-- Lockdown: revoke execute on redeem_admin_invite from public/authenticated and grant to postgres
-- Run as a migration to enforce that only the DB owner/service role can call the RPC.
BEGIN;
REVOKE EXECUTE ON FUNCTION redeem_admin_invite(text, uuid, uuid)
FROM public;
REVOKE EXECUTE ON FUNCTION redeem_admin_invite(text, uuid, uuid)
FROM authenticated;
-- Grant to postgres role (Supabase service role maps to DB owner role in many setups)
GRANT EXECUTE ON FUNCTION redeem_admin_invite(text, uuid, uuid) TO postgres;
COMMIT;