-- B9 read-only introspection. Paste into the Supabase Studio SQL editor (or run
-- through an MCP with read_only=true). SELECT only; changes nothing.

-- 1. RLS flag
select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('waitlist_subscribers', 'profiles', 'quiz_submissions', 'party_plans');

-- 2. Policies
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('waitlist_subscribers', 'profiles')
order by 1, 2;

-- 3. Constraints (PK, unique, check, FK)
select conrelid::regclass as tbl, conname, contype, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid in ('public.waitlist_subscribers'::regclass, 'public.profiles'::regclass)
order by 1, 2;

-- 4. Indexes
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename in ('waitlist_subscribers', 'profiles');

-- 5. Triggers (including on auth.users) and the related functions
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where (event_object_schema = 'public' and event_object_table in ('waitlist_subscribers', 'profiles'))
   or (event_object_schema = 'auth' and event_object_table = 'users');

select p.proname, pg_get_functiondef(p.oid) as def
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('handle_new_user', 'quiz_throttle_count');

-- 6. Grants
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('waitlist_subscribers', 'profiles')
order by 1, 2, 3;

-- 7. Column details, to confirm the baseline files (nullability, defaults)
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('waitlist_subscribers', 'profiles')
order by table_name, ordinal_position;

-- 8. Migration history vs repo files, and all public tables
select version, name from supabase_migrations.schema_migrations order by version;
select tablename from pg_tables where schemaname = 'public' order by 1;
