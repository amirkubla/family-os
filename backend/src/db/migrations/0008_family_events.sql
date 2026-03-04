CREATE TABLE IF NOT EXISTS "family_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "assignee_type" text NOT NULL DEFAULT 'family',
  "assignee_id" uuid,
  "day_of_week" integer NOT NULL,
  "start_minutes" integer NOT NULL,
  "end_minutes" integer NOT NULL,
  "location" text,
  "color" text,
  "is_recurring" boolean NOT NULL DEFAULT true,
  "date" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "family_events_family_id_idx" ON "family_events" ("family_id");
CREATE INDEX "family_events_family_dow_idx" ON "family_events" ("family_id", "day_of_week");
