-- Fix users_roles_check to allow full expanded role taxonomy
alter table public.users drop constraint if exists users_roles_check;
alter table public.users
add constraint users_roles_check check (
        roles <@ ARRAY [
      'client','tradie','admin','marketing','finance','support','employee',
      'operations','compliance','risk','product','engineering','analyst','auditor',
      'finance_manager','support_manager','marketing_manager'
    ]::text []
    );
alter table public.users
alter column roles
set default '{}'::text [];
update public.users
set roles = '{}'::text []
where roles is null;
alter table public.users
alter column roles
set not null;
-- Re-run roles array backfill to ensure consistency, but only if function exists
DO $$
DECLARE r record;
DECLARE fn_exists boolean;
BEGIN
SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.proname = 'refresh_user_roles_array'
            AND n.nspname = 'public'
    ) INTO fn_exists;
IF fn_exists THEN FOR r IN
SELECT id
FROM public.users LOOP PERFORM public.refresh_user_roles_array(r.id);
END LOOP;
END IF;
END;
$$;