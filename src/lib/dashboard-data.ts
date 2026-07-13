import { getDb } from "@/db/client";
import { OrgContextError, requireOrganizationId, getActiveOrganization } from "@/lib/org/context";
import { AppError } from "@/lib/errors";
import { CustomerRepository } from "@/repositories/customers";
import { InvoiceRepository } from "@/repositories/invoices";
import type { InvoiceStatus } from "@/lib/domain/invoice-state";
import type { CustomerStatusFilter } from "@/repositories/customers";

export type LoadFailure = {
  ok: false;
  error: unknown;
  notFound?: boolean;
};

export async function withOrgId(): Promise<
  { ok: true; organizationId: string } | LoadFailure
> {
  try {
    const organizationId = await requireOrganizationId();
    return { ok: true, organizationId };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function loadCustomersPage(input: {
  q: string;
  page: number;
  pageSize: number;
  status: CustomerStatusFilter;
}) {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new CustomerRepository(getDb());
    const result = await repo.list({ organizationId, ...input });
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error };
  }
}

export async function loadCustomerDetail(id: string) {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new CustomerRepository(getDb());
    const detail = await repo.getDetailMetrics(id, organizationId);
    return { ok: true as const, detail };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return { ok: false as const, error, notFound: true };
    }
    return { ok: false as const, error };
  }
}

export async function loadInvoicesPage(input: {
  q: string;
  page: number;
  pageSize: number;
  status: InvoiceStatus | "all";
}) {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new InvoiceRepository(getDb());
    const result = await repo.list({ organizationId, ...input });
    return { ok: true as const, result };
  } catch (error) {
    return { ok: false as const, error };
  }
}

export async function loadInvoiceDetail(id: string) {
  try {
    const organizationId = await requireOrganizationId();
    const repo = new InvoiceRepository(getDb());
    const detail = await repo.getDetail(id, organizationId);
    return { ok: true as const, detail };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return { ok: false as const, error, notFound: true };
    }
    return { ok: false as const, error };
  }
}

export async function loadInvoiceEdit(id: string) {
  try {
    const organizationId = await requireOrganizationId();
    const invoiceRepo = new InvoiceRepository(getDb());
    const detail = await invoiceRepo.getDetail(id, organizationId);
    const customers = await new CustomerRepository(getDb()).listActiveForSelect(
      organizationId,
    );
    return { ok: true as const, detail, customers };
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return { ok: false as const, error, notFound: true };
    }
    return { ok: false as const, error };
  }
}

export async function loadNewInvoice() {
  try {
    const organizationId = await requireOrganizationId();
    const customers = await new CustomerRepository(getDb()).listActiveForSelect(
      organizationId,
    );
    return { ok: true as const, customers };
  } catch (error) {
    return { ok: false as const, error };
  }
}

export async function loadDashboardOverview() {
  try {
    const org = await getActiveOrganization();
    const db = getDb();
    const customerRepo = new CustomerRepository(db);
    const invoiceRepo = new InvoiceRepository(db);

    const [customers, invoices, allInvoices] = await Promise.all([
      customerRepo.list({
        organizationId: org.id,
        status: "active",
        page: 1,
        pageSize: 5,
      }),
      invoiceRepo.list({
        organizationId: org.id,
        status: "all",
        page: 1,
        pageSize: 5,
      }),
      invoiceRepo.listByOrganization(org.id),
    ]);

    return { ok: true as const, org, customers, invoices, allInvoices };
  } catch (error) {
    return { ok: false as const, error };
  }
}

export function isOrgContextError(error: unknown): error is OrgContextError {
  return error instanceof OrgContextError;
}
