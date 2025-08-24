-- Create analytics events table
CREATE TABLE IF NOT EXISTS public.analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (
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
    ),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_user_created_at ON public.analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics(event_type);
-- RLS
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_select_own" ON public.analytics;
CREATE POLICY "analytics_select_own" ON public.analytics FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "analytics_insert_own" ON public.analytics;
CREATE POLICY "analytics_insert_own" ON public.analytics FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- (Optional) allow service role full access handled implicitly by bypass RLS.