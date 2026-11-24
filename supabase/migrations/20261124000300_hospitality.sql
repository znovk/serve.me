-- =============================================================================
-- Migration: hospitality profiles and their public links.
-- =============================================================================

create type public.link_kind as enum ('social', 'tip', 'personal', 'booking', 'other');

create table public.hospitality_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$')
    check (username not in (
      'admin', 'administrator', 'api', 'app', 'auth', 'dashboard', 'help', 'login',
      'logout', 'onboarding', 'p', 'root', 'settings', 'signup', 'support', 'system'
    )),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (bio is null or char_length(bio) <= 500),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://[^\s]+$'),
  -- Free-text workplace for Phase 1. Verified affiliations with establishment
  -- organizations arrive later via establishment_affiliations.
  workplace_name text check (workplace_name is null or char_length(workplace_name) <= 120),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hospitality_profiles_set_updated_at
  before update on public.hospitality_profiles
  for each row execute function public.set_updated_at();

create or replace function public.owns_hospitality_profile(p_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hospitality_profiles
    where id = p_profile and user_id = auth.uid()
  );
$$;

create table public.public_links (
  id uuid primary key default gen_random_uuid(),
  hospitality_profile_id uuid not null references public.hospitality_profiles (id) on delete cascade,
  kind public.link_kind not null default 'other',
  label text not null check (char_length(label) between 1 and 60),
  url text not null check (url ~ '^https://[^\s]+$' and char_length(url) <= 2048),
  position int not null default 0 check (position >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_links_profile_idx on public.public_links (hospitality_profile_id, position);

create trigger public_links_set_updated_at
  before update on public.public_links
  for each row execute function public.set_updated_at();

-- Cap links per profile to limit abuse.
create or replace function public.enforce_public_link_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.public_links
       where hospitality_profile_id = new.hospitality_profile_id) >= 25 then
    raise exception 'link_limit_reached' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger public_links_limit
  before insert on public.public_links
  for each row execute function public.enforce_public_link_limit();

-- RLS ------------------------------------------------------------------------
alter table public.hospitality_profiles enable row level security;
alter table public.public_links enable row level security;

revoke all on public.hospitality_profiles, public.public_links from anon, authenticated;

grant select, delete on public.hospitality_profiles to authenticated;
grant insert (user_id, username, display_name, bio, avatar_url, workplace_name, is_published)
  on public.hospitality_profiles to authenticated;
grant update (username, display_name, bio, avatar_url, workplace_name, is_published)
  on public.hospitality_profiles to authenticated;

grant select, delete on public.public_links to authenticated;
grant insert (hospitality_profile_id, kind, label, url, position, is_visible)
  on public.public_links to authenticated;
grant update (kind, label, url, position, is_visible) on public.public_links to authenticated;

-- Owners see their own profile; published profiles are visible to signed-in
-- users (advertisers inviting, customers connecting). Anonymous visitors use
-- get_public_profile() instead of table access.
create policy hospitality_profiles_select on public.hospitality_profiles
  for select to authenticated
  using (user_id = auth.uid() or is_published or public.is_admin());

create policy hospitality_profiles_insert_own on public.hospitality_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_role('hospitality'));

create policy hospitality_profiles_update_own on public.hospitality_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy hospitality_profiles_delete_own on public.hospitality_profiles
  for delete to authenticated
  using (user_id = auth.uid());

create policy public_links_select_owner on public.public_links
  for select to authenticated
  using (public.owns_hospitality_profile(hospitality_profile_id));

create policy public_links_insert_owner on public.public_links
  for insert to authenticated
  with check (public.owns_hospitality_profile(hospitality_profile_id));

create policy public_links_update_owner on public.public_links
  for update to authenticated
  using (public.owns_hospitality_profile(hospitality_profile_id))
  with check (public.owns_hospitality_profile(hospitality_profile_id));

create policy public_links_delete_owner on public.public_links
  for delete to authenticated
  using (public.owns_hospitality_profile(hospitality_profile_id));

revoke execute on function public.owns_hospitality_profile(uuid) from public, anon;
grant execute on function public.owns_hospitality_profile(uuid) to authenticated;
revoke execute on function public.enforce_public_link_limit() from public, anon, authenticated;
