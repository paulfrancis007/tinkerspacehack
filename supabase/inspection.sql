-- Inspection Query: Test RLS using anon and authenticated roles
begin;

-- 1. Test unauthenticated (anon) read - Should return 0 rows
set local role anon;
select 'anon profile count' as test, count(*) from public.profiles;

-- 2. Test authenticated read but without a valid user ID - Should return 0 rows
set local role authenticated;
select 'auth without id profile count' as test, count(*) from public.profiles;

-- 3. Test direct client write - Should be denied and throw an error
-- Uncommenting the next line will throw: ERROR: new row violates row-level security policy for table "profiles"
-- insert into public.profiles (id, display_name, adult_attested_at) values (gen_random_uuid(), 'Hacker', now());

rollback;
