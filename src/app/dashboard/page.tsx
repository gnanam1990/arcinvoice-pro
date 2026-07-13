import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadDashboardOverview } from "@/lib/dashboard-data";
import { formatMoney, invoiceStatusLabel } from "@/lib/format";

export default async function DashboardPage() {
  const data = await loadDashboardOverview();
  if (!data.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" />
        <OrgUnavailable error={data.error} />
      </div>
    );
  }

  const { org, customers, invoices, allInvoices } = data;
  const outstanding = allInvoices
    .filter((i) =>
      ["issued", "partially_paid", "overdue"].includes(i.status),
    )
    .reduce((sum, i) => sum + i.amountDue, 0);
  const collected = allInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
  const drafts = allInvoices.filter((i) => i.status === "draft").length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={org.name}
        title="Overview"
        description="Live data from PostgreSQL for this organization. Wallet settlement is not connected yet."
        actions={
          <>
            <Button href="/dashboard/customers/new" variant="outline">
              New customer
            </Button>
            <Button href="/dashboard/invoices/new">Create invoice</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Collected"
          value={formatMoney(collected)}
          hint="Sum of amount paid"
        />
        <MetricCard
          label="Outstanding"
          value={formatMoney(outstanding)}
          hint="Open balances"
        />
        <MetricCard label="Drafts" value={String(drafts)} hint="Editable" />
        <MetricCard
          label="Active customers"
          value={String(customers.total)}
          hint="Not archived"
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Recent invoices</h2>
            <Link
              href="/dashboard/invoices"
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </div>
          {invoices.items.length === 0 ? (
            <EmptyState
              title="No invoices"
              description="Create your first draft invoice."
              action={
                <Button href="/dashboard/invoices/new" size="sm">
                  Create invoice
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {invoices.items.map((inv) => (
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
                  <span className="font-mono text-xs text-muted">
                    {formatMoney(inv.total, inv.currency, inv.tokenDecimals)}
                  </span>
                  <StatusBadge
                    tone="neutral"
                    label={invoiceStatusLabel(inv.status)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Customers</h2>
            <Link
              href="/dashboard/customers"
              className="text-xs font-medium text-accent hover:underline"
            >
              View all
            </Link>
          </div>
          {customers.items.length === 0 ? (
            <EmptyState
              title="No customers"
              description="Add a customer to start invoicing."
              action={
                <Button href="/dashboard/customers/new" size="sm">
                  New customer
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {customers.items.map((c) => (
                <li key={c.id} className="py-3 text-sm">
                  <Link
                    href={`/dashboard/customers/${c.id}`}
                    className="font-medium hover:text-accent"
                  >
                    {c.name}
                  </Link>
                  <p className="text-xs text-muted">{c.email}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
