-- Add team-specific login credentials to awarded_team
-- This migration introduces "Team Username" and "Team Password" fields
-- to move team authentication out of user_app.

-- Ensure table exists; proceed with adding columns using quoted identifiers
ALTER TABLE "awarded_team"
  ADD COLUMN IF NOT EXISTS "Team Username" text,
  ADD COLUMN IF NOT EXISTS "Team Password" text;

-- Optional: create a unique index on Team Username to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = ANY (current_schemas(false))
      AND indexname = 'awarded_team_team_username_unique_idx'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX awarded_team_team_username_unique_idx ON "awarded_team" ("Team Username") WHERE "Team Username" IS NOT NULL;';
  END IF;
END$$;

-- Backfill Team Username from Team Leader Username when available
UPDATE "awarded_team"
SET "Team Username" = COALESCE("Team Username", "Team Leader Username")
WHERE "Team Username" IS NULL AND "Team Leader Username" IS NOT NULL;

-- Note: Team Password remains NULL. Admins should set passwords per team.
-- If your environment currently stores plaintext passwords elsewhere,
-- consider migrating them here or implementing hashing in application code.