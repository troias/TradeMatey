-- Migration: create admin_invites table for invite-based admin onboarding
CREATE TABLE IF NOT EXISTS admin_invites (
    token text PRIMARY KEY,
    email text NOT NULL,
    used boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NULL -- id of admin who created the invite
);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites (email);