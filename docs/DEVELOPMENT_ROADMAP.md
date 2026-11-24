# Development roadmap

## Phase 1 — Foundation (this phase)
Auth, roles, onboarding, dashboards for all five roles, hospitality profiles + public page + QR, advertiser profiles +
campaigns, partnership flow with blocks, customer connections + consent, RLS + tests, docs. Status:
[BUILD_STATUS.md](BUILD_STATUS.md).

## Phase 2 — Trust & polish
- Avatar uploads (Supabase Storage, size/MIME limits, re-encoding).
- Professional discovery for advertisers (opt-in directory, filters by area/category).
- Professional-initiated applications to open campaigns (`initiated_by = 'professional'`).
- Admin: business verification queue, user/org management, audit log viewer, role grants via audited RPC.
- Account deletion + data export (customer controls).
- Resend transactional email (invitations, connection requests).
- App-level rate limiting, CSP headers, Sentry.

## Phase 3 — Analytics & attribution
- `analytics_events` (profile views, visible offer impressions via IntersectionObserver, clicks, QR scans).
- Sessions, dedupe, bot filtering, IP/user-agent hashing; PostHog for product analytics.
- `/go` click recording with referral IDs; `leads`, `conversions` with verification states.
- Aggregated advertiser reports (no individual customer identities); monthly reports via Trigger.dev.

## Phase 4 — Payments
- Stripe Billing: advertiser and establishment subscriptions.
- Stripe Connect (Express): professional onboarding and payouts.
- Append-only `financial_ledger_entries` (pending → approved → available → paid; reversals, refunds, disputes),
  `commission_rules`, `payouts`, reconciliation jobs. Idempotent, signature-verified webhooks.
- Live activation only with explicit owner approval.

## Phase 5 — Messaging & CRM
- Conversations/messages with Supabase Realtime, gated by accepted connection + `direct_messages` consent at the DB
  level; read receipts, reporting, moderation, rate limits.
- Shift notifications, shared preferences, check-ins, visit history.

## Phase 6 — Establishments & loyalty
- Establishment profiles, verified staff affiliations, workplace advertising policies.
- Venue check-ins and loyalty programs (venue data separate from professional connections).
- POS integrations.

## Later
National affiliate network APIs, Expo mobile app, multi-region.
