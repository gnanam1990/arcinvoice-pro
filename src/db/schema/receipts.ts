import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { invoices } from "./invoices";
import { paymentIntents } from "./payments";
import { organizations } from "./organizations";

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    paymentIntentId: uuid("payment_intent_id").references(
      () => paymentIntents.id,
      { onDelete: "set null" },
    ),
    number: text("number").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("receipts_org_number_uidx").on(
      table.organizationId,
      table.number,
    ),
    index("receipts_invoice_idx").on(table.invoiceId),
    check("receipts_amount_positive", sql`${table.amount} > 0`),
  ],
);
