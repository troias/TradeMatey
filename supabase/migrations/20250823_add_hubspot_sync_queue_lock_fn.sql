-- Function to atomically lock a batch of hubspot_sync_queue rows
CREATE OR REPLACE FUNCTION public.lock_hubspot_sync_queue(p_limit int) RETURNS SETOF public.hubspot_sync_queue LANGUAGE sql AS $$ WITH cte AS (
        SELECT id
        FROM public.hubspot_sync_queue
        WHERE locked_at IS NULL
            AND next_run_at <= now()
        ORDER BY next_run_at ASC
        LIMIT GREATEST(p_limit, 1) FOR
        UPDATE SKIP LOCKED
    )
UPDATE public.hubspot_sync_queue q
SET locked_at = now(),
    updated_at = now()
WHERE q.id IN (
        SELECT id
        FROM cte
    )
RETURNING q.*;
$$;