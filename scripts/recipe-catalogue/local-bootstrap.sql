-- Auth/profile fixtures for the isolated PostgreSQL smoke transaction ONLY.
-- Never apply this file to EkQuarter. No real identities or credentials.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table auth.users (id uuid primary key);
create table public.profiles (id uuid primary key references auth.users(id));
alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for all to authenticated
  using (auth.uid()=id) with check (auth.uid()=id);
grant select, insert on public.profiles to authenticated;
