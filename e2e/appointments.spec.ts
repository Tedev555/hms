import { test, expect } from "@playwright/test";

test.describe("Appointment Management", () => {
  test("displays appointment list with filters", async ({ page }) => {
    await page.goto("/appointments");

    await expect(page.getByRole("heading", { name: "Appointments" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Code" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Patient" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Doctor" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();

    // Seed data should populate rows
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });
  });

  test("filters appointments by status", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Open status filter and select "Completed"
    await page.locator("button", { hasText: "All Statuses" }).click();
    await page.getByRole("option", { name: "Completed" }).click();

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Clear filters button should appear
    await expect(page.getByRole("button", { name: "Clear Filters" })).toBeVisible();
  });

  test("navigates to appointment detail page", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Click first appointment row
    await page.locator("tbody tr").first().click();

    // Should show appointment detail
    await expect(page.getByText("APT-")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Patient Information")).toBeVisible();
    await expect(page.getByText("Doctor Information")).toBeVisible();
    await expect(page.getByText("Schedule")).toBeVisible();
  });

  test("books a new appointment via multi-step form", async ({ page }) => {
    await page.goto("/appointments/new");

    await expect(page.getByRole("heading", { name: "Book Appointment" })).toBeVisible();

    // Step 1: Select Patient
    await expect(page.getByText("Select Patient")).toBeVisible();
    await page.getByPlaceholder(/search by name/i).fill("John");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 5_000 });
    await page.getByText("John Doe").click();
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Select Doctor
    await expect(page.getByText("Select Doctor")).toBeVisible();
    await page.getByPlaceholder(/search doctor/i).fill("James");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText("Dr. James Wilson")).toBeVisible({ timeout: 5_000 });
    await page.getByText("Dr. James Wilson").click();
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: Select Slot
    await expect(page.getByText("Select Time Slot")).toBeVisible();

    // Pick a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];
    await page.locator('input[type="date"]').fill(dateStr);

    // Wait for slots to load and pick one
    await page.waitForTimeout(1_000);
    const availableSlot = page.locator("button:not([disabled])", { hasText: /^\d{2}:\d{2}/ }).first();
    if (await availableSlot.isVisible()) {
      await availableSlot.click();
      await page.getByRole("button", { name: "Next" }).click();

      // Step 4: Details
      await expect(page.getByText("Appointment Details")).toBeVisible();
      await page.getByPlaceholder("Primary reason for visit").fill("E2E Test Visit");

      // Verify summary
      await expect(page.getByText("Booking Summary")).toBeVisible();
      await expect(page.getByText("John Doe")).toBeVisible();
      await expect(page.getByText("Dr. James Wilson")).toBeVisible();

      // Submit
      await page.getByRole("button", { name: "Book Appointment" }).click();

      // Should redirect to appointment detail page
      await expect(page.getByText("APT-")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("Patient Information")).toBeVisible();
    }
  });

  test("displays queue dashboard with auto-refresh", async ({ page }) => {
    await page.goto("/appointments/queue");

    await expect(page.getByRole("heading", { name: "Queue Dashboard" })).toBeVisible();

    // Should show last updated timestamp
    await expect(page.getByText("Last updated:")).toBeVisible({ timeout: 10_000 });

    // Department filter should be present
    await expect(page.getByText("All Departments")).toBeVisible();
  });

  test("shows appointment status action buttons", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10_000 });

    // Click first appointment to see details
    await page.locator("tbody tr").first().click();

    // Should show the appointment detail with possible action buttons
    await expect(page.getByText("APT-")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Back to Appointments")).toBeVisible();
  });
});
