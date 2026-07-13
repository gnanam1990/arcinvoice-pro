import { test, expect } from "@playwright/test";
import { config } from "dotenv";
import { createDbClient } from "../src/db/client";
import { invoices, organizations } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { DEMO_ORG_SLUG } from "../src/lib/org/context";

config({ path: ".env.local" });
config({ path: ".env" });

async function getIssuedPublicToken(): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  const { db, sql } = createDbClient();
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, DEMO_ORG_SLUG))
      .limit(1);
    if (!org) return null;
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, org.id))
      .limit(20);
    const issued = (
      await db
        .select()
        .from(invoices)
        .where(eq(invoices.organizationId, org.id))
    ).find((i) =>
      ["issued", "partially_paid", "paid", "overdue"].includes(i.status),
    );
    return issued?.publicPaymentToken ?? inv?.publicPaymentToken ?? null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

test.describe("Public invoice experience", () => {
  test("opens issued invoice, shows print control, and share/copy actions", async ({
    page,
  }) => {
    const token = await getIssuedPublicToken();
    test.skip(!token, "No seeded issued invoice token available");

    await page.goto(`/pay/${token}`);
    await expect(page.getByText("Testnet only")).toBeVisible();
    await expect(page.getByText("Invoice number", { exact: true })).toBeVisible();
    await expect(page.locator("article").getByText(/DEMO-|INV-/).first()).toBeVisible();

    await expect(page.getByRole("button", { name: /Copy secure link/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Print/i })).toBeVisible();

    // Share / copy fallback is present
    await expect(
      page.getByRole("button", { name: /Share|Copy link to share/i }),
    ).toBeVisible();

    // Exercise clipboard copy path
    await page.getByRole("button", { name: /Copy secure link/i }).click();

    await page.goto(`/pay/${token}/print`);
    await expect(page.getByTestId("print-invoice-button")).toBeVisible();
    await expect(page.getByText(/Testnet|Arc Testnet/i).first()).toBeVisible();
  });

  test("public mobile layout is usable", async ({ page }) => {
    const token = await getIssuedPublicToken();
    test.skip(!token, "No seeded issued invoice token available");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/pay/${token}`);

    const article = page.locator("article").first();
    await expect(article).toBeVisible();
    const box = await article.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);

    // Key actions remain available on mobile
    await expect(page.getByRole("button", { name: /Copy secure link/i })).toBeVisible();
    await expect(
      page.getByRole("article").getByText("Amount due", { exact: true }),
    ).toBeVisible();
  });

  test("invalid token shows not found", async ({ page }) => {
    await page.goto("/pay/this-token-is-invalid-and-long-enough-12");
    await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  });
});
