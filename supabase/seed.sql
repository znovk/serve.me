-- =============================================================================
-- DEVELOPMENT SEED — SYNTHETIC DATA ONLY. Never run against production.
-- Every name, email and business below is fictional.
--
-- Supabase local: applied automatically by `supabase db reset`.
-- Users created here have no password; sign in by creating real dev accounts
-- through the app, or set passwords in the Supabase dashboard (dev only).
-- =============================================================================

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'bartender.demo@example.test', '{"display_name":"Demo Bartender"}'),
  ('00000000-0000-4000-a000-000000000002', 'customer.demo@example.test', '{"display_name":"Demo Customer"}'),
  ('00000000-0000-4000-a000-000000000003', 'advertiser.demo@example.test', '{"display_name":"Demo Advertiser"}')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-a000-000000000001', 'hospitality'),
  ('00000000-0000-4000-a000-000000000002', 'customer'),
  ('00000000-0000-4000-a000-000000000003', 'advertiser')
on conflict do nothing;

update public.profiles set adult_confirmed_at = now(), onboarded_at = now()
 where id in (
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-a000-000000000003');

insert into public.hospitality_profiles (id, user_id, username, display_name, bio, workplace_name, is_published) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001',
   'demo-bartender', 'Demo Bartender', 'Fictional bartender profile for local development.',
   'The Example Tavern', true)
on conflict (id) do nothing;

insert into public.public_links (hospitality_profile_id, kind, label, url, position) values
  ('10000000-0000-4000-a000-000000000001', 'social', 'Instagram', 'https://example.com/instagram', 0),
  ('10000000-0000-4000-a000-000000000001', 'tip', 'Leave a tip', 'https://example.com/tip', 1)
on conflict do nothing;

insert into public.customer_profiles (user_id, display_name, visitor_type) values
  ('00000000-0000-4000-a000-000000000002', 'Demo Customer', 'visitor')
on conflict do nothing;

insert into public.organizations (id, kind, name, created_by) values
  ('20000000-0000-4000-a000-000000000001', 'advertiser', 'Example Fishing Charters',
   '00000000-0000-4000-a000-000000000003')
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, member_role) values
  ('20000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'owner')
on conflict do nothing;

insert into public.business_profiles (organization_id, display_name, description, website_url, market_scope, category_id, service_area)
select '20000000-0000-4000-a000-000000000001', 'Example Fishing Charters',
       'Fictional charter business for development.', 'https://example.com/charters',
       'tourism', id, 'Example Bay'
  from public.business_categories where slug = 'fishing-charters'
on conflict do nothing;

insert into public.advertising_campaigns (id, organization_id, name, offer_headline, description, destination_url,
  market_scope, compensation_model, compensation_amount_minor, status, created_by) values
  ('30000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001',
   'Half-day charter referral', '10% off a half-day charter', 'Fictional offer for development.',
   'https://example.com/charters/book', 'tourism', 'per_lead', 2500, 'active',
   '00000000-0000-4000-a000-000000000003')
on conflict (id) do nothing;

insert into public.campaign_partnerships (campaign_id, hospitality_profile_id, status, initiated_by, invited_by, responded_at) values
  ('30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'active', 'advertiser',
   '00000000-0000-4000-a000-000000000003', now())
on conflict do nothing;
