/**
 * reminderService.ts — the core of the new minute-precision reminder system.
 *
 * Surface:
 *   - materializeForSource(kind, id):
 *       Compute the next occurrence + create one reminder row per configured
 *       lead-minutes + queue a Cloud Task per row. Idempotent: replaces any
 *       existing rows for this source (cancels their tasks first).
 *   - cancelForSource(kind, id):
 *       Delete all reminder rows for this source + cancel their Cloud Tasks.
 *   - handleFire(reminderId):
 *       Idempotent pending→processing→sent transition; sends push; if the
 *       source is recurring, computes the NEXT occurrence and re-arms the
 *       same row (status back to pending, new fire_at, new Cloud Task).
 *
 * Why one row per series instead of one per occurrence: keeps the table
 * bounded by O(events × leads) regardless of how long a series runs. The
 * cost is no historical audit trail — we only know the most-recent fire.
 *
 * Single-replica assumption: there isn't one. Cloud Tasks delivers each
 * task once-with-retries, and the `claim()` pending→processing transition
 * (see remindersRepo) is the atomic gate that makes the handler safe
 * under concurrent re-delivery from multiple Cloud Run instances.
 */
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  familyEvents,
  scheduleBlocks,
  pushTokens as pushTokensTable,
} from "../db/schema.js";
import { remindersRepo } from "../repos/remindersRepo.js";
import {
  createReminderTask,
  deleteReminderTask,
} from "./cloudTasksClient.js";
import type {
  Reminder,
  ReminderSourceKind,
} from "../types/models.js";

const TZ = "Asia/Jerusalem";

// Cap on how far into the future we'll walk looking for the next recurring
// occurrence. 14 days covers weekly events comfortably; if a recurring
// event has daysOfWeek=[], or all leads put fire_at past this window for
// some weird reason, we give up.
const MAX_FUTURE_DAYS = 14;

// ---------------------------------------------------------------------------
// Source row union — we accept either kind via a small adapter
// ---------------------------------------------------------------------------

interface ReminderSource {
  id: string;
  familyId: string;
  title: string;
  startMinutes: number;
  isRecurring: boolean;
  daysOfWeek: number[];
  date: string | null; // "YYYY-MM-DD" for one-off
  reminders: string | null; // JSON array of lead-minutes
}

async function loadSource(
  kind: ReminderSourceKind,
  id: string,
): Promise<ReminderSource | null> {
  if (kind === "family_event") {
    const [row] = await db
      .select()
      .from(familyEvents)
      .where(eq(familyEvents.id, id));
    if (!row) return null;
    return {
      id: row.id,
      familyId: row.familyId,
      title: row.title,
      startMinutes: row.startMinutes,
      isRecurring: row.isRecurring,
      daysOfWeek: row.daysOfWeek,
      date: row.date,
      reminders: row.reminders,
    };
  }
  // schedule_block
  const [row] = await db
    .select()
    .from(scheduleBlocks)
    .where(eq(scheduleBlocks.id, id));
  if (!row) return null;
  return {
    id: row.id,
    familyId: row.familyId,
    title: row.title,
    startMinutes: row.startMinutes,
    isRecurring: row.isRecurring,
    daysOfWeek: row.daysOfWeek,
    date: row.date,
    reminders: row.reminders,
  };
}

// ---------------------------------------------------------------------------
// JLM ↔ UTC helpers
// ---------------------------------------------------------------------------
//
// Events store wall-clock JLM info: startMinutes is minute-of-day in JLM,
// daysOfWeek and `date` are JLM days. We need to compute the UTC instant
// at which a given JLM (date, minute) lands — this changes by an hour
// across the JLM DST boundary (last Friday of March / October).

/** Build the UTC Date that displays as `ymd HH:MM` in Asia/Jerusalem. */
function jlmDateTimeToUtc(ymd: string, minutesOfDay: number): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const hour = Math.floor(minutesOfDay / 60);
  const min = minutesOfDay % 60;

  // Build a "naive" UTC Date with the same wall-clock components, then
  // measure the JLM offset at that moment and shift.
  const naive = new Date(Date.UTC(y!, m! - 1, d!, hour, min));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(naive);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asSeenInJlm = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    // 24 → 0 (en-US 24h actually emits "00")
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
  );
  const offsetMs = asSeenInJlm - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}

/** "YYYY-MM-DD" in JLM for a given UTC instant. */
function jlmYMD(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Day-of-week in JLM (Sun=0..Sat=6) for a given UTC instant. */
function jlmDayOfWeek(d: Date): number {
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekdayShort] ?? d.getDay();
}

// ---------------------------------------------------------------------------
// Next-occurrence math
// ---------------------------------------------------------------------------

/**
 * Find the next occurrence whose `fire_at` (occurrence − leadMinutes) is
 * STRICTLY AFTER `after`. Returns null if no such occurrence exists within
 * the search horizon (one-time event past, or recurring with empty
 * daysOfWeek, or a series finished).
 *
 * This is also the "missed occurrence skip on reload" mechanism: if the
 * series's most-recent fire would be in the past, we skip it and advance.
 */
function computeNextFireAt(
  source: ReminderSource,
  leadMinutes: number,
  after: Date,
): { occurrenceTs: Date; fireAt: Date } | null {
  if (!source.isRecurring) {
    // One-off: a single concrete occurrence.
    if (!source.date) return null;
    const occurrence = jlmDateTimeToUtc(source.date, source.startMinutes);
    const fireAt = new Date(occurrence.getTime() - leadMinutes * 60_000);
    return fireAt > after ? { occurrenceTs: occurrence, fireAt } : null;
  }

  // Recurring: walk forward day-by-day from `after`'s JLM date.
  if (!source.daysOfWeek || source.daysOfWeek.length === 0) return null;
  const wanted = new Set(source.daysOfWeek);
  const startUtc = new Date(after.getTime());

  for (let dayOffset = 0; dayOffset <= MAX_FUTURE_DAYS; dayOffset++) {
    const probe = new Date(startUtc.getTime() + dayOffset * 86_400_000);
    if (!wanted.has(jlmDayOfWeek(probe))) continue;

    const ymd = jlmYMD(probe);
    const occurrence = jlmDateTimeToUtc(ymd, source.startMinutes);
    const fireAt = new Date(occurrence.getTime() - leadMinutes * 60_000);
    if (fireAt > after) return { occurrenceTs: occurrence, fireAt };
    // Else: this day's slot already passed the lead window — try the next
    // matching dayOfWeek.
  }
  return null;
}

function parseLeadMinutes(remindersJson: string | null): number[] {
  if (!remindersJson) return [];
  try {
    const arr = JSON.parse(remindersJson);
    if (!Array.isArray(arr)) return [];
    // Filter to positive integers, sorted ascending (small leads fire later).
    return arr
      .filter((x): x is number => Number.isInteger(x) && x >= 0)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API — materialize / cancel / handleFire
// ---------------------------------------------------------------------------

/**
 * Build (or rebuild) the reminder rows + Cloud Tasks for a source. Replaces
 * any existing rows for this source — call this on event create AND edit.
 *
 * On a no-reminders event (or one with all leads in the past): all existing
 * rows are still cancelled. That's the desired "delete the schedule"
 * semantics.
 */
export async function materializeForSource(
  kind: ReminderSourceKind,
  id: string,
): Promise<void> {
  // Always cancel existing first — simpler than diffing, and the unique
  // constraint on (source_kind, source_id, lead_minutes) would otherwise
  // collide.
  await cancelForSource(kind, id);

  const source = await loadSource(kind, id);
  if (!source) return; // Source got deleted between callers — fine.

  const leads = parseLeadMinutes(source.reminders);
  if (leads.length === 0) return;

  const now = new Date();
  for (const lead of leads) {
    const next = computeNextFireAt(source, lead, now);
    if (!next) continue; // One-off in the past, or series exhausted.

    // Create the row first (we need an id to embed in the Cloud Task body),
    // then create the task, then write task_name back. If task creation
    // fails we leave the row in place with task_name=null — the safety
    // refresh (Phase 6+) can re-attempt.
    const row = await remindersRepo.create({
      sourceKind: kind,
      sourceId: id,
      familyId: source.familyId,
      leadMinutes: lead,
      occurrenceTs: next.occurrenceTs,
      fireAt: next.fireAt,
      status: "pending",
    });

    let taskName: string | null = null;
    try {
      taskName = await createReminderTask(row.id, next.fireAt);
    } catch (err) {
      console.error(
        `[reminderService] Failed to enqueue task for reminder=${row.id}:`,
        err,
      );
    }
    if (taskName !== null) {
      await remindersRepo.update(row.id, { taskName });
    }
  }
}

/**
 * Delete all reminder rows for this source + cancel their Cloud Tasks.
 * Safe to call when there's nothing to cancel — returns silently.
 */
export async function cancelForSource(
  kind: ReminderSourceKind,
  id: string,
): Promise<void> {
  const rows = await remindersRepo.deleteBySource(kind, id);
  // Best-effort cancel each task. We've already deleted the rows so a
  // re-delivery would no-op via the claim() short-circuit; the deleteTask
  // call here just keeps the queue tidy.
  await Promise.all(
    rows.map((r) =>
      deleteReminderTask(r.taskName).catch((err) =>
        console.warn(
          `[reminderService] deleteTask failed for ${r.taskName}:`,
          err,
        ),
      ),
    ),
  );
}

interface FireResult {
  status: "sent" | "skipped" | "no_tokens" | "missing" | "send_failed";
  pushes?: number;
  rearmed?: boolean;
}

/**
 * Cloud Tasks calls into this when a reminder's fire_at arrives.
 *
 * Returns 200 + a status string on every reachable outcome — Cloud Tasks
 * retries on 5xx, and we don't want retries for "already sent" /
 * "cancelled" / "source deleted" cases. Only an actual unhandled exception
 * propagates as 5xx (handled by the route layer).
 */
export async function handleFire(reminderId: string): Promise<FireResult> {
  // 1. Atomically claim the row. If we lose the race or it's no longer
  //    pending (cancelled, already processed), short-circuit.
  const claimed = await remindersRepo.claim(reminderId);
  if (!claimed) return { status: "skipped" };

  // 2. Look up the source. If it was deleted between claim and now, mark
  //    sent (no-op terminal) and stop.
  const source = await loadSource(claimed.sourceKind, claimed.sourceId);
  if (!source) {
    await remindersRepo.update(reminderId, {
      status: "sent",
      sentAt: new Date(),
    });
    return { status: "missing" };
  }

  // 3. Look up push tokens for the family.
  const tokens = await db
    .select()
    .from(pushTokensTable)
    .where(eq(pushTokensTable.familyId, claimed.familyId));

  let pushes = 0;
  if (tokens.length === 0) {
    // No tokens — still mark sent so we don't retry, then rearm if recurring.
    await remindersRepo.update(reminderId, {
      status: "sent",
      sentAt: new Date(),
    });
  } else {
    try {
      pushes = await sendExpoPushBatch(
        tokens.map((t) => t.token),
        source.title,
        formatReminderLabel(claimed.leadMinutes),
        { eventId: source.id },
      );
      await remindersRepo.update(reminderId, {
        status: "sent",
        sentAt: new Date(),
      });
    } catch (err) {
      console.error(
        `[reminderService] Expo push failed for reminder=${reminderId}:`,
        err,
      );
      // Mark failed but DON'T rearm. Series stalls until the next event
      // edit re-runs materializeForSource. Acceptable for now.
      await remindersRepo.update(reminderId, { status: "failed" });
      return { status: "send_failed" };
    }
  }

  // 4. Re-arm if recurring. We compute the NEXT occurrence strictly after
  //    the one we just fired (using occurrenceTs as the anchor — passing
  //    `claimed.occurrenceTs` ensures we skip the now-past slot).
  if (!source.isRecurring) {
    return { status: tokens.length === 0 ? "no_tokens" : "sent", pushes };
  }

  const next = computeNextFireAt(source, claimed.leadMinutes, claimed.occurrenceTs);
  if (!next) {
    await remindersRepo.update(reminderId, { status: "complete" });
    return { status: "sent", pushes, rearmed: false };
  }

  // Rearm: update row in place (status back to pending, new fire_at,
  //   new task_name) and enqueue the next Cloud Task.
  let nextTaskName: string | null = null;
  try {
    nextTaskName = await createReminderTask(reminderId, next.fireAt);
  } catch (err) {
    console.error(
      `[reminderService] Failed to enqueue rearm task for reminder=${reminderId}:`,
      err,
    );
  }
  await remindersRepo.update(reminderId, {
    status: "pending",
    occurrenceTs: next.occurrenceTs,
    fireAt: next.fireAt,
    taskName: nextTaskName,
    sentAt: null,
  });

  return { status: "sent", pushes, rearmed: true };
}

// ---------------------------------------------------------------------------
// Push delivery — mirrors the existing pushService logic, kept local so the
// old pushService can be deleted in a later cleanup without coupling.
// ---------------------------------------------------------------------------

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: "default";
  channelId?: string;
}

async function sendExpoPushBatch(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<number> {
  if (tokens.length === 0) return 0;
  const messages: ExpoMessage[] = tokens.map((to) => ({
    to,
    title,
    body,
    data,
    sound: "default" as const,
    channelId: "reminders",
  }));
  // Batch up to 100 per Expo API call.
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      throw new Error(`Expo push API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    // Stale-token cleanup (DeviceNotRegistered) is handled by the existing
    // pushTokensRepo path used by the old pushService. We could add it
    // here too — left as a follow-up to keep this commit small.
    sent += chunk.length;
  }
  return sent;
}

function formatReminderLabel(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return days === 1 ? "מחר" : `בעוד ${days} ימים`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? "בעוד שעה" : `בעוד ${hours} שעות`;
  }
  return minutes === 1 ? "בעוד דקה" : `בעוד ${minutes} דקות`;
}

// Used by the backfill script (Phase 6) to enumerate every source that
// might have reminders. Returns just (kind, id); the backfill loops
// through and calls materializeForSource, which is itself a no-op for
// sources with null/empty `reminders`.
export async function listAllSourcesWithReminders(): Promise<
  Array<{ kind: ReminderSourceKind; id: string }>
> {
  // Only rows with a non-empty reminders array. The first cut returned every
  // row (no filter), which made the backfill iterate ~500 sources to produce
  // ~7 actual reminders. Tightened so the backfill only processes what
  // actually has reminders configured.
  const events = await db
    .select({ id: familyEvents.id })
    .from(familyEvents)
    .where(
      and(
        isNotNull(familyEvents.reminders),
        sql`${familyEvents.reminders} <> '[]'`,
      ),
    );
  const blocks = await db
    .select({ id: scheduleBlocks.id })
    .from(scheduleBlocks)
    .where(
      and(
        isNotNull(scheduleBlocks.reminders),
        sql`${scheduleBlocks.reminders} <> '[]'`,
      ),
    );
  return [
    ...events.map((e) => ({ kind: "family_event" as const, id: e.id })),
    ...blocks.map((b) => ({ kind: "schedule_block" as const, id: b.id })),
  ];
}
