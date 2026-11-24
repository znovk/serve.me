-- LOCAL TEST STUB ONLY. Never run against a real Supabase project.
--
-- Emulates the parts of a Supabase Postgres database that our migrations and
-- RLS policies depend on, so the schema can be tested against plain Postgres:
--   * roles: anon, authenticated, service_role
--   * schema auth with auth.users, auth.uid(), auth.jwt(), auth.role()
--   * Supabase's default privileges (anon/authenticated get table grants;
--     RLS is what actually restricts access)
--
-- Tests impersonate a user with:
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists auth;
create schema if not exists extensions;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', 'anon')
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt(), auth.role() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Mirror Supabase defaults: API roles receive broad grants on new objects in
-- public; RLS and explicit revokes in our migrations do the restricting.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
