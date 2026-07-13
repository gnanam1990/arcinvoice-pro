import { and, eq } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  auditEvents,
  customers,
  invoiceLines,
  invoices,
  paymentIntents,
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
  canAcceptPaymentIntent,
  statusAfterPayment,
  type InvoiceStatus,
} from "@/lib/domain/invoice-state";
import { generatePublicPaymentToken } from "@/lib/domain/public-token";
import {
  invoiceCreateSchema,
  paymentIntentCreateSchema,
  type InvoiceCreateInput,
  type PaymentIntentCreateInput,
} from "@/lib/validation/schemas";

export class InvoiceRepository {
  constructor(private readonly db: Database) {}

  async create(input: InvoiceCreateInput) {
    const data = invoiceCreateSchema.parse(input);
    const totals = calculateInvoiceTotals({
      lines: data.lines,
      tax: data.tax,
      discount: data.discount,
    });

    const customer = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, data.customerId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!customer) {
      throw new Error("Customer not found");
    }
    if (customer.organizationId !== data.organizationId) {
      throw new Error("Customer does not belong to organization");
    }

    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          organizationId: data.organizationId,
          customerId: data.customerId,
          number: data.number,
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
          publicPaymentToken: generatePublicPaymentToken(),
          issuedSnapshot: null,
          updatedAt: new Date(),
        })
        .returning();

      if (!invoice) throw new Error("Failed to create invoice");

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
        entityType: "invoice",
        entityId: invoice.id,
        action: "created",
        summary: `Invoice ${invoice.number} created as draft`,
        metadata: {
          number: invoice.number,
          total: invoice.total,
          demo: false,
        },
        updatedAt: new Date(),
      });

      return { invoice, lines: createdLines };
    });
  }

  async findById(id: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
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
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.publicPaymentToken, token))
      .limit(1);
    return invoice ?? null;
  }

  async listByOrganization(organizationId: string) {
    return this.db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));
  }

  async listLines(invoiceId: string) {
    return this.db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoiceId));
  }

  /**
   * Issue a draft invoice: freezes customer + line snapshot, sets issued status.
   */
  async issue(invoiceId: string, actorMemberId?: string | null) {
    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice) throw new Error("Invoice not found");
      assertInvoiceTransition(invoice.status as InvoiceStatus, "issued");

      if (!invoice.customerId) {
        throw new Error("Invoice has no customer to snapshot");
      }

      const [customer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, invoice.customerId))
        .limit(1);

      if (!customer) throw new Error("Customer not found for snapshot");

      const lines = await tx
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, invoiceId));

      if (lines.length === 0) {
        throw new Error("Cannot issue invoice without line items");
      }

      const customerSnapshot: CustomerSnapshot = {
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        addressLine1: customer.addressLine1,
        addressLine2: customer.addressLine2,
        city: customer.city,
        region: customer.region,
        postalCode: customer.postalCode,
        country: customer.country,
      };

      const lineSnapshots: LineItemSnapshot[] = lines.map((line) => ({
        lineId: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.amount,
        position: line.position,
      }));

      const issuedSnapshot: InvoiceSnapshot = {
        customer: customerSnapshot,
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
        organizationId: invoice.organizationId,
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
  }

  async cancel(invoiceId: string, actorMemberId?: string | null) {
    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice) throw new Error("Invoice not found");
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
        organizationId: invoice.organizationId,
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
  }

  /**
   * Create a payment intent if the invoice status allows it.
   * Cancelled (and other non-payable) invoices are rejected.
   */
  async createPaymentIntent(input: PaymentIntentCreateInput) {
    const data = paymentIntentCreateSchema.parse(input);

    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, data.invoiceId))
        .limit(1);

      if (!invoice) throw new Error("Invoice not found");
      if (invoice.organizationId !== data.organizationId) {
        throw new Error("Invoice does not belong to organization");
      }

      assertCanAcceptPaymentIntent(invoice.status as InvoiceStatus);

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

      if (!intent) throw new Error("Failed to create payment intent");

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

  /**
   * Apply a settled payment amount to invoice balances and status.
   * Overpayments are recorded via overpaymentAmount / hasOverpayment.
   */
  async recordPayment(invoiceId: string, paymentAmount: MoneyInt) {
    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      if (!invoice) throw new Error("Invoice not found");

      if (!canAcceptPaymentIntent(invoice.status as InvoiceStatus) && invoice.status !== "paid") {
        // paid already handled; cancelled/draft blocked
        if (invoice.status === "cancelled") {
          throw new Error("Cancelled invoices cannot accept payments");
        }
      }
      if (invoice.status === "cancelled" || invoice.status === "draft") {
        throw new Error(
          `Invoice in status "${invoice.status}" cannot record payments`,
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
}
