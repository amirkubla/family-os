/**
 * Add family event — web
 *
 * Spec: features/add-family-event.md
 * Acceptance criteria:
 *   1. New event "QA Event" appears in the calendar day list.         (visual)
 *   2. After editing, title updates to "QA Event Edited".            (visual)
 *   3. After deleting, event is no longer visible.                   (text → hierarchy)
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Add family event", () => {
  test.beforeEach(async ({ page }) => {
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("add, edit title, and delete a family event", async ({ page }) => {
    // Navigate to Calendar tab
    await page.getByTestId("tab-calendar").click();
    await expect(page.getByTestId("add-event-fab")).toBeVisible({ timeout: 10_000 });

    // --- Add event ---
    await page.getByTestId("add-event-fab").click();
    // Wait for modal heading to confirm Portal has mounted, then find input
    await expect(page.getByText("הוספת אירוע")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("input-event-title")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("input-event-title").fill("QA Event");
    await page.getByTestId("btn-save-event").click();
    await expect(page.getByTestId("btn-save-event")).not.toBeVisible({ timeout: 10_000 });

    // --- Criterion 1: event appears ---
    await expect(page.getByTestId("event-row-QA Event")).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-family-event-added.png` });
    }

    // --- Criterion 2: edit event title ---
    await page.getByTestId("event-row-QA Event").click();
    await expect(page.getByTestId("input-event-title")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("input-event-title").clear();
    await page.getByTestId("input-event-title").fill("QA Event Edited");
    await page.getByTestId("btn-save-event").click();
    await expect(page.getByTestId("btn-save-event")).not.toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("event-row-QA Event Edited")).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-family-event-edited.png` });
    }

    // --- Criterion 3: delete event ---
    await page.getByTestId("event-delete-QA Event Edited").click({ force: true });
    // Confirm delete dialog
    await page.getByText("מחק").click();
    await expect(page.getByTestId("event-row-QA Event Edited")).not.toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/add-family-event-deleted.png` });
    }
  });
});
