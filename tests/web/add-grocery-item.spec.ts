/**
 * Add grocery item feature — web
 *
 * Spec: features/add-grocery-item.md
 * Acceptance criteria:
 *   1. Item "QA Grocery" with qty 2 appears in the grocery list.        (visual)
 *   2. Marking it bought shows it in the bought section.                (visual)
 *   3. Deleting it removes it from the list.                            (text → hierarchy)
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Add grocery item", () => {
  test.beforeEach(async ({ page }) => {
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("add, mark bought, and delete a grocery item", async ({ page }) => {
    // Navigate to grocery tab
    await page.getByTestId("tab-grocery").click();

    // Open add modal
    await page.getByTestId("add-grocery-item").click();

    // Fill name and qty
    await page.getByTestId("input-grocery-name").fill("QA Grocery");
    await page.getByTestId("input-grocery-qty").fill("2");
    await page.getByTestId("btn-save").click();

    // Modal dismissed
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });

    // --- Criterion 1: item appears in grocery list ---
    const row = page.getByTestId("grocery-row-QA Grocery");
    await expect(row).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-grocery-item-added.png` });
    }

    // --- Criterion 2: mark bought → item moves to bought section ---
    await page.getByTestId("grocery-check-QA Grocery").click();
    // The row should still be visible (now in bought section)
    await expect(page.getByTestId("grocery-row-QA Grocery")).toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-grocery-item-bought.png` });
    }

    // --- Criterion 3: delete → item gone ---
    await page.getByTestId("grocery-delete-QA Grocery").click();
    await expect(page.getByTestId("grocery-row-QA Grocery")).not.toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-grocery-item-deleted.png` });
    }
  });
});
