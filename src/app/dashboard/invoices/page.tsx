import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadInvoicesPage } from "@/lib/dashboard-data";
import { formatMoney, invoiceStatusLabel } from "@/lib/format";
import {
  INVOICE_STATUSES,
  type InvoiceStatus,
} from "@/lib/domain/invoice-state";
import { listQuerySchema } from "@/lib/validation/schemas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const parsed = listQuerySchema.safeParse({
    q: typeof sp.q === "string" ? sp.q : "",
    page: typeof sp.page === "string" ? sp.page : "1",
    pageSize: "10",
    status: typeof sp.status === "string" ? sp.status : "all",
  });
  const query = parsed.success
    ? parsed.data
    : { q: "", page: 1, pageSize: 10, status: "all" };

  const statusFilter =
    query.status &&
    (INVOICE_STATUSES as readonly string[]).includes(query.status)
      ? (query.status as InvoiceStatus)
      : "all";

  const loaded = await loadInvoicesPage({
    q: query.q,
    page: query.page,
    pageSize: query.pageSize,
    status: statusFilter,
  });

  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoices" />
        <OrgUnavailable error={loaded.error} />
      </div>
    );
  }

  const { result } = loaded;

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    return `/dashboard/invoices?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Invoices"
        description="Filter by status, search by number, and manage drafts through paid."
        actions={
          <Button href="/dashboard/invoices/new" data-testid="new-invoice">
            Create invoice
          </Button>
        }
      />

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-muted">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query.q}
            placeholder="Invoice number, memo, notes…"
            className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm"
            data-testid="invoice-search"
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="mb-1.5 block text-xs font-medium text-muted"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={statusFilter}
            className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm sm:w-48"
            data-testid="invoice-status-filter"
          >
            <option value="all">All</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {invoiceStatusLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Create a draft invoice or clear filters to see seeded demo data."
          action={
            <Button href="/dashboard/invoices/new">Create invoice</Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-sunken text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Customer
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="hidden px-4 py-3 font-medium text-right md:table-cell">
                  Due
                </th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-surface-sunken/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {inv.number}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {inv.customerName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={
                        inv.status === "paid"
                          ? "success"
                          : inv.status === "overdue" ||
                              inv.status === "cancelled"
                            ? "warning"
                            : "neutral"
                      }
                      label={invoiceStatusLabel(inv.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {formatMoney(inv.total, inv.currency, inv.tokenDecimals)}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-xs md:table-cell">
                    {formatMoney(
                      inv.amountDue,
                      inv.currency,
                      inv.tokenDecimals,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefForPage={hrefForPage}
      />
    </div>
  );
}
