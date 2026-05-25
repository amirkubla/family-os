-- 0014: switch push_tokens uniqueness from (family_id, token) to (token).
--
-- An Expo push token uniquely identifies a device. The old unique key
-- (family_id, token) allowed the SAME device to be registered under multiple
-- family_ids — each time a user switched families on the device, a new row
-- was inserted instead of the existing row being updated. The effect: when
-- family A sent a reminder, family A's old row pointed at the device and the
-- device received family A's pushes even though the current user belongs to
-- family B.
--
-- Found in prod (QA Pass 2): 4 distinct tokens registered to 2–4 families
-- each. Total 12 rows for ~8 unique devices.
--
-- Migration steps (Neon HTTP driver runs each statement separately):
--   1. Drop old unique index (family_id, token).
--   2. Delete duplicate rows, keeping only the most recently updated row per
--      token. The kept row's family_id is the family the device most recently
--      authenticated against, which matches user expectations.
--   3. Add new unique index on (token).
DROP INDEX IF EXISTS "push_tokens_family_token_uniq";
--> statement-breakpoint
DELETE FROM push_tokens
WHERE id NOT IN (
  SELECT DISTINCT ON (token) id
  FROM push_tokens
  ORDER BY token, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_token_uniq" ON push_tokens (token);
