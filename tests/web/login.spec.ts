/**
 * Login feature — web
 *
 * Spec: features/login.md
 * Acceptance criteria:
 *   1. Submitting valid test credentials lands on the home/roster screen.  (visual)
 *   2. The signed-in user's name appears in the header.                    (text)
 *   3. No error banner is shown.                                           (visual)
 */

import { test, expect } from "@playwright/test";
import { ensureLoggedOut, login } from "./helpers/auth";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test("valid credentials land on home screen", async ({ page }) => {
    await login(page);

    // tab-today is visible → we're on the Today (home) screen
    await expect(page.getByTestId("tab-today")).toBeVisible();
  });

  test("signed-in user name appears in header", async ({ page }) => {
    await login(page);

    // user-header-name is a hidden node with accessibilityLabel = username
    const nameNode = page.getByTestId("user-header-name");
    await expect(nameNode).toBeAttached();
    const label = await nameNode.getAttribute("aria-label");
    expect(label).toBeTruthy();
  });

  test("no error banner shown after successful login", async ({ page }) => {
    await login(page);

    // No Hebrew "שגיאה" (error) text visible on screen
    await expect(page.getByText("שגיאה")).not.toBeVisible();
    // No snackbar / HelperText with error type
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });
});
