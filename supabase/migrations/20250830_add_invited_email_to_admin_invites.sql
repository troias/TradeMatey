-- Migration: add invited_email to admin_invites and backfill from email
-- Adds a separate invited_email column to avoid breaking existing imports that reference `email`.
BEGIN;
ALTER TABLE admin_invites
ADD COLUMN IF NOT EXISTS invited_email text;
-- Backfill from legacy `email` column when present
UPDATE admin_invites
SET invited_email = email
WHERE invited_email IS NULL
    AND email IS NOT NULL;
-- Optional index to support lookups by invited_email (helps admin UI queries)
CREATE INDEX IF NOT EXISTS idx_admin_invites_invited_email ON admin_invites(invited_email);
COMMIT;
-- Note: Do not drop the old `email` column here to remain backwards compatible; remove in a later cleanup migration if desired.