-- Keep legacy users.roles array synchronized with user_roles table
alter table public.users
add column if not exists roles text [] default '{}'::text [];
create or replace function public.refresh_user_roles_array(p_user_id uuid) returns void language plpgsql as $$ begin
update public.users u
set roles = coalesce(
        (
            select array_agg(
                    role
                    order by role
                )
            from public.user_roles ur
            where ur.user_id = u.id
        ),
        '{}'
    )::text []
where u.id = p_user_id;
end;
$$;
create or replace function public.refresh_user_roles_array_trigger() returns trigger language plpgsql as $$ begin perform public.refresh_user_roles_array(
        case
            when TG_OP = 'DELETE' then OLD.user_id
            else NEW.user_id
        end
    );
return null;
end;
$$;
drop trigger if exists trg_user_roles_sync on public.user_roles;
create trigger trg_user_roles_sync
after
insert
    or
update
    or delete on public.user_roles for each row execute function public.refresh_user_roles_array_trigger();
-- Backfill existing
do $$
declare r record;
begin for r in
select distinct user_id
from public.user_roles loop perform public.refresh_user_roles_array(r.user_id);
end loop;
end;
$$;