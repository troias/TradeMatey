-- Add expires_at and created_by to admin_invites and a simple expiry function
ALTER TABLE IF EXISTS admin_invites
ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS created_by uuid NULL;
-- Simple expiry housekeeping function (call via cron or pg_cron)
CREATE OR REPLACE FUNCTION expire_old_admin_invites() RETURNS void LANGUAGE sql AS $$
UPDATE admin_invites
SET used = true
WHERE expires_at IS NOT NULL
    AND expires_at < now();
$$;
-- RLS: Prevent client-side writes to user_roles
-- Assumes 'auth.uid()' is available and that server functions use service role.
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;
-- Allow select for authenticated users
CREATE POLICY user_roles_select_authenticated ON user_roles FOR
SELECT USING (true);
-- Prevent inserts/updates/deletes from authenticated clients by default
CREATE POLICY user_roles_no_client_write ON user_roles FOR ALL USING (false) WITH CHECK (false);
-- Server-side functions and service-role connections should bypass RLS.