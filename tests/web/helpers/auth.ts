/**
 * Shared auth helpers for web QA.
 *
 * All tests use the same QA account — credentials come from the environment.
 * Call `ensureLoggedOut` at the start of tests that need a fresh session.
 * Call `login` when a test needs an authenticated state to start from.
 */

import { Page, expect } from "@playwright/test";

const EMAIL = process.env.QA_EMAIL ?? "כהן";
const PASSWORD = process.env.QA_PASSWORD ?? "123456";

/** Wipe session storage so the app starts at the login screen. */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto("/");
  // Clear Zustand-persisted store and auth session from localStorage
  await page.evaluate(() => {
    localStorage.removeItem("family-os-store-v2");
    // The auth token key is "familyos_auth_session" on web (ApiAuthService uses AsyncStorage)
    Object.keys(localStorage)
      .filter((k) => k.startsWith("familyos") || k.startsWith("family-os"))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
  // Wait for login screen
  await expect(page.getByTestId("input-email")).toBeVisible({ timeout: 20_000 });
}

/** Fill credentials and submit the login form. Waits for the Today tab to appear. */
export async function login(page: Page, opts?: { email?: string; password?: string }): Promise<void> {
  const email = opts?.email ?? EMAIL;
  const password = opts?.password ?? PASSWORD;

  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("btn-login").click();

  // Wait for the tab bar to appear — confirms we're on the home screen
  await expect(page.getByTestId("tab-today")).toBeVisible({ timeout: 20_000 });
}
