-- Migration: create admin_audit table for recording admin actions
CREATE TABLE IF NOT EXISTS admin_audit (
    id bigserial PRIMARY KEY,
    token text NULL,
    target_user_id uuid NULL,
    actor_user_id uuid NULL,
    action text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit (actor_user_id);