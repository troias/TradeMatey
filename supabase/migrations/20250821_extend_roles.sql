-- Extend allowed roles in user_roles.role CHECK constraint
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles
add constraint user_roles_role_check check (
        role in (
            'client',
            'tradie',
            'admin',
            'marketing',
            'finance',
            'support',
            'employee',
            -- enterprise roles
            'operations',
            'compliance',
            'risk',
            'product',
            'engineering',
            'analyst',
            'auditor',
            'finance_manager',
            'support_manager',
            'marketing_manager'
        )
    );
-- Helpful index on role remains
create index if not exists idx_user_roles_role on public.user_roles(role);