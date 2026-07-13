"use server";

import { revalidatePath } from "next/cache";
import { verifyMessage } from "viem";
import { eq, and, inArray, count } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditEvents, invoices, organizations } from "@/db/schema";
import {
  AppError,
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/lib/errors";
import { requireOrganizationId } from "@/lib/org/context";
import { isValidEvmAddress, normalizeAddress } from "@/lib/arc/addresses";
import { z, ZodError } from "zod";

const updateSchema = z.object({
  walletAddress: z.string().min(1),
  signature: z.string().min(1),
  message: z.string().min(1),
  signedBy: z.string().min(1),
});

/**
 * Update merchant Arc payout address after wallet signature confirmation.
 */
export async function updateMerchantWalletAction(
  input: z.input<typeof updateSchema>,
): Promise<
  ActionResult<{
    walletAddress: string;
    issuedInvoiceWarning: boolean;
    issuedInvoiceCount: number;
  }>
> {
  try {
    const organizationId = await requireOrganizationId();
    const data = updateSchema.parse(input);

    if (!isValidEvmAddress(data.walletAddress)) {
      return actionError("Invalid EVM wallet address", "VALIDATION");
    }
    if (!isValidEvmAddress(data.signedBy)) {
      return actionError("Invalid signing wallet", "VALIDATION");
    }

    const wallet = normalizeAddress(data.walletAddress);
    const signedBy = normalizeAddress(data.signedBy);

    if (wallet !== signedBy) {
      return actionError(
        "Signature must come from the payout wallet being set",
        "VALIDATION",
      );
    }

    const valid = await verifyMessage({
      address: signedBy as `0x${string}`,
      message: data.message,
      signature: data.signature as `0x${string}`,
    });

    if (!valid) {
      return actionError("Invalid wallet signature", "VALIDATION");
    }

    if (!data.message.includes(wallet) || !data.message.includes(organizationId)) {
      return actionError("Signed message does not match request", "VALIDATION");
    }

    const db = getDb();
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return actionError("Organization not found", "NOT_FOUND");
    }

    const [issuedCountRow] = await db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          inArray(invoices.status, [
            "issued",
            "partially_paid",
            "paid",
            "overdue",
          ]),
        ),
      );

    const issuedInvoiceCount = issuedCountRow?.value ?? 0;
    const oldWallet = org.merchantWalletAddress;

    const [updated] = await db
      .update(organizations)
      .set({
        merchantWalletAddress: wallet,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    await db.insert(auditEvents).values({
      organizationId,
      entityType: "organization",
      entityId: organizationId,
      action: "merchant_wallet_updated",
      summary: "Merchant Arc payout wallet updated",
      metadata: {
        oldWallet,
        newWallet: wallet,
        signedBy,
        issuedInvoiceCount,
      },
      updatedAt: new Date(),
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return actionSuccess({
      walletAddress: updated?.merchantWalletAddress ?? wallet,
      issuedInvoiceWarning: issuedInvoiceCount > 0,
      issuedInvoiceCount,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return actionError("Validation failed", "VALIDATION");
    }
    if (err instanceof AppError) {
      return actionError(err.message, err.code);
    }
    console.error(err);
    return actionError("Could not update merchant wallet", "VALIDATION");
  }
}

export async function getMerchantWalletSettingsAction(): Promise<
  ActionResult<{
    walletAddress: string | null;
    organizationId: string;
    organizationName: string;
    issuedInvoiceCount: number;
  }>
> {
  try {
    const organizationId = await requireOrganizationId();
    const db = getDb();
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    if (!org) return actionError("Organization not found", "NOT_FOUND");

    const [issuedCountRow] = await db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          inArray(invoices.status, [
            "issued",
            "partially_paid",
            "paid",
            "overdue",
          ]),
        ),
      );

    return actionSuccess({
      walletAddress: org.merchantWalletAddress,
      organizationId: org.id,
      organizationName: org.name,
      issuedInvoiceCount: issuedCountRow?.value ?? 0,
    });
  } catch (err) {
    console.error(err);
    return actionError("Could not load settings", "UNAVAILABLE");
  }
}
