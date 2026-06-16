CREATE TABLE "budget_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT '📦' NOT NULL,
	"color" text DEFAULT '#888888' NOT NULL,
	"monthly_cap" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"category_name" text NOT NULL,
	"payer_member_id" uuid,
	"kid_id" uuid,
	"date" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "budget_categories_family_id_idx" ON "budget_categories" USING btree ("family_id");
--> statement-breakpoint
CREATE INDEX "expenses_family_id_idx" ON "expenses" USING btree ("family_id");
--> statement-breakpoint
CREATE INDEX "expenses_family_date_idx" ON "expenses" USING btree ("family_id","date");
