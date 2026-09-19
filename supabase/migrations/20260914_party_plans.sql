create table public.party_plans (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint party_plans_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint party_plans_snapshot_shape check (
    snapshot ? 'guests' and snapshot ? 'budgetPaise' and snapshot ? 'city' and
    snapshot ? 'lines' and snapshot ? 'totalPaise' and snapshot ? 'remainingPaise' and
    snapshot->>'city' = 'Jaipur' and jsonb_typeof(snapshot->'lines') = 'array'
  )
);

create or replace function public.party_plans_set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger party_plans_updated_at before update on public.party_plans
for each row execute function public.party_plans_set_updated_at();

alter table public.party_plans enable row level security;
create policy party_plans_select on public.party_plans for select to authenticated using (auth.uid() = user_id);
create policy party_plans_insert on public.party_plans for insert to authenticated with check (auth.uid() = user_id);
create policy party_plans_update on public.party_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy party_plans_delete on public.party_plans for delete to authenticated using (auth.uid() = user_id);
revoke all on public.party_plans from anon;
grant select, insert, update, delete on public.party_plans to authenticated;
