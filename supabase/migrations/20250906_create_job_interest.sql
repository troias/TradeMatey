-- Migration: create job_interest table to track tradie interest / acceptance
CREATE TABLE IF NOT EXISTS public.job_interest (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    tradie_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'interested',
    -- interested, accepted, rejected
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    accepted_at timestamptz,
    accepted_by uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_job_interest_job_id ON public.job_interest(job_id);
CREATE INDEX IF NOT EXISTS idx_job_interest_tradie_id ON public.job_interest(tradie_id);
-- Minimal RLS: allow inserts for authenticated users, and let services read
ALTER TABLE public.job_interest ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'job_interest_auth_insert'
        AND polrelid = 'public.job_interest'::regclass
) THEN CREATE POLICY job_interest_auth_insert ON public.job_interest FOR
INSERT WITH CHECK (auth.role() IS NOT NULL);
END IF;
END $$;