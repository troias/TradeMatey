-- Ensure onboarding/profile columns exist on public.users
-- This is idempotent and safe to re-run.
alter table public.users
add column if not exists has_completed_onboarding boolean not null default false,
    add column if not exists region text,
    add column if not exists trade text,
    add column if not exists bio text;
-- Optional: index for frequent filtering
create index if not exists idx_users_has_completed_onboarding on public.users(has_completed_onboarding);