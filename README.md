# BarConnect (working name)

Permission-based affiliate marketing and relationship platform for bartenders, servers and other hospitality
professionals. Professionals get a public link-in-bio page and QR code, choose which businesses they recommend, and
connect with customers who explicitly opt in.

> **Status: Phase 1 (development).** No live payments. See [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md).

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript strict · Tailwind CSS 4 · shadcn/ui-style components · Supabase
(Postgres, Auth, RLS) · React Hook Form + Zod · Vitest · Playwright · pnpm · Vercel.

## Quick start

```bash
pnpm install
cp .env.example .env.local      # fill in Supabase URL + publishable key
pnpm dev                        # http://localhost:3000
```

Supabase project setup (one time):

1. Apply the migrations in `supabase/migrations/` in order (Supabase CLI `supabase db push`, or the SQL editor).
2. **Authentication → URL Configuration**: set Site URL, and add `http://localhost:3000/**` and your Vercel URL(s)
   followed by `/**` to Redirect URLs.
3. Never put the service-role / secret key in any `NEXT_PUBLIC_` variable. Phase 1 does not use it.

## Scripts

| Command              | What it does                                                         |
| -------------------- | -------------------------------------------------------------------- |
| `pnpm dev`           | Development server                                                   |
| `pnpm check`         | Lint, typecheck, unit tests and production build                     |
| `pnpm test:unit`     | Vitest unit/component tests                                          |
| `pnpm db:test-reset` | Recreate the local Postgres test DB (Supabase stub + all migrations) |
| `pnpm test:db`       | RLS/authorization tests against the local test DB                    |
| `pnpm test:e2e`      | Playwright (desktop + mobile) against `pnpm build` output            |

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md) · [Architecture](docs/ARCHITECTURE.md) ·
  [Database schema](docs/DATABASE_SCHEMA.md) · [Security](docs/SECURITY.md)
- [Design system](docs/DESIGN_SYSTEM.md) · [User flows](docs/USER_FLOWS.md) · [Roadmap](docs/DEVELOPMENT_ROADMAP.md)
- [Integrations](docs/INTEGRATIONS.md) · [Decisions](docs/DECISIONS.md) · [Testing](docs/TESTING.md) ·
  [Build status](docs/BUILD_STATUS.md)
- Agent rules: [CLAUDE.md](CLAUDE.md)
