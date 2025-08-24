-- HubSpot portal tokens and audit
CREATE TABLE IF NOT EXISTS public.hubspot_portals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id text NOT NULL UNIQUE,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamptz,
    scopes text [],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hubspot_portals_portal_id ON public.hubspot_portals(portal_id);
-- Minimal token audit for refreshes
CREATE TABLE IF NOT EXISTS public.hubspot_token_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id uuid REFERENCES public.hubspot_portals(id) ON DELETE CASCADE,
    access_token text,
    refresh_token text,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);