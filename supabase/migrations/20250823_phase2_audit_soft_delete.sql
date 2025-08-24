-- Phase 2 migration: audit, soft-delete, tombstones, role_bindings, outbox, and admin RPCs
-- 1) Audit log (append-only)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL,
    actor_id uuid,
    surface text,
    reason text,
    request_id uuid,
    before_state jsonb,
    after_state jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);
-- 2) Tombstones for cascade-safe archival
CREATE TABLE IF NOT EXISTS public.tombstones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    tombstone jsonb NOT NULL,
    deleted_at timestamptz DEFAULT now(),
    deletion_reason text,
    cascade_from uuid,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tombstones_record_id ON public.tombstones(record_id);
-- 3) Outbox table for domain events
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id bigserial PRIMARY KEY,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    published boolean DEFAULT false,
    publish_after timestamptz DEFAULT now(),
    retry_count int DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outbox_publish_after ON public.outbox_events (publish_after)
WHERE published = false;
-- 4) Role bindings (RBAC) - canonical table (preserve user_roles for compatibility)
CREATE TABLE IF NOT EXISTS public.role_bindings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL,
    scope jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);
-- idempotent addition of CHECK constraint (Postgres doesn't support ADD CONSTRAINT IF NOT EXISTS)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'role_bindings_role_check'
) THEN
ALTER TABLE public.role_bindings
ADD CONSTRAINT role_bindings_role_check CHECK (
        role IN (
            'client',
            'tradie',
            'admin',
            'marketing',
            'finance',
            'support',
            'employee',
            'operations',
            'compliance',
            'risk',
            'product',
            'engineering',
            'analyst',
            'auditor',
            'finance_manager',
            'support_manager',
            'marketing_manager'
        )
    );
END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_role_bindings_user ON public.role_bindings (user_id);
-- 5) Soft-delete columns on users (idempotent)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
    ADD COLUMN IF NOT EXISTS deletion_reason text;
-- 6) Idempotency guard table for high-risk ops
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key text NOT NULL UNIQUE,
    actor_id uuid,
    action text,
    created_at timestamptz DEFAULT now()
);
-- 7) Helper: function to enqueue an outbox event (simple, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.enqueue_outbox(event_type text, payload jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
INSERT INTO public.outbox_events (event_type, payload)
VALUES (event_type, payload);
END;
$$;
-- 8) Soft-delete RPC (atomic): admin-only guard, audit, tombstone, outbox, idempotency
CREATE OR REPLACE FUNCTION public.soft_delete_user(
        p_target uuid,
        p_actor uuid,
        p_reason text DEFAULT NULL,
        p_surface text DEFAULT 'AdminUI',
        p_request_id uuid DEFAULT NULL,
        p_idempotency_key text DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _before jsonb;
_after jsonb;
BEGIN -- Basic admin check (server still enforces policy; keep DB check defensive)
IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_actor
        AND ur.role = 'admin'
) THEN RAISE EXCEPTION 'permission_denied';
END IF;
-- Idempotency: if key provided and exists, return earlier marker
IF p_idempotency_key IS NOT NULL THEN IF EXISTS(
    SELECT 1
    FROM public.idempotency_keys ik
    WHERE ik.idempotency_key = p_idempotency_key
        AND ik.action = 'soft_delete_user'
) THEN RETURN jsonb_build_object('status', 'already_processed');
END IF;
END IF;
SELECT to_jsonb(u) INTO _before
FROM public.users u
WHERE u.id = p_target;
IF _before IS NULL THEN RAISE EXCEPTION 'not_found';
END IF;
-- If already soft-deleted
IF (_before->>'deleted_at') IS NOT NULL THEN RETURN jsonb_build_object('status', 'already_deleted');
END IF;
UPDATE public.users
SET deleted_at = now(),
    deletion_reason = p_reason
WHERE id = p_target;
SELECT to_jsonb(u) INTO _after
FROM public.users u
WHERE u.id = p_target;
-- Insert tombstone for archival
INSERT INTO public.tombstones (
        table_name,
        record_id,
        tombstone,
        deletion_reason,
        cascade_from
    )
VALUES ('users', p_target, _before, p_reason, p_actor);
-- Audit
INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        actor_id,
        surface,
        reason,
        request_id,
        before_state,
        after_state
    )
VALUES (
        'users',
        p_target,
        'soft_delete',
        p_actor,
        p_surface,
        p_reason,
        p_request_id,
        _before,
        _after
    );
-- Enqueue outbox
PERFORM public.enqueue_outbox(
    'user.deleted',
    jsonb_build_object(
        'id',
        p_target,
        'request_id',
        p_request_id,
        'actor',
        p_actor,
        'surface',
        p_surface
    )
);
-- Record idempotency key
IF p_idempotency_key IS NOT NULL THEN
INSERT INTO public.idempotency_keys (idempotency_key, actor_id, action)
VALUES (p_idempotency_key, p_actor, 'soft_delete_user') ON CONFLICT (idempotency_key) DO NOTHING;
END IF;
RETURN _after;
END;
$$;
-- 9) Restore RPC
CREATE OR REPLACE FUNCTION public.restore_user(
        p_target uuid,
        p_actor uuid,
        p_request_id uuid DEFAULT NULL,
        p_surface text DEFAULT 'AdminUI'
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _before jsonb;
_after jsonb;
BEGIN IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_actor
        AND ur.role = 'admin'
) THEN RAISE EXCEPTION 'permission_denied';
END IF;
SELECT to_jsonb(u) INTO _before
FROM public.users u
WHERE u.id = p_target;
IF _before IS NULL THEN RAISE EXCEPTION 'not_found';
END IF;
IF (_before->>'deleted_at') IS NULL THEN RETURN jsonb_build_object('status', 'not_deleted');
END IF;
UPDATE public.users
SET deleted_at = NULL,
    deletion_reason = NULL
WHERE id = p_target;
SELECT to_jsonb(u) INTO _after
FROM public.users u
WHERE u.id = p_target;
INSERT INTO public.audit_log (
        table_name,
        record_id,
        action,
        actor_id,
        surface,
        request_id,
        before_state,
        after_state
    )
VALUES (
        'users',
        p_target,
        'restore',
        p_actor,
        p_surface,
        p_request_id,
        _before,
        _after
    );
PERFORM public.enqueue_outbox(
    'user.restored',
    jsonb_build_object(
        'id',
        p_target,
        'request_id',
        p_request_id,
        'actor',
        p_actor,
        'surface',
        p_surface
    )
);
RETURN _after;
END;
$$;
-- 10) Grant execute on RPCs to authenticated (server still enforces admin checks)
GRANT EXECUTE ON FUNCTION public.soft_delete_user(uuid, uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_user(uuid, uuid, uuid, text) TO authenticated;
-- 11) Backfill existing user_roles into role_bindings (idempotent)
INSERT INTO public.role_bindings (user_id, role, created_at)
SELECT user_id,
    role,
    now()
FROM public.user_roles ur ON CONFLICT DO NOTHING;
-- 12) Enqueue trigger for role_bindings to keep hubspot queue in sync
CREATE OR REPLACE FUNCTION public.enqueue_user_hubspot_sync_from_bindings() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM public.enqueue_user_hubspot_sync(COALESCE(NEW.user_id, OLD.user_id));
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enqueue_role_bindings_ins ON public.role_bindings;
CREATE TRIGGER trg_enqueue_role_bindings_ins
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.role_bindings FOR EACH ROW EXECUTE FUNCTION public.enqueue_user_hubspot_sync_from_bindings();
-- 13) Safe indexes
CREATE INDEX IF NOT EXISTS idx_tombstones_table ON public.tombstones (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_role_bindings_user ON public.role_bindings (user_id);
-- 14) Ownership alignment
ALTER FUNCTION public.enqueue_outbox(text, jsonb) OWNER TO postgres;
ALTER FUNCTION public.soft_delete_user(uuid, uuid, text, text, uuid, text) OWNER TO postgres;
ALTER FUNCTION public.restore_user(uuid, uuid, uuid, text) OWNER TO postgres;
ALTER FUNCTION public.enqueue_user_hubspot_sync_from_bindings() OWNER TO postgres;
-- 15) Example RLS policies (keep conservative defaults; review before enabling wide access)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Allow service_role to read via supabase policy implicitly; restrict authenticated selects to actor only
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'audit_actor_access'
        AND polrelid = 'public.audit_log'::regclass
) THEN CREATE POLICY audit_actor_access ON public.audit_log FOR
SELECT TO authenticated USING (actor_id = auth.uid());
END IF;
END $$;
ALTER TABLE public.tombstones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'tombstone_actor_access'
        AND polrelid = 'public.tombstones'::regclass
) THEN CREATE POLICY tombstone_actor_access ON public.tombstones FOR
SELECT USING (cascade_from = auth.uid());
END IF;
END $$;
ALTER TABLE public.role_bindings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'role_binding_user_access'
        AND polrelid = 'public.role_bindings'::regclass
) THEN CREATE POLICY role_binding_user_access ON public.role_bindings FOR
SELECT USING (user_id = auth.uid());
END IF;
END $$;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'outbox_event_access'
        AND polrelid = 'public.outbox_events'::regclass
) THEN CREATE POLICY outbox_event_access ON public.outbox_events FOR
SELECT USING (true);
END IF;
END $$;