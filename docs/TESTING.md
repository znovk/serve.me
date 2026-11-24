# Testing

| Suite         | Command          | What it covers                                                                     |
| ------------- | ---------------- | ---------------------------------------------------------------------------------- |
| Unit          | `pnpm test:unit` | Zod schemas, money, safe redirects, role routing, partnership UI state, offer ordering, DB error mapping, `OfferList` disclosure/ordering |
| Database      | `pnpm test:db`   | 32 RLS/authorization tests run as real `anon`/`authenticated` roles                 |
| End-to-end    | `pnpm test:e2e`  | Desktop + mobile: landing, signup validation, route protection, 404s, theme, overflow, skip link, screenshots |
| Static        | `pnpm lint`, `pnpm typecheck`, `pnpm build` |                                                          |

## Database tests

Run against **plain local Postgres** with a stub that emulates Supabase's `auth` schema, roles and default grants
(`supabase/tests/local-stub/00_supabase_stub.sql`). Each test runs in a rolled-back transaction.

```bash
# Postgres 15+ running locally, with a superuser matching your OS user
pnpm db:test-reset            # recreates barconnect_test and applies every migration
pnpm test:db
# custom connection: TEST_DATABASE_URL=postgresql://user@host/db pnpm test:db
```

Covered: anon has no table access; public payload has no ids/emails; no admin/establishment self-grant; no direct role
inserts; adult confirmation; multi-role; protected columns; cross-user profile reads/writes; links IDOR; https-only
links; cross-org campaign isolation; no self-verification; cross-org invites; pending/active/paused display rules;
redirect resolution; decline prevents re-invite; org blocks; category blocks; partnership ownership; invalid
transitions; no direct partnership writes; professional sees only names + scopes; consent before acceptance;
disconnect revokes consent with history; only customers change consent; stranger isolation; customer and professional
blocks.

## E2E tests

```bash
pnpm build
pnpm test:e2e
# use an installed Chrome instead of Playwright's download:
PLAYWRIGHT_CHROME_PATH=/usr/bin/google-chrome pnpm test:e2e
```

Screenshots land in `test-results/screens/`.

## Not yet automated (needs network access to the dev Supabase project)

The build sandbox could not reach `*.supabase.co`, so these flows are implemented but **unverified end-to-end**:

1. Sign up → confirm email → onboarding → role dashboard.
2. Professional creates + publishes profile, adds links, downloads QR; QR resolves to `/p/username`.
3. Advertiser creates business + active campaign, invites professional.
4. Professional accepts → offer appears on public page; declines/blocks → offer disappears.
5. Customer connects; professional accepts; customer toggles consent; disconnect revokes.
6. Role gates: each dashboard rejects users without the role.

Recommended: add a Playwright project that runs these against a Supabase **branch** or local Supabase stack
(`supabase start`) with seeded test users, in CI.
