-- Migration: add invited_by to admin_invites and backfill from created_by
-- Adds a nullable invited_by uuid, backfills from created_by where available,
-- adds a FK constraint to users(id) (ON DELETE SET NULL) if not already present,
-- and creates an index to support queries.
BEGIN;
ALTER TABLE IF EXISTS admin_invites
ADD COLUMN IF NOT EXISTS invited_by uuid;
-- Backfill from created_by when present
UPDATE admin_invites
SET invited_by = created_by
WHERE invited_by IS NULL
    AND created_by IS NOT NULL;
-- Add foreign key constraint if it doesn't already exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_admin_invites_invited_by_users'
) THEN
ALTER TABLE admin_invites
ADD CONSTRAINT fk_admin_invites_invited_by_users FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE
SET NULL;
END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS idx_admin_invites_invited_by ON admin_invites(invited_by);
COMMIT;
-- Note: We intentionally keep `created_by` for compatibility; consider removing it in a later cleanup.