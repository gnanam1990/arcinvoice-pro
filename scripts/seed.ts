/**
 * Seed ArcInvoice Pro with clearly labelled DEMO data.
 *
 * Usage:
 *   pnpm db:seed
 *
 * Requires DATABASE_URL and applied migrations.
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

import { createDbClient } from "../src/db/client";
import {
  auditEvents,
  customers,
  invoiceLines,
  invoices,
  members,
  organizations,
  paymentIntents,
  receipts,
  reminders,
} from "../src/db/schema";
import { calculateInvoiceTotals, calculateLineAmount } from "../src/lib/domain/amounts";
import { generatePublicPaymentToken } from "../src/lib/domain/public-token";

const DEMO = {
  organizationSlug: "demo-northline",
  organizationName: "[DEMO] Northline Studio",
  label: "DEMO DATA — not production",
} as const;

async function main() {
  const { db, sql } = createDbClient();

  try {
  console.log("→ Seeding ArcInvoice Pro demo data…");
  console.log(`  ${DEMO.label}`);

  const existing = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, DEMO.organizationSlug))
    .limit(1);

  if (existing[0]) {
    console.log(
      `→ Organization "${DEMO.organizationSlug}" already exists (${existing[0].id}).`,
    );
    console.log("  Re-run after wiping the database if you need a clean seed.");
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name: DEMO.organizationName,
        slug: DEMO.organizationSlug,
        updatedAt: new Date(),
      })
      .returning();

    if (!org) throw new Error("Failed to insert demo organization");

    const [owner] = await tx
      .insert(members)
      .values({
        organizationId: org.id,
        email: "demo.owner@example.com",
        name: "[DEMO] Alex Owner",
        role: "owner",
        updatedAt: new Date(),
      })
      .returning();

    const customerDefs = [
      {
        name: "[DEMO] Horizon Labs",
        email: "billing@horizon-labs.example",
        company: "[DEMO] Horizon Labs Inc.",
        city: "Austin",
        country: "US",
      },
      {
        name: "[DEMO] Cedar & Co",
        email: "accounts@cedar.example",
        company: "[DEMO] Cedar & Co",
        city: "Portland",
        country: "US",
      },
      {
        name: "[DEMO] Bluebird Media",
        email: "finance@bluebird.example",
        company: "[DEMO] Bluebird Media LLC",
        city: "Brooklyn",
        country: "US",
      },
    ] as const;

    const createdCustomers = await tx
      .insert(customers)
      .values(
        customerDefs.map((c) => ({
          organizationId: org.id,
          name: c.name,
          email: c.email,
          company: c.company,
          city: c.city,
          country: c.country,
          notes: DEMO.label,
          updatedAt: new Date(),
        })),
      )
      .returning();

    type InvoiceSeed = {
      number: string;
      customerIndex: number;
      status: "draft" | "issued" | "partially_paid" | "paid" | "overdue";
      tax: number;
      discount: number;
      issueDate: string | null;
      dueDate: string | null;
      amountPaid: number;
      lines: { description: string; quantity: number; unitPrice: number }[];
      notes: string;
    };

    const invoiceSeeds: InvoiceSeed[] = [
      {
        number: "DEMO-0001",
        customerIndex: 0,
        status: "draft",
        tax: 0,
        discount: 0,
        issueDate: null,
        dueDate: null,
        amountPaid: 0,
        lines: [
          {
            description: "[DEMO] Brand system exploration",
            quantity: 1,
            unitPrice: 320_000,
          },
        ],
        notes: `${DEMO.label} — draft invoice`,
      },
      {
        number: "DEMO-0002",
        customerIndex: 1,
        status: "issued",
        tax: 2_400,
        discount: 0,
        issueDate: "2026-06-01",
        dueDate: "2026-07-01",
        amountPaid: 0,
        lines: [
          {
            description: "[DEMO] Monthly design retainer",
            quantity: 1,
            unitPrice: 480_000,
          },
        ],
        notes: `${DEMO.label} — issued, unpaid`,
      },
      {
        number: "DEMO-0003",
        customerIndex: 2,
        status: "partially_paid",
        tax: 0,
        discount: 5_000,
        issueDate: "2026-05-15",
        dueDate: "2026-06-15",
        amountPaid: 100_000,
        lines: [
          {
            description: "[DEMO] Landing page build",
            quantity: 1,
            unitPrice: 250_000,
          },
          {
            description: "[DEMO] Motion pass",
            quantity: 1,
            unitPrice: 75_000,
          },
        ],
        notes: `${DEMO.label} — partially paid`,
      },
      {
        number: "DEMO-0004",
        customerIndex: 0,
        status: "paid",
        tax: 1_000,
        discount: 0,
        issueDate: "2026-04-01",
        dueDate: "2026-04-30",
        amountPaid: 0, // set to total below
        lines: [
          {
            description: "[DEMO] Icon pack",
            quantity: 2,
            unitPrice: 12_500,
          },
        ],
        notes: `${DEMO.label} — fully paid`,
      },
      {
        number: "DEMO-0005",
        customerIndex: 1,
        status: "overdue",
        tax: 0,
        discount: 0,
        issueDate: "2026-01-01",
        dueDate: "2026-01-31",
        amountPaid: 0,
        lines: [
          {
            description: "[DEMO] Q1 strategy workshop",
            quantity: 1,
            unitPrice: 150_000,
          },
        ],
        notes: `${DEMO.label} — overdue`,
      },
    ];

    const createdInvoices = [];

    for (const seed of invoiceSeeds) {
      const customer = createdCustomers[seed.customerIndex];
      if (!customer) throw new Error("Missing demo customer");

      const totals = calculateInvoiceTotals({
        lines: seed.lines,
        tax: seed.tax,
        discount: seed.discount,
      });

      const amountPaid =
        seed.status === "paid" ? totals.total : seed.amountPaid;
      const amountDue = Math.max(0, totals.total - amountPaid);
      const overpaymentAmount = Math.max(0, amountPaid - totals.total);

      const issued =
        seed.status !== "draft"
          ? {
              customer: {
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
              },
              lines: seed.lines.map((line, index) => ({
                lineId: "00000000-0000-0000-0000-000000000000",
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                amount: calculateLineAmount(line.quantity, line.unitPrice),
                position: index,
              })),
              capturedAt: new Date().toISOString(),
            }
          : null;

      const [invoice] = await tx
        .insert(invoices)
        .values({
          organizationId: org.id,
          customerId: customer.id,
          number: seed.number,
          status: seed.status,
          currency: "USD",
          tokenDecimals: 2,
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          amountPaid,
          amountDue,
          overpaymentAmount,
          hasOverpayment: overpaymentAmount > 0,
          issueDate: seed.issueDate,
          dueDate: seed.dueDate,
          notes: seed.notes,
          memo: DEMO.label,
          publicPaymentToken: generatePublicPaymentToken(),
          issuedSnapshot: issued,
          issuedAt: seed.status === "draft" ? null : new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!invoice) throw new Error("Failed to insert demo invoice");

      const lines = await tx
        .insert(invoiceLines)
        .values(
          seed.lines.map((line, index) => ({
            invoiceId: invoice.id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: calculateLineAmount(line.quantity, line.unitPrice),
            position: index,
            updatedAt: new Date(),
          })),
        )
        .returning();

      // Patch snapshot line IDs for issued invoices
      if (issued) {
        const snapshot = {
          ...issued,
          lines: lines.map((line, index) => ({
            lineId: line.id,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
            position: index,
          })),
        };
        await tx
          .update(invoices)
          .set({ issuedSnapshot: snapshot, updatedAt: new Date() })
          .where(eq(invoices.id, invoice.id));
      }

      createdInvoices.push(invoice);

      await tx.insert(auditEvents).values({
        organizationId: org.id,
        actorMemberId: owner?.id ?? null,
        entityType: "invoice",
        entityId: invoice.id,
        action: "created",
        summary: `[DEMO] Seeded invoice ${invoice.number} (${invoice.status})`,
        metadata: {
          demo: true,
          label: DEMO.label,
          status: invoice.status,
          total: invoice.total,
        },
        updatedAt: new Date(),
      });
    }

    // Demo payment intent on partially paid invoice (no chain logic)
    const partial = createdInvoices.find((i) => i.number === "DEMO-0003");
    if (partial) {
      const [intent] = await tx
        .insert(paymentIntents)
        .values({
          organizationId: org.id,
          invoiceId: partial.id,
          amount: 100_000,
          currency: "USD",
          tokenDecimals: 2,
          status: "settled",
          metadata: JSON.stringify({ demo: true, label: DEMO.label }),
          updatedAt: new Date(),
        })
        .returning();

      if (intent) {
        await tx.insert(receipts).values({
          organizationId: org.id,
          invoiceId: partial.id,
          paymentIntentId: intent.id,
          number: "DEMO-RCT-0001",
          amount: 100_000,
          currency: "USD",
          issuedAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const overdue = createdInvoices.find((i) => i.number === "DEMO-0005");
    if (overdue) {
      await tx.insert(reminders).values({
        invoiceId: overdue.id,
        channel: "email",
        scheduledFor: new Date("2026-02-01T15:00:00.000Z"),
        subject: "[DEMO] Payment reminder",
        body: `${DEMO.label}: friendly reminder for overdue invoice DEMO-0005`,
        updatedAt: new Date(),
      });
    }

    await tx.insert(auditEvents).values({
      organizationId: org.id,
      actorMemberId: owner?.id ?? null,
      entityType: "organization",
      entityId: org.id,
      action: "created",
      summary: `[DEMO] Seed completed for ${org.slug}`,
      metadata: {
        demo: true,
        label: DEMO.label,
        customers: createdCustomers.length,
        invoices: createdInvoices.length,
      },
      updatedAt: new Date(),
    });

    return {
      org,
      owner,
      customers: createdCustomers,
      invoices: createdInvoices,
    };
  });

  console.log("✓ Demo seed complete");
  console.log(`  Organization: ${result.org.name} (${result.org.id})`);
  console.log(`  Members:      1`);
  console.log(`  Customers:    ${result.customers.length}`);
  console.log(`  Invoices:     ${result.invoices.length}`);
  console.log(`  Label:        ${DEMO.label}`);
  console.log("");
  console.log("  All seeded records are DEMO DATA and unsafe for production use.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
