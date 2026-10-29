-- Proposal only: do not apply until owner approves the new-schema checkpoint.
-- Public facts only; source category is retained separately from reviewed mapping.
create table if not exists public.pegpedia_catalogue (
  pegpedia_product_id uuid primary key,
  pegpedia_slug text not null,
  name text not null,
  brand_name text not null,
  source_category text not null,
  reviewed_category text,
  product_type text not null,
  volume_ml integer check (volume_ml is null or volume_ml > 0),
  bottle_abv numeric check (bottle_abv is null or bottle_abv between 0 and 100),
  planner_product_id text references public.planner_products(id),
  match_status text not null default 'pending_review'
    check (match_status in ('unmatched','exact_link','ambiguous','category_conflict','pending_review')),
  match_reason text not null,
  planner_candidates jsonb not null default '[]'::jsonb check (jsonb_typeof(planner_candidates) = 'array'),
  jaipur_eligibility text not null default 'not_evaluated' check (jaipur_eligibility in ('not_evaluated','eligible','ineligible')),
  import_status text not null default 'pending_review'
    check (import_status in ('pending_review','approved','imported','rejected')),
  price_evidence jsonb not null default '[]'::jsonb
    check (jsonb_typeof(price_evidence) = 'array'),
  source_url text not null,
  acquisition_page_url text not null,
  source_fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((planner_product_id is not null) = (match_status = 'exact_link')),
  check (length(trim(name)) > 0 and length(trim(brand_name)) > 0 and length(trim(source_category)) > 0 and length(trim(source_url)) > 0 and length(trim(acquisition_page_url)) > 0)
);

create unique index if not exists pegpedia_catalogue_one_source_per_planner_product
  on public.pegpedia_catalogue (planner_product_id)
  where planner_product_id is not null;

alter table public.pegpedia_catalogue enable row level security;
revoke all on public.pegpedia_catalogue from public, anon, authenticated;
grant all on public.pegpedia_catalogue to service_role;
drop policy if exists pegpedia_catalogue_service_role_only on public.pegpedia_catalogue;
create policy pegpedia_catalogue_service_role_only
  on public.pegpedia_catalogue
  for all to service_role
  using (true) with check (true);

-- Import preparation must use insert-only batches keyed by Pegpedia source identity:
-- insert into public.pegpedia_catalogue (...) values (...)
-- on conflict (pegpedia_product_id) do nothing;
-- Never upsert/overwrite source facts or existing planner_products rows.
