/**
 * pushService.ts — Check for due event reminders and send push notifications
 *
 * Called by Cloud Scheduler every 15 min via POST /v1/notifications/check.
 * Uses the Expo Push API (free, no credentials needed).
 * Checks both family_events and schedule_blocks for due reminders.
 *
 * SCHEDULING WINDOW: each invocation fires every reminder whose target minute
 * falls in [now, now + WINDOW_MINUTES). With a 15-min cron + 15-min window,
 * each minute of the day is covered by exactly one tick — no double-fires
 * from window overlap, and the existing sent_notifications dedup catches
 * accidental retries.
 *
 * Trade-off: reminders fire 0 to WINDOW_MINUTES-1 minutes EARLY (never late).
 * A "5 min before" reminder for an event at 14:00 (target 13:55) lands
 * somewhere in [13:45, 14:00). Acceptable during stealth — users are aware.
 *
 * Why a 15-min interval instead of 1-min: Neon autosuspends after 5 min idle.
 * Any cron <= 5 min keeps the DB pinned awake 100% (~720 CU-hr/mo at 0.25 CU
 * = blown Free-tier cap of 100 CU-hr). 15-min lets the DB sleep 10 of every
 * 15 min, so ~33% utilization → ~45-60 CU-hr/mo with the quiet-hours guard.
 */

import { isNotNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { familyEvents, scheduleBlocks } from "../db/schema.js";
import { pushTokensRepo } from "../repos/pushTokensRepo.js";
import { sentNotificationsRepo } from "../repos/sentNotificationsRepo.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const TZ = "Asia/Jerusalem";

/**
 * Window width (in minutes) for "is this reminder due now?".
 * MUST match the Cloud Scheduler cron interval (currently every 15 min,
 * cron expression "every-15-min" written without slashes to avoid breaking
 * this block comment). Half-open window so adjacent ticks don't overlap.
 */
const WINDOW_MINUTES = 15;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: "default";
  channelId?: string;
}

/** A unified shape for anything that can trigger a reminder */
interface ReminderSource {
  id: string;
  familyId: string;
  title: string;
  startMinutes: number;
  isRecurring: boolean;
  daysOfWeek: number[];
  date: string | null;
  reminders: string | null;
}

export async function checkAndSendReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  // 1. Get current time in Asia/Jerusalem
  const now = new Date();
  const jerusalemStr = now.toLocaleString("en-US", { timeZone: TZ });
  const jerusalemNow = new Date(jerusalemStr);
  const currentDow = jerusalemNow.getDay(); // 0 = Sun
  const currentMinutes =
    jerusalemNow.getHours() * 60 + jerusalemNow.getMinutes();
  const todayYMD = formatYMD(jerusalemNow);

  // Early exit during quiet hours (00:00–05:59 Jerusalem).
  // No family events start before 6 am, so no reminder can ever fire.
  // This lets Neon autosuspend overnight instead of being woken every minute.
  if (jerusalemNow.getHours() < 6) {
    console.log(
      `[push] Quiet hours — skipping DB (${todayYMD} ${String(jerusalemNow.getHours()).padStart(2, "0")}:${String(jerusalemNow.getMinutes()).padStart(2, "0")} JLM)`,
    );
    return { sent: 0, errors: 0 };
  }

  console.log(
    `[push] Checking reminders: DOW=${currentDow}, minute=${currentMinutes}, date=${todayYMD}`,
  );

  // 2. Fetch all family events that have reminders set
  const events = await db
    .select()
    .from(familyEvents)
    .where(isNotNull(familyEvents.reminders));

  // 3. Fetch all schedule blocks that have reminders set
  const blocks = await db
    .select()
    .from(scheduleBlocks)
    .where(isNotNull(scheduleBlocks.reminders));

  // Combine into a unified list
  const sources: ReminderSource[] = [
    ...events.map((e) => ({
      id: e.id,
      familyId: e.familyId,
      title: e.title,
      startMinutes: e.startMinutes,
      isRecurring: e.isRecurring,
      daysOfWeek: e.daysOfWeek,
      date: e.date,
      reminders: e.reminders,
    })),
    ...blocks.map((b) => ({
      id: b.id,
      familyId: b.familyId,
      title: b.title,
      startMinutes: b.startMinutes,
      isRecurring: b.isRecurring,
      daysOfWeek: b.daysOfWeek,
      date: b.date,
      reminders: b.reminders,
    })),
  ];

  let sent = 0;
  let errors = 0;

  for (const source of sources) {
    if (!source.reminders) continue;

    let reminders: number[];
    try {
      reminders = JSON.parse(source.reminders);
    } catch {
      continue;
    }
    if (!Array.isArray(reminders) || reminders.length === 0) continue;

    // 4. Determine if this event/block occurs today
    const eventDate = getEventDateForToday(source, currentDow, todayYMD);
    if (!eventDate) continue;

    // 5. For each reminder offset, check if it's due in the current window
    for (const offsetMinutes of reminders) {
      const reminderMinute = source.startMinutes - offsetMinutes;

      // Skip if the reminder time is outside today (before midnight or after)
      if (reminderMinute < 0 || reminderMinute > 1439) continue;
      // Fire if target falls within [now, now + WINDOW_MINUTES) — half-open,
      // so adjacent ticks don't overlap. See module header for the rationale.
      if (
        reminderMinute < currentMinutes ||
        reminderMinute >= currentMinutes + WINDOW_MINUTES
      )
        continue;

      // 6. Check if already sent (dedup)
      const alreadySent = await sentNotificationsRepo.exists(
        source.id,
        offsetMinutes,
        eventDate,
      );
      if (alreadySent) continue;

      // 7. Get all push tokens for this family
      const tokens = await pushTokensRepo.listByFamily(source.familyId);
      if (tokens.length === 0) continue;

      // 8. Build notification messages
      const timeLabel = formatReminderLabel(offsetMinutes);
      const messages: ExpoPushMessage[] = tokens.map((t) => ({
        to: t.token,
        title: source.title,
        body: timeLabel,
        data: { eventId: source.id },
        sound: "default" as const,
        channelId: "reminders",
      }));

      // 9. Send via Expo Push API
      try {
        await sendExpoPush(messages);
        await sentNotificationsRepo.create(source.id, offsetMinutes, eventDate);
        sent += messages.length;
        console.log(
          `[push] Sent ${messages.length} notification(s) for "${source.title}" (${offsetMinutes}min before)`,
        );
      } catch (err) {
        console.error("[push] Failed to send:", err);
        errors++;
      }
    }
  }

  // Periodic cleanup of old sent_notifications — once per hour (at :00) is enough.
  if (jerusalemNow.getMinutes() === 0) {
    await sentNotificationsRepo.cleanOld();
  }

  return { sent, errors };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEventDateForToday(
  event: { isRecurring: boolean; daysOfWeek: number[]; date: string | null },
  currentDow: number,
  todayYMD: string,
): string | null {
  if (event.isRecurring) {
    return event.daysOfWeek.includes(currentDow) ? todayYMD : null;
  } else {
    return event.date === todayYMD ? todayYMD : null;
  }
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

async function sendExpoPush(messages: ExpoPushMessage[]): Promise<void> {
  // Expo push API accepts batches of up to 100 messages
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Expo push API error: ${res.status} ${text}`);
    }

    const result = await res.json();

    // Handle ticket errors (e.g., stale tokens)
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          console.log("[push] Removing stale token:", chunk[i].to);
          await pushTokensRepo.deleteByToken(chunk[i].to);
        }
      }
    }
  }
}
