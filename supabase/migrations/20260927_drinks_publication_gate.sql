-- Fail-closed publication gate aligned with the applied remote policy.
-- Local reset: base-schema.sql, then essentials-schema.sql before this file.
-- No automatic catalogue approval or publication.
alter table public.drinks add column if not exists editorial_ready boolean not null default false;
alter table public.drinks enable row level security;
drop policy if exists drinks_public_read on public.drinks;
create policy drinks_public_read on public.drinks for select to public using (
  status = 'published' and editorial_ready
  and alcohol_type in ('cocktail', 'mocktail')
  and length(trim(source_name)) > 0 and length(trim(source_url)) > 0
  and source_retrieved_at is not null and length(trim(content_origin)) > 0
  and recipe_quality_issues = '{}'::text[]
  and case when jsonb_typeof(ingredients) = 'array' then jsonb_array_length(ingredients) > 0 else false end
  and case when jsonb_typeof(preparation) = 'array' then jsonb_array_length(preparation) > 0 else false end
);
revoke all on public.drinks from anon, authenticated;
grant select on public.drinks to anon, authenticated;
