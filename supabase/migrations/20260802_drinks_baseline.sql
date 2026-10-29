-- 20260802_drinks_baseline  (B9)
--
-- BASELINE / DOCUMENTATION MIGRATION. Reproduces what already exists on the
-- remote EkQuarter project: public.drinks as it stands after the remote
-- migrations ekquarter_core_tables, drink_recipe_provenance,
-- recipe_essentials_unknowns and recipe_quality_publication_gate. Do not
-- re-run blindly against the remote project. Every statement below was read
-- back with read-only SQL on 2026-10-13 (pg_attribute, pg_constraint,
-- pg_policies, pg_trigger, pg_class.relacl).
--
-- Used by: Find My Drink (app/find-my-drink/queries.ts, anon key, REST read).
-- Owner decision 2026-10-12: the recipe browser stays; drinks is owned content.
--
-- Structure only. No row data: the remote holds 9,462 rows, 50 of them
-- publishable (published + editorial_ready); that content is managed in
-- Supabase Studio and by scripts/recipe-catalogue/, not by migrations.
--
-- Fail-closed publication gate: anon/authenticated can SELECT only rows that
-- are published, editorial_ready, provenance-complete and have a non-empty
-- recipe. There is no write policy and no write grant for client roles.
--
-- set_updated_at() is shared with profiles (see 20260801_profiles_baseline);
-- it is repeated here with create or replace so this file stands alone.

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

create table if not exists public.drinks (
  id text not null,
  name text not null,
  alt_names text[] not null default '{}'::text[],
  description text,
  category text not null,
  subcategory text,
  base_spirit text,
  secondary_spirits text[] not null default '{}'::text[],
  ingredients jsonb not null default '[]'::jsonb,
  preparation jsonb not null default '[]'::jsonb,
  glassware text,
  garnish text,
  ice_type text,
  serving_temp text not null default 'iced'::text,
  abv numeric(4,1) default null,
  strength smallint,
  sweetness smallint,
  sourness smallint,
  bitterness smallint,
  smokiness smallint,
  fruitiness smallint,
  herbal smallint,
  creaminess smallint,
  spice smallint,
  carbonation smallint,
  complexity smallint,
  mood_tags text[] not null default '{}'::text[],
  occasion_tags text[] not null default '{}'::text[],
  seasonal_tags text[] not null default '{}'::text[],
  budget_category text,
  experience_level text,
  dietary_tags text[] not null default '{}'::text[],
  allergens text[],
  has_caffeine boolean,
  zero_proof_alt_id text,
  prep_time_min smallint,
  image_url text,
  image_alt text,
  featured boolean not null default false,
  status text not null default 'published'::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_name text,
  source_url text,
  source_retrieved_at timestamptz,
  content_origin text,
  alcohol_type text,
  ingredient_details jsonb,
  recipe_yield text,
  servings numeric,
  preparation_method text,
  recipe_quality_issues text[],
  editorial_ready boolean not null default false,
  constraint drinks_pkey primary key (id),
  constraint drinks_abv_check check (abv >= 0 and abv <= 100),
  constraint drinks_alcohol_type_check check (alcohol_type is null or alcohol_type = any (array['cocktail'::text, 'mocktail'::text])),
  constraint drinks_bitterness_check check (bitterness >= 0 and bitterness <= 10),
  constraint drinks_budget_category_check check (budget_category = any (array['budget'::text, 'standard'::text, 'premium'::text])),
  constraint drinks_carbonation_check check (carbonation >= 0 and carbonation <= 10),
  constraint drinks_complexity_check check (complexity >= 0 and complexity <= 10),
  constraint drinks_content_origin_check check (content_origin is null or content_origin = 'allcheers_original_from_facts'::text),
  constraint drinks_creaminess_check check (creaminess >= 0 and creaminess <= 10),
  constraint drinks_experience_level_check check (experience_level = any (array['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  constraint drinks_fruitiness_check check (fruitiness >= 0 and fruitiness <= 10),
  constraint drinks_herbal_check check (herbal >= 0 and herbal <= 10),
  constraint drinks_ingredient_details_array_check check (ingredient_details is null or jsonb_typeof(ingredient_details) = 'array'::text),
  constraint drinks_prep_time_min_check check (prep_time_min >= 0),
  constraint drinks_preparation_method_check check (preparation_method is null or preparation_method = any (array['shake'::text, 'stir'::text, 'blend'::text, 'build'::text, 'batch'::text, 'hot'::text])),
  constraint drinks_serving_temp_check check (serving_temp = any (array['iced'::text, 'hot'::text, 'any'::text])),
  constraint drinks_servings_positive_check check (servings is null or servings > 0::numeric),
  constraint drinks_smokiness_check check (smokiness >= 0 and smokiness <= 10),
  constraint drinks_source_name_check check (source_name is null or source_name = any (array['drinknation'::text, 'mindfulmocktail'::text])),
  constraint drinks_source_url_check check (source_url is null or (source_url ~ '^https://[^[:space:]]+$'::text and char_length(source_url) <= 2048)),
  constraint drinks_sourness_check check (sourness >= 0 and sourness <= 10),
  constraint drinks_spice_check check (spice >= 0 and spice <= 10),
  constraint drinks_status_check check (status = any (array['draft'::text, 'published'::text, 'archived'::text])),
  constraint drinks_strength_check check (strength >= 1 and strength <= 3),
  constraint drinks_sweetness_check check (sweetness >= 0 and sweetness <= 10),
  constraint drinks_zero_proof_alt_id_fkey foreign key (zero_proof_alt_id) references public.drinks (id) on delete set null
);

comment on table public.drinks is
  'EkQuarter canonical drink catalog. Curated in Supabase Studio; clients read status=published rows only.';

alter table public.drinks enable row level security;

drop policy if exists drinks_public_read on public.drinks;
create policy drinks_public_read on public.drinks
  for select to public using (
    status = 'published' and editorial_ready
    and alcohol_type = any (array['cocktail'::text, 'mocktail'::text])
    and length(trim(both from source_name)) > 0
    and length(trim(both from source_url)) > 0
    and source_retrieved_at is not null
    and length(trim(both from content_origin)) > 0
    and recipe_quality_issues = '{}'::text[]
    and case when jsonb_typeof(ingredients) = 'array' then jsonb_array_length(ingredients) > 0 else false end
    and case when jsonb_typeof(preparation) = 'array' then jsonb_array_length(preparation) > 0 else false end
  );

drop trigger if exists drinks_set_updated_at on public.drinks;
create trigger drinks_set_updated_at
  before update on public.drinks
  for each row execute function public.set_updated_at();

-- Remote grants: client roles read-only; service_role full (Supabase default).
revoke all on public.drinks from anon, authenticated;
grant select on public.drinks to anon, authenticated;
grant all on public.drinks to service_role;
