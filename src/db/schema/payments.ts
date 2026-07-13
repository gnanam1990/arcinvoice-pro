import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { invoices } from "./invoices";
import { organizations } from "./organizations";
import {
  onchainPaymentStatusEnum,
  paymentIntentStatusEnum,
} from "./enums";

export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    tokenDecimals: integer("token_decimals").notNull().default(2),
    status: paymentIntentStatusEnum("status").notNull().default("pending"),
    /** Placeholder for future wallet/chain wiring — no logic yet. */
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_intents_invoice_idx").on(table.invoiceId),
    index("payment_intents_org_idx").on(table.organizationId),
    index("payment_intents_status_idx").on(table.status),
    check("payment_intents_amount_positive", sql`${table.amount} > 0`),
  ],
);

/**
 * On-chain payment record shell. Stores references only — no wallet or tx logic.
 */
export const onchainPayments = pgTable(
  "onchain_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    network: text("network").notNull().default("arc-testnet"),
    /** Optional future tx hash — not populated by wallet execution yet. */
    txHash: text("tx_hash"),
    amount: integer("amount").notNull(),
    status: onchainPaymentStatusEnum("status").notNull().default("pending"),
    confirmations: integer("confirmations").notNull().default(0),
    payerAddress: text("payer_address"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("onchain_payments_intent_idx").on(table.paymentIntentId),
    check("onchain_payments_amount_positive", sql`${table.amount} > 0`),
    check(
      "onchain_payments_confirmations_non_negative",
      sql`${table.confirmations} >= 0`,
    ),
  ],
);
