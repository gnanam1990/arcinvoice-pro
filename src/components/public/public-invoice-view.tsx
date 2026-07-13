import type { PublicInvoiceView } from "@/lib/public/invoice-dto";
import { formatDate, formatMoney, invoiceStatusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { NetworkBadge } from "@/components/ui/network-badge";
import { CopyButton } from "@/components/public/copy-button";
import { ShareActions } from "@/components/public/share-actions";
import {
  absoluteUrl,
  publicInvoicePath,
  publicInvoicePrintPath,
} from "@/lib/config/public";
import { cn } from "@/lib/utils";

type PublicInvoiceDocumentProps = {
  view: PublicInvoiceView;
  /** Raw token for building absolute links (never shown as internal id). */
  token: string;
  mode?: "page" | "print";
  onLinkCopied?: () => void;
};

/**
 * Public invoice document. Escapes merchant/customer text via React text nodes.
 * Does not render private notes, audit, members, or internal IDs.
 */
export function PublicInvoiceDocument({
  view,
  token,
  mode = "page",
  onLinkCopied,
}: PublicInvoiceDocumentProps) {
  const isPrint = mode === "print";
  const url = absoluteUrl(publicInvoicePath(token));
  const printUrl = absoluteUrl(publicInvoicePrintPath(token));

  return (
    <article
      className={cn(
        "mx-auto w-full bg-surface text-foreground",
        isPrint
          ? "max-w-[210mm] p-8 print:p-0"
          : "max-w-3xl rounded-[var(--radius-2xl)] border border-border p-5 shadow-sm sm:p-8",
      )}
    >
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">
            Invoice
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {view.merchant.name}
          </h1>
          {view.merchant.tagline ? (
            <p className="text-sm text-muted">{view.merchant.tagline}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <NetworkBadge network="arc-testnet" />
            <StatusBadge
              tone={
                view.status === "paid"
                  ? "success"
                  : view.status === "overdue"
                    ? "warning"
                    : "neutral"
              }
              label={invoiceStatusLabel(view.status)}
            />
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted">Invoice number</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 sm:justify-end">
            <p className="font-mono text-lg font-semibold">{view.invoiceNumber}</p>
            {!isPrint ? (
              <CopyButton value={view.invoiceNumber} label="Copy #" size="sm" />
            ) : null}
          </div>
        </div>
      </header>

      {!isPrint ? (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-warning/30 bg-warning-muted px-3 py-2 text-xs text-warning">
          <strong className="font-semibold">Testnet only.</strong> This invoice
          is shown on Arc Testnet for demonstration. Do not send mainnet funds.
          On-chain payment execution is not enabled in this build.
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted">
          Arc Testnet · testnet-only document · not for mainnet settlement
        </p>
      )}

      {!isPrint ? (
        <div className="mt-4">
          <ShareActions
            title={`Invoice ${view.invoiceNumber}`}
            text={`Invoice ${view.invoiceNumber} from ${view.merchant.name}`}
            url={url}
            printHref={publicInvoicePrintPath(token)}
            onLinkCopied={onLinkCopied}
          />
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
            Bill to
          </h2>
          {view.customer ? (
            <div className="mt-2 space-y-0.5 text-sm">
              <p className="font-medium">{view.customer.name}</p>
              {view.customer.company ? <p>{view.customer.company}</p> : null}
              <p className="text-muted">{view.customer.email}</p>
              {view.customer.addressLine1 ? (
                <p>{view.customer.addressLine1}</p>
              ) : null}
              {view.customer.addressLine2 ? (
                <p>{view.customer.addressLine2}</p>
              ) : null}
              <p className="text-muted">
                {[view.customer.city, view.customer.region, view.customer.postalCode]
                  .filter(Boolean)
                  .join(", ")}
                {view.customer.country ? ` · ${view.customer.country}` : ""}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Customer unavailable</p>
          )}
        </div>
        <div className="space-y-3 text-sm sm:text-right">
          <div>
            <p className="text-xs text-muted">Issued</p>
            <p className="font-medium">{formatDate(view.issueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Due</p>
            <p className="font-medium">{formatDate(view.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Network</p>
            <p className="font-medium">{view.networkLabel}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs tracking-wide text-muted uppercase">
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 font-medium">Qty</th>
              <th className="py-2 pr-3 font-medium">Unit</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {view.lines.map((line, i) => (
              <tr key={`${line.position}-${i}`} className="border-b border-border">
                <td className="py-2.5 pr-3">{line.description}</td>
                <td className="py-2.5 pr-3 font-mono">{line.quantity}</td>
                <td className="py-2.5 pr-3 font-mono">
                  {formatMoney(line.unitPrice, view.currency, view.tokenDecimals)}
                </td>
                <td className="py-2.5 text-right font-mono">
                  {formatMoney(line.amount, view.currency, view.tokenDecimals)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex flex-col gap-2 border-t border-border pt-4 sm:ml-auto sm:max-w-xs">
        {(
          [
            ["Subtotal", view.subtotal],
            ["Tax", view.tax],
            ["Discount", view.discount],
            ["Total", view.total],
            ["Amount paid", view.amountPaid],
            ["Amount due", view.amountDue],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span
              className={
                label === "Total" || label === "Amount due"
                  ? "font-semibold"
                  : "text-muted"
              }
            >
              {label}
            </span>
            <span
              className={cn(
                "font-mono",
                (label === "Total" || label === "Amount due") && "font-semibold",
              )}
            >
              {formatMoney(value, view.currency, view.tokenDecimals)}
            </span>
          </div>
        ))}
      </section>

      {view.memo ? (
        <section className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface-sunken p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Payment memo
            </h2>
            {!isPrint ? <CopyButton value={view.memo} label="Copy memo" /> : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{view.memo}</p>
        </section>
      ) : null}

      {view.merchant.walletAddress ? (
        <section className="mt-6 text-sm">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Merchant wallet
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="break-all font-mono text-xs">
              {view.merchant.walletAddress}
            </code>
            {!isPrint ? (
              <CopyButton
                value={view.merchant.walletAddress}
                label="Copy wallet"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {isPrint ? (
        <footer className="mt-10 border-t border-border pt-4 text-[11px] text-muted">
          <p>Secure link: {printUrl.replace("/print", "")}</p>
          <p className="mt-1">
            Transaction details appear on receipts after settled on-chain
            payment. Payment execution is not included in this build.
          </p>
        </footer>
      ) : null}
    </article>
  );
}
