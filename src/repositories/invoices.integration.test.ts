import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDbClient, type DbClient } from "@/db/client";
import { organizations } from "@/db/schema";
import { CustomerRepository } from "@/repositories/customers";
import { InvoiceRepository } from "@/repositories/invoices";
import { AppError } from "@/lib/errors";

config({ path: ".env.local" });
config({ path: ".env" });

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("InvoiceRepository integration", () => {
  let client: DbClient;
  let orgId: string;
  let customerId: string;
  let invoices: InvoiceRepository;

  beforeAll(async () => {
    client = createDbClient();
    const slug = `test-inv-${Date.now()}`;
    const [org] = await client.db
      .insert(organizations)
      .values({
        name: "Test Invoices Org",
        slug,
        merchantWalletAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
        updatedAt: new Date(),
      })
      .returning();
    orgId = org!.id;
    const customers = new CustomerRepository(client.db);
    const customer = await customers.create({
      organizationId: orgId,
      name: "Billable Co",
      email: `billable-${Date.now()}@example.com`,
      country: "US",
    });
    customerId = customer.id;
    invoices = new InvoiceRepository(client.db);
  });

  afterAll(async () => {
    await client.db.delete(organizations).where(eq(organizations.id, orgId));
    await client.sql.end({ timeout: 5 });
  });

  it("creates a draft invoice with integer totals", async () => {
    const { invoice, lines } = await invoices.create({
      organizationId: orgId,
      customerId,
      tax: 100,
      discount: 50,
      lines: [
        { description: "Design", quantity: 2, unitPrice: 1000 },
        { description: "Dev", quantity: 1, unitPrice: 500 },
      ],
    });

    expect(invoice.status).toBe("draft");
    expect(invoice.subtotal).toBe(2500);
    expect(invoice.tax).toBe(100);
    expect(invoice.discount).toBe(50);
    expect(invoice.total).toBe(2550);
    expect(invoice.amountDue).toBe(2550);
    expect(invoice.amountPaid).toBe(0);
    expect(lines).toHaveLength(2);
  });

  it("issues invoice with immutable snapshot", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Retainer", quantity: 1, unitPrice: 10_000 }],
    });

    const issued = await invoices.issue(invoice.id, orgId);
    expect(issued?.status).toBe("issued");
    expect(issued?.issuedSnapshot).toBeTruthy();
    expect(issued?.issuedSnapshot?.customer.email).toContain("@");
    expect(issued?.issuedSnapshot?.lines).toHaveLength(1);
  });

  it("rejects invalid state transitions", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "X", quantity: 1, unitPrice: 100 }],
    });

    await expect(invoices.issue(invoice.id, orgId)).resolves.toBeTruthy();
    await expect(invoices.issue(invoice.id, orgId)).rejects.toMatchObject({
      code: "INVALID_STATE",
    } satisfies Partial<AppError>);
  });

  it("rejects payment intents on cancelled invoices", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Y", quantity: 1, unitPrice: 100 }],
    });
    await invoices.issue(invoice.id, orgId);
    await invoices.cancel(invoice.id, orgId);

    await expect(
      invoices.createPaymentIntent({
        organizationId: orgId,
        invoiceId: invoice.id,
        amount: 50,
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("duplicates an invoice as a new draft", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Dup me", quantity: 3, unitPrice: 200 }],
    });
    const dup = await invoices.duplicate(invoice.id, orgId);
    expect(dup.invoice.status).toBe("draft");
    expect(dup.invoice.id).not.toBe(invoice.id);
    expect(dup.invoice.number).not.toBe(invoice.number);
    expect(dup.lines).toHaveLength(1);
  });

  it("rejects editing non-draft invoices", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Locked", quantity: 1, unitPrice: 100 }],
    });
    await invoices.issue(invoice.id, orgId);
    await expect(
      invoices.updateDraft(invoice.id, orgId, { notes: "nope" }),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });
});
