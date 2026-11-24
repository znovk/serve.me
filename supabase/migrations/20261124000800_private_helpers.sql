-- =============================================================================
-- Migration: move authorization helpers into a private schema.
--
-- Helpers used by RLS policies should not be callable over the Data API
-- (/rest/v1/rpc/...). The `private` schema is not exposed by PostgREST.
-- Policies reference functions by OID, so they keep working after the move;
-- functions that call helpers by name are redefined below.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.has_role(public.app_role) set schema private;
alter function public.is_admin() set schema private;
alter function public.is_org_member(uuid, boolean) set schema private;
alter function public.owns_hospitality_profile(uuid) set schema private;
alter function public.has_partnership_with_campaign(uuid) set schema private;
alter function public.campaign_org(uuid) set schema private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin'::public.app_role);
$$;

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
  if not private.has_role('advertiser') then
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

create or replace function public.invite_to_campaign(p_campaign uuid, p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_campaign public.advertising_campaigns%rowtype;
  v_profile uuid;
  v_existing public.campaign_partnerships%rowtype;
  v_id uuid;
  v_recent int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_campaign from public.advertising_campaigns where id = p_campaign;
  if not found or not private.is_org_member(v_campaign.organization_id, true) then
    raise exception 'campaign_not_found' using errcode = '42501';
  end if;
  if v_campaign.status not in ('draft', 'active') then
    raise exception 'campaign_not_open' using errcode = '22023';
  end if;

  select id into v_profile from public.hospitality_profiles
   where username = lower(trim(p_username)) and is_published;
  -- Same error whether the profile is missing or has blocked this advertiser,
  -- so blocks are not disclosed to the advertiser.
  if v_profile is null or public.is_advertiser_blocked(v_profile, v_campaign.organization_id) then
    raise exception 'professional_unavailable' using errcode = '22023';
  end if;

  -- Rate limit: 50 invitations per organization per rolling 24 hours.
  select count(*) into v_recent
    from public.campaign_partnerships cp
    join public.advertising_campaigns c on c.id = cp.campaign_id
   where c.organization_id = v_campaign.organization_id
     and cp.initiated_by = 'advertiser'
     and cp.created_at > now() - interval '24 hours';
  if v_recent >= 50 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  select * into v_existing from public.campaign_partnerships
   where campaign_id = p_campaign and hospitality_profile_id = v_profile
   for update;

  if found then
    if v_existing.status in ('declined', 'blocked') then
      raise exception 'professional_unavailable' using errcode = '22023';
    elsif v_existing.status in ('expired', 'terminated') then
      update public.campaign_partnerships
         set status = 'pending', invited_by = v_uid, initiated_by = 'advertiser',
             responded_at = null, status_changed_at = now()
       where id = v_existing.id
      returning id into v_id;
    else
      raise exception 'already_invited' using errcode = '23505';
    end if;
  else
    insert into public.campaign_partnerships (campaign_id, hospitality_profile_id, initiated_by, invited_by)
    values (p_campaign, v_profile, 'advertiser', v_uid)
    returning id into v_id;
  end if;

  perform public.write_audit('partnership.invited', 'campaign_partnership', v_id,
    jsonb_build_object('campaign_id', p_campaign));
  return v_id;
end;
$$;

create or replace function public.advertiser_update_partnership(p_partnership uuid, p_action text)
returns public.partnership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.campaign_partnerships%rowtype;
begin
  select * into v_row from public.campaign_partnerships where id = p_partnership for update;
  if not found or not private.is_org_member(private.campaign_org(v_row.campaign_id), true) then
    raise exception 'partnership_not_found' using errcode = '42501';
  end if;
  if not (
    (p_action = 'withdraw' and v_row.status = 'pending')
    or (p_action = 'terminate' and v_row.status in ('accepted', 'active', 'paused'))
  ) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.campaign_partnerships
     set status = 'terminated', status_changed_at = now()
   where id = v_row.id;

  perform public.write_audit('partnership.advertiser_' || p_action, 'campaign_partnership', v_row.id,
    jsonb_build_object('from', v_row.status));
  return 'terminated';
end;
$$;

create or replace function public.request_connection(p_username text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.hospitality_profiles%rowtype;
  v_existing public.customer_connections%rowtype;
  v_id uuid;
  v_recent int;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not private.has_role('customer') then
    raise exception 'customer_role_required' using errcode = '42501';
  end if;

  select * into v_profile from public.hospitality_profiles
   where username = lower(trim(p_username)) and is_published;
  if not found or v_profile.user_id = v_uid then
    raise exception 'professional_unavailable' using errcode = '22023';
  end if;

  -- Rate limit: 30 connection requests per customer per rolling 24 hours.
  select count(*) into v_recent from public.customer_connections
   where customer_user_id = v_uid and requested_at > now() - interval '24 hours';
  if v_recent >= 30 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  select * into v_existing from public.customer_connections
   where customer_user_id = v_uid and hospitality_profile_id = v_profile.id
   for update;

  if found then
    if v_existing.status = 'disconnected' then
      update public.customer_connections
         set status = 'pending', requested_at = now(), responded_at = null,
             blocked_by = null, status_changed_at = now()
       where id = v_existing.id
      returning id into v_id;
    elsif v_existing.status in ('pending', 'accepted') then
      raise exception 'already_requested' using errcode = '23505';
    else
      -- declined or blocked: do not reveal which.
      raise exception 'professional_unavailable' using errcode = '22023';
    end if;
  else
    insert into public.customer_connections (customer_user_id, hospitality_profile_id)
    values (v_uid, v_profile.id)
    returning id into v_id;
    insert into public.consent_preferences (connection_id) values (v_id);
  end if;

  perform public.write_audit('connection.requested', 'customer_connection', v_id, '{}'::jsonb);
  return v_id;
end;
$$;

-- Re-assert grants after the move.
revoke execute on function private.has_role(public.app_role) from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated;
revoke execute on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
revoke execute on function private.is_org_member(uuid, boolean) from public, anon;
grant execute on function private.is_org_member(uuid, boolean) to authenticated;
revoke execute on function private.owns_hospitality_profile(uuid) from public, anon;
grant execute on function private.owns_hospitality_profile(uuid) to authenticated;
revoke execute on function private.has_partnership_with_campaign(uuid) from public, anon;
grant execute on function private.has_partnership_with_campaign(uuid) to authenticated;
revoke execute on function private.campaign_org(uuid) from public, anon;
grant execute on function private.campaign_org(uuid) to authenticated;
