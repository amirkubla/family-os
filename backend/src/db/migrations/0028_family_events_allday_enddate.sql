ALTER TABLE "family_events" ADD COLUMN "end_date" text;
--> statement-breakpoint
ALTER TABLE "family_events" ADD COLUMN "all_day" boolean DEFAULT false NOT NULL;
