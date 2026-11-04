-- 20261104_socifer_account_exists
--
-- Lets Create account refuse an email or phone that already has a Socifer account before any code is sent
-- (owner decision 2026-11-04). This project is shared with EkQuarter, so a login row alone isn't a Socifer account:
-- Socifer's create-account step records `consent` in the login's metadata, and that record is what counts
-- (isSociferAccount in app/account/rules.ts).
--
-- Applied to the remote project on 2026-11-04. Only the server's secret key (service_role) can call it, so the
-- public anon key can't be used to test whether an address is registered.

create or replace function public.socifer_account_exists(p_address text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where deleted_at is null
      and raw_user_meta_data ? 'consent'
      and (lower(email) = lower(p_address) or phone = ltrim(p_address, '+'))
  );
$$;

revoke all on function public.socifer_account_exists(text) from public, anon, authenticated;
grant execute on function public.socifer_account_exists(text) to service_role;
