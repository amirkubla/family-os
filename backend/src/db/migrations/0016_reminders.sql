CREATE TABLE IF NOT EXISTS "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_kind" text NOT NULL,
  "source_id" uuid NOT NULL,
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "lead_minutes" integer NOT NULL,
  "occurrence_ts" timestamp with time zone NOT NULL,
  "fire_at" timestamp with time zone NOT NULL,
  "task_name" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reminders_source_kind_check" CHECK ("source_kind" IN ('family_event','schedule_block')),
  CONSTRAINT "reminders_status_check" CHECK ("status" IN ('pending','processing','sent','failed','cancelled','complete'))
);
--> statement-breakpoint
CREATE INDEX "reminders_status_fire_at_idx" ON "reminders" ("status", "fire_at");
--> statement-breakpoint
CREATE INDEX "reminders_family_id_idx" ON "reminders" ("family_id");
--> statement-breakpoint
CREATE INDEX "reminders_source_idx" ON "reminders" ("source_kind", "source_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_source_lead_uniq" ON "reminders" ("source_kind", "source_id", "lead_minutes");
