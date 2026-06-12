/**
 * Add note feature — web
 *
 * Spec: features/add-note.md
 * Acceptance criteria:
 *   1. Note "QA Note" appears in the notes list.                        (visual)
 *   2. Pinning it shows the pin indicator.                              (visual)
 *   3. Deleting it removes it from the list.                            (text → hierarchy)
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Add note", () => {
  test.beforeEach(async ({ page }) => {
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("add, pin, and delete a note", async ({ page }) => {
    // Navigate to Home tab and wait for sections to render
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("btn-add-note")).toBeVisible({ timeout: 15_000 });

    // Open add note modal
    await page.getByTestId("btn-add-note").click();

    // Fill body first (required), then title
    await page.getByTestId("input-note-body").fill("QA note body");
    await page.getByTestId("input-note-title").fill("QA Note");
    await page.getByTestId("btn-save").click();

    // Modal dismissed
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });

    // --- Criterion 1: note appears in list ---
    const card = page.getByTestId("note-card-QA Note");
    await expect(card).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-note-added.png` });
    }

    // --- Criterion 2: pin note ---
    // The notes grid re-renders after save, causing the pin button to briefly detach.
    // force:true dispatches the click without waiting for stability (works on RN Web).
    await page.getByTestId("note-pin-QA Note").click({ force: true });
    // Card still visible, now pinned (verified visually via pin indicator)
    await expect(page.getByTestId("note-card-QA Note")).toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-note-pinned.png` });
    }

    // --- Criterion 3: delete → note gone ---
    await page.getByTestId("note-delete-QA Note").click();
    // Confirm delete dialog
    await expect(page.getByTestId("btn-confirm-delete")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("btn-confirm-delete").click();

    await expect(page.getByTestId("note-card-QA Note")).not.toBeVisible({ timeout: 5_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-note-deleted.png` });
    }
  });
});
