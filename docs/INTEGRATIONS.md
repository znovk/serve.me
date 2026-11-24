# Integrations

| Integration       | Status                                       | Notes |
| ----------------- | -------------------------------------------- | ----- |
| Supabase Postgres | **Connected (dev project)**                  | Migrations 0100–0800 applied; security advisor reviewed. Ref in `.env.local`. |
| Supabase Auth     | **Configured in code; not yet verified end-to-end** | Email + password. Requires redirect URLs (below). Sign-in could not be exercised from the build sandbox (network allow-list). |
| Supabase Storage  | Not started                                  | Planned for avatars (Phase 2). |
| Supabase Realtime | Not started                                  | Planned for messaging. |
| GitHub            | **Connected**                                | `znovk/serve.me`; Phase 1 on branch `phase-1`. |
| Vercel            | **Pending owner action**                     | Import repo in Vercel dashboard; set env vars (below). |
| Stripe Billing / Connect | Not started (intentionally)           | No live payments in Phase 1. |
| Resend, PostHog, Sentry, Trigger.dev | Not started               | See roadmap. |
| Affiliate networks, POS | Not started                            | Must respect each network's terms and privacy rules. |

## Supabase setup checklist
1. **Authentication → URL Configuration**: Site URL = production URL (or `http://localhost:3000` during dev);
   Redirect URLs: `http://localhost:3000/**`, `https://<vercel-preview-domain>/**`, production domain.
2. **Authentication → Providers → Email**: keep "Confirm email" on for production.
3. Default email templates work (PKCE `code` flow). For custom templates, link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`.
4. Configure custom SMTP (e.g. Resend) before launch; Supabase's default sender is heavily rate-limited.

## Vercel setup checklist
1. Add New → Project → import `znovk/serve.me` (framework auto-detected: Next.js; package manager: pnpm).
2. Environment variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (the deployment's canonical URL — used in QR codes and email links)
   - optional `NEXT_PUBLIC_BRAND_NAME`
3. Add the Vercel URLs to Supabase redirect URLs.
4. Production deploys from `main` only after owner approval.
