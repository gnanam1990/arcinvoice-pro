import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  auditEvents,
  customers,
  invoices,
  paymentIntents,
} from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  customerCreateSchema,
  customerUpdateSchema,
  type CustomerCreateInput,
  type CustomerUpdateInput,
} from "@/lib/validation/schemas";

export type CustomerStatusFilter = "active" | "archived" | "all";

export type CustomerListParams = {
  organizationId: string;
  q?: string;
  status?: CustomerStatusFilter;
  page?: number;
  pageSize?: number;
};

export class CustomerRepository {
  constructor(private readonly db: Database) {}

  private async assertUnique(
    organizationId: string,
    email: string,
    walletAddress: string | null | undefined,
    excludeId?: string,
  ) {
    const emailMatch = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          eq(customers.email, email.toLowerCase()),
          excludeId ? sql`${customers.id} <> ${excludeId}` : undefined,
        ),
      )
      .limit(1);

    if (emailMatch[0]) {
      throw new AppError(
        "A customer with this email already exists in the organization",
        "CONFLICT",
      );
    }

    if (walletAddress) {
      const walletMatch = await this.db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, organizationId),
            eq(customers.walletAddress, walletAddress),
            excludeId ? sql`${customers.id} <> ${excludeId}` : undefined,
          ),
        )
        .limit(1);

      if (walletMatch[0]) {
        throw new AppError(
          "A customer with this wallet address already exists in the organization",
          "CONFLICT",
        );
      }
    }
  }

  async create(input: CustomerCreateInput, actorMemberId?: string | null) {
    const data = customerCreateSchema.parse(input);
    const email = data.email.toLowerCase();
    const wallet = data.walletAddress ?? null;

    await this.assertUnique(data.organizationId, email, wallet);

    const [customer] = await this.db
      .insert(customers)
      .values({
        organizationId: data.organizationId,
        name: data.name,
        email,
        walletAddress: wallet,
        company: data.company ?? null,
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        region: data.region ?? null,
        postalCode: data.postalCode ?? null,
        country: data.country ?? null,
        notes: data.notes ?? null,
        status: "active",
        updatedAt: new Date(),
      })
      .returning();

    if (!customer) throw new AppError("Failed to create customer", "VALIDATION");

    await this.db.insert(auditEvents).values({
      organizationId: data.organizationId,
      actorMemberId: actorMemberId ?? null,
      entityType: "customer",
      entityId: customer.id,
      action: "created",
      summary: `Customer ${customer.name} created`,
      metadata: { email: customer.email },
      updatedAt: new Date(),
    });

    return customer;
  }

  async findByIdForOrg(id: string, organizationId: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, id), eq(customers.organizationId, organizationId)),
      )
      .limit(1);
    return customer ?? null;
  }

  async list(params: CustomerListParams) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const status = params.status ?? "active";

    const filters: SQL[] = [eq(customers.organizationId, params.organizationId)];

    if (status !== "all") {
      filters.push(eq(customers.status, status));
    }

    if (params.q?.trim()) {
      const q = `%${params.q.trim()}%`;
      filters.push(
        or(
          ilike(customers.name, q),
          ilike(customers.email, q),
          ilike(customers.company, q),
          ilike(customers.walletAddress, q),
        )!,
      );
    }

    const where = and(...filters);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(customers)
      .where(where);

    const rows = await this.db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows,
      total: totalRow?.value ?? 0,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil((totalRow?.value ?? 0) / pageSize)),
    };
  }

  async update(
    id: string,
    organizationId: string,
    input: CustomerUpdateInput,
    actorMemberId?: string | null,
  ) {
    const existing = await this.findByIdForOrg(id, organizationId);
    if (!existing) {
      throw new AppError("Customer not found", "NOT_FOUND");
    }

    const data = customerUpdateSchema.parse(input);
    const email = data.email?.toLowerCase() ?? existing.email;
    const wallet =
      data.walletAddress === undefined
        ? existing.walletAddress
        : data.walletAddress;

    await this.assertUnique(organizationId, email, wallet, id);

    const [customer] = await this.db
      .update(customers)
      .set({
        name: data.name ?? existing.name,
        email,
        walletAddress: wallet,
        company:
          data.company === undefined ? existing.company : data.company,
        addressLine1:
          data.addressLine1 === undefined
            ? existing.addressLine1
            : data.addressLine1,
        addressLine2:
          data.addressLine2 === undefined
            ? existing.addressLine2
            : data.addressLine2,
        city: data.city === undefined ? existing.city : data.city,
        region: data.region === undefined ? existing.region : data.region,
        postalCode:
          data.postalCode === undefined
            ? existing.postalCode
            : data.postalCode,
        country: data.country === undefined ? existing.country : data.country,
        notes: data.notes === undefined ? existing.notes : data.notes,
        updatedAt: new Date(),
      })
      .where(
        and(eq(customers.id, id), eq(customers.organizationId, organizationId)),
      )
      .returning();

    await this.db.insert(auditEvents).values({
      organizationId,
      actorMemberId: actorMemberId ?? null,
      entityType: "customer",
      entityId: id,
      action: "updated",
      summary: `Customer ${customer?.name ?? id} updated`,
      metadata: { fields: Object.keys(data) },
      updatedAt: new Date(),
    });

    return customer;
  }

  async archive(
    id: string,
    organizationId: string,
    actorMemberId?: string | null,
  ) {
    const existing = await this.findByIdForOrg(id, organizationId);
    if (!existing) {
      throw new AppError("Customer not found", "NOT_FOUND");
    }
    if (existing.status === "archived") {
      return existing;
    }

    const [customer] = await this.db
      .update(customers)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(customers.id, id), eq(customers.organizationId, organizationId)),
      )
      .returning();

    await this.db.insert(auditEvents).values({
      organizationId,
      actorMemberId: actorMemberId ?? null,
      entityType: "customer",
      entityId: id,
      action: "deleted",
      summary: `Customer ${existing.name} archived`,
      metadata: { archive: true },
      updatedAt: new Date(),
    });

    return customer;
  }

  async getDetailMetrics(customerId: string, organizationId: string) {
    const customer = await this.findByIdForOrg(customerId, organizationId);
    if (!customer) {
      throw new AppError("Customer not found", "NOT_FOUND");
    }

    const customerInvoices = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, customerId),
          eq(invoices.organizationId, organizationId),
        ),
      )
      .orderBy(desc(invoices.createdAt));

    const invoiceCount = customerInvoices.length;
    const outstandingAmount = customerInvoices
      .filter((inv) =>
        ["issued", "partially_paid", "overdue"].includes(inv.status),
      )
      .reduce((sum, inv) => sum + inv.amountDue, 0);

    const invoiceIds = customerInvoices.map((i) => i.id);
    let paymentHistory: (typeof paymentIntents.$inferSelect)[] = [];
    if (invoiceIds.length > 0) {
      paymentHistory = await this.db
        .select()
        .from(paymentIntents)
        .where(
          and(
            eq(paymentIntents.organizationId, organizationId),
            inArray(paymentIntents.invoiceId, invoiceIds),
          ),
        )
        .orderBy(desc(paymentIntents.createdAt));
    }

    return {
      customer,
      invoiceCount,
      outstandingAmount,
      invoices: customerInvoices,
      paymentHistory,
    };
  }

  async listActiveForSelect(organizationId: string) {
    return this.db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        company: customers.company,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          eq(customers.status, "active"),
        ),
      )
      .orderBy(customers.name);
  }
}
