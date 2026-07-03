-- Long-term project management: contextual icon, optional due date, subtasks
-- (each with its own progress), and assigned family members. Purely additive
-- and backward-compatible: existing rows get emoji=NULL, due_date=NULL, and
-- empty sub_tasks / member_ids arrays.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "emoji" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "due_date" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "sub_tasks" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "member_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;
