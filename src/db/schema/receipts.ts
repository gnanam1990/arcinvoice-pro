import {
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
import { invoices } from "./invoices";
import { onchainPayments, paymentIntents } from "./payments";
import { organizations } from "./organizations";

/**
 * Immutable receipt payload captured at creation time.
 * Never mutated after insert — edits create a new receipt if needed.
 */
export type ReceiptSnapshot = {
  invoiceNumber: string;
  amount: number;
  currency: string;
  asset: string;
  tokenDecimals: number;
  network: string;
  txHash: string | null;
  finalizedAt: string;
  payerAddress: string | null;
  merchantAddress: string | null;
  memo: string | null;
  remainingBalance: number;
  paymentIntentId: string | null;
  onchainPaymentId: string | null;
  capturedAt: string;
};

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
    onchainPaymentId: uuid("onchain_payment_id").references(
      () => onchainPayments.id,
      { onDelete: "set null" },
    ),
    number: text("number").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    tokenDecimals: integer("token_decimals").notNull().default(2),
    /** Random unique public token for /receipt/[token]. */
    publicToken: text("public_token").notNull(),
    publicTokenHash: text("public_token_hash").notNull(),
    /** Frozen snapshot — do not update after insert. */
    snapshot: jsonb("snapshot").$type<ReceiptSnapshot>().notNull(),
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
    uniqueIndex("receipts_public_token_uidx").on(table.publicToken),
    uniqueIndex("receipts_public_token_hash_uidx").on(table.publicTokenHash),
    index("receipts_invoice_idx").on(table.invoiceId),
    check("receipts_amount_positive", sql`${table.amount} > 0`),
  ],
);
