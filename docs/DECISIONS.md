# Architecture decision log

Format: date · decision · why · consequences.

1. **2026-11-24 · Modular monolith on Next.js 16 + Supabase.** Fastest path with strong defaults; seams documented for
   later extraction.
2. **2026-11-24 · Authorization in Postgres (RLS + SECURITY DEFINER RPCs).** Protects data even if an app route is
   wrong or the Data API is called directly. App checks are defense in depth.
3. **2026-11-24 · State machines in SQL functions, not client updates.** Partnership and connection rows have no client
   UPDATE grants; transitions are validated atomically with row locks and audit logging.
4. **2026-11-24 · anon has no table privileges.** Public pages use `get_public_profile`, which returns an explicit
   field allow-list. Prevents scraping of user ids or unpublished data.
5. **2026-11-24 · Policy helpers in a `private` schema.** Supabase advisor flagged them as callable RPCs; moving them
   removes that surface (notably `campaign_org`, which revealed campaign ownership).
6. **2026-11-24 · Multi-role users via `user_roles`.** Only customer/hospitality/advertiser are self-service; admin and
   establishment are granted by the owner.
7. **2026-11-24 · 18+ self-attestation at onboarding, no birth date stored.** Minimizes sensitive data. Messaging may
   require stronger eligibility later (some venues/regions need 21+).
8. **2026-11-24 · Accept moves a partnership straight to `active`.** `accepted` reserved for future contract/approval
   steps. Public display also requires the campaign to be active, so pausing a campaign hides it everywhere.
9. **2026-11-24 · Declined/blocked partnerships cannot be re-invited; terminated/expired can.** Matches "no unwanted
   repeat invitations"; professionals can always block.
10. **2026-11-24 · Advertisers never learn who blocked them.** Same generic error as "not found"; blocked rows shown as
    "Ended".
11. **2026-11-24 · Consent stored per connection with append-only history.** Five scopes, default false; disconnect and
    block revoke everything.
12. **2026-11-24 · Visitor type is client-only on public pages.** Stored in browser storage, never sent to the server;
    satisfies "no location tracking".
13. **2026-11-24 · Public profiles render dynamically (`connection()`).** Correctness over caching: declines/blocks must
    disappear immediately. Revisit with `use cache` + tag invalidation.
14. **2026-11-24 · Hand-written shadcn-style components.** Registry unreachable from the build sandbox; same conventions.
15. **2026-11-24 · Workplace is free text in Phase 1.** Verified `establishment_affiliations` come with establishment
    tooling; venue-owned customer data will be stored separately from professional connections.
16. **2026-11-24 · Photo is an https URL in Phase 1.** Uploads deferred until Storage validation is built.
17. **2026-11-24 · Money as integer minor units + basis points; future ledger append-only.** Avoids float errors and
    editable balances.
18. **2026-11-24 · Branding via `src/lib/config/brand.ts` / `NEXT_PUBLIC_BRAND_NAME`.** Working name only.
