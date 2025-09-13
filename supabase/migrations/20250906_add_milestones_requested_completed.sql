-- Add requested_at and completed_at to milestones so tradie request flow is durable
-- Run this in Supabase SQL editor or apply via your migrations tooling
BEGIN;
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS requested_at timestamptz NULL;
ALTER TABLE public.milestones
ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;
-- Optional index to make queries for pending/requested milestones fast
CREATE INDEX IF NOT EXISTS idx_milestones_requested_at ON public.milestones(requested_at);
CREATE INDEX IF NOT EXISTS idx_milestones_completed_at ON public.milestones(completed_at);
COMMIT;