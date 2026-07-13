import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { OrgUnavailable } from "@/components/dashboard/org-guard";
import { loadCustomersPage } from "@/lib/dashboard-data";
import { listQuerySchema } from "@/lib/validation/schemas";
import type { CustomerStatusFilter } from "@/repositories/customers";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const parsed = listQuerySchema.safeParse({
    q: typeof sp.q === "string" ? sp.q : "",
    page: typeof sp.page === "string" ? sp.page : "1",
    pageSize: "10",
    status: typeof sp.status === "string" ? sp.status : "active",
  });
  const query = parsed.success
    ? parsed.data
    : { q: "", page: 1, pageSize: 10, status: "active" };

  const status: CustomerStatusFilter =
    query.status === "archived" || query.status === "all"
      ? query.status
      : "active";

  const loaded = await loadCustomersPage({
    q: query.q,
    page: query.page,
    pageSize: query.pageSize,
    status,
  });

  if (!loaded.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customers" />
        <OrgUnavailable error={loaded.error} />
      </div>
    );
  }

  const { result } = loaded;

  const hrefForPage = (page: number) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (status !== "active") params.set("status", status);
    params.set("page", String(page));
    return `/dashboard/customers?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Customers"
        description="Search, filter, and manage billing contacts for this organization."
        actions={
          <Button href="/dashboard/customers/new" data-testid="new-customer">
            New customer
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
            placeholder="Name, email, company, wallet…"
            className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm"
            data-testid="customer-search"
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
            defaultValue={status}
            className="w-full rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-2 text-sm sm:w-40"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Create a customer to start issuing invoices, or adjust your search filters."
          action={
            <Button href="/dashboard/customers/new">Create customer</Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-sunken text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Email
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Company
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border last:border-0 hover:bg-surface-sunken/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted sm:table-cell">
                    {customer.email}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {customer.company ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={customer.status === "active" ? "success" : "neutral"}
                      label={customer.status}
                    />
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
