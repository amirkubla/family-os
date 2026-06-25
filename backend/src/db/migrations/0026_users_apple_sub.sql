ALTER TABLE "users" ADD COLUMN "apple_sub" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_apple_sub_uniq" ON "users" ("apple_sub");
