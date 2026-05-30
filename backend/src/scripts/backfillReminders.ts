/**
 * backfillReminders.ts — one-time migration script for the Cloud Tasks
 * reminder system (Phase 6a).
 *
 * Walks every family_event and schedule_block and calls
 * `materializeForSource` on each. The service is idempotent: sources
 * without reminders no-op, sources with stale rows have them cancelled
 * before fresh ones are inserted.
 *
 * Run with:
 *   DATABASE_URL=$PROD_NEON_URL \
 *   SCHEDULER_SECRET=$PROD_SECRET \
 *   CLOUD_TASKS_QUEUE_NAME=reminders \
 *   CLOUD_TASKS_PROJECT=family-os-489209 \
 *   CLOUD_TASKS_LOCATION=europe-west1 \
 *   REMINDER_HANDLER_URL=https://<cloud-run-url>/v1/notifications/fire-reminder \
 *   tsx src/scripts/backfillReminders.ts
 *
 * Local credentials for Cloud Tasks come from ADC
 * (`gcloud auth application-default login`).
 *
 * Re-runnable: yes. Cancels existing rows and tasks before creating new
 * ones, so re-running after a partial failure is safe.
 */
import {
  listAllSourcesWithReminders,
  materializeForSource,
} from "../services/reminderService.js";
import { describeQueue } from "../services/cloudTasksClient.js";

async function main(): Promise<void> {
  console.log(`[backfill] Queue: ${describeQueue()}`);

  const sources = await listAllSourcesWithReminders();
  console.log(`[backfill] Walking ${sources.length} source rows…`);

  let processed = 0;
  let errors = 0;

  // Sequential rather than parallel so we don't burst the Cloud Tasks
  // create-task quota (1000 rps default — plenty for our scale, but no
  // point pushing it during a one-shot migration).
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
}

main().catch((err) => {
  console.error("[backfill] Fatal error:", err);
  process.exit(1);
});
