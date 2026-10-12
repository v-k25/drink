-- Director-applied, additive recipe essentials schema. No data or policy changes.
alter table public.drinks
  add column if not exists ingredient_details jsonb,
  add column if not exists recipe_yield text,
  add column if not exists servings numeric,
  add column if not exists preparation_method text,
  add column if not exists recipe_quality_issues text[];

alter table public.drinks alter column strength drop not null;
alter table public.drinks alter column strength set default null;
alter table public.drinks alter column sweetness drop not null;
alter table public.drinks alter column sweetness set default null;
alter table public.drinks alter column has_caffeine drop not null;
alter table public.drinks alter column has_caffeine set default null;
alter table public.drinks alter column allergens drop not null;
alter table public.drinks alter column allergens set default null;

do $$ begin
  alter table public.drinks add constraint drinks_ingredient_details_array_check
    check (ingredient_details is null or jsonb_typeof(ingredient_details) = 'array');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.drinks add constraint drinks_servings_positive_check
    check (servings is null or servings > 0);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.drinks add constraint drinks_preparation_method_check
    check (preparation_method is null or preparation_method in ('shake','stir','blend','build','batch','hot'));
exception when duplicate_object then null; end $$;
