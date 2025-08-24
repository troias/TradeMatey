-- Ensure a primary application role (client or tradie) exists for a user
create or replace function public.ensure_primary_role(p_user_id uuid, p_role text) returns void language plpgsql as $$ begin if p_role not in ('client', 'tradie') then raise exception 'ensure_primary_role only accepts client or tradie';
end if;
begin
insert into public.user_roles(user_id, role)
values (p_user_id, p_role) on conflict (user_id, role) do nothing;
exception
when unique_violation then null;
-- ignore race
end;
perform public.refresh_user_roles_array(p_user_id);
end;
$$;