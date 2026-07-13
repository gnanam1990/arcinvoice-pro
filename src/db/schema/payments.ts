import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { invoices } from "./invoices";
import { organizations } from "./organizations";
import {
  onchainPaymentStatusEnum,
  paymentIntentStatusEnum,
} from "./enums";

/**
 * Server-authoritative payment preparation record.
 * Created before any wallet transaction is requested.
 * Does not broadcast or settle payments.
 */
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
    /** Amount in invoice integer base units (server-recalculated). */
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    tokenDecimals: integer("token_decimals").notNull().default(2),
    status: paymentIntentStatusEnum("status").notNull().default("pending"),
    /** Client-supplied key to prevent duplicate active intents. */
    idempotencyKey: text("idempotency_key").notNull(),
    /** Checksummed payer wallet (connected wallet). */
    payerAddress: text("payer_address"),
    /** Checksummed merchant payout from invoice snapshot. */
    recipientAddress: text("recipient_address").notNull(),
    chainId: integer("chain_id").notNull().default(5042002),
    network: text("network").notNull().default("arc-testnet"),
    memo: text("memo"),
    invoiceNumber: text("invoice_number").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Placeholder for future wallet/chain wiring — no tx yet. */
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
    uniqueIndex("payment_intents_idempotency_uidx").on(table.idempotencyKey),
    index("payment_intents_active_lookup_idx").on(
      table.invoiceId,
      table.payerAddress,
      table.amount,
      table.status,
    ),
    check("payment_intents_amount_positive", sql`${table.amount} > 0`),
  ],
);

/**
 * On-chain payment record shell. Stores references only — no wallet execution yet.
 */
export const onchainPayments = pgTable(
  "onchain_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id, { onDelete: "cascade" }),
    network: text("network").notNull().default("arc-testnet"),
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
