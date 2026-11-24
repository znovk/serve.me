-- =============================================================================
-- Migration: reference data (business categories). Safe to re-run.
-- =============================================================================
insert into public.business_categories (slug, name) values
  ('home-services', 'Home services'),
  ('hvac', 'HVAC'),
  ('electrical', 'Electrical'),
  ('roofing', 'Roofing'),
  ('landscaping', 'Landscaping'),
  ('fitness', 'Fitness'),
  ('restaurants', 'Restaurants'),
  ('fishing-charters', 'Fishing charters'),
  ('golf', 'Golf'),
  ('attractions', 'Attractions'),
  ('boat-rentals', 'Boat rentals'),
  ('hotels', 'Hotels and lodging'),
  ('entertainment', 'Entertainment'),
  ('retail', 'Retail'),
  ('apparel', 'Apparel'),
  ('travel', 'Travel'),
  ('subscriptions', 'Subscriptions'),
  ('consumer-products', 'Consumer products'),
  ('alcohol-tobacco', 'Alcohol and tobacco'),
  ('gambling', 'Gambling'),
  ('financial-services', 'Financial services')
on conflict (slug) do nothing;
