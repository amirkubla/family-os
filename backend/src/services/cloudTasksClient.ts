/**
 * cloudTasksClient.ts — thin wrapper around Google Cloud Tasks.
 *
 * The reminder pipeline (services/reminderService.ts) calls into here to
 * schedule a single HTTP callback at the exact moment a reminder should
 * fire. Cloud Tasks holds the future call in its managed delay queue;
 * when the scheduleTime arrives it POSTs to the handler URL.
 *
 * Why a wrapper:
 *   - One place to encode our task body shape + the shared-secret header
 *   - One place to compose the queue path / handler URL
 *   - A clean dev-mode escape hatch: when CLOUD_TASKS_QUEUE_NAME is unset
 *     (i.e., running locally without GCP credentials), every method
 *     no-ops + logs. Local backend tests don't need a queue.
 *
 * Single-replica note: nothing here assumes one replica. Cloud Tasks
 * itself is the source of truth for what fires when; the backend can
 * scale to N instances and any one of them can be the recipient.
 */
import { CloudTasksClient, protos } from "@google-cloud/tasks";

const QUEUE_NAME = process.env.CLOUD_TASKS_QUEUE_NAME ?? "";
const LOCATION = process.env.CLOUD_TASKS_LOCATION ?? "europe-west1";
const PROJECT = process.env.CLOUD_TASKS_PROJECT ?? "";
// Where Cloud Tasks delivers the fire callback. Same Cloud Run service,
// new endpoint added in Phase 5.
const HANDLER_URL = process.env.REMINDER_HANDLER_URL ?? "";
// Shared-secret header the handler validates (re-using SCHEDULER_SECRET
// for parity with the current /v1/notifications/check endpoint).
const SHARED_SECRET = process.env.SCHEDULER_SECRET ?? "";

function isEnabled(): boolean {
  // All three must be set. In local dev the env is empty and we no-op.
  return Boolean(QUEUE_NAME && PROJECT && HANDLER_URL);
}

let _client: CloudTasksClient | null = null;
function getClient(): CloudTasksClient {
  if (_client === null) {
    _client = new CloudTasksClient();
  }
  return _client;
}

function queuePath(): string {
  return getClient().queuePath(PROJECT, LOCATION, QUEUE_NAME);
}

/**
 * Schedule a Cloud Task that will POST to the reminder handler at `fireAt`.
 * Returns the full task resource name (used later to delete it on cancel).
 *
 * Returns null in dev mode (queue not configured) — callers should treat
 * "task_name is null" as "no task to delete on cancel" and otherwise
 * proceed normally.
 */
export async function createReminderTask(
  reminderId: string,
  fireAt: Date,
): Promise<string | null> {
  if (!isEnabled()) {
    console.log(
      `[cloud-tasks] DEV: would schedule reminder=${reminderId} at ${fireAt.toISOString()} (queue not configured)`,
    );
    return null;
  }

  const task: protos.google.cloud.tasks.v2.ITask = {
    httpRequest: {
      httpMethod: "POST",
      url: HANDLER_URL,
      headers: {
        "Content-Type": "application/json",
        // Shared-secret auth — same envelope the old /check endpoint
        // already validates. Cloud Tasks → Cloud Run path is TLS, so this
        // is fine for our threat model.
        "X-Scheduler-Secret": SHARED_SECRET,
      },
      body: Buffer.from(JSON.stringify({ reminderId })).toString("base64"),
    },
    // Cloud Tasks accepts seconds + nanos. Round to the nearest second —
    // sub-second precision isn't useful for a reminder.
    scheduleTime: {
      seconds: Math.floor(fireAt.getTime() / 1000),
    },
  };

  const [created] = await getClient().createTask({
    parent: queuePath(),
    task,
  });
  // `name` is the full resource path:
  //   projects/X/locations/Y/queues/Z/tasks/<task-id>
  // — that's what we pass to deleteReminderTask later.
  if (!created.name) {
    throw new Error("Cloud Tasks createTask returned a task without a name");
  }
  return created.name;
}

/**
 * Cancel a scheduled task. Safe to call with null / unknown names — silently
 * no-ops in those cases so the reminderService cancel path doesn't need
 * special-casing for dev-mode rows.
 *
 * If the task already fired (or never existed), deleteTask 404s — we
 * swallow that since the desired state ("this task is not in the queue
 * anymore") is already true.
 */
export async function deleteReminderTask(taskName: string | null): Promise<void> {
  if (!isEnabled() || !taskName) return;
  try {
    await getClient().deleteTask({ name: taskName });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    // gRPC NOT_FOUND = 5. Treat as success; the task is gone, that's what
    // we wanted.
    if (code === 5) return;
    throw err;
  }
}

/** For diagnostics only — used by the backfill script to log the queue path. */
export function describeQueue(): string {
  if (!isEnabled()) return "(dev — queue not configured)";
  return queuePath();
}
