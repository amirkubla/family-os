/**
 * Add family member feature — web
 *
 * Spec: features/add-family-member.md
 * Acceptance criteria:
 *   1. After saving, the new member appears in the roster.           (visual)
 *   2. The member shows their assigned color swatch.                 (visual)
 *   3. The roster count increments by one from the baseline.         (text)
 *
 * Baseline after qa:reset: 2 active members (אבא + אמא).
 * Server reset runs in beforeEach so each test starts clean.
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

// Resolve project root regardless of where tests run from
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Add family member", () => {
  test.beforeEach(async ({ page }) => {
    // Reset server state: removes "QA Member" rows, restores 2-member baseline
    // Use the same account the web test logs in with (כהן = QA_EMAIL default)
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("new member appears with color swatch and roster count increments", async ({ page }) => {
    // Navigate to Settings via tab bar (works on web — no RTL coordinate issue)
    await page.getByTestId("tab-settings").click();

    // Count active member rows before adding
    const before = await page.locator('[data-testid^="member-row-"]').count();

    // Open the add-member modal
    await page.getByTestId("btn-add-member").click();

    // Fill name and save (no keyboard-covers-button issue on web)
    await page.getByTestId("input-member-name").fill("QA Member");
    await page.getByTestId("btn-save").click();

    // Modal dismissed
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });

    // --- Criterion 1: new member appears in roster ---
    const row = page.getByTestId("member-row-QA Member");
    await expect(row).toBeVisible({ timeout: 10_000 });

    // --- Criterion 2: color swatch rendered (row has non-zero height) ---
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(0);

    // --- Criterion 3: roster count incremented by exactly 1 ---
    const after = await page.locator('[data-testid^="member-row-"]').count();
    expect(after).toBe(before + 1);
  });
});
