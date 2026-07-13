import { and, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  auditEvents,
  invoices,
  organizations,
  paymentIntents,
} from "@/db/schema";
import { ARC_TESTNET_CHAIN_ID } from "@/lib/arc/chain";
import { normalizeAddress } from "@/lib/arc/addresses";
import { AppError } from "@/lib/errors";
import { hashPublicToken, tokensMatch } from "@/lib/security/tokens";
import { rateLimit } from "@/lib/security/rate-limit";
import { isPublicViewableStatus } from "@/lib/public/invoice-dto";
import { randomBytes } from "node:crypto";

const PAYABLE_STATUSES = ["issued", "partially_paid", "overdue"] as const;
const ACTIVE_INTENT_STATUSES = ["pending", "ready"] as const;
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export type PreparePaymentInput = {
  publicToken: string;
  /** Requested amount in invoice base units; server revalidates. */
  requestedAmount?: number;
  payerAddress: string;
  idempotencyKey: string;
};

export type PublicPaymentIntentView = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  tokenDecimals: number;
  recipientAddress: string;
  payerAddress: string | null;
  chainId: number;
  network: string;
  networkLabel: string;
  invoiceNumber: string;
  memo: string | null;
  expiresAt: string;
  asset: string;
  estimatedGasNote: string;
};

function isPayableStatus(
  status: string,
): status is (typeof PAYABLE_STATUSES)[number] {
  return (PAYABLE_STATUSES as readonly string[]).includes(status);
}

export class PaymentIntentRepository {
  constructor(private readonly db: Database) {}

  async expireStaleForInvoice(invoiceId: string) {
    await this.db
      .update(paymentIntents)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          eq(paymentIntents.invoiceId, invoiceId),
          inArray(paymentIntents.status, [...ACTIVE_INTENT_STATUSES]),
          sql`${paymentIntents.expiresAt} <= now()`,
        ),
      );
  }

  /**
   * Create or return an existing payment preparation intent.
   * Never trusts browser-supplied amount/recipient/chain for final values.
   */
  async preparePayment(
    input: PreparePaymentInput,
    rateLimitKey: string,
  ): Promise<PublicPaymentIntentView> {
    const rl = rateLimit({
      key: `payment-intent:${rateLimitKey}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      throw new AppError("Too many payment preparation requests", "VALIDATION");
    }

    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new AppError("Idempotency key required", "VALIDATION");
    }
    if (!input.publicToken || input.publicToken.length < 16) {
      throw new AppError("Invalid invoice token", "NOT_FOUND");
    }

    let payer: string;
    try {
      payer = normalizeAddress(input.payerAddress);
    } catch {
      throw new AppError("Invalid payer wallet address", "VALIDATION");
    }

    const tokenHash = hashPublicToken(input.publicToken);

    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          invoice: invoices,
          orgName: organizations.name,
          orgWallet: organizations.merchantWalletAddress,
        })
        .from(invoices)
        .innerJoin(
          organizations,
          eq(invoices.organizationId, organizations.id),
        )
        .where(eq(invoices.publicPaymentTokenHash, tokenHash))
        .limit(1);

      if (!row || !tokensMatch(input.publicToken, row.invoice.publicPaymentToken)) {
        throw new AppError("Invoice not found", "NOT_FOUND");
      }

      const { invoice } = row;

      // Expire stale intents first
      await tx
        .update(paymentIntents)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(
            eq(paymentIntents.invoiceId, invoice.id),
            inArray(paymentIntents.status, [...ACTIVE_INTENT_STATUSES]),
            sql`${paymentIntents.expiresAt} <= now()`,
          ),
        );

      // Idempotent return
      const [existingByKey] = await tx
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.idempotencyKey, input.idempotencyKey))
        .limit(1);

      if (existingByKey) {
        return this.toPublicView(existingByKey);
      }

      if (!isPayableStatus(invoice.status)) {
        throw new AppError(
          `Invoice status "${invoice.status}" cannot prepare payment`,
          "INVALID_STATE",
        );
      }

      if (!isPublicViewableStatus(invoice.status)) {
        throw new AppError("Invoice not available", "NOT_FOUND");
      }

      if (invoice.amountDue <= 0) {
        throw new AppError("Invoice has no amount due", "INVALID_STATE");
      }

      const snapshot = invoice.issuedSnapshot;
      if (!snapshot) {
        throw new AppError("Invoice snapshot missing", "INVALID_STATE");
      }

      const recipientRaw =
        snapshot.merchant?.walletAddress ?? row.orgWallet ?? null;
      if (!recipientRaw) {
        throw new AppError(
          "Merchant payout wallet is not configured",
          "INVALID_STATE",
        );
      }

      let recipient: string;
      try {
        recipient = normalizeAddress(recipientRaw);
      } catch {
        throw new AppError("Merchant payout wallet is invalid", "INVALID_STATE");
      }

      // Server-authoritative amount
      let amount = invoice.amountDue;
      if (input.requestedAmount !== undefined) {
        if (!Number.isInteger(input.requestedAmount)) {
          throw new AppError("Amount must be an integer base unit", "VALIDATION");
        }
        if (input.requestedAmount <= 0) {
          throw new AppError("Amount must be greater than zero", "VALIDATION");
        }
        if (input.requestedAmount > invoice.amountDue) {
          throw new AppError(
            "Amount cannot exceed amount due",
            "VALIDATION",
          );
        }
        const allowPartial =
          snapshot.allowPartialPayments ?? invoice.allowPartialPayments;
        if (
          input.requestedAmount < invoice.amountDue &&
          !allowPartial
        ) {
          throw new AppError(
            "Partial payments are not allowed for this invoice",
            "INVALID_STATE",
          );
        }
        amount = input.requestedAmount;
      }

      // Prevent duplicate active intents for same wallet + invoice + amount
      const [duplicate] = await tx
        .select()
        .from(paymentIntents)
        .where(
          and(
            eq(paymentIntents.invoiceId, invoice.id),
            eq(paymentIntents.payerAddress, payer),
            eq(paymentIntents.amount, amount),
            inArray(paymentIntents.status, [...ACTIVE_INTENT_STATUSES]),
            gt(paymentIntents.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (duplicate) {
        return this.toPublicView(duplicate);
      }

      const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);

      const [created] = await tx
        .insert(paymentIntents)
        .values({
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          amount,
          currency: invoice.currency,
          tokenDecimals: invoice.tokenDecimals,
          status: "ready",
          idempotencyKey: input.idempotencyKey,
          payerAddress: payer,
          recipientAddress: recipient,
          chainId: ARC_TESTNET_CHAIN_ID,
          network: "arc-testnet",
          memo: invoice.memo,
          invoiceNumber: invoice.number,
          expiresAt,
          metadata: JSON.stringify({
            preparedOnly: true,
            noBroadcast: true,
          }),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        throw new AppError("Failed to create payment intent", "VALIDATION");
      }

      await tx.insert(auditEvents).values({
        organizationId: invoice.organizationId,
        entityType: "payment_intent",
        entityId: created.id,
        action: "payment_intent_created",
        summary: `Payment intent prepared for invoice ${invoice.number}`,
        metadata: {
          amount,
          payer,
          recipient,
          // No public org id exposure beyond audit store
          invoiceNumber: invoice.number,
          visitorIpLogged: false,
        },
        updatedAt: new Date(),
      });

      return this.toPublicView(created);
    });
  }

  toPublicView(
    row: typeof paymentIntents.$inferSelect,
  ): PublicPaymentIntentView {
    const expired =
      row.status === "expired" ||
      (["pending", "ready"].includes(row.status) &&
        row.expiresAt.getTime() <= Date.now());

    return {
      id: row.id,
      status: expired ? "expired" : row.status,
      amount: row.amount,
      currency: row.currency,
      tokenDecimals: row.tokenDecimals,
      recipientAddress: row.recipientAddress,
      payerAddress: row.payerAddress,
      chainId: row.chainId,
      network: row.network,
      networkLabel: "Arc Testnet",
      invoiceNumber: row.invoiceNumber,
      memo: row.memo,
      expiresAt: row.expiresAt.toISOString(),
      asset: "USDC",
      estimatedGasNote:
        "Gas is paid in native USDC on Arc Testnet. No transaction is signed or broadcast in this step.",
    };
  }
}

export function newIdempotencyKey(): string {
  return randomBytes(16).toString("hex");
}
