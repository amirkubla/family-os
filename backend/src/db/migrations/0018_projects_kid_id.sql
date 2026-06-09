ALTER TABLE "projects" ADD COLUMN "kid_id" uuid REFERENCES "kids"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "projects_kid_id_idx" ON "projects" ("kid_id");
