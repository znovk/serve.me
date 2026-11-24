# User flows (Phase 1)

## Sign up and onboarding
1. `/signup`: name, email, password (client + server validation).
2. Confirmation email → `/auth/confirm` → `/onboarding` (if email confirmation is off, straight to onboarding).
3. Choose a role (customer, hospitality professional, business advertiser) and confirm 18+ → role dashboard.
4. Users can return to `/onboarding` to add another self-service role.

## Hospitality professional
1. Dashboard → Profile: choose username, display name, bio, workplace, photo URL; toggle **Publish**.
2. Add links (social, tips, personal, private events); hide/show or delete them.
3. Overview: public URL, QR preview, download PNG/SVG (only when published), counts of invitations and requests.
4. Partners: review invitations (business, verified status, compensation terms) → Accept / Decline / Block.
   Active → Pause / Resume / End / Block. Block a whole category. Unblock (does not restore ended partnerships).
5. Guests: accept / decline connection requests, disconnect, block; see which permissions each guest granted.

## Customer
1. Scan QR → `/p/username` (no account needed). Choose "I'm local" / "I'm visiting" to reorder offers.
2. Tap **Connect** → sign in / sign up if needed → request sent.
3. Dashboard → My connections: once accepted, switch each permission on/off; cancel, disconnect or block.
4. Set local/visitor preference.

## Advertiser
1. Dashboard → create business profile (name, market, category, website, service area). Starts **unverified**.
2. New campaign: headline, details, destination URL, audience, compensation model and amount/percent, budget, draft
   or active.
3. Campaign page: activate / pause / end; invite professionals by username; withdraw pending invites; end partnerships.
   Blocks appear as "Ended" (advertisers are not told who blocked them).

## Offer click
`/p/username` → offer → `/go/<partnershipId>` → 302 to destination **only if** the offer is still visible; otherwise
410 "no longer available". (Click recording is a later milestone.)

## Establishment / admin
Protected dashboards with clearly labeled placeholders. Roles granted by the project owner (see SECURITY.md).
