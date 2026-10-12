-- Phase 2-3 community tables. Apply only after review; this file makes no data writes.
create schema if not exists private;

alter table public.saved_drinks enable row level security;
alter table public.saved_drinks alter column user_id set default auth.uid();
revoke all on public.saved_drinks from public, anon, authenticated;
grant select (user_id, drink_id, note, saved_at), insert (drink_id, note), update (note), delete on public.saved_drinks to authenticated;
drop policy if exists saved_own_select on public.saved_drinks; drop policy if exists saved_own_insert on public.saved_drinks; drop policy if exists saved_own_update on public.saved_drinks; drop policy if exists saved_own_delete on public.saved_drinks;
drop policy if exists saved_drinks_owner_select on public.saved_drinks;
drop policy if exists saved_drinks_owner_insert on public.saved_drinks;
drop policy if exists saved_drinks_owner_update on public.saved_drinks;
drop policy if exists saved_drinks_owner_delete on public.saved_drinks;
create policy saved_drinks_owner_select on public.saved_drinks for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_drinks_owner_insert on public.saved_drinks for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.drinks d where d.id=drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
create policy saved_drinks_owner_update on public.saved_drinks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_drinks_owner_delete on public.saved_drinks for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.drink_likes (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  drink_id text not null references public.drinks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, drink_id)
);
create table if not exists public.drink_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  drink_id text not null references public.drinks(id) on delete cascade, rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) <= 2000 and char_length(trim(body)) > 0), moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, drink_id)
);
create table if not exists public.drink_comments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  drink_id text not null references public.drinks(id) on delete cascade, kind text not null check (kind in ('comment','question','tip')),
  body text not null check (char_length(body) <= 2000 and char_length(trim(body)) > 0), moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.drink_likes enable row level security; alter table public.drink_reviews enable row level security; alter table public.drink_comments enable row level security;
revoke all on public.drink_likes, public.drink_reviews, public.drink_comments from public, anon, authenticated;
grant select (user_id, drink_id), insert (drink_id), delete on public.drink_likes to authenticated;
grant select (drink_id, rating, body, moderation_status, created_at), insert (drink_id, rating, body), delete on public.drink_reviews to authenticated;
grant select (id, drink_id, kind, body, moderation_status, created_at), insert (drink_id, kind, body), delete on public.drink_comments to authenticated;
create policy drink_likes_owner on public.drink_likes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.drinks d where d.id=drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
create policy drink_reviews_owner on public.drink_reviews for select to authenticated using ((select auth.uid()) = user_id and moderation_status <> 'rejected');
create policy drink_reviews_insert on public.drink_reviews for insert to authenticated with check ((select auth.uid()) = user_id and moderation_status = 'pending' and exists (select 1 from public.drinks d where d.id=drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
grant update (rating, body) on public.drink_reviews to authenticated;
create policy drink_reviews_update on public.drink_reviews for update to authenticated using ((select auth.uid()) = user_id and moderation_status <> 'rejected') with check ((select auth.uid()) = user_id and moderation_status = 'pending' and exists (select 1 from public.drinks d where d.id=drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
create policy drink_reviews_delete on public.drink_reviews for delete to authenticated using ((select auth.uid()) = user_id);
create policy drink_comments_owner on public.drink_comments for select to authenticated using ((select auth.uid()) = user_id and moderation_status <> 'rejected');
create policy drink_comments_insert on public.drink_comments for insert to authenticated with check ((select auth.uid()) = user_id and moderation_status = 'pending' and exists (select 1 from public.drinks d where d.id=drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
create policy drink_comments_delete on public.drink_comments for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists private.drink_reviews_public (id uuid primary key, drink_id text not null, rating integer not null, body text not null, created_at timestamptz not null);
create table if not exists private.drink_comments_public (id uuid primary key, drink_id text not null, kind text not null, body text not null, created_at timestamptz not null);
create table if not exists private.drink_social_stats (drink_id text primary key, likes integer not null default 0, reviews integer not null default 0, average_rating numeric(3,2));
create table if not exists private.community_rate_limits (user_id uuid not null, kind text not null, window_start timestamptz not null, hits integer not null, primary key(user_id,kind));
alter table private.community_rate_limits enable row level security;
revoke all on private.community_rate_limits from public, anon, authenticated;
create policy community_rate_limits_private on private.community_rate_limits for all to public using (false) with check (false);
create index if not exists drink_likes_drink_idx on public.drink_likes(drink_id);
create index if not exists drink_reviews_drink_created_idx on public.drink_reviews(drink_id,created_at);
create index if not exists drink_comments_drink_created_idx on public.drink_comments(drink_id,created_at);
create index if not exists drink_comments_user_created_idx on public.drink_comments(user_id,created_at);
create index if not exists saved_drinks_drink_idx on public.saved_drinks(drink_id);
create index if not exists drink_reviews_projection_drink_idx on private.drink_reviews_public(drink_id,created_at);
create index if not exists drink_comments_projection_drink_idx on private.drink_comments_public(drink_id,created_at);
alter table private.drink_reviews_public enable row level security; alter table private.drink_comments_public enable row level security; alter table private.drink_social_stats enable row level security;
grant usage on schema private to anon, authenticated;
create policy public_review_projection on private.drink_reviews_public for select to anon, authenticated using (exists (select 1 from public.drinks d where d.id=drink_reviews_public.drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
create policy public_comment_projection on private.drink_comments_public for select to anon, authenticated using (exists (select 1 from public.drinks d where d.id=drink_comments_public.drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
create policy public_stats_projection on private.drink_social_stats for select to anon, authenticated using (exists (select 1 from public.drinks d where d.id=drink_social_stats.drink_id and d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}'));
revoke all on private.drink_reviews_public, private.drink_comments_public, private.drink_social_stats from public, anon, authenticated;
grant select on private.drink_reviews_public, private.drink_comments_public, private.drink_social_stats to anon, authenticated;

create or replace view public.drink_reviews_public with (security_invoker = true) as select p.id,p.drink_id,p.rating,p.body,p.created_at from private.drink_reviews_public p join public.drinks d on d.id=p.drink_id where d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}';
create or replace view public.drink_comments_public with (security_invoker = true) as select p.id,p.drink_id,p.kind,p.body,p.created_at from private.drink_comments_public p join public.drinks d on d.id=p.drink_id where d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}';
create or replace view public.drink_social_stats with (security_invoker = true) as select s.drink_id,s.likes,s.reviews,s.average_rating from private.drink_social_stats s join public.drinks d on d.id=s.drink_id where d.status='published' and d.editorial_ready=true and d.alcohol_type in ('cocktail','mocktail') and d.source_name is not null and d.source_url is not null and d.source_retrieved_at is not null and d.content_origin is not null and d.recipe_quality_issues='{}';
revoke all on public.drink_reviews_public, public.drink_comments_public, public.drink_social_stats from public, anon, authenticated;
grant select on public.drink_reviews_public, public.drink_comments_public, public.drink_social_stats to anon, authenticated;

create or replace function private.refresh_drink_stats(target_drink text) returns void
language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(target_drink, 4242));
  insert into private.drink_social_stats(drink_id, likes, reviews, average_rating)
  select target_drink, (select count(*) from public.drink_likes where drink_id=target_drink),
    (select count(*) from public.drink_reviews where drink_id=target_drink and moderation_status='approved'),
    (select avg(rating)::numeric(3,2) from public.drink_reviews where drink_id=target_drink and moderation_status='approved')
  on conflict (drink_id) do update set likes=excluded.likes, reviews=excluded.reviews, average_rating=excluded.average_rating;
end $$;
create or replace function private.lock_drink_social() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$ begin perform pg_advisory_xact_lock(hashtextextended(case when tg_op='DELETE' then old.drink_id else new.drink_id end, 4242)); if tg_op='DELETE' then return old; else return new; end if; end $$;
create or replace function private.sync_review_public() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if tg_op in ('UPDATE','DELETE') then delete from private.drink_reviews_public where id=old.id; end if;
  if tg_op in ('INSERT','UPDATE') and new.moderation_status='approved' then
    insert into private.drink_reviews_public(id,drink_id,rating,body,created_at) values(new.id,new.drink_id,new.rating,new.body,new.created_at)
    on conflict(id) do update set rating=excluded.rating,body=excluded.body,drink_id=excluded.drink_id;
  end if;
  perform private.refresh_drink_stats(case when tg_op='DELETE' then old.drink_id else new.drink_id end);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create or replace function private.sync_comment_public() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if tg_op in ('UPDATE','DELETE') then delete from private.drink_comments_public where id=old.id; end if;
  if tg_op in ('INSERT','UPDATE') and new.moderation_status='approved' then
    insert into private.drink_comments_public(id,drink_id,kind,body,created_at) values(new.id,new.drink_id,new.kind,new.body,new.created_at)
    on conflict(id) do update set kind=excluded.kind,body=excluded.body,drink_id=excluded.drink_id;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create or replace function private.sync_like_stats() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin perform private.refresh_drink_stats(case when tg_op='DELETE' then old.drink_id else new.drink_id end); if tg_op='DELETE' then return old; else return new; end if; end $$;
create or replace function private.reset_review_moderation() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$ begin if new.rating<>old.rating or new.body<>old.body then new.moderation_status='pending'; end if; new.updated_at=now(); return new; end $$;
create or replace function private.reset_comment_moderation() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$ begin if new.kind<>old.kind or new.body<>old.body then new.moderation_status='pending'; end if; new.updated_at=now(); return new; end $$;
create or replace function private.consume_community_limit(uid uuid, category text) returns void language plpgsql security definer set search_path = pg_catalog, private as $$ declare current_hits integer; begin insert into private.community_rate_limits(user_id,kind,window_start,hits) values(uid,category,now(),1) on conflict(user_id,kind) do update set window_start=case when private.community_rate_limits.window_start <= now()-interval '1 minute' then now() else private.community_rate_limits.window_start end, hits=case when private.community_rate_limits.window_start <= now()-interval '1 minute' then 1 else private.community_rate_limits.hits+1 end returning hits into current_hits; if current_hits>5 then raise exception 'community rate limit exceeded'; end if; end $$;
create or replace function private.limit_comments() returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$ begin perform private.consume_community_limit(new.user_id,'comment'); return new; end $$;
create or replace function private.limit_reviews() returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$ begin if tg_op='INSERT' or new.rating<>old.rating or new.body<>old.body then perform private.consume_community_limit(new.user_id,'review'); end if; return new; end $$;
revoke execute on function private.refresh_drink_stats(text), private.lock_drink_social(), private.consume_community_limit(uuid,text), private.sync_review_public(), private.sync_comment_public(), private.sync_like_stats(), private.reset_review_moderation(), private.reset_comment_moderation(), private.limit_comments(), private.limit_reviews() from public, anon, authenticated;
drop trigger if exists drink_likes_social_lock on public.drink_likes;
create trigger drink_likes_social_lock before insert or update or delete on public.drink_likes for each row execute function private.lock_drink_social();
drop trigger if exists drink_reviews_social_lock on public.drink_reviews;
create trigger drink_reviews_social_lock before insert or update or delete on public.drink_reviews for each row execute function private.lock_drink_social();
drop trigger if exists drink_comments_social_lock on public.drink_comments;
create trigger drink_comments_social_lock before insert or update or delete on public.drink_comments for each row execute function private.lock_drink_social();
drop trigger if exists drink_reviews_reset_moderation on public.drink_reviews;
create trigger drink_reviews_reset_moderation before update on public.drink_reviews for each row execute function private.reset_review_moderation();
drop trigger if exists drink_reviews_rate_limit on public.drink_reviews;
create trigger drink_reviews_rate_limit before insert or update on public.drink_reviews for each row execute function private.limit_reviews();
drop trigger if exists drink_reviews_public_sync on public.drink_reviews;
create trigger drink_reviews_public_sync after insert or update or delete on public.drink_reviews for each row execute function private.sync_review_public();
drop trigger if exists drink_comments_reset_moderation on public.drink_comments;
create trigger drink_comments_reset_moderation before update on public.drink_comments for each row execute function private.reset_comment_moderation();
drop trigger if exists drink_comments_rate_limit on public.drink_comments;
create trigger drink_comments_rate_limit before insert on public.drink_comments for each row execute function private.limit_comments();
drop trigger if exists drink_comments_public_sync on public.drink_comments;
create trigger drink_comments_public_sync after insert or update or delete on public.drink_comments for each row execute function private.sync_comment_public();
drop trigger if exists drink_likes_stats_sync on public.drink_likes;
create trigger drink_likes_stats_sync after insert or delete on public.drink_likes for each row execute function private.sync_like_stats();
insert into private.drink_reviews_public(id,drink_id,rating,body,created_at) select id,drink_id,rating,body,created_at from public.drink_reviews where moderation_status='approved' on conflict (id) do nothing;
insert into private.drink_comments_public(id,drink_id,kind,body,created_at) select id,drink_id,kind,body,created_at from public.drink_comments where moderation_status='approved' on conflict (id) do nothing;
