import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDbClient, type DbClient } from "@/db/client";
import { organizations } from "@/db/schema";
import { CustomerRepository } from "@/repositories/customers";
import { AppError } from "@/lib/errors";

config({ path: ".env.local" });
config({ path: ".env" });

const hasDb = Boolean(process.env.DATABASE_URL);

describe.runIf(hasDb)("CustomerRepository integration", () => {
  let client: DbClient;
  let orgId: string;
  let repo: CustomerRepository;
  const slug = `test-cust-${Date.now()}`;

  beforeAll(async () => {
    client = createDbClient();
    const [org] = await client.db
      .insert(organizations)
      .values({
        name: "Test Customers Org",
        slug,
        updatedAt: new Date(),
      })
      .returning();
    orgId = org!.id;
    repo = new CustomerRepository(client.db);
  });

  afterAll(async () => {
    await client.db
      .delete(organizations)
      .where(eq(organizations.id, orgId));
    await client.sql.end({ timeout: 5 });
  });

  it("creates a customer and prevents duplicate email", async () => {
    const created = await repo.create({
      organizationId: orgId,
      name: "Ada Lovelace",
      email: "ada@example.com",
      country: "US",
      walletAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });

    expect(created.id).toBeTruthy();
    expect(created.email).toBe("ada@example.com");

    await expect(
      repo.create({
        organizationId: orgId,
        name: "Ada 2",
        email: "ada@example.com",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" } satisfies Partial<AppError>);
  });

  it("prevents duplicate wallet within organization", async () => {
    await repo.create({
      organizationId: orgId,
      name: "Wallet One",
      email: "w1@example.com",
      walletAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    await expect(
      repo.create({
        organizationId: orgId,
        name: "Wallet Two",
        email: "w2@example.com",
        walletAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("archives a customer", async () => {
    const c = await repo.create({
      organizationId: orgId,
      name: "Archive Me",
      email: "archive-me@example.com",
    });
    const archived = await repo.archive(c.id, orgId);
    expect(archived?.status).toBe("archived");
  });

  it("lists with search and pagination", async () => {
    const result = await repo.list({
      organizationId: orgId,
      q: "Ada",
      status: "all",
      page: 1,
      pageSize: 10,
    });
    expect(result.items.some((c) => c.email === "ada@example.com")).toBe(true);
  });
});
