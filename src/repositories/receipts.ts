import { and, count, desc, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  auditEvents,
  invoices,
  onchainPayments,
  organizations,
  paymentIntents,
  receipts,
  type ReceiptSnapshot,
} from "@/db/schema";
import {
  generatePublicPaymentToken,
  hashToken,
} from "@/lib/domain/public-token";
import { AppError } from "@/lib/errors";
import { tokensMatch } from "@/lib/security/tokens";

/**
 * Receipts are created only after an onchain payment is settled.
 * Snapshots are immutable after insert.
 */
export class ReceiptRepository {
  constructor(private readonly db: Database) {}

  private async nextReceiptNumber(organizationId: string): Promise<string> {
    const [row] = await this.db
      .select({ value: count() })
      .from(receipts)
      .where(eq(receipts.organizationId, organizationId));
    const n = (row?.value ?? 0) + 1;
    return `RCT-${String(n).padStart(5, "0")}`;
  }

  async listByInvoice(invoiceId: string, organizationId: string) {
    return this.db
      .select()
      .from(receipts)
      .where(
        and(
          eq(receipts.invoiceId, invoiceId),
          eq(receipts.organizationId, organizationId),
        ),
      )
      .orderBy(desc(receipts.issuedAt));
  }

  async findByPublicToken(token: string) {
    const tokenHash = hashToken(token);
    const [row] = await this.db
      .select({
        receipt: receipts,
        merchantName: organizations.name,
      })
      .from(receipts)
      .innerJoin(organizations, eq(receipts.organizationId, organizations.id))
      .where(eq(receipts.publicTokenHash, tokenHash))
      .limit(1);

    if (!row) return null;
    if (!tokensMatch(token, row.receipt.publicToken)) return null;
    return row;
  }

  /**
   * Create a receipt from a settled onchain payment.
   * Idempotent per onchainPaymentId when a receipt already exists.
   */
  async createFromSettledOnchainPayment(
    onchainPaymentId: string,
    actorMemberId?: string | null,
  ) {
    return this.db.transaction(async (tx) => {
      const [onchain] = await tx
        .select()
        .from(onchainPayments)
        .where(eq(onchainPayments.id, onchainPaymentId))
        .limit(1);

      if (!onchain) {
        throw new AppError("Onchain payment not found", "NOT_FOUND");
      }
      if (onchain.status !== "settled") {
        throw new AppError(
          "Receipts can only be created for settled onchain payments",
          "INVALID_STATE",
        );
      }

      const existing = await tx
        .select()
        .from(receipts)
        .where(eq(receipts.onchainPaymentId, onchainPaymentId))
        .limit(1);
      if (existing[0]) {
        return existing[0];
      }

      const [intent] = await tx
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.id, onchain.paymentIntentId))
        .limit(1);
      if (!intent) {
        throw new AppError("Payment intent not found", "NOT_FOUND");
      }

      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, intent.invoiceId))
        .limit(1);
      if (!invoice) {
        throw new AppError("Invoice not found", "NOT_FOUND");
      }

      const [org] = await tx
        .select()
        .from(organizations)
        .where(eq(organizations.id, invoice.organizationId))
        .limit(1);

      const number = await this.nextReceiptNumber(invoice.organizationId);
      const publicToken = generatePublicPaymentToken();
      const finalizedAt = (
        onchain.settledAt ?? new Date()
      ).toISOString();

      const remainingBalance = Math.max(0, invoice.amountDue);

      const snapshot: ReceiptSnapshot = {
        invoiceNumber: invoice.number,
        amount: onchain.amount,
        currency: intent.currency,
        asset: intent.currency,
        tokenDecimals: intent.tokenDecimals,
        network: onchain.network,
        txHash: onchain.txHash,
        finalizedAt,
        payerAddress: onchain.payerAddress,
        merchantAddress: org?.merchantWalletAddress ?? null,
        memo: invoice.memo,
        remainingBalance,
        paymentIntentId: intent.id,
        onchainPaymentId: onchain.id,
        capturedAt: new Date().toISOString(),
      };

      const [receipt] = await tx
        .insert(receipts)
        .values({
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          paymentIntentId: intent.id,
          onchainPaymentId: onchain.id,
          number,
          amount: onchain.amount,
          currency: intent.currency,
          tokenDecimals: intent.tokenDecimals,
          publicToken,
          publicTokenHash: hashToken(publicToken),
          snapshot,
          issuedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!receipt) {
        throw new AppError("Failed to create receipt", "VALIDATION");
      }

      // Immutability: snapshot is write-once; no further updates allowed.
      await tx.insert(auditEvents).values({
        organizationId: invoice.organizationId,
        actorMemberId: actorMemberId ?? null,
        entityType: "receipt",
        entityId: receipt.id,
        action: "receipt_created",
        summary: `Receipt ${receipt.number} created for invoice ${invoice.number}`,
        metadata: {
          invoiceId: invoice.id,
          onchainPaymentId: onchain.id,
          amount: receipt.amount,
          // Never log visitor IPs
        },
        updatedAt: new Date(),
      });

      return receipt;
    });
  }
}
