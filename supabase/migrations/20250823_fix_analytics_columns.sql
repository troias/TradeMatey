-- Ensure analytics table has required columns & indexes
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'analytics'
        AND column_name = 'created_at'
) THEN
ALTER TABLE public.analytics
ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'analytics'
        AND column_name = 'metadata'
) THEN
ALTER TABLE public.analytics
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
END IF;
-- Backfill any NULL created_at (in case column added without default on existing rows)
UPDATE public.analytics
SET created_at = now()
WHERE created_at IS NULL;
-- Add CHECK constraint for event_type if missing
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_event_type_check'
) THEN
ALTER TABLE public.analytics
ADD CONSTRAINT analytics_event_type_check CHECK (
        event_type IN (
            'job_posted',
            'job_accepted',
            'milestone_paid',
            'milestone_verified',
            'payment_received',
            'dispute_filed',
            'premium_subscribed',
            'referral_sent'
        )
    );
END IF;
END $$;
-- Indexes (create if not exists)
CREATE INDEX IF NOT EXISTS idx_analytics_user_created_at ON public.analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics(event_type);
-- RLS enable (idempotent)
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analytics_select_own ON public.analytics;
CREATE POLICY analytics_select_own ON public.analytics FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS analytics_insert_own ON public.analytics;
CREATE POLICY analytics_insert_own ON public.analytics FOR
INSERT WITH CHECK (auth.uid() = user_id);