-- Team, invitations, permissions, portal settings, token vault columns, and worker metrics
-- 1) invitations table for invite workflow
CREATE TABLE IF NOT EXISTS public.invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    invited_by uuid,
    role text NOT NULL,
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending',
    -- pending/accepted/revoked
    accepted_by uuid,
    accepted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
-- 2) permissions table (optional, for future fine-grained permissions)
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz DEFAULT now()
);
-- 3) hubspot portal settings: property mappings & flags
CREATE TABLE IF NOT EXISTS public.hubspot_portal_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id text NOT NULL UNIQUE,
    property_mappings jsonb DEFAULT '{}'::jsonb,
    sync_flags jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hubspot_portal_settings_portal_id ON public.hubspot_portal_settings(portal_id);
-- 4) token vault columns (application-level encryption; migration keeps plaintext for compatibility)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hubspot_portals'
        AND column_name = 'encrypted_access_token'
) THEN
ALTER TABLE public.hubspot_portals
ADD COLUMN encrypted_access_token text;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hubspot_portals'
        AND column_name = 'encrypted_refresh_token'
) THEN
ALTER TABLE public.hubspot_portals
ADD COLUMN encrypted_refresh_token text;
END IF;
END $$;
-- 5) worker metrics table (per-day per-portal counters)
CREATE TABLE IF NOT EXISTS public.hubspot_worker_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id text NOT NULL,
    day date NOT NULL,
    processed int DEFAULT 0,
    errors int DEFAULT 0,
    dlq int DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hubspot_worker_metrics_portal_day ON public.hubspot_worker_metrics (portal_id, day);
-- 6) minimal RLS additions for role_bindings and users
ALTER TABLE public.role_bindings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'role_binding_service_read'
        AND polrelid = 'public.role_bindings'::regclass
) THEN CREATE POLICY role_binding_service_read ON public.role_bindings FOR
SELECT USING (true);
END IF;
END $$;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'users_self_read'
        AND polrelid = 'public.users'::regclass
) THEN CREATE POLICY users_self_read ON public.users FOR
SELECT USING (id = auth.uid());
END IF;
END $$;
-- Note: application should perform invite acceptance which inserts into users/role_bindings via service role or approved flow.
-- 7) upsert helper for worker metrics
CREATE OR REPLACE FUNCTION public.upsert_hubspot_worker_metric(
        p_portal_id text,
        p_processed int,
        p_errors int,
        p_dlq int
    ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
INSERT INTO public.hubspot_worker_metrics (
        portal_id,
        day,
        processed,
        errors,
        dlq,
        updated_at
    )
VALUES (
        p_portal_id,
        CURRENT_DATE,
        COALESCE(p_processed, 0),
        COALESCE(p_errors, 0),
        COALESCE(p_dlq, 0),
        now()
    ) ON CONFLICT (portal_id, day) DO
UPDATE
SET processed = hubspot_worker_metrics.processed + EXCLUDED.processed,
    errors = hubspot_worker_metrics.errors + EXCLUDED.errors,
    dlq = hubspot_worker_metrics.dlq + EXCLUDED.dlq,
    updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_hubspot_worker_metric(text, int, int, int) TO authenticated;