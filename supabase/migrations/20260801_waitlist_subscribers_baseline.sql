-- 20260801_waitlist_subscribers_baseline  (B9)
--
-- BASELINE / DOCUMENTATION MIGRATION. Reproduces what already exists on the
-- remote EkQuarter project (created via the remote migrations
-- 20260815142117 ekquarter_core_tables, 20260824121716
-- segment_waitlist_for_early_access and 20260824122227
-- drop_redundant_waitlist_email_constraint). Do not re-run blindly against the
-- remote project; it is for rebuilding a fresh database and for review.
--
-- Every part below was read back from the remote with read-only SQL
-- (pg_policies, pg_constraint, pg_indexes, pg_class.relacl, information_schema)
-- on 2026-10-13.
--
-- Used by app/early-access/actions.ts: anon INSERT only. 201 = success,
-- 409 (23505 on waitlist_email_unique) = already on the list. No anon reads:
-- RLS is enabled and the only policy is INSERT. Grants are tightened to match
-- (B9 Step 2, 2026-10-13): anon and authenticated hold INSERT only, so reads,
-- updates and deletes are blocked by grants as well as by RLS.

create extension if not exists citext with schema extensions;

create table if not exists public.waitlist_subscribers (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null,
  source text not null default 'footer',
  city text,
  consent_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  interests text[] not null default '{}'::text[],
  preference text,
  cta_source text,
  consent_version text
);

-- CHECK constraints (PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_city_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_city_check
      check (city is null or char_length(city) <= 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_consent_version_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_consent_version_check
      check (consent_version is null or char_length(consent_version) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_cta_source_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_cta_source_check
      check (cta_source is null or (char_length(cta_source) <= 40 and cta_source ~ '^[a-z0-9-]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_email_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_email_check
      check (email operator(extensions.~*) '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::extensions.citext);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_interests_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_interests_check
      check (interests <@ array['find-my-sip', 'party-planner', 'zero-percent', 'jaipur']);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_preference_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_preference_check
      check (preference is null or preference = any (array['alcoholic', 'zero', 'both', 'undecided']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_subscribers_source_check' and conrelid = 'public.waitlist_subscribers'::regclass) then
    alter table public.waitlist_subscribers add constraint waitlist_subscribers_source_check
      check (source = any (array['footer', 'quiz', 'venue-teaser', 'early-access']));
  end if;
end;
$$;

create unique index if not exists waitlist_email_unique
  on public.waitlist_subscribers (email);

alter table public.waitlist_subscribers enable row level security;

-- Insert-only for everyone (policy role is PUBLIC). No SELECT/UPDATE/DELETE policy.
drop policy if exists waitlist_insert on public.waitlist_subscribers;
create policy waitlist_insert on public.waitlist_subscribers
  for insert
  with check (true);

-- Insert-only grants for client roles; service_role keeps full access.
revoke all on public.waitlist_subscribers from anon, authenticated;
grant insert on public.waitlist_subscribers to anon, authenticated;
grant all on public.waitlist_subscribers to service_role;

comment on table public.waitlist_subscribers is
  'Email capture (footer form, quiz, venue teaser, early-access page). Insert-only from clients — no read-back. Manage/unsubscribe in Studio.';
comment on column public.waitlist_subscribers.email is
  'Subscriber email (citext). Case-insensitive dedupe enforced by waitlist_email_unique index; duplicates surface as 23505.';
comment on column public.waitlist_subscribers.interests is
  'Selected demand segments: find-my-sip | party-planner | zero-percent | jaipur. App requires at least one for early-access signups.';
comment on column public.waitlist_subscribers.preference is
  'Drink preference: alcoholic | zero | both | undecided. Optional.';
comment on column public.waitlist_subscribers.cta_source is
  'Attribution slug from the CTA that led to the form (?from=), e.g. header, home, find-my-sip.';
comment on column public.waitlist_subscribers.consent_version is
  'Version tag of the consent copy shown at signup, e.g. early-access-v1. consent_at records when.';
