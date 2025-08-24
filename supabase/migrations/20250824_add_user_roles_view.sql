-- Migration: create compatibility view user_roles_if_migrated
-- Keep app queries working while migrating from user_roles -> role_bindings.
CREATE OR REPLACE VIEW public.user_roles_if_migrated AS
SELECT rb.user_id,
    rb.role
FROM public.role_bindings rb
UNION
SELECT ur.user_id,
    ur.role
FROM public.user_roles ur
WHERE NOT EXISTS (
        SELECT 1
        FROM public.role_bindings rb
        WHERE rb.user_id = ur.user_id
            AND rb.role = ur.role
    );
GRANT SELECT ON public.user_roles_if_migrated TO authenticated;