-- =============================================================================
-- Migration: identity foundation
-- profiles, user_roles, audit_logs, shared helpers.
--
-- Conventions (see docs/DATABASE_SCHEMA.md):
--   * UUID primary keys, timestamptz created_at/updated_at.
--   * RLS enabled on every table; deny by default.
--   * Privileged state changes go through SECURITY DEFINER functions with
--     search_path = '' and fully qualified names. Direct table writes are only
--     granted where the row owner may freely edit specific columns.
--   * anon has no direct table access; public data is served by functions.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'hospitality', 'advertiser', 'establishment', 'admin');

-- ---------------------------------------------------------------------------
-- Shared trigger: updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user. Private account data.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  adult_confirmed_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(v_name, 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- user_roles: a user may hold several roles. Never writable by clients.
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------------
-- audit_logs: append-only; written only by SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Authorization helpers (SECURITY DEFINER so policies can call them without
-- recursive RLS evaluation).
-- ---------------------------------------------------------------------------
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = p_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin'::public.app_role);
$$;

-- Only self-service roles can be claimed. 'admin' and 'establishment' are
-- granted by an administrator (service role) and never through signup.
create or replace function public.claim_role(p_role public.app_role, p_confirm_adult boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_role not in ('customer', 'hospitality', 'advertiser') then
    raise exception 'role_not_claimable' using errcode = '42501';
  end if;
  if not coalesce(p_confirm_adult, false) then
    raise exception 'adult_confirmation_required' using errcode = '22023';
  end if;

  insert into public.user_roles (user_id, role) values (v_uid, p_role)
  on conflict do nothing;

  update public.profiles
     set adult_confirmed_at = coalesce(adult_confirmed_at, now()),
         onboarded_at = coalesce(onboarded_at, now())
   where id = v_uid;

  perform public.write_audit('role.claimed', 'profile', v_uid, jsonb_build_object('role', p_role));
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.profiles, public.user_roles, public.audit_logs from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.audit_logs to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy user_roles_select_own on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- Function execute grants: revoke the PUBLIC default, then grant explicitly.
revoke execute on function public.write_audit(text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.claim_role(public.app_role, boolean) from public, anon;
grant execute on function public.claim_role(public.app_role, boolean) to authenticated;
revoke execute on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
