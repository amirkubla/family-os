ALTER TABLE "notes" ADD COLUMN "kid_id" uuid REFERENCES "kids"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "notes_kid_id_idx" ON "notes" ("kid_id");
