-- Chores action-center metadata: description, priority, optional due date,
-- completedAt, and recurrence (unit/interval/daysOfWeek). Purely additive and
-- backward-compatible: existing rows get NULLs, is_recurring=false, interval=1.
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "priority" text;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "is_recurring" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "repeat_unit" text;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "repeat_interval" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "chores" ADD COLUMN IF NOT EXISTS "days_of_week" jsonb;
