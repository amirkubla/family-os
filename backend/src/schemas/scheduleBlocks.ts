/**
 * Zod schemas for schedule_blocks route validation.
 *
 * Same shape as family_events (title, daysOfWeek, time range, reminders) plus
 * a kidId reference. Mirrors family_events validation.
 */

import { z } from "zod";

const minuteOfDay = z
  .number()
  .int()
  .min(0, "startMinutes/endMinutes must be ≥ 0")
  .max(1439, "startMinutes/endMinutes must be ≤ 1439");

const ymdDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

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

const baseScheduleBlock = z
  .object({
    title: z.string().trim().min(1, "title is required").max(200),
    kidId: z.string().uuid("kidId must be a UUID"),
    daysOfWeek: z.array(z.number().int().min(0).max(6)),
    startMinutes: minuteOfDay,
    endMinutes: minuteOfDay,
    location: z.string().max(200).nullable().optional(),
    color: z.string().max(20).nullable().optional(),
    isRecurring: z.boolean(),
    date: ymdDate.nullable().optional(),
    reminders: remindersJson,
  })
  .refine((d) => d.endMinutes > d.startMinutes, {
    path: ["endMinutes"],
    message: "endMinutes must be greater than startMinutes",
  })
  .refine((d) => !d.isRecurring || d.daysOfWeek.length > 0, {
    path: ["daysOfWeek"],
    message: "recurring blocks must have at least one day of week",
  })
  .refine((d) => d.isRecurring || !!d.date, {
    path: ["date"],
    message: "one-time blocks must have a date",
  });

export const createScheduleBlockSchema = baseScheduleBlock;

export const upsertScheduleBlockSchema = baseScheduleBlock.and(
  z.object({ id: z.string().uuid() }),
);

export const patchScheduleBlockSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  kidId: z.string().uuid().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startMinutes: minuteOfDay.optional(),
  endMinutes: minuteOfDay.optional(),
  location: z.string().max(200).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  isRecurring: z.boolean().optional(),
  date: ymdDate.nullable().optional(),
  reminders: remindersJson,
});
