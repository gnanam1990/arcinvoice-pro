import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDbClient, type DbClient } from "@/db/client";
import { organizations } from "@/db/schema";
import { CustomerRepository } from "@/repositories/customers";
import { InvoiceRepository } from "@/repositories/invoices";
import { ReceiptRepository } from "@/repositories/receipts";
import { onchainPayments, paymentIntents } from "@/db/schema";
import { isPublicViewableStatus } from "@/lib/public/invoice-dto";
import { hashToken } from "@/lib/domain/public-token";
import { tokensMatch } from "@/lib/security/tokens";

config({ path: ".env.local" });
config({ path: ".env" });

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("Public invoice & receipt integration", () => {
  let client: DbClient;
  let orgId: string;
  let customerId: string;
  let invoices: InvoiceRepository;
  let receipts: ReceiptRepository;

  beforeAll(async () => {
    client = createDbClient();
    const slug = `test-pub-${Date.now()}`;
    const [org] = await client.db
      .insert(organizations)
      .values({
        name: "Public Test Org",
        slug,
        merchantWalletAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
        updatedAt: new Date(),
      })
      .returning();
    orgId = org!.id;
    const customer = await new CustomerRepository(client.db).create({
      organizationId: orgId,
      name: "Public Customer",
      email: `pub-${Date.now()}@example.com`,
      country: "US",
    });
    customerId = customer.id;
    invoices = new InvoiceRepository(client.db);
    receipts = new ReceiptRepository(client.db);
  });

  afterAll(async () => {
    await client.db.delete(organizations).where(eq(organizations.id, orgId));
    await client.sql.end({ timeout: 5 });
  });

  it("stores unique public tokens with hashes", async () => {
    const a = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "A", quantity: 1, unitPrice: 100 }],
    });
    const b = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "B", quantity: 1, unitPrice: 100 }],
    });
    expect(a.invoice.publicPaymentToken).not.toBe(b.invoice.publicPaymentToken);
    expect(a.invoice.publicPaymentTokenHash).toBe(
      hashToken(a.invoice.publicPaymentToken),
    );
    expect(
      tokensMatch(a.invoice.publicPaymentToken, a.invoice.publicPaymentToken),
    ).toBe(true);
  });

  it("blocks draft and cancelled from public viewable set", async () => {
    expect(isPublicViewableStatus("draft")).toBe(false);
    expect(isPublicViewableStatus("cancelled")).toBe(false);
  });

  it("finds issued invoice by public token hash", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Issued item", quantity: 1, unitPrice: 500 }],
    });
    await invoices.issue(invoice.id, orgId);
    const found = await invoices.findByPublicToken(invoice.publicPaymentToken);
    expect(found?.id).toBe(invoice.id);
    expect(found?.status).toBe("issued");
    expect(found?.notes).toBeDefined(); // internal still has notes
  });

  it("creates immutable receipt only after settled onchain payment", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      lines: [{ description: "Pay me", quantity: 1, unitPrice: 1000 }],
    });
    await invoices.issue(invoice.id, orgId);

    const [intent] = await client.db
      .insert(paymentIntents)
      .values({
        organizationId: orgId,
        invoiceId: invoice.id,
        amount: 400,
        currency: "USD",
        tokenDecimals: 2,
        status: "settled",
        updatedAt: new Date(),
      })
      .returning();

    await expect(
      receipts.createFromSettledOnchainPayment("00000000-0000-0000-0000-000000000000"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [pendingChain] = await client.db
      .insert(onchainPayments)
      .values({
        paymentIntentId: intent!.id,
        network: "arc-testnet",
        txHash: "0xpending",
        amount: 400,
        status: "pending",
        updatedAt: new Date(),
      })
      .returning();

    await expect(
      receipts.createFromSettledOnchainPayment(pendingChain!.id),
    ).rejects.toMatchObject({ code: "INVALID_STATE" });

    const [settled] = await client.db
      .insert(onchainPayments)
      .values({
        paymentIntentId: intent!.id,
        network: "arc-testnet",
        txHash: "0xsettledhash",
        amount: 400,
        status: "settled",
        payerAddress: "0xdddddddddddddddddddddddddddddddddddddddd",
        settledAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const receipt = await receipts.createFromSettledOnchainPayment(settled!.id);
    expect(receipt.number).toMatch(/^RCT-/);
    expect(receipt.snapshot.txHash).toBe("0xsettledhash");
    expect(receipt.snapshot.invoiceNumber).toBe(invoice.number);
    expect(receipt.publicTokenHash).toBe(hashToken(receipt.publicToken));

    // Immutability: re-create returns same receipt (idempotent)
    const again = await receipts.createFromSettledOnchainPayment(settled!.id);
    expect(again.id).toBe(receipt.id);
    expect(again.snapshot.capturedAt).toBe(receipt.snapshot.capturedAt);

    const byToken = await receipts.findByPublicToken(receipt.publicToken);
    expect(byToken?.receipt.id).toBe(receipt.id);
    // Private org fields not needed on public token lookup payload beyond name
    expect(byToken?.merchantName).toBe("Public Test Org");
  });

  it("public DTO helpers never expose private notes field shape", async () => {
    const { invoice } = await invoices.create({
      organizationId: orgId,
      customerId,
      notes: "PRIVATE INTERNAL NOTE",
      memo: "Public memo",
      lines: [{ description: "X", quantity: 1, unitPrice: 50 }],
    });
    await invoices.issue(invoice.id, orgId);
    const found = await invoices.findByPublicToken(invoice.publicPaymentToken);
    // Internal row still has notes — public loader must omit them
    expect(found?.notes).toBe("PRIVATE INTERNAL NOTE");
    expect(found?.memo).toBe("Public memo");
    // Public view construction is tested in unit tests; ensure snapshot has no notes key
    expect(found?.issuedSnapshot).not.toHaveProperty("notes");
  });
});
