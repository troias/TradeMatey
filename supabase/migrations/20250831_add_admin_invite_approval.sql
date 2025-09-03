-- Add approval columns to admin_invites and index
ALTER TABLE IF EXISTS admin_invites
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS approved_by uuid NULL,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_admin_invites_status ON admin_invites (status);
-- Backfill: if any invites are marked used, mark them as approved
UPDATE admin_invites
SET status = 'approved'
WHERE used = true
    AND status = 'pending';