import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";
import { customerStatusEnum } from "./enums";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** Optional settlement wallet (validated format only — no chain logic). */
    walletAddress: text("wallet_address"),
    company: text("company"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    notes: text("notes"),
    status: customerStatusEnum("status").notNull().default("active"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("customers_org_idx").on(table.organizationId),
    index("customers_org_status_idx").on(table.organizationId, table.status),
    uniqueIndex("customers_org_email_uidx").on(
      table.organizationId,
      table.email,
    ),
    // Partial unique: only one non-null wallet per org
    uniqueIndex("customers_org_wallet_uidx")
      .on(table.organizationId, table.walletAddress)
      .where(sql`${table.walletAddress} is not null`),
  ],
);
