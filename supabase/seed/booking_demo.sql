-- Booking Phase 1: ONE demo venue and offer, FOR TESTING ONLY.
-- Run it by hand, after 20261030_booking_phase1.sql is applied, on a staging or
-- branch database. It is not a migration and is never run automatically.
--
-- Everything carries is_demo = true. Remove all of it (offers and requests
-- cascade) with the last statement in this file.

insert into public.venues (slug, name, area, address, active, is_demo)
values ('demo-club-jaipur', 'Demo Club (test only)', 'C-Scheme', 'Test address, Jaipur', true, true)
on conflict (slug) do nothing;

insert into public.venue_offers (venue_id, kind, title, description, entry_rules, price_paise, capacity_per_night, max_party_size, active, is_demo)
select v.id, 'table', 'Demo table for a night', 'Test offer. Not a real venue or price.', 'Test only. Carry photo ID.', 0, 12, 6, true, true
  from public.venues v
 where v.slug = 'demo-club-jaipur'
   and not exists (select 1 from public.venue_offers o where o.venue_id = v.id and o.title = 'Demo table for a night');

-- To make a test user the venue's staff (replace the uuid with a user from auth.users):
--   insert into public.venue_members (venue_id, user_id, role)
--   select id, '00000000-0000-0000-0000-000000000000', 'owner' from public.venues where slug = 'demo-club-jaipur';
--
-- Example walk-through as a signed-in customer (supabase-js):
--   supabase.rpc('create_booking_request', { p_offer_id, p_night: '2026-11-14', p_party_size: 4, p_note: 'Birthday', p_idempotency_key: 'demo-key-0001' })
-- then as the staff user:
--   supabase.rpc('decide_booking_request', { p_booking_id, p_decision: 'approved' })
-- then as the customer:
--   supabase.rpc('cancel_booking_request', { p_booking_id })

-- Remove all demo data:
--   delete from public.venues where is_demo;
