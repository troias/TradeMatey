-- Enforce no duplicate roles per user
create unique index if not exists user_roles_user_role_unique_idx on public.user_roles(user_id, role);
-- Enforce only one global admin
create unique index if not exists uniq_single_admin on public.user_roles(role)
where role = 'admin';