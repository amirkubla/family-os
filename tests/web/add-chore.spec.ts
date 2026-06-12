/**
 * Add chore feature — web
 *
 * Spec: features/add-chore.md
 * Acceptance criteria:
 *   1. Chore "QA Chore" appears in the chores list.                     (visual)
 *   2. Marking it done shows it with done styling.                      (visual)
 *   3. Deleting it removes it from the list.                            (text → hierarchy)
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Add chore", () => {
  test.beforeEach(async ({ page }) => {
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("add, mark done, and delete a chore", async ({ page }) => {
    // Navigate to Home tab
    await page.getByTestId("tab-home").click();

    // Open add chore modal
    await page.getByTestId("btn-add-chore").click();

    // Fill title and save
    await page.getByTestId("input-chore-title").fill("QA Chore");
    await page.getByTestId("btn-save").click();

    // Modal dismissed
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });

    // --- Criterion 1: chore appears in list ---
    const row = page.getByTestId("chore-row-QA Chore");
    await expect(row).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-chore-added.png` });
    }

    // --- Criterion 2: mark done ---
    await page.getByTestId("chore-check-QA Chore").click();
    // Row still visible, now with done styling (verified visually)
    await expect(page.getByTestId("chore-row-QA Chore")).toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-chore-done.png` });
    }

    // --- Criterion 3: delete → chore gone ---
    await page.getByTestId("chore-delete-QA Chore").click();
    // Confirm delete dialog
    await expect(page.getByTestId("btn-confirm-delete")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("btn-confirm-delete").click();

    await expect(page.getByTestId("chore-row-QA Chore")).not.toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-chore-deleted.png` });
    }
  });
});
