-- HubSpot sync queue for reliable, near-real-time CRM updates
CREATE TABLE IF NOT EXISTS public.hubspot_sync_queue (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attempt int NOT NULL DEFAULT 0,
    next_run_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    last_error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- One queue row per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_hubspot_sync_queue_user ON public.hubspot_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_sync_queue_next_run ON public.hubspot_sync_queue(next_run_at);
-- Helper function to (re)enqueue a user
CREATE OR REPLACE FUNCTION public.enqueue_user_hubspot_sync(p_user_id uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
INSERT INTO public.hubspot_sync_queue(user_id, next_run_at, locked_at)
VALUES (p_user_id, now(), NULL) ON CONFLICT (user_id) DO
UPDATE
SET next_run_at = EXCLUDED.next_run_at,
    locked_at = NULL,
    updated_at = now();
END;
$$;
-- Trigger wrapper for INSERT/UPDATE style events
CREATE OR REPLACE FUNCTION public.enqueue_user_hubspot_sync_tg() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_user_id uuid;
BEGIN IF TG_TABLE_NAME = 'user_roles' THEN v_user_id := COALESCE(NEW.user_id, OLD.user_id);
ELSIF TG_TABLE_NAME = 'users' THEN v_user_id := NEW.id;
ELSE RETURN NULL;
END IF;
PERFORM public.enqueue_user_hubspot_sync(v_user_id);
RETURN NEW;
END;
$$;
-- Trigger for DELETE on user_roles (needs OLD)
CREATE OR REPLACE FUNCTION public.enqueue_user_hubspot_sync_delete_tg() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM public.enqueue_user_hubspot_sync(OLD.user_id);
RETURN OLD;
END;
$$;
-- Attach triggers (idempotent guard by dropping first if exist)
DROP TRIGGER IF EXISTS trg_enqueue_user_roles_ins ON public.user_roles;
CREATE TRIGGER trg_enqueue_user_roles_ins
AFTER
INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enqueue_user_hubspot_sync_tg();
DROP TRIGGER IF EXISTS trg_enqueue_user_roles_del ON public.user_roles;
CREATE TRIGGER trg_enqueue_user_roles_del
AFTER DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enqueue_user_hubspot_sync_delete_tg();
DROP TRIGGER IF EXISTS trg_enqueue_users_ins ON public.users;
CREATE TRIGGER trg_enqueue_users_ins
AFTER
INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.enqueue_user_hubspot_sync_tg();