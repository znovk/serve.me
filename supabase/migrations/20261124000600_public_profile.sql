-- =============================================================================
-- Migration: public (anonymous) read surface.
--
-- Anonymous visitors have NO table privileges. Public pages are served only
-- through these functions, which return an explicit allow-list of fields.
-- An offer appears only when ALL of these hold:
--   * partnership.status = 'active'
--   * campaign.status = 'active'
--   * the professional has not blocked the organization or its category
-- =============================================================================

create or replace function public.get_public_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'username', hp.username,
    'display_name', hp.display_name,
    'bio', hp.bio,
    'avatar_url', hp.avatar_url,
    'workplace_name', hp.workplace_name,
    'links', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'kind', l.kind, 'label', l.label, 'url', l.url)
             order by l.position, l.created_at)
        from public.public_links l
       where l.hospitality_profile_id = hp.id and l.is_visible
    ), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object(
               'partnership_id', cp.id,
               'headline', c.offer_headline,
               'description', c.description,
               'market_scope', c.market_scope,
               'business_name', bp.display_name,
               'business_verified', bp.verification_status = 'verified')
             order by c.market_scope, cp.status_changed_at desc)
        from public.campaign_partnerships cp
        join public.advertising_campaigns c on c.id = cp.campaign_id
        join public.business_profiles bp on bp.organization_id = c.organization_id
       where cp.hospitality_profile_id = hp.id
         and cp.status = 'active'
         and c.status = 'active'
         and not public.is_advertiser_blocked(hp.id, c.organization_id)
    ), '[]'::jsonb)
  )
  from public.hospitality_profiles hp
  where hp.username = lower(trim(p_username))
    and hp.is_published;
$$;

-- Controlled redirect target for an offer click. Returns null unless the offer
-- would currently be displayed publicly, so dead or blocked offers never
-- redirect. Click recording is a later milestone (analytics_events).
create or replace function public.resolve_offer_redirect(p_partnership uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.destination_url
    from public.campaign_partnerships cp
    join public.advertising_campaigns c on c.id = cp.campaign_id
    join public.hospitality_profiles hp on hp.id = cp.hospitality_profile_id
   where cp.id = p_partnership
     and cp.status = 'active'
     and c.status = 'active'
     and hp.is_published
     and not public.is_advertiser_blocked(hp.id, c.organization_id);
$$;

revoke execute on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;
revoke execute on function public.resolve_offer_redirect(uuid) from public;
grant execute on function public.resolve_offer_redirect(uuid) to anon, authenticated;
