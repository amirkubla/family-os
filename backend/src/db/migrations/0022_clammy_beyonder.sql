ALTER TABLE "expenses" ADD COLUMN "is_recurring" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurrence_day" integer;
