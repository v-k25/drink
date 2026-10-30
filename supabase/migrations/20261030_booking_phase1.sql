-- 20261030_booking_phase1  (B11, Phase 1: request-to-book, no payment)
--
-- NEW migration, NOT yet applied to the remote EkQuarter project. Apply only
-- with owner approval, after review, ideally on a staging/branch database first.
--
-- Scope (docs/socifer-product-plan.md section 7, Phase 1):
--   venues, venue_members, venue_offers, booking_requests, booking_status_history.
--   Statuses: requested -> approved | declined | expired; requested/approved -> cancelled.
--   No payments, quotes or passes (Phase 2).
--
-- Design rules
--   * Clients never write the booking tables directly. Writes go through three
--     SECURITY DEFINER functions that check auth.uid(), lock the offer row,
--     enforce capacity and write the status history in one transaction.
--   * RLS: customers see only their own requests; venue staff see only their
--     venue's requests; anyone may read active venues and offers.
--   * Prices on offers are display-only until Phase 2 (server-set quotes).
--   * The age threshold and door policy are an open business question (D11), so
--     nothing here hard-codes an age; venues verify ID at the door.

-- ---------------------------------------------------------------- venues
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  city text not null default 'Jaipur',
  area text,
  address text,
  active boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_slug_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  constraint venues_name_check check (char_length(name) between 1 and 120),
  constraint venues_city_check check (city = 'Jaipur'),
  constraint venues_area_check check (area is null or char_length(area) <= 80),
  constraint venues_address_check check (address is null or char_length(address) <= 240)
);
create unique index if not exists venues_slug_unique on public.venues (slug);

-- ---------------------------------------------------------------- venue_members
create table if not exists public.venue_members (
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id),
  constraint venue_members_role_check check (role in ('owner', 'staff'))
);
create index if not exists venue_members_user_idx on public.venue_members (user_id);

-- ---------------------------------------------------------------- venue_offers
create table if not exists public.venue_offers (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  kind text not null,
  title text not null,
  description text,
  entry_rules text,
  price_paise integer not null default 0,
  capacity_per_night integer not null,
  max_party_size smallint not null default 10,
  active boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venue_offers_kind_check check (kind in ('entry', 'table', 'package')),
  constraint venue_offers_title_check check (char_length(title) between 1 and 120),
  constraint venue_offers_description_check check (description is null or char_length(description) <= 500),
  constraint venue_offers_rules_check check (entry_rules is null or char_length(entry_rules) <= 500),
  constraint venue_offers_price_check check (price_paise >= 0),
  constraint venue_offers_capacity_check check (capacity_per_night between 1 and 5000),
  constraint venue_offers_party_check check (max_party_size between 1 and 50),
  -- lets booking_requests prove that its offer belongs to its venue
  constraint venue_offers_id_venue_unique unique (id, venue_id)
);
create index if not exists venue_offers_venue_idx on public.venue_offers (venue_id);

-- ---------------------------------------------------------------- booking_requests
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null,
  offer_id uuid not null,
  night date not null,
  party_size smallint not null,
  note text,
  status text not null default 'requested',
  idempotency_key text not null,
  expires_at timestamptz not null,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_requests_offer_fk foreign key (offer_id, venue_id) references public.venue_offers (id, venue_id) on delete cascade,
  constraint booking_requests_status_check check (status in ('requested', 'approved', 'declined', 'expired', 'cancelled')),
  constraint booking_requests_party_check check (party_size between 1 and 50),
  constraint booking_requests_note_check check (note is null or char_length(note) <= 300),
  constraint booking_requests_key_check check (idempotency_key ~ '^[A-Za-z0-9_-]{8,64}$')
);
-- One live request per person, venue and night.
create unique index if not exists booking_requests_active_unique
  on public.booking_requests (user_id, venue_id, night) where status in ('requested', 'approved');
-- A retried create returns the same row.
create unique index if not exists booking_requests_idempotency_unique
  on public.booking_requests (user_id, idempotency_key);
create index if not exists booking_requests_capacity_idx
  on public.booking_requests (offer_id, night) where status in ('requested', 'approved');
create index if not exists booking_requests_venue_idx on public.booking_requests (venue_id, status, night);

-- ---------------------------------------------------------------- booking_status_history
create table if not exists public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.booking_requests (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  constraint booking_status_history_to_check check (to_status in ('requested', 'approved', 'declined', 'expired', 'cancelled')),
  constraint booking_status_history_reason_check check (reason is null or char_length(reason) <= 300)
);
create index if not exists booking_status_history_booking_idx on public.booking_status_history (booking_id, created_at);

-- ---------------------------------------------------------------- updated_at triggers
-- public.set_updated_at() is defined in 20260801000001_profiles_baseline.sql.
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'venues_set_updated_at') then
    create trigger venues_set_updated_at before update on public.venues for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'venue_offers_set_updated_at') then
    create trigger venue_offers_set_updated_at before update on public.venue_offers for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'booking_requests_set_updated_at') then
    create trigger booking_requests_set_updated_at before update on public.booking_requests for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------- RLS
alter table public.venues enable row level security;
alter table public.venue_members enable row level security;
alter table public.venue_offers enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_status_history enable row level security;

drop policy if exists venues_public_select on public.venues;
create policy venues_public_select on public.venues for select using (active);
drop policy if exists venues_member_select on public.venues;
create policy venues_member_select on public.venues for select
  using (exists (select 1 from public.venue_members m where m.venue_id = venues.id and m.user_id = (select auth.uid())));

drop policy if exists venue_members_own_select on public.venue_members;
create policy venue_members_own_select on public.venue_members for select using (user_id = (select auth.uid()));

drop policy if exists venue_offers_public_select on public.venue_offers;
create policy venue_offers_public_select on public.venue_offers for select
  using (active and exists (select 1 from public.venues v where v.id = venue_offers.venue_id and v.active));
drop policy if exists venue_offers_member_select on public.venue_offers;
create policy venue_offers_member_select on public.venue_offers for select
  using (exists (select 1 from public.venue_members m where m.venue_id = venue_offers.venue_id and m.user_id = (select auth.uid())));

drop policy if exists booking_requests_select on public.booking_requests;
create policy booking_requests_select on public.booking_requests for select
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.venue_members m where m.venue_id = booking_requests.venue_id and m.user_id = (select auth.uid()))
  );

-- History is visible to whoever can see the booking (the subquery runs under the caller's RLS).
drop policy if exists booking_status_history_select on public.booking_status_history;
create policy booking_status_history_select on public.booking_status_history for select
  using (exists (select 1 from public.booking_requests b where b.id = booking_status_history.booking_id));

-- No insert/update/delete policies: clients write only through the functions below.
revoke all on public.venues, public.venue_members, public.venue_offers, public.booking_requests, public.booking_status_history from anon, authenticated;
grant select on public.venues, public.venue_offers to anon, authenticated;
grant select on public.venue_members, public.booking_requests, public.booking_status_history to authenticated;
grant all on public.venues, public.venue_members, public.venue_offers, public.booking_requests, public.booking_status_history to service_role;

-- ---------------------------------------------------------------- functions
-- The 48-hour answer window below is a placeholder until the owner sets the SLA (D11).
create or replace function public.create_booking_request(
  p_offer_id uuid, p_night date, p_party_size integer, p_note text, p_idempotency_key text
) returns public.booking_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_offer public.venue_offers;
  v_existing public.booking_requests;
  v_booked integer;
  v_row public.booking_requests;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,64}$' then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  -- A retry with the same key returns the original row.
  select * into v_existing from public.booking_requests where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then return v_existing; end if;

  -- Lock the offer so concurrent requests for it are checked one at a time.
  select o.* into v_offer
    from public.venue_offers o join public.venues v on v.id = o.venue_id
   where o.id = p_offer_id and o.active and v.active
     for update of o;
  if not found then raise exception 'offer_unavailable' using errcode = 'P0002'; end if;

  if p_night is null or p_night < v_today or p_night > v_today + 60 then
    raise exception 'invalid_night' using errcode = '22023';
  end if;
  if p_party_size is null or p_party_size < 1 or p_party_size > v_offer.max_party_size then
    raise exception 'invalid_party_size' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 300 then raise exception 'invalid_note' using errcode = '22023'; end if;

  select coalesce(sum(party_size), 0) into v_booked
    from public.booking_requests
   where offer_id = p_offer_id and night = p_night and status in ('requested', 'approved');
  if v_booked + p_party_size > v_offer.capacity_per_night then
    raise exception 'capacity_exceeded' using errcode = 'P0001';
  end if;

  insert into public.booking_requests (user_id, venue_id, offer_id, night, party_size, note, idempotency_key, expires_at, is_demo)
  values (v_user, v_offer.venue_id, v_offer.id, p_night, p_party_size::smallint, nullif(btrim(p_note), ''), p_idempotency_key, now() + interval '48 hours', v_offer.is_demo)
  returning * into v_row;

  insert into public.booking_status_history (booking_id, from_status, to_status, actor) values (v_row.id, null, 'requested', v_user);
  return v_row;
end;
$$;

create or replace function public.decide_booking_request(p_booking_id uuid, p_decision text, p_reason text default null)
returns public.booking_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.booking_requests;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_decision is null or p_decision not in ('approved', 'declined') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  if p_reason is not null and char_length(p_reason) > 300 then raise exception 'invalid_reason' using errcode = '22023'; end if;

  select * into v_row from public.booking_requests where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.venue_members m where m.venue_id = v_row.venue_id and m.user_id = v_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'requested' then raise exception 'invalid_transition' using errcode = 'P0001'; end if;
  if v_row.expires_at <= now() then raise exception 'request_expired' using errcode = 'P0001'; end if;

  update public.booking_requests set status = p_decision, decided_at = now(), decided_by = v_user where id = v_row.id returning * into v_row;
  insert into public.booking_status_history (booking_id, from_status, to_status, actor, reason) values (v_row.id, 'requested', p_decision, v_user, nullif(btrim(p_reason), ''));
  return v_row;
end;
$$;

create or replace function public.cancel_booking_request(p_booking_id uuid, p_reason text default null)
returns public.booking_requests
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_row public.booking_requests;
  v_from text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_reason is not null and char_length(p_reason) > 300 then raise exception 'invalid_reason' using errcode = '22023'; end if;

  select * into v_row from public.booking_requests where id = p_booking_id and user_id = v_user for update;
  if not found then raise exception 'booking_not_found' using errcode = 'P0002'; end if;
  if v_row.status not in ('requested', 'approved') then raise exception 'invalid_transition' using errcode = 'P0001'; end if;

  v_from := v_row.status;
  update public.booking_requests set status = 'cancelled' where id = v_row.id returning * into v_row;
  insert into public.booking_status_history (booking_id, from_status, to_status, actor, reason) values (v_row.id, v_from, 'cancelled', v_user, nullif(btrim(p_reason), ''));
  return v_row;
end;
$$;

-- Run on a schedule (service role only): requests the venue never answered become expired.
create or replace function public.expire_booking_requests()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  with expired as (
    update public.booking_requests set status = 'expired'
     where status = 'requested' and expires_at <= now()
    returning id
  ), logged as (
    insert into public.booking_status_history (booking_id, from_status, to_status, reason)
    select id, 'requested', 'expired', 'no venue response before expiry' from expired
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;

revoke all on function public.create_booking_request(uuid, date, integer, text, text) from public, anon, authenticated;
revoke all on function public.decide_booking_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.cancel_booking_request(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_booking_requests() from public, anon, authenticated;
grant execute on function public.create_booking_request(uuid, date, integer, text, text) to authenticated, service_role;
grant execute on function public.decide_booking_request(uuid, text, text) to authenticated, service_role;
grant execute on function public.cancel_booking_request(uuid, text) to authenticated, service_role;
grant execute on function public.expire_booking_requests() to service_role;

comment on table public.booking_requests is 'Phase 1 request-to-book. Written only through create/decide/cancel/expire functions; no payment.';
comment on column public.booking_requests.is_demo is 'Test data only. Remove with: delete from public.venues where is_demo (cascades to offers and requests).';
