# Build status

_Last updated: 2026-11-24 · Branch `phase-1`_

## Phase 1 acceptance criteria

| Criterion                                              | Status | Evidence |
| ------------------------------------------------------ | ------ | -------- |
| Application runs locally                               | ✅ | `pnpm build` + `pnpm start` used by e2e tests |
| Authentication works against a development Supabase project | ⚠️ Implemented, not verified | Sandbox couldn't reach Supabase; verify on a Vercel preview or locally (see TESTING.md) |
| Users receive only authorized roles                    | ✅ | DB tests (escalation, direct inserts) |
| Each dashboard is appropriately protected              | ✅ | Proxy redirect (e2e) + `requireRole` on every page/action + RLS |
| Professionals can create and edit public profiles      | ✅ code / ⚠️ e2e | DB tests for ownership; UI built |
| Public profiles accessible without authentication      | ✅ | `get_public_profile` anon tests |
| Public profile QR codes resolve correctly              | ✅ code / ⚠️ e2e | QR encodes `NEXT_PUBLIC_SITE_URL/p/<username>`; set the env var per environment |
| Advertisers can create basic campaigns                 | ✅ | DB tests + UI |
| Professionals can accept or decline partnerships       | ✅ | DB tests + UI |
| Declined or blocked advertisers not displayed publicly | ✅ | DB tests (decline, org block, category block, paused campaign) |
| Customers can request connections and manage consent   | ✅ | DB tests + UI |
| Unauthorized data access is rejected                   | ✅ | 32 DB tests; Supabase advisor clean of RLS issues |
| Mobile and desktop interfaces are responsive           | ✅ public pages / ⚠️ dashboards | E2E on Pixel 7 + desktop; dashboards need a signed-in visual pass |
| Tests, type checking and production build pass         | ✅ | 62 unit · 32 DB · 34 e2e · lint · tsc · build |
| Documentation reflects implemented functionality       | ✅ | This folder |
| No live payments or unapproved production operations  | ✅ | Schema applied to dev project with owner approval; nothing on `main` beyond scaffold |

## Completed
Schema + RLS + private helpers (8 migrations, applied to dev project) · generated types · Supabase SSR auth ·
onboarding · five dashboard shells · profile + links editor · public page with local/visitor ordering and disclosures
· SVG/PNG QR · controlled offer redirect · advertiser business profiles, campaigns, invitations · partnership actions
and blocks · customer connections and consent · design system (light/dark) · docs.

## In progress / blockers
- **End-to-end verification of auth and data flows** against Supabase (blocked by sandbox network allow-list).
- **Vercel project**: owner to import repo and set env vars (INTEGRATIONS.md).
- **Supabase redirect URLs**: owner to add localhost + Vercel URLs.

## Known issues
- Valid-format usernames that don't exist render the not-found UI with HTTP 200 (streaming); malformed ones return 404.
  Metadata sets `noindex`.
- Remote migration history names differ from file timestamps (see DATABASE_SCHEMA.md) — repair before `supabase db push`.
- Link reordering UI not built (links keep insertion order).
- Username changes break previously printed QR codes (warned in UI). Consider redirects from old usernames.

## Unfinished features (labeled placeholders in the UI)
Analytics/earnings, messaging, check-ins, visit history, shared preferences, loyalty, saved offers, data export,
account deletion, establishment tooling, admin tooling, advertiser reports/billing/discovery, photo uploads, payments.

## Next recommended milestone
1. Verify auth + core flows on a Vercel preview (or locally) and fix anything found.
2. Signed-in visual QA of dashboards on mobile/desktop.
3. Phase 2: admin verification queue, avatar uploads, professional discovery, transactional email, account deletion.
