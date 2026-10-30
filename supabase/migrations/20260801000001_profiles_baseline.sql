-- 20260801_profiles_baseline  (B9)
--
-- BASELINE / DOCUMENTATION MIGRATION. Reproduces what already exists on the
-- remote EkQuarter project (created via the remote migrations
-- 20260815142117 ekquarter_core_tables and 20260815142832
-- ekquarter_rls_and_auth_bootstrap). Do not re-run blindly against the remote
-- project. Everything below was read back with read-only SQL on 2026-10-13.
--
-- profiles is kept as the FK target for future bookings (B11). Phone OTP
-- sign-in is removed from the app (owner decision 2026-10-12), so nothing in
-- the app reads it today.
--
-- Not reproduced here: the public.set_updated_at() function is shared and is
-- defined in the remote core migration; it is recreated below only so this file
-- is self-contained. Grants are tightened (B9 Step 2, 2026-10-13): anon has no
-- access, authenticated has select/insert/update, service_role is full. RLS
-- still limits authenticated users to their own row.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_city_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_city_check
      check (city is null or char_length(city) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_display_name_check
      check (display_name is null or char_length(display_name) <= 80);
  end if;
end;
$$;

alter table public.profiles enable row level security;

-- Owner-only. Policy role is PUBLIC; auth.uid() is null for anon, so anon matches nothing.
drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on table public.profiles is
  'Public profile data, one row per auth user. Auto-created on signup via handle_new_user trigger.';
