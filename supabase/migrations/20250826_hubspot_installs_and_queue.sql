-- HubSpot installs, DLQ, and queue enhancements
-- 1) installs table
CREATE TABLE IF NOT EXISTS public.hubspot_installs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    installer_user_id uuid,
    portal_id text NOT NULL,
    app_client_id text,
    created_at timestamptz DEFAULT now()
);
-- 2) Dead-letter queue for hubspot sync failures
CREATE TABLE IF NOT EXISTS public.hubspot_dlq (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id bigint,
    user_id uuid,
    error text,
    attempts integer DEFAULT 0,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);
-- 3) Enhance existing hubspot_sync_queue with attempts, last_error, next_run_at, locked_at
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hubspot_sync_queue'
        AND column_name = 'attempts'
) THEN
ALTER TABLE public.hubspot_sync_queue
ADD COLUMN attempts integer DEFAULT 0;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hubspot_sync_queue'
        AND column_name = 'last_error'
) THEN
ALTER TABLE public.hubspot_sync_queue
ADD COLUMN last_error text;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hubspot_sync_queue'
        AND column_name = 'next_run_at'
) THEN
ALTER TABLE public.hubspot_sync_queue
ADD COLUMN next_run_at timestamptz DEFAULT now();
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hubspot_sync_queue'
        AND column_name = 'locked_at'
) THEN
ALTER TABLE public.hubspot_sync_queue
ADD COLUMN locked_at timestamptz;
END IF;
END $$;