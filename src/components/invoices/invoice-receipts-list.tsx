import Link from "next/link";
import { formatDate, formatMoney } from "@/lib/format";
import { publicReceiptPath } from "@/lib/config/public";

export type ReceiptListItem = {
  id: string;
  number: string;
  amount: number;
  currency: string;
  tokenDecimals: number;
  publicToken: string;
  issuedAt: Date | string;
};

export function InvoiceReceiptsList({
  receipts,
}: {
  receipts: ReceiptListItem[];
}) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
      <h2 className="mb-3 text-sm font-semibold">Receipts</h2>
      {receipts.length === 0 ? (
        <p className="text-sm text-muted">
          Receipts appear after an on-chain payment is settled. Multiple
          receipts are supported for partial payments.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {receipts.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{r.number}</p>
                <p className="text-xs text-muted">{formatDate(r.issuedAt)}</p>
              </div>
              <span className="font-mono text-xs">
                {formatMoney(r.amount, r.currency, r.tokenDecimals)}
              </span>
              <Link
                href={publicReceiptPath(r.publicToken)}
                className="text-xs font-medium text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open receipt
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
