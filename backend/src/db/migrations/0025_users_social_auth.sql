ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_sub" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_uniq" ON "users" ("google_sub");
