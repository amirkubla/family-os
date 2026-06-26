/**
 * Zod schemas for family_events route validation.
 *
 * Before this file existed the routes accepted any JSON shape — the QA pass
 * caught 4 distinct 201 Created responses for malformed payloads:
 *   - empty title
 *   - empty daysOfWeek + isRecurring=true (orphan event, never fires)
 *   - startMinutes: -5 (violates DB constraint; persisted regardless)
 *   - reminders as a non-JSON string
 *
 * The frontend already validated these in its Zod schemas; this file mirrors
 * those rules at the API boundary so the backend stops trusting client input.
 */

import { z } from "zod";

/** Minutes since midnight in Asia/Jerusalem. 0–1439 inclusive. */
const minuteOfDay = z
  .number()
  .int()
  .min(0, "startMinutes/endMinutes must be ≥ 0")
  .max(1439, "startMinutes/endMinutes must be ≤ 1439");

/** "YYYY-MM-DD" — strict format check, no Date parsing. */
const ymdDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

/**
 * Reminders are stored as a JSON-encoded array of integers in a text column
 * (legacy choice). Validate the shape before persisting so the cron's
 * JSON.parse never silently swallows malformed strings.
 */
const remindersJson = z
  .string()
  .refine((s) => {
    try {
      const parsed = JSON.parse(s);
      return (
        Array.isArray(parsed) &&
        parsed.every((n) => Number.isInteger(n) && n >= 0 && n <= 10080)
      );
    } catch {
      return false;
    }
  }, "reminders must be a JSON array of non-negative integers (minutes)")
  .nullable()
  .optional();

const baseFamilyEvent = z
  .object({
    title: z.string().trim().min(1, "title is required").max(200),
    assigneeType: z.enum(["family", "kid", "member"]).default("family"),
    assigneeId: z.string().uuid().nullable().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    startMinutes: minuteOfDay,
    endMinutes: minuteOfDay,
    location: z.string().max(200).nullable().optional(),
    color: z.string().max(20).nullable().optional(),
    isRecurring: z.boolean(),
    date: ymdDate.nullable().optional(),
    endDate: ymdDate.nullable().optional(),
    allDay: z.boolean().optional(),
    reminders: remindersJson,
  })
  .refine((d) => d.endMinutes > d.startMinutes, {
    path: ["endMinutes"],
    message: "endMinutes must be greater than startMinutes",
  })
  .refine((d) => !d.endDate || !d.date || d.endDate >= d.date, {
    path: ["endDate"],
    message: "endDate must be on or after date",
  })
  .refine((d) => !d.isRecurring || d.daysOfWeek.length > 0, {
    path: ["daysOfWeek"],
    message: "recurring events must have at least one day of week",
  })
  .refine((d) => d.isRecurring || !!d.date, {
    path: ["date"],
    message: "one-time events must have a date",
  });

/** POST /v1/family/:familyId/family-events */
export const createFamilyEventSchema = baseFamilyEvent;

/** PUT /v1/family/:familyId/family-events/:id — full upsert body */
export const upsertFamilyEventSchema = baseFamilyEvent.and(
  z.object({ id: z.string().uuid() }),
);

/**
 * PATCH /v1/family/:familyId/family-events/:id — every field optional, but
 * if startMinutes / endMinutes / isRecurring / daysOfWeek / date are present
 * they must each pass the same constraints.
 *
 * Cross-field rules (endMinutes > startMinutes, recurring needs daysOfWeek,
 * one-time needs date) can't be enforced here because we don't have the
 * existing row to merge against — that check stays at the repo layer or as
 * a fetch-then-validate dance. For now, individual field rules are enforced.
 */
export const patchFamilyEventSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  assigneeType: z.enum(["family", "kid", "member"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startMinutes: minuteOfDay.optional(),
  endMinutes: minuteOfDay.optional(),
  location: z.string().max(200).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  isRecurring: z.boolean().optional(),
  date: ymdDate.nullable().optional(),
  endDate: ymdDate.nullable().optional(),
  allDay: z.boolean().optional(),
  reminders: remindersJson,
});
