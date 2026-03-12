import { test as setup, expect } from "@playwright/test";
import { ADMIN_USER } from "./fixtures/test-data";

const AUTH_FILE = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Username").fill(ADMIN_USER.username);
  await page.getByLabel("Password").fill(ADMIN_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Persist auth state for other tests
  await page.context().storageState({ path: AUTH_FILE });
});
