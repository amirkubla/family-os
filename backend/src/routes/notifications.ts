import { Hono } from "hono";
import { checkAndSendReminders } from "../services/pushService.js";
import {
  handleFire,
  listAllSourcesWithReminders,
  materializeForSource,
} from "../services/reminderService.js";

export const notificationRoutes = new Hono();

// Shared-secret check, identical envelope for both endpoints below.
function verifySharedSecret(c: {
  req: { header: (n: string) => string | undefined };
}): boolean {
  const expected = process.env.SCHEDULER_SECRET;
  if (!expected) return true; // dev / not configured
  return c.req.header("X-Scheduler-Secret") === expected;
}

// POST /v1/notifications/check
//
// Legacy endpoint, called by the Cloud Scheduler `check-event-reminders`
// job every 15 min. We keep it functional through the cutover (Phase 6b)
// so the running scheduler doesn't 5xx while it's still enabled; once the
// scheduler job is deleted this becomes dead code, safe to remove.
notificationRoutes.post("/check", async (c) => {
  if (!verifySharedSecret(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const result = await checkAndSendReminders();
  return c.json({ ok: true, ...result });
});

// POST /v1/notifications/fire-reminder
//
// New endpoint, called by Cloud Tasks at each reminder's `fire_at`. Body:
//   { reminderId: string }
//
// Idempotency: reminderService.claim() is the at-most-once gate. If Cloud
// Tasks redelivers a task we already 200'd on (slow response, etc.), this
// endpoint returns 200 with status="skipped" — NOT a 5xx, since 5xx
// would trigger another retry.
//
// We DO return 5xx for unexpected errors so Cloud Tasks retries with
// exponential backoff (default queue retry config — fine for our scale).
notificationRoutes.post("/fire-reminder", async (c) => {
  if (!verifySharedSecret(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  let body: { reminderId?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Body must be JSON" }, 400);
  }
  const reminderId = body.reminderId;
  if (typeof reminderId !== "string" || reminderId.length === 0) {
    return c.json({ error: "reminderId is required" }, 400);
  }

  try {
    const result = await handleFire(reminderId);
    return c.json({ ok: true, ...result });
  } catch (err) {
    // Unhandled error — let Cloud Tasks retry. Log so we can debug.
    console.error(
      `[notifications/fire-reminder] handleFire(${reminderId}) failed:`,
      err,
    );
    return c.json({ error: String(err) }, 500);
  }
});

// POST /v1/notifications/admin/backfill-reminders
//
// One-shot administrative endpoint to (re)materialize reminders for every
// existing source. Runs from inside the deployed container, so the Cloud
// Tasks calls use the Cloud Run service account which has
// roles/cloudtasks.enqueuer — avoiding the local-creds rabbit hole that
// the standalone backfill script hits.
//
// Safe to re-run: materializeForSource cancels existing rows + tasks
// first, so consecutive calls reconcile to the current state.
//
// Returns immediately with {accepted, count} and runs the actual
// materialization in the background; the Cloud Run request-timeout would
// otherwise cap the work at 5 min. Progress is logged.
notificationRoutes.post("/admin/backfill-reminders", async (c) => {
  if (!verifySharedSecret(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const sources = await listAllSourcesWithReminders();
  // Background: fire-and-forget, errors logged inside.
  (async () => {
    console.log(`[backfill] Starting backfill for ${sources.length} sources`);
    let processed = 0;
    let errors = 0;
    for (const s of sources) {
      try {
        await materializeForSource(s.kind, s.id);
        processed++;
      } catch (err) {
        errors++;
        console.error(`[backfill] ${s.kind}/${s.id} failed:`, err);
      }
    }
    console.log(`[backfill] Done — processed=${processed} errors=${errors}`);
  })();
  return c.json({ accepted: true, count: sources.length });
});
