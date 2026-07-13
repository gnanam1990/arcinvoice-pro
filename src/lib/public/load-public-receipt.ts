import { headers } from "next/headers";
import { getDb } from "@/db/client";
import {
  getExplorerTxUrl,
  getPublicNetworkLabel,
} from "@/lib/config/public";
import { snapshotToPublicReceipt, type PublicReceiptView } from "@/lib/public/receipt-dto";
import {
  PUBLIC_INVOICE_RATE_LIMIT,
  rateLimit,
} from "@/lib/security/rate-limit";
import { ReceiptRepository } from "@/repositories/receipts";

export type PublicReceiptLoadResult =
  | { ok: true; view: PublicReceiptView }
  | { ok: false; reason: "not_found" | "rate_limited"; retryAfterMs?: number };

export async function loadPublicReceipt(
  token: string,
): Promise<PublicReceiptLoadResult> {
  if (!token || token.length < 16 || token.length > 128) {
    return { ok: false, reason: "not_found" };
  }

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";

  const rl = rateLimit({
    key: `public-receipt:${ip}`,
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

  const repo = new ReceiptRepository(getDb());
  const row = await repo.findByPublicToken(token);
  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  const snapshot = row.receipt.snapshot;
  const view = snapshotToPublicReceipt(
    row.receipt.number,
    row.merchantName,
    snapshot,
    getPublicNetworkLabel(),
    getExplorerTxUrl(snapshot.txHash),
  );

  return { ok: true, view };
}
