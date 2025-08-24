-- Secure role assignment and approval workflow
-- 1) pending_role_changes table
CREATE TABLE IF NOT EXISTS public.pending_role_changes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id uuid NOT NULL,
    role text NOT NULL,
    reason text,
    requested_by uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    -- pending/approved/rejected/applied
    approvals jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pending_role_changes_target ON public.pending_role_changes(target_user_id);
-- 2) assign_role RPC: idempotent, records audit, only callable by service or via our approval flow
CREATE OR REPLACE FUNCTION public.assign_role(
        p_target uuid,
        p_role text,
        p_actor uuid,
        p_reason text DEFAULT NULL
    ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE _before jsonb;
BEGIN -- Defensive check: caller must already be admin OR function called by a DB superuser (service role)
IF NOT EXISTS (
    SELECT 1
    FROM public.role_bindings rb
    WHERE rb.user_id = p_actor
        AND rb.role = 'admin'
) THEN RAISE EXCEPTION 'permission_denied';
END IF;
-- idempotent insert
INSERT INTO public.role_bindings (user_id, role, created_at)
VALUES (p_target, p_role, now()) ON CONFLICT DO NOTHING;
-- audit
SELECT to_jsonb(r) INTO _before
FROM public.role_bindings r
WHERE r.user_id = p_target;
INSERT INTO public.audit_log(
        table_name,
        record_id,
        action,
        actor_id,
        surface,
        reason,
        before_state,
        after_state
    )
VALUES(
        'role_bindings',
        p_target,
        'grant_role',
        p_actor,
        'assign_role_rpc',
        p_reason,
        _before,
        jsonb_build_object('role', p_role)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.assign_role(uuid, text, uuid, text) TO authenticated;
-- 3) Restrict direct modifications to role_bindings: revoke write from authenticated role
REVOKE
INSERT,
    UPDATE,
    DELETE ON public.role_bindings
FROM authenticated;
-- 4) Helper to mark pending change applied (called by app server after approvals)
CREATE OR REPLACE FUNCTION public.apply_pending_role_change(p_id uuid, p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rec RECORD;
BEGIN
SELECT * INTO rec
FROM public.pending_role_changes
WHERE id = p_id;
IF rec IS NULL THEN RAISE EXCEPTION 'not_found';
END IF;
PERFORM public.assign_role(
    rec.target_user_id,
    rec.role,
    p_actor,
    rec.reason
);
UPDATE public.pending_role_changes
SET status = 'applied',
    updated_at = now()
WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_pending_role_change(uuid, uuid) TO authenticated;