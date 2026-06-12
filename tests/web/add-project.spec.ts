/**
 * Add project feature — web
 *
 * Spec: features/add-project.md
 * Acceptance criteria:
 *   1. Project "QA Project" appears in the projects list.               (visual)
 *   2. Deleting it removes it from the list.                            (text → hierarchy)
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Add project", () => {
  test.beforeEach(async ({ page }) => {
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("add and delete a project", async ({ page }) => {
    // Navigate to Home tab and wait for sections to render
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("btn-add-project")).toBeVisible({ timeout: 15_000 });

    // Open add project modal
    await page.getByTestId("btn-add-project").click();

    // Fill title and save
    await page.getByTestId("input-project-title").fill("QA Project");
    await page.getByTestId("btn-save").click();

    // Modal dismissed
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });

    // --- Criterion 1: project appears in list ---
    const card = page.getByTestId("project-card-QA Project");
    await expect(card).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-project-added.png` });
    }

    // --- Criterion 2: delete → project gone ---
    await page.getByTestId("project-delete-QA Project").click();
    // Confirm delete dialog
    await expect(page.getByTestId("btn-confirm-delete")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("btn-confirm-delete").click();

    await expect(page.getByTestId("project-card-QA Project")).not.toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-project-deleted.png` });
    }
  });
});
