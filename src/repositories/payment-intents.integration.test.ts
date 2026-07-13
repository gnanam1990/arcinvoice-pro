import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDbClient, type DbClient } from "@/db/client";
import { organizations } from "@/db/schema";
import { CustomerRepository } from "@/repositories/customers";
import { InvoiceRepository } from "@/repositories/invoices";
import { PaymentIntentRepository } from "@/repositories/payment-intents";
import { AppError } from "@/lib/errors";

config({ path: ".env.local" });
config({ path: ".env" });

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("PaymentIntent preparation", () => {
  let client: DbClient;
  let orgId: string;
  let customerId: string;
  let invoices: InvoiceRepository;
  let payments: PaymentIntentRepository;
  const merchant = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";

  beforeAll(async () => {
    client = createDbClient();
    const slug = `test-pay-${Date.now()}`;
    const [org] = await client.db
      .insert(organizations)
      .values({
        name: "Pay Prep Org",
        slug,
        merchantWalletAddress: merchant,
        updatedAt: new Date(),
      })
      .returning();
    orgId = org!.id;
    const customer = await new CustomerRepository(client.db).create({
      organizationId: orgId,
      name: "Payer Co",
      email: `pay-${Date.now()}@example.com`,
      country: "US",
    });
    customerId = customer.id;
    invoices = new InvoiceRepository(client.db);
    payments = new PaymentIntentRepository(client.db);
  });

  afterAll(async () => {
    await client.db.delete(organizations).where(eq(organizations.id, orgId));
    await client.sql.end({ timeout: 5 });
  });

  async function issuedInvoice(opts?: {
    amount?: number;
    allowPartial?: boolean;
  }) {
    const unit = opts?.amount ?? 10_000;
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      allowPartialPayments: opts?.allowPartial ?? true,
      lines: [{ description: "Service", quantity: 1, unitPrice: unit }],
    });
    await invoices.issue(invoice.id, orgId);
    const full = await invoices.findByIdForOrg(invoice.id, orgId);
    return full!;
  }

  it("prepares intent with server-side amount and merchant snapshot", async () => {
    const invoice = await issuedInvoice({ amount: 5000 });
    const view = await payments.preparePayment(
      {
        publicToken: invoice.publicPaymentToken,
        payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
        idempotencyKey: `k-${invoice.id}-1`,
      },
      "test-ip",
    );
    expect(view.status).toBe("ready");
    expect(view.amount).toBe(5000);
    expect(view.recipientAddress.toLowerCase()).toBe(merchant.toLowerCase());
    expect(view.chainId).toBe(5042002);
    expect(view.invoiceNumber).toBe(invoice.number);
    expect(view.asset).toBe("USDC");
  });

  it("is idempotent for the same key", async () => {
    const invoice = await issuedInvoice({ amount: 2500 });
    const key = `idem-${invoice.id}`;
    const a = await payments.preparePayment(
      {
        publicToken: invoice.publicPaymentToken,
        payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
        idempotencyKey: key,
      },
      "test-ip",
    );
    const b = await payments.preparePayment(
      {
        publicToken: invoice.publicPaymentToken,
        payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
        idempotencyKey: key,
      },
      "test-ip",
    );
    expect(a.id).toBe(b.id);
  });

  it("blocks draft invoices", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Draft", quantity: 1, unitPrice: 100 }],
    });
    await expect(
      payments.preparePayment(
        {
          publicToken: invoice.publicPaymentToken,
          payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
          idempotencyKey: `draft-${invoice.id}`,
        },
        "test-ip",
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" } satisfies Partial<AppError>);
  });

  it("blocks amount over due and partial when disallowed", async () => {
    const invoice = await issuedInvoice({ amount: 1000, allowPartial: false });
    await expect(
      payments.preparePayment(
        {
          publicToken: invoice.publicPaymentToken,
          payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
          idempotencyKey: `over-${invoice.id}`,
          requestedAmount: 2000,
        },
        "test-ip",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(
      payments.preparePayment(
        {
          publicToken: invoice.publicPaymentToken,
          payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
          idempotencyKey: `part-${invoice.id}`,
          requestedAmount: 500,
        },
        "test-ip",
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("preserves merchant snapshot when org wallet changes", async () => {
    const invoice = await issuedInvoice({ amount: 3000 });
    const snapBefore = invoice.issuedSnapshot?.merchant?.walletAddress;
    expect(snapBefore?.toLowerCase()).toBe(merchant.toLowerCase());

    await client.db
      .update(organizations)
      .set({
        merchantWalletAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    const view = await payments.preparePayment(
      {
        publicToken: invoice.publicPaymentToken,
        payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
        idempotencyKey: `snap-${invoice.id}`,
      },
      "test-ip",
    );
    expect(view.recipientAddress.toLowerCase()).toBe(merchant.toLowerCase());
    expect(view.recipientAddress.toLowerCase()).not.toBe(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    );
  });
});
