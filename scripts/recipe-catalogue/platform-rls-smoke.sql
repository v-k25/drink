-- Behavioral assertions for the isolated local check transaction. No live users.
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into public.profiles(id) select id from auth.users;
insert into public.drinks(id,name,category,status,editorial_ready,alcohol_type,source_name,source_url,source_retrieved_at,content_origin,recipe_quality_issues,ingredients,preparation)
values ('test-eligible','Test recipe','Mocktail','published',true,'mocktail','drinknation','https://example.invalid/recipe',now(),'allcheers_original_from_facts','{}','["1 cup water"]','["Pour into a glass."]'),
       ('test-draft','Draft recipe','Mocktail','draft',false,'mocktail','drinknation','https://example.invalid/draft',now(),'allcheers_original_from_facts','{}','["1 cup water"]','["Pour into a glass."]');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.saved_drinks(drink_id) values ('test-eligible') on conflict(user_id,drink_id) do nothing;
update public.saved_drinks set note='Private owner A note' where drink_id='test-eligible';
insert into public.saved_drinks(drink_id) values ('test-eligible') on conflict(user_id,drink_id) do nothing;
insert into public.drink_likes(drink_id) values ('test-eligible') on conflict(user_id,drink_id) do nothing;
insert into public.drink_likes(drink_id) values ('test-eligible') on conflict(user_id,drink_id) do nothing;
insert into public.drink_reviews(drink_id,rating,body) values ('test-eligible',5,'Pending A review');
insert into public.drink_comments(drink_id,kind,body) values ('test-eligible','tip','Pending A tip');
do $$ begin
  if (select count(*) from public.saved_drinks)<>1 or (select note from public.saved_drinks where drink_id='test-eligible')<>'Private owner A note' then raise exception 'Duplicate save lost note'; end if;
  if (select count(*) from public.drink_likes)<>1 then raise exception 'Duplicate like'; end if;
  if exists(select 1 from public.drink_reviews_public) or exists(select 1 from public.drink_comments_public) then raise exception 'Pending content leaked'; end if;
  if (select likes from public.drink_social_stats where drink_id='test-eligible')<>1 or (select reviews from public.drink_social_stats where drink_id='test-eligible')<>0 then raise exception 'Wrong pending stats'; end if;
  begin insert into public.saved_drinks(drink_id) values ('test-draft'); raise exception 'Draft save permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.drink_likes(drink_id) values ('test-draft'); raise exception 'Draft like permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.drink_reviews(drink_id,rating,body) values ('test-draft',5,'No draft reviews'); raise exception 'Draft review permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.drink_comments(drink_id,kind,body) values ('test-draft','tip','No draft comments'); raise exception 'Draft comment permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.saved_drinks(user_id,drink_id) values ('00000000-0000-4000-8000-000000000002','test-eligible'); raise exception 'Forged uid permitted'; exception when insufficient_privilege then null; end;
  begin update public.drink_reviews set moderation_status='approved'; raise exception 'Self approval permitted'; exception when insufficient_privilege then null; end;
  begin update public.drink_reviews set drink_id='test-draft'; raise exception 'Recipe reassignment permitted'; exception when insufficient_privilege then null; end;
  begin update public.saved_drinks set note=repeat('x',501); raise exception 'Oversized note permitted'; exception when check_violation then null; end;
  begin insert into public.drink_reviews(drink_id,rating,body) values ('test-eligible',6,'Invalid rating'); raise exception 'Invalid rating permitted'; exception when check_violation then null; end;
  begin insert into public.drink_reviews(drink_id,rating,body) values ('test-eligible',4,'Duplicate review'); raise exception 'Duplicate review permitted'; exception when unique_violation then null; end;
  begin insert into public.drink_comments(drink_id,kind,body) values ('test-eligible','other','Invalid kind'); raise exception 'Invalid kind permitted'; exception when check_violation then null; end;
  begin insert into public.drink_comments(drink_id,kind,body) values ('test-eligible','tip',repeat('x',2001)); raise exception 'Oversized comment permitted'; exception when check_violation then null; end;
  begin insert into public.drink_comments(drink_id,kind,body) values ('test-eligible','tip','   '); raise exception 'Blank comment permitted'; exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
  if exists(select 1 from public.saved_drinks) or exists(select 1 from public.drink_reviews) or exists(select 1 from public.drink_comments) or exists(select 1 from public.drink_likes) then raise exception 'Cross-user private read'; end if;
  update public.saved_drinks set note='Forged'; if found then raise exception 'Cross-user note update'; end if;
  delete from public.drink_reviews; if found then raise exception 'Cross-user delete'; end if;
end $$;
insert into public.drink_likes(drink_id) values ('test-eligible');
do $$ begin if (select likes from public.drink_social_stats where drink_id='test-eligible')<>2 then raise exception 'Incorrect two-user like count'; end if; end $$;

reset role;
update public.drink_reviews set moderation_status='approved';
update public.drink_comments set moderation_status='approved';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if (select count(*) from public.drink_reviews_public)<>1 or (select count(*) from public.drink_comments_public)<>1 then raise exception 'Approved content not public'; end if;
  if (select average_rating from public.drink_social_stats where drink_id='test-eligible')<>5 then raise exception 'Approved rating incorrect'; end if;
  begin perform note from public.saved_drinks; raise exception 'Anon private note read'; exception when insufficient_privilege then null; end;
  begin perform body from public.drink_reviews; raise exception 'Anon base review read'; exception when insufficient_privilege then null; end;
  begin insert into public.drink_comments(drink_id,kind,body) values ('test-eligible','comment','Anonymous write'); raise exception 'Anon write'; exception when insufficient_privilege then null; end;
  begin perform private.refresh_drink_stats('test-eligible'); raise exception 'Definer RPC exposed'; exception when insufficient_privilege then null; end;
end $$;

reset role;
update public.drinks set status='draft' where id='test-eligible';
set local role anon;
do $$ begin
  if exists(select 1 from public.drink_reviews_public) or exists(select 1 from public.drink_comments_public) or exists(select 1 from public.drink_social_stats) then raise exception 'Unpublished social data leaked'; end if;
end $$;
reset role;
update public.drinks set status='published' where id='test-eligible';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
update public.drink_reviews set body='Edited review' where drink_id='test-eligible';
do $$ begin
  if (select moderation_status from public.drink_reviews)<>'pending' or exists(select 1 from public.drink_reviews_public) then raise exception 'Review edit failed to reset moderation'; end if;
  if (select reviews from public.drink_social_stats where drink_id='test-eligible')<>0 then raise exception 'Edited review retained aggregate'; end if;
end $$;
reset role;
update public.drink_reviews set moderation_status='rejected';
update public.drink_comments set moderation_status='rejected';
set local role authenticated;
do $$ begin if exists(select 1 from public.drink_reviews) or exists(select 1 from public.drink_comments) then raise exception 'Rejected content visible to owner'; end if; end $$;

-- Keep consumed rate-limit events even when the corresponding content is deleted.
delete from public.drink_comments;
insert into public.drink_comments(drink_id,kind,body) select 'test-eligible','tip','Rate fixture '||n from generate_series(1,4)n;
delete from public.drink_comments;
do $$ begin
  begin
    insert into public.drink_comments(drink_id,kind,body) values('test-eligible','tip','Sixth event must fail');
    raise exception using errcode='P0002',message='Comment rate limit bypassed by deletion';
  exception when raise_exception then null;
  end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name in ('drink_reviews_public','drink_comments_public','drink_social_stats') and column_name='user_id') then raise exception 'Identity in public projection'; end if;
  if has_column_privilege('authenticated','public.drink_reviews','moderation_status','UPDATE') or has_column_privilege('authenticated','public.drink_reviews','user_id','INSERT') then raise exception 'Excess writable grants'; end if;
end $$;
select 'PASS: owner/cross-user/anon, draft/forged uid/self-approval denial, bounds, duplicate notes/likes/reviews, approved projections, unpublish/edit/reject, rate-limit retention' as result;
