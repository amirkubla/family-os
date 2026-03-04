ALTER TABLE "family_members" ADD COLUMN "color" text;
ALTER TABLE "family_members" ADD COLUMN "avatar_emoji" text;
ALTER TABLE "family_members" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "chores" ADD COLUMN "assigned_to_member_id" uuid;
