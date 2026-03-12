import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("displays dashboard heading and welcome text", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Welcome to the Hospital Management System")).toBeVisible();
  });

  test("displays stat cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Total Patients")).toBeVisible();
    await expect(page.getByText("Appointments Today")).toBeVisible();
    await expect(page.getByText("Bed Occupancy")).toBeVisible();
    await expect(page.getByText("Pending Lab Results")).toBeVisible();
  });

  test("displays sidebar navigation with all modules", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("HMS")).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Patients" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Appointments" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Billing" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Pharmacy" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Laboratory" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Ward Management" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Staff" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Reports" })).toBeVisible();
  });

  test("sidebar links have correct href attributes", async ({ page }) => {
    await page.goto("/");

    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Patients" })).toHaveAttribute(
      "href",
      "/patients",
    );
    await expect(sidebar.getByRole("link", { name: "Appointments" })).toHaveAttribute(
      "href",
      "/appointments",
    );
    await expect(sidebar.getByRole("link", { name: "Billing" })).toHaveAttribute(
      "href",
      "/billing",
    );
  });

  test("shows header with system title", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Hospital Management System").first()).toBeVisible();
  });
});
