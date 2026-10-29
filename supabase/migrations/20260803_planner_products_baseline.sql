-- 20260803_planner_products_baseline  (B9)
--
-- BASELINE / DOCUMENTATION MIGRATION. Reproduces what already exists on the
-- remote EkQuarter project: public.planner_products, the Jaipur bottle
-- catalogue behind the Party Planner. Remote migrations that produced it:
-- jaipur_planner_products, remove_false_mrp_defaults_from_live_planner_products
-- and remove_planner_product_source_columns (the candidate/backup copies were
-- removed by remove_obsolete_planner_staging_and_backup). Do not re-run blindly
-- against the remote project. Read back with read-only SQL on 2026-10-13.
--
-- Used by: app/party-planner/catalogue-server.ts, server side only, with the
-- service-role key (SUPABASE_SECRET_KEY).
--
-- Structure only. No row data: the remote holds 1,311 rows (Livcheers
-- website-listed prices, checked 2026-10-03). They are loaded by
-- scripts/jaipur-planner-supabase-import.py and mirrored in
-- app/party-planner/catalogue.json; they are intentionally not copied here.
--
-- Access model: RLS on with NO policies, so anon/authenticated see nothing even
-- if a grant is added by mistake. The only grants are to service_role
-- (INSERT, SELECT), matching the remote. The Supabase advisor reports this as
-- INFO "rls_enabled_no_policy"; that is intended.

create table if not exists public.planner_products (
  id text not null,
  category text not null,
  name text not null,
  brand text not null,
  size_ml integer not null,
  price_paise integer not null,
  city text not null default 'Jaipur'::text,
  constraint planner_products_pkey primary key (id),
  constraint planner_products_city_check check (city = 'Jaipur'::text),
  constraint planner_products_price_paise_check check (price_paise > 0),
  constraint planner_products_size_ml_check check (size_ml > 0)
);

alter table public.planner_products enable row level security;

revoke all on public.planner_products from anon, authenticated;
grant insert, select on public.planner_products to service_role;
