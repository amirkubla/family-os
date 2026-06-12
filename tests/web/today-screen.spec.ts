/**
 * Today screen — web
 *
 * Spec: features/today-screen.md
 * Acceptance criteria:
 *   1. A family event created for today appears in the Today unified list.  (visual)
 *   2. A pinned note appears in the PinnedNotesCarousel on Today.           (visual)
 *   3. An active project appears in the ActiveProjectsCarousel on Today.   (visual)
 *
 * Setup: creates the three items, verifies Today, then cleans up.
 */

import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";
import { ensureLoggedOut, login } from "./helpers/auth";

const PROJECT_ROOT = path.resolve(__dirname, "../../");
const BACKEND_DIR = path.join(PROJECT_ROOT, "backend");

test.describe("Today screen", () => {
  test.beforeEach(async ({ page }) => {
    execSync(`npm run qa:reset`, {
      cwd: BACKEND_DIR,
      stdio: "ignore",
      env: { ...process.env, QA_USERNAME: process.env.QA_EMAIL ?? "כהן" },
    });
    await ensureLoggedOut(page);
    await login(page);
  });

  test("event, pinned note, and active project appear on Today", async ({ page }) => {
    // --- Setup: create a family event for today ---
    await page.getByTestId("tab-calendar").click();
    await expect(page.getByTestId("add-event-fab")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("add-event-fab").click();
    await expect(page.getByText("הוספת אירוע")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("input-event-title")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("input-event-title").fill("QA Today Event");
    // Switch to one-time so date = today (default is recurring Monday-only which may not be today)
    await page.getByText("חד פעמי").first().click();
    await page.getByTestId("btn-save-event").click();
    await expect(page.getByTestId("btn-save-event")).not.toBeVisible({ timeout: 5_000 });

    // --- Setup: create a note and pin it ---
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("btn-add-note")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("btn-add-note").click();
    await expect(page.getByTestId("input-note-body")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("input-note-body").fill("QA today note body");
    await page.getByTestId("input-note-title").fill("QA Today Note");
    await page.getByTestId("btn-save").click();
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });
    // Wait for note card to fully render before pinning (grid re-renders after save)
    await expect(page.getByTestId("note-card-QA Today Note").first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.getByTestId("note-pin-QA Today Note").first().click({ force: true });
    await page.waitForTimeout(1000);

    // --- Setup: create a project ---
    await expect(page.getByTestId("btn-add-project")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("btn-add-project").click();
    await expect(page.getByTestId("input-project-title")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("input-project-title").fill("QA Today Project");
    await page.getByTestId("btn-save").click();
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });
    // Edit project to set in_progress (status picker only appears in edit mode)
    await expect(page.getByTestId("project-card-QA Today Project")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("project-card-QA Today Project").click();
    await expect(page.getByTestId("input-project-title")).toBeVisible({ timeout: 5_000 });
    await page.getByText("בתהליך").click();
    await page.getByTestId("btn-save").click();
    await expect(page.getByTestId("btn-save")).not.toBeVisible({ timeout: 5_000 });

    // --- Navigate to Today ---
    await page.getByTestId("tab-today").click();
    await expect(page.getByTestId("roster-screen")).toBeVisible({ timeout: 10_000 });

    if (process.env.QA_RUN_ID) {
      await page.screenshot({ path: `qa-reports/${process.env.QA_RUN_ID}/screenshots/web/today-screen.png` });
    }

    // Scope to roster-screen to avoid strict-mode conflicts with calendar tab
    // (React Native Web keeps all tab screens in DOM simultaneously)
    const today = page.getByTestId("roster-screen");

    // --- Criterion 1: event appears in today's list ---
    await expect(page.getByTestId("today-event-QA Today Event")).toBeVisible({ timeout: 15_000 });

    // Scroll down to reveal PinnedNotesCarousel and ActiveProjectsCarousel
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(500);

    // --- Criterion 2: pinned note appears in carousel ---
    const noteCard = page.getByTestId("today-note-QA Today Note");
    await noteCard.scrollIntoViewIfNeeded();
    await expect(noteCard).toBeVisible({ timeout: 10_000 });

    // --- Criterion 3: active project appears in carousel ---
    const projectCard = page.getByTestId("today-project-QA Today Project");
    await projectCard.scrollIntoViewIfNeeded();
    await expect(projectCard).toBeVisible({ timeout: 10_000 });

    // --- Cleanup: delete event ---
    await page.getByTestId("tab-calendar").click();
    await page.getByTestId("event-delete-QA Today Event").click({ force: true });
    await page.getByText("מחק").click();

    // --- Cleanup: delete note and project ---
    await page.getByTestId("tab-home").click();
    await expect(page.getByTestId("btn-add-note")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("note-delete-QA Today Note").click({ force: true });
    await page.getByText("מחק").first().click();
    await page.getByTestId("project-delete-QA Today Project").click({ force: true });
    await page.getByText("מחק").first().click();
  });
});
