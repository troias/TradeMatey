-- Redeem RPC (copied from repo)
-- RPC: redeem_admin_invite(token text, user_id uuid)
-- (content copied from supabase/migrations/20250826_redeem_admin_invite.sql)
CREATE OR REPLACE FUNCTION redeem_admin_invite(
        p_token text,
        p_user_id uuid,
        p_actor_id uuid DEFAULT NULL
    ) RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_inv record;
v_user_email text;
v_exists int;
BEGIN PERFORM pg_advisory_xact_lock(hashtext(p_token));
SELECT token,
    email,
    used,
    expires_at INTO v_inv
FROM admin_invites
WHERE token = p_token FOR
UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'invalid_invite' USING ERRCODE = 'P0001';
END IF;
IF v_inv.used THEN RAISE EXCEPTION 'invite_already_used' USING ERRCODE = 'P0003';
END IF;
IF v_inv.expires_at IS NOT NULL
AND v_inv.expires_at < now() THEN RAISE EXCEPTION 'invite_expired' USING ERRCODE = 'P0004';
END IF;
-- Ensure the target user exists
SELECT 1 INTO v_exists
FROM users
WHERE id = p_user_id;
IF NOT FOUND THEN RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0006';
END IF;
SELECT email INTO v_user_email
FROM users
WHERE id = p_user_id;
IF v_inv.email IS NOT NULL
AND v_user_email IS NOT NULL
AND v_inv.email <> v_user_email THEN RAISE EXCEPTION 'invite_email_mismatch' USING ERRCODE = 'P0005';
END IF;
-- If an actor is provided, ensure the actor exists and is an admin
IF p_actor_id IS NOT NULL THEN
SELECT 1 INTO v_exists
FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
WHERE u.id = p_actor_id
    AND ur.role = 'admin';
IF NOT FOUND THEN RAISE EXCEPTION 'actor_not_admin' USING ERRCODE = 'P0007';
END IF;
END IF;
-- Insert admin role if not already present (idempotent)
-- Use ON CONFLICT DO NOTHING so concurrent calls won't error on duplicate
INSERT INTO user_roles (user_id, role)
VALUES (p_user_id, 'admin') ON CONFLICT DO NOTHING;
-- Mark invite used conditionally; if it's already used, raise a clear error
UPDATE admin_invites
SET used = true
WHERE token = p_token
    AND used = false;
IF NOT FOUND THEN -- Because we selected FOR UPDATE above and checked v_inv.used earlier, this
-- indicates a race or the invite was already used; return a clear SQLSTATE-coded error.
RAISE EXCEPTION 'invite_already_used' USING ERRCODE = 'P0003';
END IF;
-- Audit log: actor may be null (self redemption) or admin id
INSERT INTO admin_audit (
        token,
        target_user_id,
        actor_user_id,
        action,
        created_at
    )
VALUES (
        p_token,
        p_user_id,
        p_actor_id,
        'redeem_invite',
        now()
    );
END;
$$;