# Product requirements

Working name: **BarConnect** (configurable in `src/lib/config/brand.ts`).

## Vision

An offline-to-online affiliate marketing, hospitality relationship management and customer retention platform.
Bartenders and servers build real relationships with hundreds of guests; the platform lets them monetize those
relationships through **voluntary** partnerships, affiliate recommendations, sponsorships and referrals, without
needing a social media following. Customers are locals, tourists, or anyone in the US.

## Principles

1. Professionals control every endorsement. Nothing appears on their page without an active, accepted partnership.
2. Customers control their data. Nothing is shared without explicit, revocable, per-scope consent.
3. Clear disclosure of sponsored and affiliate content.
4. Never fabricate analytics or treat unverified conversions as sales.
5. Premium hospitality technology feel; not a dating app, not a coupon directory.

## Roles

| Role                     | Self-service?            | Phase 1 scope                                                                        |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------ |
| Hospitality professional | Yes                      | Profile, links, public page, QR, partnerships (accept/decline/pause/end/block), guest connections |
| Customer                 | Yes                      | Connect to professionals, manage per-scope consent, local/visitor preference          |
| Business advertiser      | Yes                      | Business profile, campaigns, invite by username, manage partners                     |
| Restaurant / bar         | No (granted by owner)    | Protected dashboard shell with placeholders                                          |
| Administrator            | No (never via signup)    | Protected dashboard shell with placeholders                                          |

A user can hold several roles at once.

## Marketplace

- Advertiser markets: **local**, **tourism**, **national**.
- Partnership states: pending, accepted, declined, active, paused, expired, terminated, blocked.
- Compensation models modeled (not paid): monthly sponsorship, pay per verified click, pay per qualified lead, flat
  closed-sale commission, percentage commission, affiliate network commission, hybrid.
- Professionals can block an advertiser or a whole category; blocks hide existing offers and stop invitations.

## Public profile (`/p/[username]`)

Photo, name, bio, optional workplace, social/tip/personal/private-event links, connect button, sponsored
recommendations grouped by local / tourism / national with disclosure. Visitors pick "I'm local" / "I'm visiting" to
reorder offers — no location tracking. Loads without an account.

## CRM & consent

Consent scopes: direct messages, shift notifications, marketing, shared preferences, loyalty. All default off.
Professionals see only a display name and the scopes a customer has granted. No staff notes. No exact addresses,
payment data, or unnecessary location data.

## Out of scope for Phase 1

Messaging, loyalty, check-ins, payments/payouts (Stripe), analytics/attribution, affiliate network APIs, POS
integrations, photo uploads, admin tooling, establishment tooling, data export/deletion self-service. See
[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).

## Phase 1 acceptance criteria

See [BUILD_STATUS.md](BUILD_STATUS.md) for the current status of each criterion.
