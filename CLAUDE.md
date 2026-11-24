# CLAUDE.md — permanent project rules

Read this first in every session, then `docs/BUILD_STATUS.md` for current state. Also read `AGENTS.md`: this is
Next.js 16; check `node_modules/next/dist/docs/` before using framework APIs.

## Product in one paragraph

Hospitality professionals (bartenders, servers) get a public page (`/p/[username]`) and QR code, accept or decline
advertiser partnerships, and connect with customers who explicitly consent. Advertisers (local / tourism / national)
create campaigns and invite professionals. Establishments and admins exist as roles; their tooling is later.
"BarConnect" is a working name — read it from `src/lib/config/brand.ts`, never hardcode it.

## Non-negotiable rules

1. **Security is enforced in the database.** Every table has RLS, deny by default. Privileged state changes go through
   `SECURITY DEFINER` functions (`search_path = ''`, fully qualified names, explicit `revoke`/`grant`). UI checks are
   cosmetic.
2. **anon has no table access.** Public data is served only by allow-listed functions (`get_public_profile`,
   `resolve_offer_redirect`).
3. **Authorization helpers used by policies live in the `private` schema** (not exposed via the Data API).
4. **Every Server Action / route handler re-authenticates** (`requireUser` / `requireRole` from
   `src/modules/identity/session.ts`) and re-validates input with Zod. Actions take `unknown` input.
5. **No service-role key in the app** in Phase 1. Never expose secrets to the browser; only `NEXT_PUBLIC_*` in
   `src/lib/env.ts`.
6. **Roles:** users may hold several. Only `customer`, `hospitality`, `advertiser` are self-service (`claim_role`).
   `admin` and `establishment` are granted manually by the project owner. Never add a client path that grants them.
7. **Advertisers appear publicly only when** partnership `active` AND campaign `active` AND not blocked (org or
   category). Declined/blocked advertisers cannot re-invite. Keep the DB tests proving this green.
8. **Consent** defaults to false, is per connection and per scope, is revocable, and every change is written to
   `consent_history`. Disconnect/block revokes all consent.
9. **Money:** integer minor units (`*_minor`), percentages in basis points. Future balances come from an append-only
   ledger, never editable balance columns. No live payments, charges or payouts without explicit owner approval.
10. **Never fabricate analytics.** Placeholder UI must be labeled "Not built yet" (`DevPlaceholder`).
11. **Approval required** before: destructive DB operations, production deploys / merging to `main`, permission
    expansion, live financial operations, or creating paid resources.
12. Never commit `.env.local` or credentials. Use synthetic data only (`supabase/seed.sql`).

## Architecture conventions

- Modular monolith. Domain code in `src/modules/<domain>/`: `schemas.ts` (Zod, shared client/server), `queries.ts`
  (`server-only` reads), `actions.ts` (`"use server"` mutations), pure helpers (unit-tested).
- `src/app` = routing + presentation only. Keep business logic out of components.
- Cache Components is on: anything reading cookies/session or `params` goes inside `<Suspense>`. Public profile pages
  call `connection()` so blocks/declines take effect immediately.
- Supabase clients: `lib/supabase/server.ts` (per request, RLS as user), `lib/supabase/public.ts` (anon, no cookies),
  `lib/supabase/proxy.ts` (session refresh + optimistic redirect only).
- UI: components in `src/components/ui` (shadcn-style, owned source). Tokens in `src/app/globals.css`.

## Database workflow

1. Add a new timestamped file in `supabase/migrations/` (never edit applied migrations).
2. `pnpm db:test-reset && pnpm test:db` locally; add tests for every new policy/function.
3. Apply to the dev project (with owner approval), run Supabase security advisors, regenerate
   `src/lib/supabase/database.types.ts`.

## Definition of done

`pnpm check`, `pnpm test:db` and `pnpm test:e2e` pass; docs and `docs/BUILD_STATUS.md` updated; descriptive commit.
