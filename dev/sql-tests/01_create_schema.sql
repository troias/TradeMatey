-- minimal schema for tests (users, user_roles, admin_invites, admin_audit)
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY, email text);
CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid,
    role text,
    PRIMARY KEY(user_id, role)
);
CREATE TABLE IF NOT EXISTS admin_invites (
    token text PRIMARY KEY,
    email text NULL,
    used boolean NOT NULL DEFAULT false,
    expires_at timestamptz NULL
);
CREATE TABLE IF NOT EXISTS admin_audit (
    id bigserial PRIMARY KEY,
    token text NULL,
    target_user_id uuid NULL,
    actor_user_id uuid NULL,
    action text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- create the RPC function by including the migration file content
-- (this assumes the migration file is copied into this directory as 02_redeem.sql by the user or CI)
\ i / docker - entrypoint - initdb.d / 02_redeem.sql