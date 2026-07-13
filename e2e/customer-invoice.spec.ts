import { test, expect } from "@playwright/test";

/**
 * End-to-end: create a customer, then create a draft invoice.
 * Requires: app running (playwright webServer), migrated DB, seeded org.
 */
test.describe("Customer and draft invoice", () => {
  test("creates customer and draft invoice", async ({ page }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@example.com`;
    const name = `E2E Customer ${stamp}`;

    await page.goto("/dashboard/customers/new");
    await expect(page.getByRole("heading", { name: "New customer" })).toBeVisible();
    await expect(page.getByTestId("customer-form")).toHaveAttribute(
      "data-hydrated",
      "true",
    );
    await expect(page.getByTestId("customer-submit")).toBeEnabled();

    await page.getByTestId("customer-name").fill(name);
    await page.getByTestId("customer-email").fill(email);
    await page.getByTestId("customer-country").fill("US");
    await page.getByTestId("customer-submit").click();

    await expect(page).toHaveURL(/\/dashboard\/customers\/[0-9a-f-]+/i, {
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.goto("/dashboard/invoices/new");
    await expect(page.getByRole("heading", { name: "Create invoice" })).toBeVisible();

    const customerSelect = page.getByTestId("invoice-customer").first();
    await customerSelect.selectOption({ label: `${name} · ${email}` });
    await page.getByRole("button", { name: "Continue" }).first().click();

    await page.getByTestId("line-desc-0").first().fill("E2E consulting hours");
    await page.getByTestId("line-qty-0").first().fill("2");
    await page.getByTestId("line-price-0").first().fill("150.00");
    await page.getByRole("button", { name: "Continue" }).first().click();

    await page.getByTestId("invoice-due-date").first().fill("2030-12-31");
    await page.getByRole("button", { name: "Continue" }).first().click();

    await page.getByTestId("invoice-save-draft").first().click();

    await expect(page).toHaveURL(/\/dashboard\/invoices\/[0-9a-f-]+/i, {
      timeout: 15_000,
    });
    await expect(page.getByText(/draft/i).first()).toBeVisible();
    await expect(page.getByText("E2E consulting hours")).toBeVisible();
  });
});
