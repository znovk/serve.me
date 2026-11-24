-- =============================================================================
-- Migration: organizations, memberships, business categories and profiles.
-- Tenant isolation: everything owned by an organization is visible only to
-- its members (and admins), except the public-facing business profile fields.
-- =============================================================================

create type public.org_kind as enum ('advertiser', 'establishment');
create type public.org_member_role as enum ('owner', 'admin', 'member');
create type public.market_scope as enum ('local', 'tourism', 'national');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  name text not null check (char_length(name) between 2 and 120),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.org_member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);

-- Member check. p_manage = true requires owner/admin.
create or replace function public.is_org_member(p_org uuid, p_manage boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and (not p_manage or m.member_role in ('owner', 'admin'))
  );
$$;

create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  created_at timestamptz not null default now()
);

create table public.business_profiles (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  website_url text check (website_url is null or website_url ~ '^https://[^\s]+$'),
  market_scope public.market_scope not null,
  category_id uuid references public.business_categories (id) on delete set null,
  service_area text check (service_area is null or char_length(service_area) <= 120),
  verification_status public.verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_profiles_category_idx on public.business_profiles (category_id);

create trigger business_profiles_set_updated_at
  before update on public.business_profiles
  for each row execute function public.set_updated_at();

-- Atomically create an advertiser organization, owner membership and business
-- profile. Caller must hold the advertiser role.
create or replace function public.create_advertiser_organization(
  p_name text,
  p_market_scope public.market_scope,
  p_category_id uuid default null,
  p_website_url text default null,
  p_description text default null,
  p_service_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.has_role('advertiser') then
    raise exception 'advertiser_role_required' using errcode = '42501';
  end if;

  select count(*) into v_count
    from public.organizations
   where created_by = v_uid and kind = 'advertiser';
  if v_count >= 5 then
    raise exception 'organization_limit_reached' using errcode = '54000';
  end if;

  insert into public.organizations (kind, name, created_by)
  values ('advertiser', trim(p_name), v_uid)
  returning id into v_org;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (v_org, v_uid, 'owner');

  insert into public.business_profiles (
    organization_id, display_name, description, website_url, market_scope, category_id, service_area
  ) values (
    v_org, trim(p_name), nullif(trim(p_description), ''), nullif(trim(p_website_url), ''),
    p_market_scope, p_category_id, nullif(trim(p_service_area), '')
  );

  perform public.write_audit('organization.created', 'organization', v_org,
    jsonb_build_object('kind', 'advertiser'));
  return v_org;
end;
$$;

-- RLS ------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.business_categories enable row level security;
alter table public.business_profiles enable row level security;

revoke all on public.organizations, public.organization_members,
  public.business_categories, public.business_profiles from anon, authenticated;

grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select on public.business_categories to authenticated;
grant select on public.business_profiles to authenticated;
-- verification_status is intentionally NOT client-updatable.
grant update (display_name, description, website_url, market_scope, category_id, service_area)
  on public.business_profiles to authenticated;

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (public.is_org_member(id) or public.is_admin());

create policy organizations_update_manager on public.organizations
  for update to authenticated
  using (public.is_org_member(id, true))
  with check (public.is_org_member(id, true));

create policy organization_members_select on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id) or public.is_admin());

create policy business_categories_select on public.business_categories
  for select to authenticated
  using (true);

-- Business profiles are public-facing business information; any signed-in
-- user may read them (e.g. a professional reviewing an invitation).
create policy business_profiles_select on public.business_profiles
  for select to authenticated
  using (true);

create policy business_profiles_update_manager on public.business_profiles
  for update to authenticated
  using (public.is_org_member(organization_id, true))
  with check (public.is_org_member(organization_id, true));

revoke execute on function public.is_org_member(uuid, boolean) from public, anon;
grant execute on function public.is_org_member(uuid, boolean) to authenticated;
revoke execute on function public.create_advertiser_organization(text, public.market_scope, uuid, text, text, text) from public, anon;
grant execute on function public.create_advertiser_organization(text, public.market_scope, uuid, text, text, text) to authenticated;
