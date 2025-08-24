-- Alter existing bare analytics table to expected schema
-- Handles case where earlier CREATE TABLE IF NOT EXISTS left a minimal table (id, details)
BEGIN;
-- Add missing columns
ALTER TABLE public.analytics
ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.analytics
ADD COLUMN IF NOT EXISTS event_type text;
ALTER TABLE public.analytics
ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.analytics
ADD COLUMN IF NOT EXISTS created_at timestamptz;
-- Initialize metadata from legacy details column if present
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
        AND table_name = 'analytics'
        AND column_name = 'details'
) THEN
UPDATE public.analytics
SET metadata = COALESCE(metadata, details)
WHERE metadata IS NULL;
END IF;
END $$;
-- Set defaults for NULLs
UPDATE public.analytics
SET created_at = NOW()
WHERE created_at IS NULL;
UPDATE public.analytics
SET metadata = '{}'::jsonb
WHERE metadata IS NULL;
UPDATE public.analytics
SET event_type = 'job_posted'
WHERE event_type IS NULL;
-- placeholder for legacy rows
-- Apply NOT NULL & defaults (using separate ALTER to avoid rewriting before backfill)
ALTER TABLE public.analytics
ALTER COLUMN created_at
SET DEFAULT now();
ALTER TABLE public.analytics
ALTER COLUMN created_at
SET NOT NULL;
ALTER TABLE public.analytics
ALTER COLUMN metadata
SET DEFAULT '{}'::jsonb;
ALTER TABLE public.analytics
ALTER COLUMN metadata
SET NOT NULL;
ALTER TABLE public.analytics
ALTER COLUMN event_type
SET NOT NULL;
-- Add / fix foreign key: prefer auth.users if exists, else public.users
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname = 'auth'
)
AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
        AND table_name = 'users'
) THEN -- Drop old FK if points elsewhere
IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_user_id_fkey'
) THEN
ALTER TABLE public.analytics DROP CONSTRAINT analytics_user_id_fkey;
END IF;
ALTER TABLE public.analytics
ADD CONSTRAINT analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ELSE -- Fallback to public.users
IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_user_id_fkey'
) THEN
ALTER TABLE public.analytics
ADD CONSTRAINT analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END IF;
END IF;
END $$;
-- Event type constraint (drop / recreate to match allowed list)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_event_type_check'
) THEN
ALTER TABLE public.analytics DROP CONSTRAINT analytics_event_type_check;
END IF;
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
END $$;
-- Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user_created_at ON public.analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics(event_type);
-- RLS enable & policies
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'analytics'
        AND policyname = 'analytics_select_own'
) THEN DROP POLICY analytics_select_own ON public.analytics;
END IF;
IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'analytics'
        AND policyname = 'analytics_insert_own'
) THEN DROP POLICY analytics_insert_own ON public.analytics;
END IF;
END $$;
CREATE POLICY analytics_select_own ON public.analytics FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY analytics_insert_own ON public.analytics FOR
INSERT WITH CHECK (auth.uid() = user_id);
COMMIT;