/**
 * Internal API surface for service-to-service calls.
 *
 * Mounted at /v1/internal/family/:familyId/* and guarded by the shared
 * SERVICE_TOKEN (see middleware/serviceToken.ts). Currently used by the
 * Telegram-bot Assistant to create events and grocery items on behalf of
 * a user without a per-user JWT.
 *
 * Scope is intentionally narrow — only POST endpoints for the resources
 * the Telegram bot needs to write. Reads, updates, and deletes stay on the
 * user-JWT surface.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { choresRepo } from "../repos/choresRepo.js";
import { familyEventsRepo } from "../repos/familyEventsRepo.js";
import { familyMembersRepo } from "../repos/familyMembersRepo.js";
import { groceryRepo } from "../repos/groceryRepo.js";
import { kidsRepo } from "../repos/kidsRepo.js";
import { notesRepo } from "../repos/notesRepo.js";
import { scheduleBlocksRepo } from "../repos/scheduleBlocksRepo.js";
import { createFamilyEventSchema } from "../schemas/familyEvents.js";

export const internalRoutes = new Hono();

// ── family events ────────────────────────────────────────────────────────

internalRoutes.post(
  "/family/:familyId/family-events",
  zValidator("json", createFamilyEventSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "Validation failed", issues: result.error.issues },
        400,
      );
    }
  }),
  async (c) => {
    const familyId = c.req.param("familyId")!;
    const body = c.req.valid("json");
    const row = await familyEventsRepo.create({ ...body, familyId });
    return c.json(row, 201);
  },
);

// ── grocery ──────────────────────────────────────────────────────────────
//
// We pass shape through to the repo as-is. The user-facing grocery route
// also lacks Zod validation (the broader BUG-N5 backfill is deferred), so
// no schema is enforced here either. The Assistant is a trusted caller.

internalRoutes.post("/family/:familyId/grocery", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = await c.req.json();
  if (typeof body?.title !== "string" || body.title.trim().length === 0) {
    return c.json({ error: "title is required" }, 400);
  }
  const row = await groceryRepo.create({ ...body, familyId });
  return c.json(row, 201);
});

// ── chores ───────────────────────────────────────────────────────────────
//
// The Assistant sends `assignedTo` as free-text Hebrew (e.g. "עודד", "אמא").
// We try to resolve it to a familyMember row so the chore links to a member
// (case-insensitive exact match against displayName). If there's no match,
// we keep the free-text in `assignedTo` and leave `assignedToMemberId` null
// — the family-os app already supports unlinked free-text assignees.

internalRoutes.post("/family/:familyId/chores", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = (await c.req.json()) as {
    title?: unknown;
    assignedTo?: unknown;
  };

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return c.json({ error: "title is required" }, 400);
  }
  const title = body.title.trim();
  const assignedToText =
    typeof body.assignedTo === "string" && body.assignedTo.trim().length > 0
      ? body.assignedTo.trim()
      : null;

  let assignedToMemberId: string | null = null;
  if (assignedToText) {
    const members = await familyMembersRepo.listByFamily(familyId);
    const needle = assignedToText.toLowerCase();
    const match = members.find(
      (m) => m.displayName.trim().toLowerCase() === needle,
    );
    if (match) {
      assignedToMemberId = match.id;
    }
  }

  const row = await choresRepo.create({
    familyId,
    title,
    assignedTo: assignedToText,
    assignedToMemberId,
  });
  return c.json(row, 201);
});

// ── notes ────────────────────────────────────────────────────────────────

internalRoutes.post("/family/:familyId/notes", async (c) => {
  const familyId = c.req.param("familyId")!;
  const body = (await c.req.json()) as {
    body?: unknown;
    title?: unknown;
    pinned?: unknown;
  };

  if (typeof body.body !== "string" || body.body.trim().length === 0) {
    return c.json({ error: "body is required" }, 400);
  }

  const row = await notesRepo.create({
    familyId,
    body: body.body.trim(),
    title:
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : null,
    pinned: body.pinned === true,
  });
  return c.json(row, 201);
});

// ── reads ────────────────────────────────────────────────────────────────
//
// Narrow GET surface for the Assistant query intents. We deliberately keep
// these shaped for bot replies — small JSON payloads, no joins. If a future
// caller needs richer data, add a new param rather than widening these.
//
// Dates are interpreted in Asia/Jerusalem (the family's local timezone).
// "today"/"tomorrow" use the server's wall-clock day; if the server runs in
// UTC, the small day boundary mismatch is acceptable for a bot use case.

const JERUSALEM_TZ = "Asia/Jerusalem";
const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function localDateParts(d: Date): { isoDate: string; dayOfWeek: number } {
  // en-CA → YYYY-MM-DD; weekday short → "Sun".."Sat" mapped to 0..6 to
  // match the family_events.days_of_week convention (Sun=0).
  const isoDate = d.toLocaleDateString("en-CA", { timeZone: JERUSALEM_TZ });
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: JERUSALEM_TZ,
    weekday: "short",
  }).format(d);
  const dayOfWeek = WEEKDAY_TO_INDEX[weekdayShort] ?? d.getDay();
  return { isoDate, dayOfWeek };
}

// Resolve a free-text kid name (Hebrew, case-insensitive exact match) to a
// kid_id within a family. Returns null if not found — callers should treat
// that as a 404 for the asked kid.
async function resolveKidId(
  familyId: string,
  kidName: string,
): Promise<string | null> {
  const kids = await kidsRepo.listByFamily(familyId);
  const needle = kidName.trim().toLowerCase();
  const match = kids.find(
    (k) => k.isActive && k.name.trim().toLowerCase() === needle,
  );
  return match ? match.id : null;
}

internalRoutes.get("/family/:familyId/family-events", async (c) => {
  const familyId = c.req.param("familyId")!;
  const range = c.req.query("range") ?? "today";
  if (range !== "today" && range !== "tomorrow" && range !== "week") {
    return c.json({ error: "range must be today|tomorrow|week" }, 400);
  }

  // Optional kid scope: only events whose assignee is this kid.
  const kidNameParam = c.req.query("kidName")?.trim();
  let kidIdFilter: string | null = null;
  if (kidNameParam) {
    kidIdFilter = await resolveKidId(familyId, kidNameParam);
    if (kidIdFilter === null) {
      // Empty list rather than 404 — bot replies "no events for X" cleanly.
      return c.json([], 200);
    }
  }

  const all = await familyEventsRepo.listByFamily(familyId);

  const today = new Date();
  const todayParts = localDateParts(today);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowParts = localDateParts(tomorrow);

  const isOneTime = (e: (typeof all)[number]) => !e.isRecurring && !!e.date;
  const isRecurring = (e: (typeof all)[number]) =>
    e.isRecurring && Array.isArray(e.daysOfWeek) && e.daysOfWeek.length > 0;

  const matchesDay = (e: (typeof all)[number], isoDate: string, dow: number) =>
    (isOneTime(e) && e.date === isoDate) ||
    (isRecurring(e) && (e.daysOfWeek as number[]).includes(dow));

  let filtered = all;
  if (range === "today") {
    filtered = all.filter((e) =>
      matchesDay(e, todayParts.isoDate, todayParts.dayOfWeek),
    );
  } else if (range === "tomorrow") {
    filtered = all.filter((e) =>
      matchesDay(e, tomorrowParts.isoDate, tomorrowParts.dayOfWeek),
    );
  } else {
    // week — next 7 days inclusive of today.
    const weekDays: { isoDate: string; dayOfWeek: number }[] = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(
        localDateParts(new Date(today.getTime() + i * 24 * 60 * 60 * 1000)),
      );
    }
    filtered = all.filter((e) =>
      weekDays.some((d) => matchesDay(e, d.isoDate, d.dayOfWeek)),
    );
  }

  // Apply kid scope after the date filter to keep the matchesDay closure simple.
  if (kidIdFilter) {
    filtered = filtered.filter(
      (e) => e.assigneeType === "kid" && e.assigneeId === kidIdFilter,
    );
  }

  // Sort by start time for predictable bot output.
  filtered.sort((a, b) => a.startMinutes - b.startMinutes);
  return c.json(filtered, 200);
});

// ── schedule-blocks (kid's weekly schedule — classes, hobbies) ───────────
//
// Distinct from family-events: each block belongs to exactly one kid and
// is shaped for the kid's weekly schedule screen. The bot uses this to
// answer "what does דני have next week" (where dani's classes / hobbies
// live), separately from family-wide events.

internalRoutes.get("/family/:familyId/schedule-blocks", async (c) => {
  const familyId = c.req.param("familyId")!;
  const range = c.req.query("range") ?? "today";
  if (range !== "today" && range !== "tomorrow" && range !== "week") {
    return c.json({ error: "range must be today|tomorrow|week" }, 400);
  }

  const kidNameParam = c.req.query("kidName")?.trim();
  let kidIdFilter: string | null = null;
  if (kidNameParam) {
    kidIdFilter = await resolveKidId(familyId, kidNameParam);
    if (kidIdFilter === null) {
      return c.json([], 200);
    }
  }

  const all = kidIdFilter
    ? await scheduleBlocksRepo.listByKid(kidIdFilter)
    : await scheduleBlocksRepo.listByFamily(familyId);

  // Same range-matching logic as family-events. Kept inline rather than
  // extracted because the predicate is small and the type differs by one
  // field (no isRecurring/date semantics drift to worry about).
  const today = new Date();
  const todayParts = localDateParts(today);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowParts = localDateParts(tomorrow);

  const isOneTime = (b: (typeof all)[number]) => !b.isRecurring && !!b.date;
  const isRecurring = (b: (typeof all)[number]) =>
    b.isRecurring && Array.isArray(b.daysOfWeek) && b.daysOfWeek.length > 0;

  const matchesDay = (
    b: (typeof all)[number],
    isoDate: string,
    dow: number,
  ) =>
    (isOneTime(b) && b.date === isoDate) ||
    (isRecurring(b) && (b.daysOfWeek as number[]).includes(dow));

  let filtered = all;
  if (range === "today") {
    filtered = all.filter((b) =>
      matchesDay(b, todayParts.isoDate, todayParts.dayOfWeek),
    );
  } else if (range === "tomorrow") {
    filtered = all.filter((b) =>
      matchesDay(b, tomorrowParts.isoDate, tomorrowParts.dayOfWeek),
    );
  } else {
    const weekDays: { isoDate: string; dayOfWeek: number }[] = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(
        localDateParts(new Date(today.getTime() + i * 24 * 60 * 60 * 1000)),
      );
    }
    filtered = all.filter((b) =>
      weekDays.some((d) => matchesDay(b, d.isoDate, d.dayOfWeek)),
    );
  }

  filtered.sort((a, b) => a.startMinutes - b.startMinutes);
  return c.json(filtered, 200);
});

internalRoutes.get("/family/:familyId/grocery", async (c) => {
  const familyId = c.req.param("familyId")!;
  const status = c.req.query("status") ?? "unchecked";
  if (status !== "unchecked" && status !== "all") {
    return c.json({ error: "status must be unchecked|all" }, 400);
  }
  const rows =
    status === "all"
      ? await groceryRepo.listByFamily(familyId)
      : await groceryRepo.listUnbought(familyId);
  return c.json(rows, 200);
});

internalRoutes.get("/family/:familyId/chores", async (c) => {
  const familyId = c.req.param("familyId")!;
  const status = c.req.query("status") ?? "undone";
  if (status !== "undone" && status !== "all") {
    return c.json({ error: "status must be undone|all" }, 400);
  }
  const assigneeMemberId = c.req.query("assigneeMemberId");
  const selectedForTodayParam = c.req.query("selectedForToday");
  // Only accept the literal strings "true"/"false" — silently ignoring
  // typos would mask Assistant bugs.
  let selectedForTodayFilter: boolean | null = null;
  if (selectedForTodayParam !== undefined) {
    if (selectedForTodayParam !== "true" && selectedForTodayParam !== "false") {
      return c.json({ error: "selectedForToday must be true|false" }, 400);
    }
    selectedForTodayFilter = selectedForTodayParam === "true";
  }

  let rows =
    status === "all"
      ? await choresRepo.listByFamily(familyId)
      : await choresRepo.listUndone(familyId);

  if (assigneeMemberId) {
    rows = rows.filter((r) => r.assignedToMemberId === assigneeMemberId);
  }
  if (selectedForTodayFilter !== null) {
    rows = rows.filter((r) => r.selectedForToday === selectedForTodayFilter);
  }

  return c.json(rows, 200);
});

// ── members (read-only; for the Assistant's /me onboarding) ──────────────

internalRoutes.get("/family/:familyId/members", async (c) => {
  const familyId = c.req.param("familyId")!;
  const rows = await familyMembersRepo.listByFamily(familyId);
  // Active members only — inactive rows are kept for historical attribution
  // (e.g., chores assigned to a parent who left), but don't belong in a
  // "who are you?" picker.
  const active = rows
    .filter((m) => m.isActive)
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      role: m.role,
      avatarEmoji: m.avatarEmoji,
    }));
  return c.json(active, 200);
});
