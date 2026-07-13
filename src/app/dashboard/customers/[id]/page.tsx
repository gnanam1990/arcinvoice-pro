import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCard } from "@/components/ui/metric-card";
import { CustomerForm } from "@/components/customers/customer-form";
import { ArchiveCustomerButton } from "@/components/customers/archive-customer-button";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadCustomerDetail } from "@/lib/dashboard-data";
import { formatMoney, formatDate, invoiceStatusLabel } from "@/lib/format";

export const metadata = { title: "Customer detail" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadCustomerDetail(id);

  if (!loaded.ok) {
    if (loaded.notFound) notFound();
    return (
      <div className="space-y-6">
        <PageHeader title="Customer" />
        <OrgUnavailable error={loaded.error} />
      </div>
    );
  }

  const { customer, invoiceCount, outstandingAmount, invoices, paymentHistory } =
    loaded.detail;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Customers"
        title={customer.name}
        description={customer.email}
        actions={
          <>
            {customer.status === "active" ? (
              <ArchiveCustomerButton
                customerId={customer.id}
                customerName={customer.name}
              />
            ) : (
              <StatusBadge tone="neutral" label="Archived" />
            )}
            <Button href="/dashboard/invoices/new" variant="secondary">
              New invoice
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Invoices" value={String(invoiceCount)} />
        <MetricCard
          label="Outstanding"
          value={formatMoney(outstandingAmount)}
          hint="Open balances only"
        />
        <MetricCard
          label="Status"
          value={customer.status}
          hint={
            customer.archivedAt
              ? `Archived ${formatDate(customer.archivedAt)}`
              : "Active in workspace"
          }
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Company</dt>
              <dd>{customer.company ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Wallet</dt>
              <dd className="font-mono text-xs">
                {customer.walletAddress ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Country</dt>
              <dd>{customer.country ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">City</dt>
              <dd>{customer.city ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Payment history
          </h2>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-muted">
              No payment intents recorded yet. Wallet settlement is not wired.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {paymentHistory.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0"
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

      <section className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">No invoices for this customer.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  className="font-medium hover:text-accent"
                >
                  {inv.number}
                </Link>
                <span className="text-muted">
                  {formatMoney(inv.total, inv.currency, inv.tokenDecimals)}
                </span>
                <StatusBadge
                  tone={
                    inv.status === "paid"
                      ? "success"
                      : inv.status === "overdue"
                        ? "warning"
                        : "neutral"
                  }
                  label={invoiceStatusLabel(inv.status)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {customer.status === "active" ? (
        <section className="max-w-2xl rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs sm:p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Edit customer
          </h2>
          <CustomerForm
            mode="edit"
            customerId={customer.id}
            initial={{
              name: customer.name,
              email: customer.email,
              company: customer.company ?? "",
              walletAddress: customer.walletAddress ?? "",
              addressLine1: customer.addressLine1 ?? "",
              addressLine2: customer.addressLine2 ?? "",
              city: customer.city ?? "",
              region: customer.region ?? "",
              postalCode: customer.postalCode ?? "",
              country: customer.country ?? "",
              notes: customer.notes ?? "",
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
