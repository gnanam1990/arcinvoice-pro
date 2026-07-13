import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { PublicInvoiceActions } from "@/components/invoices/public-invoice-actions";
import { InvoiceReceiptsList } from "@/components/invoices/invoice-receipts-list";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadInvoiceDetail } from "@/lib/dashboard-data";
import {
  formatDate,
  formatMoney,
  invoiceStatusLabel,
} from "@/lib/format";

export const metadata = { title: "Invoice detail" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadInvoiceDetail(id);

  if (!loaded.ok) {
    if (loaded.notFound) notFound();
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" />
        <OrgUnavailable error={loaded.error} />
      </div>
    );
  }

  const { invoice, lines, customer, payments, timeline, receipts } =
    loaded.detail;
  const snapshot = invoice.issuedSnapshot;
  const showSnapshot = Boolean(snapshot) && invoice.status !== "draft";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Invoices"
        title={invoice.number}
        description={`Status: ${invoiceStatusLabel(invoice.status)}`}
        actions={
          <StatusBadge
            tone={
              invoice.status === "paid"
                ? "success"
                : invoice.status === "overdue"
                  ? "warning"
                  : "neutral"
            }
            label={invoiceStatusLabel(invoice.status)}
          />
        }
      />

      <InvoiceActions
        invoiceId={invoice.id}
        status={invoice.status}
        number={invoice.number}
        publicPaymentToken={invoice.publicPaymentToken}
      />

      <PublicInvoiceActions
        invoiceId={invoice.id}
        status={invoice.status}
        publicPaymentToken={invoice.publicPaymentToken}
        preview
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Subtotal", invoice.subtotal],
            ["Tax", invoice.tax],
            ["Discount", invoice.discount],
            ["Total", invoice.total],
            ["Amount paid", invoice.amountPaid],
            ["Amount due", invoice.amountDue],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[var(--radius-xl)] border border-border bg-surface p-4 shadow-xs"
          >
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-1 font-mono text-sm font-semibold">
              {formatMoney(value, invoice.currency, invoice.tokenDecimals)}
            </p>
          </div>
        ))}
      </div>

      {invoice.hasOverpayment ? (
        <p className="text-sm text-warning">
          Overpayment recorded:{" "}
          {formatMoney(
            invoice.overpaymentAmount,
            invoice.currency,
            invoice.tokenDecimals,
          )}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <h2 className="text-sm font-semibold">
            {showSnapshot ? "Customer snapshot (immutable)" : "Customer"}
          </h2>
          {showSnapshot && snapshot ? (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Name</dt>
                <dd>{snapshot.customer.name}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Email</dt>
                <dd>{snapshot.customer.email}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Wallet</dt>
                <dd className="font-mono text-xs">
                  {snapshot.customer.walletAddress ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Captured</dt>
                <dd className="text-xs">{formatDate(snapshot.capturedAt)}</dd>
              </div>
            </dl>
          ) : (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Name</dt>
                <dd>{customer?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Email</dt>
                <dd>{customer?.email ?? "—"}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <h2 className="text-sm font-semibold">Dates & notes</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Issue date</dt>
              <dd>{formatDate(invoice.issueDate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Due date</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Memo</dt>
              <dd className="text-right">{invoice.memo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {invoice.notes ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
        <h2 className="mb-3 text-sm font-semibold">
          {showSnapshot ? "Line items snapshot (immutable)" : "Line items"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(showSnapshot && snapshot ? snapshot.lines : lines).map((line) => (
                <tr
                  key={"lineId" in line ? line.lineId : line.id}
                  className="border-t border-border"
                >
                  <td className="py-2 pr-3">{line.description}</td>
                  <td className="py-2 pr-3 font-mono">{line.quantity}</td>
                  <td className="py-2 pr-3 font-mono">
                    {formatMoney(
                      line.unitPrice,
                      invoice.currency,
                      invoice.tokenDecimals,
                    )}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatMoney(
                      line.amount,
                      invoice.currency,
                      invoice.tokenDecimals,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold">Status timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No audit events yet.</p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="border-l-2 border-accent/40 pl-3">
                  <p className="text-sm font-medium capitalize">
                    {event.action.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted">{event.summary}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">
                    {formatDate(event.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold">Payment intents</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">
              No payment intents. Arc wallet payment logic is not enabled.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-mono text-xs">
                    {formatMoney(p.amount, p.currency, p.tokenDecimals)}
                  </span>
                  <StatusBadge tone="neutral" label={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <InvoiceReceiptsList receipts={receipts} />
    </div>
  );
}
