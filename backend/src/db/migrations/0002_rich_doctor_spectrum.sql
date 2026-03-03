CREATE TABLE "schedule_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"kid_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"location" text,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_blocks_dow_range" CHECK ("schedule_blocks"."day_of_week" >= 0 AND "schedule_blocks"."day_of_week" <= 6),
	CONSTRAINT "schedule_blocks_time_range" CHECK ("schedule_blocks"."start_minutes" >= 0 AND "schedule_blocks"."start_minutes" < 1440 AND "schedule_blocks"."end_minutes" > 0 AND "schedule_blocks"."end_minutes" <= 1440),
	CONSTRAINT "schedule_blocks_end_after_start" CHECK ("schedule_blocks"."end_minutes" > "schedule_blocks"."start_minutes")
);
--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_blocks" ADD CONSTRAINT "schedule_blocks_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "schedule_blocks_family_id_idx" ON "schedule_blocks" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "schedule_blocks_kid_id_idx" ON "schedule_blocks" USING btree ("kid_id");--> statement-breakpoint
CREATE INDEX "schedule_blocks_kid_dow_idx" ON "schedule_blocks" USING btree ("kid_id","day_of_week");