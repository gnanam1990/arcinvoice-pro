import type { PublicReceiptView } from "@/lib/public/receipt-dto";
import { formatDate, formatMoney } from "@/lib/format";
import { NetworkBadge } from "@/components/ui/network-badge";
import { ShareActions } from "@/components/public/share-actions";
import { CopyButton } from "@/components/public/copy-button";
import { absoluteUrl, publicReceiptPath } from "@/lib/config/public";

type PublicReceiptDocumentProps = {
  view: PublicReceiptView;
  token: string;
};

export function PublicReceiptDocument({
  view,
  token,
}: PublicReceiptDocumentProps) {
  const url = absoluteUrl(publicReceiptPath(token));

  return (
    <article className="mx-auto w-full max-w-2xl rounded-[var(--radius-2xl)] border border-border bg-surface p-5 shadow-sm sm:p-8">
      <header className="border-b border-border pb-5">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Receipt
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {view.merchantName}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <NetworkBadge network="arc-testnet" />
          <span className="font-mono text-sm font-medium">
            {view.receiptNumber}
          </span>
        </div>
      </header>

      <div className="mt-4 rounded-[var(--radius-lg)] border border-warning/30 bg-warning-muted px-3 py-2 text-xs text-warning print:border-border print:bg-transparent print:text-foreground">
        Arc Testnet receipt · testnet-only · do not treat as mainnet settlement
      </div>

      <div className="mt-4">
        <ShareActions
          title={`Receipt ${view.receiptNumber}`}
          text={`Receipt ${view.receiptNumber} for invoice ${view.invoiceNumber}`}
          url={url}
        />
      </div>

      <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Payment amount</dt>
          <dd className="mt-1 font-mono text-lg font-semibold">
            {formatMoney(view.amount, view.currency, view.tokenDecimals)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Asset</dt>
          <dd className="mt-1 font-medium">{view.asset}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Invoice</dt>
          <dd className="mt-1 font-mono">{view.invoiceNumber}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Network</dt>
          <dd className="mt-1">{view.networkLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Finalized</dt>
          <dd className="mt-1">{formatDate(view.finalizedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Remaining balance</dt>
          <dd className="mt-1 font-mono">
            {formatMoney(
              view.remainingBalance,
              view.currency,
              view.tokenDecimals,
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted">Transaction hash</dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {view.txHash ?? "—"}
          </dd>
          {view.explorerUrl && view.txHash ? (
            <a
              href={view.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs font-medium text-accent underline print:no-underline"
            >
              View on explorer
            </a>
          ) : null}
        </div>
        <div>
          <dt className="text-xs text-muted">Payer address</dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {view.payerAddress ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Merchant address</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className="break-all font-mono text-xs">
              {view.merchantAddress ?? "—"}
            </span>
            {view.merchantAddress ? (
              <CopyButton value={view.merchantAddress} label="Copy" />
            ) : null}
          </dd>
        </div>
        {view.memo ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">Memo</dt>
            <dd className="mt-1 whitespace-pre-wrap">{view.memo}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
