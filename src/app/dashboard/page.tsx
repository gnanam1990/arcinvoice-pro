import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Invoices"
        description="Your workspace is ready. Create the first invoice when product logic lands — this view is a polished empty state with demo metrics only."
        actions={
          <>
            <Button variant="outline" size="md" type="button" disabled>
              Import
            </Button>
            <Button size="md" type="button" aria-label="Create invoice (coming soon)">
              <PlusIcon />
              Create invoice
            </Button>
          </>
        }
      />

      <section aria-labelledby="metrics-heading" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="metrics-heading"
            className="text-sm font-semibold text-foreground"
          >
            Revenue snapshot
          </h2>
          <StatusBadge tone="warning" label="Demo data" showDot={false} />
        </div>
        <p className="text-xs text-muted">
          Placeholder figures for layout review. Not connected to a database or
          chain.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            demo
            label="Collected (30d)"
            value="$0.00"
            hint="No settled invoices"
            trend="—"
            trendTone="neutral"
            icon={<CurrencyIcon />}
          />
          <MetricCard
            demo
            label="Outstanding"
            value="$0.00"
            hint="Awaiting payments"
            trend="—"
            trendTone="neutral"
            icon={<ClockIcon />}
          />
          <MetricCard
            demo
            label="Drafts"
            value="0"
            hint="In progress"
            trend="—"
            trendTone="neutral"
            icon={<DraftIcon />}
          />
          <MetricCard
            demo
            label="Avg. days to pay"
            value="—"
            hint="Insufficient data"
            trend="—"
            trendTone="neutral"
            icon={<ChartIcon />}
          />
        </div>
      </section>

      <section id="invoices" aria-labelledby="invoice-list-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="invoice-list-heading"
            className="text-sm font-semibold text-foreground"
          >
            Recent invoices
          </h2>
          <span className="font-mono text-[11px] text-muted">0 records</span>
        </div>

        <EmptyState
          title="No invoices yet"
          description="When you create invoices, they will appear here with status, amounts, and customer context. Wallet settlement and database persistence are intentionally not included in this foundation."
          action={
            <>
              <Button type="button" size="md">
                <PlusIcon />
                Create invoice
              </Button>
              <Button type="button" variant="outline" size="md" disabled>
                View sample (soon)
              </Button>
            </>
          }
        />
      </section>

      <section
        id="customers"
        className="grid gap-4 lg:grid-cols-2"
        aria-label="Secondary placeholders"
      >
        <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Customers</h3>
            <StatusBadge tone="neutral" label="Empty" />
          </div>
          <p className="mt-2 text-sm text-muted">
            Customer directory will live here. No records in this scaffold.
          </p>
        </div>
        <div
          id="payments"
          className="rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Payments</h3>
            <StatusBadge tone="offline" label="Not connected" />
          </div>
          <p className="mt-2 text-sm text-muted">
            Payment rails and Arc transactions are out of scope for this UI
            foundation.
          </p>
        </div>
      </section>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9.5 9.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5-1 2-2.5 2.5-3 1-2.5 2.5 1.5 1.5 2.5 1.5 2-.5 2.5-1.5" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 3h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinejoin="round" />
      <path d="M14 3v4h4" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M8 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
