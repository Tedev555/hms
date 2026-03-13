import { test, expect } from "@playwright/test";

test.describe("Billing & Invoices", () => {
  test("displays invoice list with filters", async ({ page }) => {
    await page.goto("/billing");

    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Invoice #" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Patient" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();

    // Seed data should populate rows
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });
  });

  test("filters invoices by status", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Open status filter
    await page.locator("button", { hasText: "All Statuses" }).click();
    await page.getByRole("option", { name: "Draft" }).click();

    await page.waitForTimeout(500);

    // Clear filters should be visible
    await expect(page.getByRole("button", { name: "Clear Filters" })).toBeVisible();
  });

  test("creates a new invoice with line items", async ({ page }) => {
    await page.goto("/billing/new");

    await expect(page.getByRole("heading", { name: "Create Invoice" })).toBeVisible();

    // Search and select patient
    await page.getByPlaceholder(/search patients/i).fill("John");
    await page.waitForTimeout(500);
    const patientResult = page.getByText("John Doe").first();
    await expect(patientResult).toBeVisible({ timeout: 5_000 });
    await patientResult.click();

    // Verify patient is selected
    await expect(page.getByText("John Doe")).toBeVisible();

    // Fill first line item
    await page.getByPlaceholder("Item description").first().fill("Consultation Fee");
    await page.locator('input[type="number"]').nth(0).fill("1"); // qty
    await page.locator('input[type="number"]').nth(1).fill("500"); // price

    // Add another item
    await page.getByRole("button", { name: "Add Item" }).click();
    await page.getByPlaceholder("Item description").nth(1).fill("Lab Work");
    await page.locator('input[type="number"]').nth(2).fill("2"); // qty
    await page.locator('input[type="number"]').nth(3).fill("150"); // price

    // Verify live total calculation
    await expect(page.getByText("800.00")).toBeVisible();

    // Submit
    await page.getByRole("button", { name: "Create Invoice" }).click();

    // Should redirect to invoice detail page
    await expect(page.getByText("INV-")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Line Items")).toBeVisible();
    await expect(page.getByText("Consultation Fee")).toBeVisible();
    await expect(page.getByText("Lab Work")).toBeVisible();
  });

  test("navigates to invoice detail page", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Click first invoice
    await page.locator("tbody tr").first().click();

    // Should show invoice detail
    await expect(page.getByText("INV-")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Line Items")).toBeVisible();
    await expect(page.getByText("Summary")).toBeVisible();
    await expect(page.getByText("Subtotal:")).toBeVisible();
    await expect(page.getByText("Total:")).toBeVisible();
  });

  test("issues a draft invoice", async ({ page }) => {
    // First create a new invoice to ensure we have a draft
    await page.goto("/billing/new");
    await page.getByPlaceholder(/search patients/i).fill("Maria");
    await page.waitForTimeout(500);
    await page.getByText("Maria Garcia").first().click();

    await page.getByPlaceholder("Item description").first().fill("Test Service");
    await page.locator('input[type="number"]').nth(0).fill("1");
    await page.locator('input[type="number"]').nth(1).fill("100");

    await page.getByRole("button", { name: "Create Invoice" }).click();
    await expect(page.getByText("INV-")).toBeVisible({ timeout: 10_000 });

    // Should be draft status with Issue button
    await expect(page.getByText("Draft")).toBeVisible();
    await expect(page.getByRole("button", { name: "Issue Invoice" })).toBeVisible();

    // Issue the invoice
    await page.getByRole("button", { name: "Issue Invoice" }).click();

    // Confirm in dialog
    await expect(page.getByText("This will mark the invoice as issued")).toBeVisible();
    await page.getByRole("button", { name: "Issue Invoice" }).nth(1).click();

    // Status should change to Issued
    await expect(page.getByText("Issued")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("link", { name: "Record Payment" })).toBeVisible();
  });

  test("records a payment against an issued invoice", async ({ page }) => {
    // Create and issue a new invoice
    await page.goto("/billing/new");
    await page.getByPlaceholder(/search patients/i).fill("David");
    await page.waitForTimeout(500);
    await page.getByText("David Kim").first().click();

    await page.getByPlaceholder("Item description").first().fill("Payment Test Service");
    await page.locator('input[type="number"]').nth(0).fill("1");
    await page.locator('input[type="number"]').nth(1).fill("200");

    await page.getByRole("button", { name: "Create Invoice" }).click();
    await expect(page.getByText("INV-")).toBeVisible({ timeout: 10_000 });

    // Issue it
    await page.getByRole("button", { name: "Issue Invoice" }).click();
    await page.getByRole("button", { name: "Issue Invoice" }).nth(1).click();
    await expect(page.getByText("Issued")).toBeVisible({ timeout: 5_000 });

    // Go to payment page
    await page.getByRole("link", { name: "Record Payment" }).click();

    await expect(page.getByRole("heading", { name: "Record Payment" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Outstanding Balance:")).toBeVisible();

    // Select payment method
    await page.getByLabel("Payment Method").click();
    await page.getByRole("option", { name: "Cash" }).click();

    // Submit payment (amount should be pre-filled with outstanding balance)
    await page.getByRole("button", { name: "Record Payment" }).click();

    // Should redirect to invoice detail
    await expect(page.getByText("Payment History")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Cash")).toBeVisible();
  });
});
