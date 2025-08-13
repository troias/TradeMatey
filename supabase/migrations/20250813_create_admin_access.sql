-- Migration: Admin access via single-use links and invitation flow
-- Tables: admin_links, admin_invites
-- admin_links: short-lived, single-use tokens for existing admins to jump in quickly
create table if not exists public.admin_links (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    used boolean not null default false,
    created_at timestamptz not null default now()
);
alter table public.admin_links enable row level security;
-- Only the owner (issuer) can select/update their links; anyone can insert for themselves
create policy if not exists "issuer can select own links" on public.admin_links for
select using (auth.uid() = user_id);
create policy if not exists "issuer can update own links" on public.admin_links for
update using (auth.uid() = user_id);
create policy if not exists "user can insert own link" on public.admin_links for
insert with check (auth.uid() = user_id);
-- admin_invites: invitation tokens to grant admin role to a specific email
create table if not exists public.admin_invites (
    id uuid primary key default gen_random_uuid(),
    invited_email text not null,
    invited_by uuid not null references public.users(id) on delete
    set null,
        token text not null unique,
        expires_at timestamptz not null,
        used boolean not null default false,
        accepted_by uuid references public.users(id) on delete
    set null,
        accepted_at timestamptz,
        created_at timestamptz not null default now()
);
alter table public.admin_invites enable row level security;
-- Only admins can create invites
create policy if not exists "admins can insert invites" on public.admin_invites for
insert with check (
        exists (
            select 1
            from public.user_roles ur
            where ur.user_id = auth.uid()
                and ur.role = 'admin'
        )
    );
-- Invitee (by email) can view their invite by token
create policy if not exists "invitee can select by token" on public.admin_invites for
select using (invited_email = (auth.jwt()->>'email'));
-- Invitee can update their invite (mark used) when accepting
create policy if not exists "invitee can update their invite" on public.admin_invites for
update using (invited_email = (auth.jwt()->>'email'));
-- Helpful indexes
create index if not exists idx_admin_links_user_id on public.admin_links(user_id);
create index if not exists idx_admin_links_token on public.admin_links(token);
create index if not exists idx_admin_invites_token on public.admin_invites(token);
create index if not exists idx_admin_invites_invited_email on public.admin_invites(invited_email);