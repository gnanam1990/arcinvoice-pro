import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { customers } from "./customers";
import { invoiceStatusEnum } from "./enums";

/**
 * Immutable customer snapshot captured when an invoice is issued.
 * Stored as JSON so later customer edits do not rewrite issued invoices.
 */
export type CustomerSnapshot = {
  customerId: string;
  name: string;
  email: string;
  walletAddress: string | null;
  company: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
};

/**
 * Immutable line snapshot captured at issue time (alongside live invoice_lines).
 */
export type LineItemSnapshot = {
  lineId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  position: number;
};

export type InvoiceSnapshot = {
  customer: CustomerSnapshot;
  lines: LineItemSnapshot[];
  capturedAt: string;
};

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    number: text("number").notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    /** ISO 4217 currency code or token symbol (e.g. USD, USDC). */
    currency: text("currency").notNull().default("USD"),
    /**
     * Token / currency decimal places for display conversion.
     * Amounts are always stored as integer base units (never floats).
     */
    tokenDecimals: integer("token_decimals").notNull().default(2),
    /** Integer base units — never floating point. */
    subtotal: integer("subtotal").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    amountDue: integer("amount_due").notNull().default(0),
    /**
     * Excess paid beyond `total`. Required whenever amountPaid would exceed total.
     * Zero when there is no overpayment.
     */
    overpaymentAmount: integer("overpayment_amount").notNull().default(0),
    hasOverpayment: boolean("has_overpayment").notNull().default(false),
    issueDate: date("issue_date"),
    dueDate: date("due_date"),
    notes: text("notes"),
    memo: text("memo"),
    /** Random unique public token for payment pages (no auth). */
    publicPaymentToken: text("public_payment_token").notNull(),
    /** Immutable customer + line snapshot after issue; null while draft. */
    issuedSnapshot: jsonb("issued_snapshot").$type<InvoiceSnapshot | null>(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("invoices_org_number_uidx").on(
      table.organizationId,
      table.number,
    ),
    uniqueIndex("invoices_public_payment_token_uidx").on(
      table.publicPaymentToken,
    ),
    index("invoices_org_status_idx").on(table.organizationId, table.status),
    index("invoices_customer_idx").on(table.customerId),
    check("invoices_subtotal_non_negative", sql`${table.subtotal} >= 0`),
    check("invoices_tax_non_negative", sql`${table.tax} >= 0`),
    check("invoices_discount_non_negative", sql`${table.discount} >= 0`),
    check("invoices_total_non_negative", sql`${table.total} >= 0`),
    check("invoices_amount_paid_non_negative", sql`${table.amountPaid} >= 0`),
    check("invoices_amount_due_non_negative", sql`${table.amountDue} >= 0`),
    check(
      "invoices_overpayment_non_negative",
      sql`${table.overpaymentAmount} >= 0`,
    ),
    check(
      "invoices_token_decimals_range",
      sql`${table.tokenDecimals} >= 0 AND ${table.tokenDecimals} <= 18`,
    ),
  ],
);

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    /**
     * Quantity as integer base units (e.g. 1 item = 1, or milli-units).
     * Never floating point.
     */
    quantity: integer("quantity").notNull(),
    /** Unit price in integer currency/token base units. */
    unitPrice: integer("unit_price").notNull(),
    /** Line amount = quantity * unitPrice (integer). */
    amount: integer("amount").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invoice_lines_invoice_idx").on(table.invoiceId),
    check("invoice_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("invoice_lines_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
    check("invoice_lines_amount_non_negative", sql`${table.amount} >= 0`),
  ],
);
