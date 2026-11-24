# Security

## Model

1. **Database (authoritative):** RLS on every table, deny by default; column-level grants; state changes only via
   `SECURITY DEFINER` functions with `search_path = ''`; anon has zero table privileges.
2. **Server (defense in depth):** every Server Action and route handler calls `requireUser`/`requireRole` and
   re-validates input with Zod. Server Actions accept `unknown`.
3. **Proxy (UX only):** redirects signed-out users and rejects malformed profile URLs with 404. Never trusted for
   authorization.

## Threats addressed in Phase 1

| Threat                                  | Mitigation                                                                                 | Test |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ---- |
| Privilege escalation via signup         | `claim_role` only allows customer/hospitality/advertiser; `user_roles` not client-writable | DB   |
| Self-verification of business           | `verification_status` excluded from column grants                                          | DB   |
| IDOR on profiles/links/campaigns        | RLS by owner / org membership; RPCs look up rows by `auth.uid()`                            | DB   |
| Cross-tenant access                     | `private.is_org_member` in every org policy                                                | DB   |
| Unwanted advertiser display             | Public function requires active partnership + active campaign + no block                   | DB   |
| Re-invite spam after decline/block      | `invite_to_campaign` rejects; generic error does not reveal the block                      | DB   |
| Customer data exposure                  | Professionals read via `list_professional_connections` (name + scopes only)                | DB   |
| Consent tampering                       | Only `set_consent` (customer only) writes; history is append-only                          | DB   |
| Anonymous data scraping                 | anon has no table grants; only allow-listed RPCs                                           | DB   |
| Open redirect after login               | `safeNextPath`                                                                             | Unit |
| Malicious links (`javascript:`)         | https-only check constraints + Zod                                                         | DB/Unit |
| Offer redirect abuse                    | `/go/[uuid]` resolves only currently-visible offers; https only                            | E2E |
| Account enumeration                     | Generic signup/login errors                                                                | —    |
| Brute force / spam                      | Supabase Auth rate limits; DB rate limits on invites (50/org/day), connections (30/day), orgs (5/user), links (25/profile) | — |
| Session fixation / leakage              | HTTP-only Supabase cookies; auth responses carry no-cache headers (`@supabase/ssr`)        | —    |
| Secret exposure                         | Only `NEXT_PUBLIC_*` read in `lib/env.ts`; no service-role key used; `.env*` git-ignored   | —    |

Supabase security advisor (run after migrations): no missing-RLS findings. Remaining warnings are the intentional
RPC functions above, which each check the caller, and `public.rls_auto_enable()`, which Supabase created (not ours).

## Operating procedures

**Grant admin or establishment role** (project owner, Supabase SQL editor — never through the app):

```sql
insert into public.user_roles (user_id, role, granted_by)
values ('<user uuid>', 'admin', '<your uuid>');
```

**Verify a business:** `update public.business_profiles set verification_status = 'verified' where organization_id = '<uuid>';`

## Requires owner approval

Destructive DB operations, production deploys / merges to `main`, permission expansion, live financial operations,
paid resources. Do not connect agent tooling with unrestricted write access to a production database.

## Known gaps / next steps

- App-level rate limiting for auth endpoints beyond Supabase defaults (e.g. Upstash or Vercel WAF).
- Content Security Policy headers (nonce-based) — planned with analytics scripts.
- Photo uploads (Supabase Storage) need MIME/size validation and image re-encoding.
- Account deletion and data export workflows (currently via support).
- Abuse reporting and moderation queues.
- Age eligibility is self-attested (18+); stronger checks may be needed for messaging.
- Move remaining internal functions (`write_audit`, `revoke_all_consent`, `is_advertiser_blocked`) to `private` for
  tidiness (they are already not executable by clients).
