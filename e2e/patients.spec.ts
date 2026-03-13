import { test, expect } from "@playwright/test";

test.describe("Patient Management", () => {
  test("displays patient list with table", async ({ page }) => {
    await page.goto("/patients");

    await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Code" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Gender" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Phone" })).toBeVisible();

    // Seed data should populate rows
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("PAT-")).toBeVisible();
  });

  test("searches patients by name", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Search for a seeded patient
    await page.getByPlaceholder(/search/i).fill("John");

    // Wait for debounce + results
    await expect(page.getByText("John")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Doe")).toBeVisible();
  });

  test("navigates to patient detail page", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Click first patient row
    await page.locator("tbody tr").first().click();

    // Should show patient detail page with tabs
    await expect(page.getByText("Demographics")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Medical History")).toBeVisible();
    await expect(page.getByText("Documents")).toBeVisible();
    await expect(page.getByText("Emergency Contacts")).toBeVisible();
  });

  test("registers a new patient", async ({ page }) => {
    await page.goto("/patients/new");

    await expect(page.getByRole("heading", { name: "Register Patient" })).toBeVisible();

    // Fill required fields
    await page.getByLabel("First Name *").fill("TestFirst");
    await page.getByLabel("Last Name *").fill("TestLast");
    await page.getByLabel("Date of Birth *").fill("1990-05-15");
    await page.getByLabel("Gender *").click();
    await page.getByRole("option", { name: "Male" }).click();
    await page.getByLabel("Phone *").fill("+1-555-999-0099");

    // Fill optional fields
    await page.getByLabel("Email").fill("testpatient@email.com");

    // Submit
    await page.getByRole("button", { name: "Register Patient" }).click();

    // Should redirect to patient detail page
    await expect(page.getByText("TestFirst")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("TestLast")).toBeVisible();
    await expect(page.getByText("Demographics")).toBeVisible();
  });

  test("edits an existing patient", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Navigate to first patient detail
    await page.locator("tbody tr").first().click();
    await expect(page.getByText("Demographics")).toBeVisible({ timeout: 10_000 });

    // Click edit button
    await page.getByRole("button", { name: "Edit" }).click();

    // Should show edit form with pre-filled data
    await expect(page.getByRole("heading", { name: "Edit Patient" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Code:")).toBeVisible();

    // Modify address
    const addressField = page.getByLabel("Address");
    await addressField.fill("Updated Test Address 123");

    // Save
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Should redirect back to detail page
    await expect(page.getByText("Updated Test Address 123")).toBeVisible({ timeout: 10_000 });
  });

  test("displays allergies prominently on detail page", async ({ page }) => {
    await page.goto("/patients");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Search for patient with known allergies (John Doe has Penicillin)
    await page.getByPlaceholder(/search/i).fill("John Doe");
    await expect(page.getByText("John")).toBeVisible({ timeout: 5_000 });

    await page.locator("tbody tr").first().click();
    await expect(page.getByText("Demographics")).toBeVisible({ timeout: 10_000 });

    // Allergies should be displayed
    await expect(page.getByText("Allergies:")).toBeVisible();
    await expect(page.getByText("Penicillin")).toBeVisible();
  });
});
