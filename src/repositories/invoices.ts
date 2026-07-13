import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  auditEvents,
  customers,
  invoiceLines,
  invoices,
  paymentIntents,
  receipts,
  type CustomerSnapshot,
  type InvoiceSnapshot,
  type LineItemSnapshot,
} from "@/db/schema";
import {
  calculateInvoiceTotals,
  calculateLineAmount,
  applyPayment as applyPaymentAmounts,
  type MoneyInt,
} from "@/lib/domain/amounts";
import {
  assertCanAcceptPaymentIntent,
  assertInvoiceTransition,
  InvoiceStateError,
  statusAfterPayment,
  type InvoiceStatus,
  INVOICE_STATUSES,
} from "@/lib/domain/invoice-state";
import {
  generatePublicPaymentToken,
  hashToken,
} from "@/lib/domain/public-token";
import { AppError } from "@/lib/errors";
import {
  invoiceCreateSchema,
  invoiceUpdateDraftSchema,
  paymentIntentCreateSchema,
  type InvoiceCreateInput,
  type InvoiceUpdateDraftInput,
  type PaymentIntentCreateInput,
} from "@/lib/validation/schemas";

export type InvoiceListParams = {
  organizationId: string;
  q?: string;
  status?: InvoiceStatus | "all";
  page?: number;
  pageSize?: number;
  customerId?: string;
};

function toAppError(err: unknown): never {
  if (err instanceof AppError) throw err;
  if (err instanceof InvoiceStateError) {
    throw new AppError(err.message, "INVALID_STATE");
  }
  throw err;
}

export class InvoiceRepository {
  constructor(private readonly db: Database) {}

  private async nextInvoiceNumber(organizationId: string): Promise<string> {
    const [row] = await this.db
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));
    const n = (row?.value ?? 0) + 1;
    return `INV-${String(n).padStart(5, "0")}`;
  }

  private buildCustomerSnapshot(
    customer: typeof customers.$inferSelect,
  ): CustomerSnapshot {
    return {
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      walletAddress: customer.walletAddress,
      company: customer.company,
      addressLine1: customer.addressLine1,
      addressLine2: customer.addressLine2,
      city: customer.city,
      region: customer.region,
      postalCode: customer.postalCode,
      country: customer.country,
    };
  }

  async create(input: InvoiceCreateInput, actorMemberId?: string | null) {
    const data = invoiceCreateSchema.parse(input);
    const totals = calculateInvoiceTotals({
      lines: data.lines,
      tax: data.tax,
      discount: data.discount,
    });

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, data.customerId),
          eq(customers.organizationId, data.organizationId),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new AppError("Customer not found", "NOT_FOUND");
    }
    if (customer.status === "archived") {
      throw new AppError("Cannot invoice an archived customer", "INVALID_STATE");
    }

    const number =
      data.number?.trim() ||
      (await this.nextInvoiceNumber(data.organizationId));

    const existingNumber = await this.findByOrgAndNumber(
      data.organizationId,
      number,
    );
    if (existingNumber) {
      throw new AppError(
        `Invoice number ${number} already exists`,
        "CONFLICT",
      );
    }

    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          organizationId: data.organizationId,
          customerId: data.customerId,
          number,
          status: "draft",
          currency: data.currency,
          tokenDecimals: data.tokenDecimals,
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          amountPaid: 0,
          amountDue: totals.total,
          overpaymentAmount: 0,
          hasOverpayment: false,
          issueDate: data.issueDate ?? null,
          dueDate: data.dueDate ?? null,
          notes: data.notes ?? null,
          memo: data.memo ?? null,
          ...(() => {
            const publicPaymentToken = generatePublicPaymentToken();
            return {
              publicPaymentToken,
              publicPaymentTokenHash: hashToken(publicPaymentToken),
            };
          })(),
          issuedSnapshot: null,
          updatedAt: new Date(),
        })
        .returning();

      if (!invoice) throw new AppError("Failed to create invoice");

      const lineRows = data.lines.map((line, index) => ({
        invoiceId: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: calculateLineAmount(line.quantity, line.unitPrice),
        position: line.position ?? index,
        updatedAt: new Date(),
      }));

      const createdLines = await tx
        .insert(invoiceLines)
        .values(lineRows)
        .returning();

      await tx.insert(auditEvents).values({
        organizationId: data.organizationId,
        actorMemberId: actorMemberId ?? null,
        entityType: "invoice",
        entityId: invoice.id,
        action: "created",
        summary: `Invoice ${invoice.number} created as draft`,
        metadata: { number: invoice.number, total: invoice.total },
        updatedAt: new Date(),
      });

      return { invoice, lines: createdLines };
    });
  }

  async findByIdForOrg(id: string, organizationId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.organizationId, organizationId)),
      )
      .limit(1);
    return invoice ?? null;
  }

  async findByOrgAndNumber(organizationId: string, number: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organizationId),
          eq(invoices.number, number),
        ),
      )
      .limit(1);
    return invoice ?? null;
  }

  async findByPublicToken(token: string) {
    const tokenHash = hashToken(token);
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.publicPaymentTokenHash, tokenHash))
      .limit(1);
    return invoice ?? null;
  }

  async list(params: InvoiceListParams) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const status = params.status ?? "all";

    const filters: SQL[] = [eq(invoices.organizationId, params.organizationId)];

    if (status !== "all") {
      if (!(INVOICE_STATUSES as readonly string[]).includes(status)) {
        throw new AppError("Invalid invoice status filter", "VALIDATION");
      }
      filters.push(eq(invoices.status, status));
    }

    if (params.customerId) {
      filters.push(eq(invoices.customerId, params.customerId));
    }

    if (params.q?.trim()) {
      const q = `%${params.q.trim()}%`;
      filters.push(
        or(ilike(invoices.number, q), ilike(invoices.memo, q), ilike(invoices.notes, q))!,
      );
    }

    const where = and(...filters);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(invoices)
      .where(where);

    const rows = await this.db
      .select({
        invoice: invoices,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(where)
      .orderBy(desc(invoices.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map((r) => ({
        ...r.invoice,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
      })),
      total: totalRow?.value ?? 0,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil((totalRow?.value ?? 0) / pageSize)),
    };
  }

  async listLines(invoiceId: string) {
    return this.db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId))
      .orderBy(invoiceLines.position);
  }

  async getDetail(id: string, organizationId: string) {
    const invoice = await this.findByIdForOrg(id, organizationId);
    if (!invoice) {
      throw new AppError("Invoice not found", "NOT_FOUND");
    }

    const lines = await this.listLines(id);
    let customer: typeof customers.$inferSelect | null = null;
    if (invoice.customerId) {
      const [c] = await this.db
        .select()
        .from(customers)
        .where(eq(customers.id, invoice.customerId))
        .limit(1);
      customer = c ?? null;
    }

    const payments = await this.db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.invoiceId, id))
      .orderBy(desc(paymentIntents.createdAt));

    const timeline = await this.db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, organizationId),
          eq(auditEvents.entityType, "invoice"),
          eq(auditEvents.entityId, id),
        ),
      )
      .orderBy(desc(auditEvents.createdAt));

    const invoiceReceipts = await this.db
      .select({
        id: receipts.id,
        number: receipts.number,
        amount: receipts.amount,
        currency: receipts.currency,
        tokenDecimals: receipts.tokenDecimals,
        publicToken: receipts.publicToken,
        issuedAt: receipts.issuedAt,
        snapshot: receipts.snapshot,
      })
      .from(receipts)
      .where(eq(receipts.invoiceId, id))
      .orderBy(desc(receipts.issuedAt));

    return {
      invoice,
      lines,
      customer,
      payments,
      timeline,
      receipts: invoiceReceipts,
    };
  }

  async updateDraft(
    id: string,
    organizationId: string,
    input: InvoiceUpdateDraftInput,
    actorMemberId?: string | null,
  ) {
    try {
      const invoice = await this.findByIdForOrg(id, organizationId);
      if (!invoice) throw new AppError("Invoice not found", "NOT_FOUND");
      if (invoice.status !== "draft") {
        throw new AppError("Only draft invoices can be edited", "INVALID_STATE");
      }

      const data = invoiceUpdateDraftSchema.parse(input);

      if (data.customerId) {
        const [customer] = await this.db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.id, data.customerId),
              eq(customers.organizationId, organizationId),
            ),
          )
          .limit(1);
        if (!customer) throw new AppError("Customer not found", "NOT_FOUND");
        if (customer.status === "archived") {
          throw new AppError(
            "Cannot assign an archived customer",
            "INVALID_STATE",
          );
        }
      }

      return this.db.transaction(async (tx) => {
        let totals = {
          subtotal: invoice.subtotal,
          tax: data.tax ?? invoice.tax,
          discount: data.discount ?? invoice.discount,
          total: invoice.total,
        };

        if (data.lines) {
          totals = calculateInvoiceTotals({
            lines: data.lines,
            tax: data.tax ?? invoice.tax,
            discount: data.discount ?? invoice.discount,
          });

          await tx
            .delete(invoiceLines)
            .where(eq(invoiceLines.invoiceId, id));

          await tx.insert(invoiceLines).values(
            data.lines.map((line, index) => ({
              invoiceId: id,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: calculateLineAmount(line.quantity, line.unitPrice),
              position: line.position ?? index,
              updatedAt: new Date(),
            })),
          );
        } else if (data.tax !== undefined || data.discount !== undefined) {
          const lines = await tx
            .select()
            .from(invoiceLines)
            .where(eq(invoiceLines.invoiceId, id));
          totals = calculateInvoiceTotals({
            lines: lines.map((l) => ({
              quantity: l.quantity,
              unitPrice: l.unitPrice,
            })),
            tax: data.tax ?? invoice.tax,
            discount: data.discount ?? invoice.discount,
          });
        }

        const [updated] = await tx
          .update(invoices)
          .set({
            customerId: data.customerId ?? invoice.customerId,
            currency: data.currency ?? invoice.currency,
            tokenDecimals: data.tokenDecimals ?? invoice.tokenDecimals,
            subtotal: totals.subtotal,
            tax: totals.tax,
            discount: totals.discount,
            total: totals.total,
            amountPaid: 0,
            amountDue: totals.total,
            overpaymentAmount: 0,
            hasOverpayment: false,
            issueDate:
              data.issueDate === undefined ? invoice.issueDate : data.issueDate,
            dueDate:
              data.dueDate === undefined ? invoice.dueDate : data.dueDate,
            notes: data.notes === undefined ? invoice.notes : data.notes,
            memo: data.memo === undefined ? invoice.memo : data.memo,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(invoices.id, id),
              eq(invoices.organizationId, organizationId),
            ),
          )
          .returning();

        await tx.insert(auditEvents).values({
          organizationId,
          actorMemberId: actorMemberId ?? null,
          entityType: "invoice",
          entityId: id,
          action: "updated",
          summary: `Draft invoice ${invoice.number} updated`,
          metadata: { fields: Object.keys(data) },
          updatedAt: new Date(),
        });

        return updated;
      });
    } catch (err) {
      toAppError(err);
    }
  }

  async issue(
    invoiceId: string,
    organizationId: string,
    actorMemberId?: string | null,
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.id, invoiceId),
              eq(invoices.organizationId, organizationId),
            ),
          )
          .limit(1);

        if (!invoice) throw new AppError("Invoice not found", "NOT_FOUND");
        assertInvoiceTransition(invoice.status as InvoiceStatus, "issued");

        if (!invoice.customerId) {
          throw new AppError("Invoice has no customer", "INVALID_STATE");
        }

        const [customer] = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, invoice.customerId))
          .limit(1);

        if (!customer) {
          throw new AppError("Customer not found for snapshot", "NOT_FOUND");
        }

        const lines = await tx
          .select()
          .from(invoiceLines)
          .where(eq(invoiceLines.invoiceId, invoiceId))
          .orderBy(invoiceLines.position);

        if (lines.length === 0) {
          throw new AppError(
            "Cannot issue invoice without line items",
            "INVALID_STATE",
          );
        }

        const lineSnapshots: LineItemSnapshot[] = lines.map((line) => ({
          lineId: line.id,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          amount: line.amount,
          position: line.position,
        }));

        const issuedSnapshot: InvoiceSnapshot = {
          customer: this.buildCustomerSnapshot(customer),
          lines: lineSnapshots,
          capturedAt: new Date().toISOString(),
        };

        const issueDate =
          invoice.issueDate ?? new Date().toISOString().slice(0, 10);

        const [updated] = await tx
          .update(invoices)
          .set({
            status: "issued",
            issuedSnapshot,
            issueDate,
            issuedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId))
          .returning();

        await tx.insert(auditEvents).values({
          organizationId,
          actorMemberId: actorMemberId ?? null,
          entityType: "invoice",
          entityId: invoice.id,
          action: "issued",
          summary: `Invoice ${invoice.number} issued`,
          metadata: {
            from: invoice.status,
            to: "issued",
            snapshotCapturedAt: issuedSnapshot.capturedAt,
          },
          updatedAt: new Date(),
        });

        return updated;
      });
    } catch (err) {
      toAppError(err);
    }
  }

  async cancel(
    invoiceId: string,
    organizationId: string,
    actorMemberId?: string | null,
  ) {
    try {
      return await this.db.transaction(async (tx) => {
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.id, invoiceId),
              eq(invoices.organizationId, organizationId),
            ),
          )
          .limit(1);

        if (!invoice) throw new AppError("Invoice not found", "NOT_FOUND");
        assertInvoiceTransition(invoice.status as InvoiceStatus, "cancelled");

        const [updated] = await tx
          .update(invoices)
          .set({
            status: "cancelled",
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoiceId))
          .returning();

        await tx.insert(auditEvents).values({
          organizationId,
          actorMemberId: actorMemberId ?? null,
          entityType: "invoice",
          entityId: invoice.id,
          action: "cancelled",
          summary: `Invoice ${invoice.number} cancelled`,
          metadata: { from: invoice.status, to: "cancelled" },
          updatedAt: new Date(),
        });

        return updated;
      });
    } catch (err) {
      toAppError(err);
    }
  }

  async duplicate(
    invoiceId: string,
    organizationId: string,
    actorMemberId?: string | null,
  ) {
    const detail = await this.getDetail(invoiceId, organizationId);
    const { invoice, lines } = detail;

    const number = await this.nextInvoiceNumber(organizationId);

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(invoices)
        .values({
          organizationId,
          customerId: invoice.customerId,
          number,
          status: "draft",
          currency: invoice.currency,
          tokenDecimals: invoice.tokenDecimals,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          discount: invoice.discount,
          total: invoice.total,
          amountPaid: 0,
          amountDue: invoice.total,
          overpaymentAmount: 0,
          hasOverpayment: false,
          issueDate: null,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          memo: invoice.memo ? `Copy of ${invoice.number}: ${invoice.memo}` : `Copy of ${invoice.number}`,
          ...(() => {
            const publicPaymentToken = generatePublicPaymentToken();
            return {
              publicPaymentToken,
              publicPaymentTokenHash: hashToken(publicPaymentToken),
            };
          })(),
          issuedSnapshot: null,
          updatedAt: new Date(),
        })
        .returning();

      if (!created) throw new AppError("Failed to duplicate invoice");

      const createdLines = lines.length
        ? await tx
            .insert(invoiceLines)
            .values(
              lines.map((line, index) => ({
                invoiceId: created.id,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                amount: line.amount,
                position: line.position ?? index,
                updatedAt: new Date(),
              })),
            )
            .returning()
        : [];

      await tx.insert(auditEvents).values({
        organizationId,
        actorMemberId: actorMemberId ?? null,
        entityType: "invoice",
        entityId: created.id,
        action: "created",
        summary: `Invoice ${created.number} duplicated from ${invoice.number}`,
        metadata: {
          sourceInvoiceId: invoice.id,
          sourceNumber: invoice.number,
          duplicate: true,
        },
        updatedAt: new Date(),
      });

      return { invoice: created, lines: createdLines };
    });
  }

  async createPaymentIntent(input: PaymentIntentCreateInput) {
    const data = paymentIntentCreateSchema.parse(input);

    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, data.invoiceId))
        .limit(1);

      if (!invoice) throw new AppError("Invoice not found", "NOT_FOUND");
      if (invoice.organizationId !== data.organizationId) {
        throw new AppError("Invoice does not belong to organization", "FORBIDDEN");
      }

      try {
        assertCanAcceptPaymentIntent(invoice.status as InvoiceStatus);
      } catch (err) {
        toAppError(err);
      }

      const [intent] = await tx
        .insert(paymentIntents)
        .values({
          organizationId: data.organizationId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          currency: data.currency,
          tokenDecimals: data.tokenDecimals,
          status: "pending",
          updatedAt: new Date(),
        })
        .returning();

      if (!intent) throw new AppError("Failed to create payment intent");

      await tx.insert(auditEvents).values({
        organizationId: data.organizationId,
        entityType: "payment_intent",
        entityId: intent.id,
        action: "created",
        summary: `Payment intent created for invoice ${invoice.number}`,
        metadata: {
          invoiceId: invoice.id,
          amount: intent.amount,
          status: intent.status,
        },
        updatedAt: new Date(),
      });

      return intent;
    });
  }

  async recordPayment(invoiceId: string, paymentAmount: MoneyInt) {
    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice) throw new AppError("Invoice not found", "NOT_FOUND");

      if (invoice.status === "cancelled" || invoice.status === "draft") {
        throw new AppError(
          `Invoice in status "${invoice.status}" cannot record payments`,
          "INVALID_STATE",
        );
      }

      const balances = applyPaymentAmounts({
        total: invoice.total,
        currentAmountPaid: invoice.amountPaid,
        paymentAmount,
      });

      const nextStatus = statusAfterPayment({
        currentStatus: invoice.status as InvoiceStatus,
        amountDue: balances.amountDue,
        amountPaid: balances.amountPaid,
        total: invoice.total,
      });

      if (nextStatus !== invoice.status) {
        assertInvoiceTransition(invoice.status as InvoiceStatus, nextStatus);
      }

      const [updated] = await tx
        .update(invoices)
        .set({
          amountPaid: balances.amountPaid,
          amountDue: balances.amountDue,
          overpaymentAmount: balances.overpaymentAmount,
          hasOverpayment: balances.hasOverpayment,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId))
        .returning();

      await tx.insert(auditEvents).values({
        organizationId: invoice.organizationId,
        entityType: "invoice",
        entityId: invoice.id,
        action: "payment_recorded",
        summary: `Payment of ${paymentAmount} recorded on ${invoice.number}`,
        metadata: {
          paymentAmount,
          ...balances,
          from: invoice.status,
          to: nextStatus,
        },
        updatedAt: new Date(),
      });

      return updated;
    });
  }

  async listByOrganization(organizationId: string) {
    return this.db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));
  }
}
