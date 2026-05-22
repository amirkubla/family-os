CREATE TABLE IF NOT EXISTS "invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "code" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "used_by_user_id" uuid,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invites_code_uniq" ON "invites" ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invites_family_id_idx" ON "invites" ("family_id");
--> statement-breakpoint
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "user_id" uuid;
