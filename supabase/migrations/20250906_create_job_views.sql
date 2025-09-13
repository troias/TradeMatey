-- Migration: create job_views table to record when a viewer opens a job
CREATE TABLE IF NOT EXISTS public.job_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    viewer_id uuid NULL REFERENCES public.users(id),
    created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views(job_id);
-- Minimal RLS policy: allow insert by authenticated users; allow public reads via service policy
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'job_views_auth_insert'
        AND polrelid = 'public.job_views'::regclass
) THEN CREATE POLICY job_views_auth_insert ON public.job_views FOR
INSERT USING (auth.role() IS NOT NULL);
END IF;
END $$;