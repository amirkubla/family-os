-- Family-event recurrence: interval-based repeats (every N weeks/months).
-- Purely additive + backward-compatible: existing recurring rows get
-- repeat_interval=1 and repeat_unit=NULL, which the occurrence rule treats as
-- "weekly on days_of_week" — identical to the previous behavior.
ALTER TABLE "family_events" ADD COLUMN IF NOT EXISTS "repeat_unit" text;
--> statement-breakpoint
ALTER TABLE "family_events" ADD COLUMN IF NOT EXISTS "repeat_interval" integer NOT NULL DEFAULT 1;
