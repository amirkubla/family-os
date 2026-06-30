ALTER TABLE "chores" ADD COLUMN "kid_id" uuid REFERENCES "kids"("id") ON DELETE SET NULL;
