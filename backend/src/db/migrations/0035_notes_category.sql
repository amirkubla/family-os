-- Notes categorization: an optional category key (home/finance/kids/work/…)
-- used by the redesigned Notes page for colored pills + filtering. Purely
-- additive and backward-compatible: existing rows get category = NULL.
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "category" text;
