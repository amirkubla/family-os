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
import { notesRepo } from "../repos/notesRepo.js";
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

internalRoutes.get("/family/:familyId/family-events", async (c) => {
  const familyId = c.req.param("familyId")!;
  const range = c.req.query("range") ?? "today";
  if (range !== "today" && range !== "tomorrow" && range !== "week") {
    return c.json({ error: "range must be today|tomorrow|week" }, 400);
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

  // Sort by start time for predictable bot output.
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
  const rows =
    status === "all"
      ? await choresRepo.listByFamily(familyId)
      : await choresRepo.listUndone(familyId);
  return c.json(rows, 200);
});
