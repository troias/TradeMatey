-- One-time bootstrap: idempotent admin grant + audit
-- WARNING: Run this from a secure, ops-only environment (do NOT commit secrets).
-- Replace <USER_UUID> with the target user's UUID before running.
BEGIN;
-- Grant admin role (idempotent)
INSERT INTO user_roles (user_id, role)
VALUES ('<USER_UUID>', 'admin') ON CONFLICT DO NOTHING;
-- Record bootstrap audit row with unique token for traceability
INSERT INTO admin_audit (
        token,
        target_user_id,
        actor_user_id,
        action,
        created_at
    )
VALUES (
        'bootstrap-' || gen_random_uuid()::text,
        '<USER_UUID>',
        NULL,
        'bootstrap_manual_grant',
        now()
    );
COMMIT;
-- After running: rotate any ephemeral credentials and ensure this file is stored in a secure place or removed.