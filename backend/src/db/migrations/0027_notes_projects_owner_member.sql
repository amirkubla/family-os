ALTER TABLE "notes" ADD COLUMN "owner_member_id" uuid REFERENCES "family_members"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner_member_id" uuid REFERENCES "family_members"("id") ON DELETE SET NULL;
