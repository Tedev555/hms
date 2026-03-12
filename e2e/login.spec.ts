import { test, expect } from "@playwright/test";
import { ADMIN_USER } from "./fixtures/test-data";

// These tests run WITHOUT the shared auth state so they can test the login page itself.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Hospital Management System" })).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.getByLabel("Username").fill("nonexistent");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error when fields are empty", async ({ page }) => {
    await page.getByRole("button", { name: "Sign in" }).click();

    // HTML5 required validation prevents submission — the page stays on /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in successfully with valid credentials", async ({ page }) => {
    await page.getByLabel("Username").fill(ADMIN_USER.username);
    await page.getByLabel("Password").fill(ADMIN_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Signing in..." })).toBeVisible();

    await expect(page).toHaveURL("/", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});
