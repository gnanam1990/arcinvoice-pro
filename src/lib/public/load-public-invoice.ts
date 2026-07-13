import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { auditEvents, organizations } from "@/db/schema";
import {
  getMerchantDefaultWallet,
  getPublicNetworkLabel,
} from "@/lib/config/public";
import {
  isPublicViewableStatus,
  toPublicCustomer,
  toPublicLines,
  type PublicInvoiceView,
} from "@/lib/public/invoice-dto";
import {
  PUBLIC_INVOICE_RATE_LIMIT,
  rateLimit,
} from "@/lib/security/rate-limit";
import { hashPublicToken, tokensMatch } from "@/lib/security/tokens";
import { invoices } from "@/db/schema";

export type PublicInvoiceLoadResult =
  | { ok: true; view: PublicInvoiceView }
  | { ok: false; reason: "not_found" | "rate_limited"; retryAfterMs?: number };

/**
 * Load a privacy-safe public invoice DTO by payment token.
 * Uniform not-found for invalid / draft / cancelled to reduce enumeration.
 * Does not expose audit events, members, private notes, or internal IDs.
 */
export async function loadPublicInvoice(
  token: string,
): Promise<PublicInvoiceLoadResult> {
  if (!token || token.length < 16 || token.length > 128) {
    return { ok: false, reason: "not_found" };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  const rl = rateLimit({
    key: `public-invoice:${ip}`,
    limit: PUBLIC_INVOICE_RATE_LIMIT.limit,
    windowMs: PUBLIC_INVOICE_RATE_LIMIT.windowMs,
  });

  if (!rl.allowed) {
    return {
      ok: false,
      reason: "rate_limited",
      retryAfterMs: rl.retryAfterMs,
    };
  }

  const db = getDb();
  const tokenHash = hashPublicToken(token);

  const [row] = await db
    .select({
      invoice: invoices,
      merchantName: organizations.name,
      merchantWallet: organizations.merchantWalletAddress,
      brandingTagline: organizations.brandingTagline,
    })
    .from(invoices)
    .innerJoin(organizations, eq(invoices.organizationId, organizations.id))
    .where(eq(invoices.publicPaymentTokenHash, tokenHash))
    .limit(1);

  // Uniform failure path — no status leak for missing tokens
  if (!row || !tokensMatch(token, row.invoice.publicPaymentToken)) {
    return { ok: false, reason: "not_found" };
  }

  if (!isPublicViewableStatus(row.invoice.status)) {
    return { ok: false, reason: "not_found" };
  }

  const snapshot = row.invoice.issuedSnapshot;
  if (!snapshot) {
    // Issued-family without snapshot is treated as unavailable
    return { ok: false, reason: "not_found" };
  }

  // Prefer immutable merchant wallet from issue snapshot.
  // Fall back to live org wallet only when snapshot predates merchant freeze.
  const snapshotWallet = snapshot.merchant?.walletAddress ?? null;
  const merchantWallet =
    snapshotWallet ??
    row.merchantWallet ??
    getMerchantDefaultWallet();

  const canPreparePayment =
    ["issued", "partially_paid", "overdue"].includes(row.invoice.status) &&
    row.invoice.amountDue > 0;

  const view: PublicInvoiceView = {
    invoiceNumber: row.invoice.number,
    status: row.invoice.status,
    currency: row.invoice.currency,
    tokenDecimals: row.invoice.tokenDecimals,
    subtotal: row.invoice.subtotal,
    tax: row.invoice.tax,
    discount: row.invoice.discount,
    total: row.invoice.total,
    amountPaid: row.invoice.amountPaid,
    amountDue: row.invoice.amountDue,
    issueDate: row.invoice.issueDate,
    dueDate: row.invoice.dueDate,
    memo: row.invoice.memo,
    merchant: {
      name: snapshot.merchant?.organizationName ?? row.merchantName,
      tagline: row.brandingTagline,
      walletAddress: merchantWallet,
    },
    customer: toPublicCustomer(snapshot.customer),
    lines: toPublicLines(snapshot.lines),
    networkLabel: getPublicNetworkLabel(),
    isTestnet: true,
    allowPartialPayments:
      snapshot.allowPartialPayments ?? row.invoice.allowPartialPayments,
    canPreparePayment,
  };

  // Privacy-safe public view audit — no IP, no user agent
  try {
    await db.insert(auditEvents).values({
      organizationId: row.invoice.organizationId,
      entityType: "invoice",
      entityId: row.invoice.id,
      action: "public_viewed",
      summary: `Public invoice ${row.invoice.number} viewed`,
      metadata: {
        via: "public_token",
        // Explicitly no IP logging
        visitorIpLogged: false,
      },
      updatedAt: new Date(),
    });
  } catch {
    // Do not fail the public page if audit write fails
  }

  return { ok: true, view };
}
