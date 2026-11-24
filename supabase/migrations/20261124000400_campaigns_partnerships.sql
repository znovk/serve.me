-- =============================================================================
-- Migration: advertising campaigns, partnerships and advertiser blocks.
--
-- Partnership state changes are only possible through the functions below,
-- which enforce the state machine documented in docs/DATABASE_SCHEMA.md.
-- No real money moves in Phase 1; compensation fields are descriptive.
-- =============================================================================

create type public.campaign_status as enum ('draft', 'active', 'paused', 'ended');
create type public.compensation_model as enum (
  'monthly_sponsorship', 'per_click', 'per_lead', 'flat_commission',
  'percentage_commission', 'network_commission', 'hybrid'
);
create type public.partnership_status as enum (
  'pending', 'accepted', 'declined', 'active', 'paused', 'expired', 'terminated', 'blocked'
);

create table public.advertising_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  offer_headline text not null check (char_length(offer_headline) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  destination_url text not null check (destination_url ~ '^https://[^\s]+$' and char_length(destination_url) <= 2048),
  market_scope public.market_scope not null,
  compensation_model public.compensation_model not null,
  -- Integer minor units (cents). Percentages in basis points (1% = 100).
  compensation_amount_minor bigint check (compensation_amount_minor is null or compensation_amount_minor >= 0),
  compensation_percent_bps int check (compensation_percent_bps is null or compensation_percent_bps between 0 and 10000),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  budget_minor bigint check (budget_minor is null or budget_minor >= 0),
  status public.campaign_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advertising_campaigns_org_idx on public.advertising_campaigns (organization_id, created_at desc);

create trigger advertising_campaigns_set_updated_at
  before update on public.advertising_campaigns
  for each row execute function public.set_updated_at();

create table public.campaign_partnerships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.advertising_campaigns (id) on delete cascade,
  hospitality_profile_id uuid not null references public.hospitality_profiles (id) on delete cascade,
  status public.partnership_status not null default 'pending',
  initiated_by text not null check (initiated_by in ('advertiser', 'professional')),
  invited_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, hospitality_profile_id)
);

create index campaign_partnerships_profile_idx on public.campaign_partnerships (hospitality_profile_id, status);
create index campaign_partnerships_campaign_idx on public.campaign_partnerships (campaign_id, status);

create trigger campaign_partnerships_set_updated_at
  before update on public.campaign_partnerships
  for each row execute function public.set_updated_at();

create table public.advertiser_blocks (
  id uuid primary key default gen_random_uuid(),
  hospitality_profile_id uuid not null references public.hospitality_profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  category_id uuid references public.business_categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(organization_id, category_id) = 1)
);

create unique index advertiser_blocks_org_uq
  on public.advertiser_blocks (hospitality_profile_id, organization_id) where organization_id is not null;
create unique index advertiser_blocks_category_uq
  on public.advertiser_blocks (hospitality_profile_id, category_id) where category_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_advertiser_blocked(p_profile uuid, p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.advertiser_blocks b
    where b.hospitality_profile_id = p_profile
      and (
        b.organization_id = p_org
        or b.category_id = (select bp.category_id from public.business_profiles bp where bp.organization_id = p_org)
      )
  );
$$;

-- Professional may read a campaign they have a partnership row for.
create or replace function public.has_partnership_with_campaign(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_partnerships cp
    join public.hospitality_profiles hp on hp.id = cp.hospitality_profile_id
    where cp.campaign_id = p_campaign and hp.user_id = auth.uid()
  );
$$;

create or replace function public.campaign_org(p_campaign uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.advertising_campaigns where id = p_campaign;
$$;

-- ---------------------------------------------------------------------------
-- Advertiser: invite a professional by username.
-- ---------------------------------------------------------------------------
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
  if not found or not public.is_org_member(v_campaign.organization_id, true) then
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

-- ---------------------------------------------------------------------------
-- Professional: respond to / manage a partnership.
-- Actions: accept, decline, pause, resume, terminate, block
-- ---------------------------------------------------------------------------
create or replace function public.professional_update_partnership(p_partnership uuid, p_action text)
returns public.partnership_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.campaign_partnerships%rowtype;
  v_org uuid;
  v_campaign_status public.campaign_status;
  v_new public.partnership_status;
begin
  select cp.* into v_row
    from public.campaign_partnerships cp
    join public.hospitality_profiles hp on hp.id = cp.hospitality_profile_id
   where cp.id = p_partnership and hp.user_id = auth.uid()
   for update of cp;
  if not found then
    raise exception 'partnership_not_found' using errcode = '42501';
  end if;

  select organization_id, status into v_org, v_campaign_status
    from public.advertising_campaigns where id = v_row.campaign_id;

  v_new := case
    when p_action = 'accept' and v_row.status = 'pending' and v_campaign_status <> 'ended' then 'active'
    when p_action = 'decline' and v_row.status = 'pending' then 'declined'
    when p_action = 'pause' and v_row.status = 'active' then 'paused'
    when p_action = 'resume' and v_row.status = 'paused' and v_campaign_status <> 'ended' then 'active'
    when p_action = 'terminate' and v_row.status in ('active', 'paused', 'accepted') then 'terminated'
    when p_action = 'block' and v_row.status <> 'blocked' then 'blocked'
    else null
  end::public.partnership_status;

  if v_new is null then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.campaign_partnerships
     set status = v_new,
         responded_at = case when v_row.status = 'pending' then now() else responded_at end,
         status_changed_at = now()
   where id = v_row.id;

  if v_new = 'blocked' then
    insert into public.advertiser_blocks (hospitality_profile_id, organization_id)
    values (v_row.hospitality_profile_id, v_org)
    on conflict do nothing;
    -- Blocking an advertiser ends every partnership with that organization.
    update public.campaign_partnerships cp
       set status = 'blocked', status_changed_at = now()
      from public.advertising_campaigns c
     where c.id = cp.campaign_id and c.organization_id = v_org
       and cp.hospitality_profile_id = v_row.hospitality_profile_id
       and cp.status <> 'blocked';
  end if;

  perform public.write_audit('partnership.' || p_action, 'campaign_partnership', v_row.id,
    jsonb_build_object('from', v_row.status, 'to', v_new));
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Advertiser: withdraw a pending invite or terminate a partnership.
-- ---------------------------------------------------------------------------
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
  if not found or not public.is_org_member(public.campaign_org(v_row.campaign_id), true) then
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

-- ---------------------------------------------------------------------------
-- Professional: block an advertiser organization or a whole category.
-- ---------------------------------------------------------------------------
create or replace function public.block_advertiser(p_organization uuid default null, p_category uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile uuid;
begin
  if num_nonnulls(p_organization, p_category) <> 1 then
    raise exception 'exactly_one_target_required' using errcode = '22023';
  end if;
  select id into v_profile from public.hospitality_profiles where user_id = auth.uid();
  if v_profile is null then
    raise exception 'hospitality_profile_required' using errcode = '42501';
  end if;

  insert into public.advertiser_blocks (hospitality_profile_id, organization_id, category_id)
  values (v_profile, p_organization, p_category)
  on conflict do nothing;

  update public.campaign_partnerships cp
     set status = 'blocked', status_changed_at = now()
    from public.advertising_campaigns c
    join public.business_profiles bp on bp.organization_id = c.organization_id
   where c.id = cp.campaign_id
     and cp.hospitality_profile_id = v_profile
     and cp.status <> 'blocked'
     and (c.organization_id = p_organization or bp.category_id = p_category);

  perform public.write_audit('advertiser.blocked', 'hospitality_profile', v_profile,
    jsonb_build_object('organization_id', p_organization, 'category_id', p_category));
end;
$$;

-- RLS ------------------------------------------------------------------------
alter table public.advertising_campaigns enable row level security;
alter table public.campaign_partnerships enable row level security;
alter table public.advertiser_blocks enable row level security;

revoke all on public.advertising_campaigns, public.campaign_partnerships, public.advertiser_blocks
  from anon, authenticated;

grant select, delete on public.advertising_campaigns to authenticated;
grant insert (organization_id, name, offer_headline, description, destination_url, market_scope,
  compensation_model, compensation_amount_minor, compensation_percent_bps, currency, budget_minor,
  status, created_by) on public.advertising_campaigns to authenticated;
grant update (name, offer_headline, description, destination_url, market_scope, compensation_model,
  compensation_amount_minor, compensation_percent_bps, currency, budget_minor, status)
  on public.advertising_campaigns to authenticated;

grant select on public.campaign_partnerships to authenticated;
grant select, delete on public.advertiser_blocks to authenticated;

create policy campaigns_select on public.advertising_campaigns
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    or public.has_partnership_with_campaign(id)
    or public.is_admin()
  );

create policy campaigns_insert_manager on public.advertising_campaigns
  for insert to authenticated
  with check (
    public.is_org_member(organization_id, true)
    and public.has_role('advertiser')
    and created_by = auth.uid()
  );

create policy campaigns_update_manager on public.advertising_campaigns
  for update to authenticated
  using (public.is_org_member(organization_id, true))
  with check (public.is_org_member(organization_id, true));

create policy campaigns_delete_draft on public.advertising_campaigns
  for delete to authenticated
  using (public.is_org_member(organization_id, true) and status = 'draft');

create policy partnerships_select on public.campaign_partnerships
  for select to authenticated
  using (
    public.owns_hospitality_profile(hospitality_profile_id)
    or public.is_org_member(public.campaign_org(campaign_id))
    or public.is_admin()
  );

create policy advertiser_blocks_select_own on public.advertiser_blocks
  for select to authenticated
  using (public.owns_hospitality_profile(hospitality_profile_id));

create policy advertiser_blocks_delete_own on public.advertiser_blocks
  for delete to authenticated
  using (public.owns_hospitality_profile(hospitality_profile_id));

revoke execute on function public.is_advertiser_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.has_partnership_with_campaign(uuid) from public, anon;
grant execute on function public.has_partnership_with_campaign(uuid) to authenticated;
revoke execute on function public.campaign_org(uuid) from public, anon;
grant execute on function public.campaign_org(uuid) to authenticated;
revoke execute on function public.invite_to_campaign(uuid, text) from public, anon;
grant execute on function public.invite_to_campaign(uuid, text) to authenticated;
revoke execute on function public.professional_update_partnership(uuid, text) from public, anon;
grant execute on function public.professional_update_partnership(uuid, text) to authenticated;
revoke execute on function public.advertiser_update_partnership(uuid, text) from public, anon;
grant execute on function public.advertiser_update_partnership(uuid, text) to authenticated;
revoke execute on function public.block_advertiser(uuid, uuid) from public, anon;
grant execute on function public.block_advertiser(uuid, uuid) to authenticated;
