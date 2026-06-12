import { defineConfig } from "@playwright/test";

/**
 * Playwright config for family-os web QA.
 *
 * Targets the Expo web dev server on :8083 (must already be running).
 * Run via:  npm run test:web
 *       or: /qa-run (which also covers iOS + Android via Maestro)
 *
 * Screenshots land in qa-reports/<run>/screenshots/web/.
 * Per-test failure artifacts (screenshots, traces) go under playwright-results/.
 */
export default defineConfig({
  testDir: "./tests/web",
  timeout: 60_000,        // single-action timeout (bumped for slow post-login renders)
  expect: { timeout: 15_000 },
  workers: 1,             // serial: tests share app state, don't parallelise
  retries: 1,             // retry once on flaky server-state timing issues

  use: {
    baseURL: process.env.QA_WEB_URL ?? "http://localhost:8083",
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro viewport — matches the app's mobile web layout
    screenshot: "only-on-failure",
    video: "off",
    trace: "on-first-retry",
    // All testIDs become data-testid on React Native Web
    testIdAttribute: "data-testid",
  },

  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "playwright-results/results.json" },
    ],
  ],
});
