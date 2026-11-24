import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./helpers";

/**
 * Database authorization tests. These prove that RLS, column grants and the
 * SECURITY DEFINER functions reject unauthorized access when queried DIRECTLY
 * (as PostgREST would), independent of the Next.js application.
 */
let db: Db;

beforeAll(async () => {
  db = await openDb();
});
afterAll(async () => {
  await db.client.end();
});
beforeEach(async () => {
  await db.admin("begin");
});
afterEach(async () => {
  await db.admin("rollback");
});

async function makeProfessional(name: string, published = true) {
  const uid = await db.createUser(name, ["hospitality"]);
  const username = `${name}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
  const [hp] = await db.as<{ id: string }>(
    uid,
    "insert into public.hospitality_profiles (user_id, username, display_name, is_published) values ($1, $2, $3, $4) returning id",
    [uid, username, name, published],
  );
  return { uid, username, profileId: hp!.id };
}

async function makeAdvertiser(name: string, categorySlug = "fishing-charters", scope = "tourism") {
  const uid = await db.createUser(name, ["advertiser"]);
  const [cat] = await db.admin<{ id: string }>("select id from public.business_categories where slug = $1", [categorySlug]);
  const [org] = await db.as<{ id: string }>(
    uid,
    "select public.create_advertiser_organization($1, $2::public.market_scope, $3) as id",
    [name, scope, cat!.id],
  );
  const [campaign] = await db.as<{ id: string }>(
    uid,
    `insert into public.advertising_campaigns
       (organization_id, name, offer_headline, destination_url, market_scope, compensation_model, status, created_by)
     values ($1, 'Campaign', 'Great offer', 'https://example.com/offer', $2, 'per_click', 'active', $3)
     returning id`,
    [org!.id, scope, uid],
  );
  return { uid, orgId: org!.id, campaignId: campaign!.id, categoryId: cat!.id };
}

async function publicOffers(username: string) {
  const [row] = await db.anon<{ p: { offers: { headline: string }[] } | null }>(
    "select public.get_public_profile($1) as p",
    [username],
  );
  return row!.p?.offers ?? [];
}

describe("anonymous access", () => {
  it("has no direct table access to private tables", async () => {
    for (const table of [
      "profiles",
      "user_roles",
      "customer_profiles",
      "customer_connections",
      "consent_preferences",
      "hospitality_profiles",
      "public_links",
      "advertising_campaigns",
      "campaign_partnerships",
      "organizations",
      "audit_logs",
    ]) {
      const msg = await db.fails(() => db.anon(`select * from public.${table}`));
      expect(msg, table).toMatch(/permission denied/);
    }
  });

  it("reads only published profiles through get_public_profile", async () => {
    const pub = await makeProfessional("pubpro");
    const priv = await makeProfessional("privpro", false);
    const [a] = await db.anon<{ p: { username: string } | null }>("select public.get_public_profile($1) as p", [pub.username]);
    const [b] = await db.anon<{ p: unknown }>("select public.get_public_profile($1) as p", [priv.username]);
    expect(a!.p?.username).toBe(pub.username);
    expect(b!.p).toBeNull();
  });

  it("public profile payload contains no user ids or emails", async () => {
    const pro = await makeProfessional("shape");
    const [row] = await db.anon<{ p: Record<string, unknown> }>("select public.get_public_profile($1) as p", [pro.username]);
    const json = JSON.stringify(row!.p);
    expect(json).not.toContain(pro.uid);
    expect(json).not.toContain("@example.test");
    expect(Object.keys(row!.p).sort()).toEqual(
      ["avatar_url", "bio", "display_name", "links", "offers", "username", "workplace_name"].sort(),
    );
  });

  it("cannot call privileged functions", async () => {
    const msg = await db.fails(() => db.anon("select public.claim_role('customer', true)"));
    expect(msg).toMatch(/permission denied/);
  });
});

describe("roles and privilege escalation", () => {
  it("cannot claim admin or establishment roles", async () => {
    const uid = await db.createUser("escalator");
    expect(await db.fails(() => db.as(uid, "select public.claim_role('admin', true)"))).toMatch(/role_not_claimable/);
    expect(await db.fails(() => db.as(uid, "select public.claim_role('establishment', true)"))).toMatch(
      /role_not_claimable/,
    );
  });

  it("cannot insert roles directly", async () => {
    const uid = await db.createUser("direct");
    const msg = await db.fails(() =>
      db.as(uid, "insert into public.user_roles (user_id, role) values ($1, 'admin')", [uid]),
    );
    expect(msg).toMatch(/permission denied/);
  });

  it("requires adult confirmation to claim a role", async () => {
    const uid = await db.createUser("minorcheck");
    expect(await db.fails(() => db.as(uid, "select public.claim_role('customer', false)"))).toMatch(
      /adult_confirmation_required/,
    );
    await db.as(uid, "select public.claim_role('customer', true)");
    const roles = await db.as<{ role: string }>(uid, "select role from public.user_roles");
    expect(roles.map((r) => r.role)).toEqual(["customer"]);
  });

  it("supports multiple roles per user", async () => {
    const uid = await db.createUser("multi");
    await db.as(uid, "select public.claim_role('customer', true)");
    await db.as(uid, "select public.claim_role('hospitality', true)");
    const roles = await db.as<{ role: string }>(uid, "select role from public.user_roles order by role");
    expect(roles.map((r) => r.role).sort()).toEqual(["customer", "hospitality"]);
  });

  it("cannot set onboarding/adult timestamps directly", async () => {
    const uid = await db.createUser("tamper");
    const msg = await db.fails(() =>
      db.as(uid, "update public.profiles set onboarded_at = now() where id = $1", [uid]),
    );
    expect(msg).toMatch(/permission denied/);
  });
});

describe("user isolation (IDOR)", () => {
  it("one user cannot read another user's private profile", async () => {
    const a = await db.createUser("alice");
    const b = await db.createUser("bob");
    const rows = await db.as(a, "select * from public.profiles where id = $1", [b]);
    expect(rows).toHaveLength(0);
  });

  it("cannot update another user's profile", async () => {
    const a = await db.createUser("alice2");
    const b = await db.createUser("bob2");
    await db.as(a, "update public.profiles set display_name = 'pwned' where id = $1", [b]);
    const [row] = await db.admin<{ display_name: string }>("select display_name from public.profiles where id = $1", [b]);
    expect(row!.display_name).toBe("bob2");
  });

  it("cannot create a hospitality profile for someone else or without the role", async () => {
    const a = await db.createUser("hpa", ["hospitality"]);
    const b = await db.createUser("hpb", ["hospitality"]);
    const noRole = await db.createUser("hpc");
    expect(
      await db.fails(() =>
        db.as(a, "insert into public.hospitality_profiles (user_id, username, display_name) values ($1, 'stolen-name', 'x')", [b]),
      ),
    ).toMatch(/row-level security/);
    expect(
      await db.fails(() =>
        db.as(noRole, "insert into public.hospitality_profiles (user_id, username, display_name) values ($1, 'no-role', 'x')", [noRole]),
      ),
    ).toMatch(/row-level security/);
  });

  it("cannot add links to another professional's profile or read hidden links", async () => {
    const owner = await makeProfessional("linkowner");
    const intruder = await makeProfessional("intruder");
    await db.as(
      owner.uid,
      "insert into public.public_links (hospitality_profile_id, label, url, is_visible) values ($1, 'Hidden', 'https://example.com/h', false)",
      [owner.profileId],
    );
    expect(
      await db.fails(() =>
        db.as(
          intruder.uid,
          "insert into public.public_links (hospitality_profile_id, label, url) values ($1, 'Spam', 'https://example.com/s')",
          [owner.profileId],
        ),
      ),
    ).toMatch(/row-level security/);
    const seen = await db.as(intruder.uid, "select * from public.public_links where hospitality_profile_id = $1", [
      owner.profileId,
    ]);
    expect(seen).toHaveLength(0);
    const [pub] = await db.anon<{ p: { links: unknown[] } }>("select public.get_public_profile($1) as p", [owner.username]);
    expect(pub!.p.links).toHaveLength(0);
  });

  it("rejects non-https links", async () => {
    const pro = await makeProfessional("jslink");
    expect(
      await db.fails(() =>
        db.as(
          pro.uid,
          "insert into public.public_links (hospitality_profile_id, label, url) values ($1, 'x', 'javascript:alert(1)')",
          [pro.profileId],
        ),
      ),
    ).toMatch(/check constraint/);
  });
});

describe("organization tenant isolation", () => {
  it("advertisers cannot see or write another organization's campaigns", async () => {
    const a = await makeAdvertiser("Org A");
    const b = await makeAdvertiser("Org B");
    const seen = await db.as(b.uid, "select * from public.advertising_campaigns where organization_id = $1", [a.orgId]);
    expect(seen).toHaveLength(0);
    expect(
      await db.fails(() =>
        db.as(
          b.uid,
          `insert into public.advertising_campaigns (organization_id, name, offer_headline, destination_url, market_scope, compensation_model, created_by)
           values ($1, 'Hijack', 'x x', 'https://example.com', 'local', 'per_click', $2)`,
          [a.orgId, b.uid],
        ),
      ),
    ).toMatch(/row-level security/);
    await db.as(b.uid, "update public.advertising_campaigns set name = 'pwned' where id = $1", [a.campaignId]);
    const [row] = await db.admin<{ name: string }>("select name from public.advertising_campaigns where id = $1", [a.campaignId]);
    expect(row!.name).toBe("Campaign");
  });

  it("advertisers cannot verify their own business", async () => {
    const a = await makeAdvertiser("Self Verify");
    expect(
      await db.fails(() =>
        db.as(a.uid, "update public.business_profiles set verification_status = 'verified' where organization_id = $1", [a.orgId]),
      ),
    ).toMatch(/permission denied/);
  });

  it("cannot invite from another organization's campaign", async () => {
    const a = await makeAdvertiser("Inviter A");
    const b = await makeAdvertiser("Inviter B");
    const pro = await makeProfessional("target");
    expect(await db.fails(() => db.as(b.uid, "select public.invite_to_campaign($1, $2)", [a.campaignId, pro.username]))).toMatch(
      /campaign_not_found/,
    );
  });
});

describe("partnerships and public display", () => {
  it("only active partnerships on active campaigns appear publicly", async () => {
    const adv = await makeAdvertiser("Charter Co");
    const pro = await makeProfessional("bartender");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    expect(await publicOffers(pro.username)).toHaveLength(0); // pending

    await db.as(pro.uid, "select public.professional_update_partnership($1, 'accept')", [inv!.id]);
    expect(await publicOffers(pro.username)).toHaveLength(1);

    await db.as(adv.uid, "update public.advertising_campaigns set status = 'paused' where id = $1", [adv.campaignId]);
    expect(await publicOffers(pro.username)).toHaveLength(0);
    const [redir] = await db.anon<{ u: string | null }>("select public.resolve_offer_redirect($1) as u", [inv!.id]);
    expect(redir!.u).toBeNull();
  });

  it("declined advertisers are hidden and cannot re-invite", async () => {
    const adv = await makeAdvertiser("Decline Co");
    const pro = await makeProfessional("decliner");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    await db.as(pro.uid, "select public.professional_update_partnership($1, 'decline')", [inv!.id]);
    expect(await publicOffers(pro.username)).toHaveLength(0);
    expect(await db.fails(() => db.as(adv.uid, "select public.invite_to_campaign($1, $2)", [adv.campaignId, pro.username]))).toMatch(
      /professional_unavailable/,
    );
  });

  it("blocking an advertiser hides all its offers and stops new invitations", async () => {
    const adv = await makeAdvertiser("Block Co");
    const pro = await makeProfessional("blocker");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    await db.as(pro.uid, "select public.professional_update_partnership($1, 'accept')", [inv!.id]);
    await db.as(pro.uid, "select public.professional_update_partnership($1, 'block')", [inv!.id]);
    expect(await publicOffers(pro.username)).toHaveLength(0);

    const [c2] = await db.as<{ id: string }>(
      adv.uid,
      `insert into public.advertising_campaigns (organization_id, name, offer_headline, destination_url, market_scope, compensation_model, status, created_by)
       values ($1, 'Second', 'Another offer', 'https://example.com/2', 'tourism', 'per_click', 'active', $2) returning id`,
      [adv.orgId, adv.uid],
    );
    expect(await db.fails(() => db.as(adv.uid, "select public.invite_to_campaign($1, $2)", [c2!.id, pro.username]))).toMatch(
      /professional_unavailable/,
    );
  });

  it("category blocks hide existing offers in that category", async () => {
    const adv = await makeAdvertiser("Cat Co", "gambling", "national");
    const pro = await makeProfessional("catblocker");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    await db.as(pro.uid, "select public.professional_update_partnership($1, 'accept')", [inv!.id]);
    expect(await publicOffers(pro.username)).toHaveLength(1);
    await db.as(pro.uid, "select public.block_advertiser(null, $1)", [adv.categoryId]);
    expect(await publicOffers(pro.username)).toHaveLength(0);
  });

  it("professionals cannot act on someone else's partnership", async () => {
    const adv = await makeAdvertiser("Other Co");
    const pro = await makeProfessional("realpro");
    const other = await makeProfessional("otherpro");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    expect(
      await db.fails(() => db.as(other.uid, "select public.professional_update_partnership($1, 'accept')", [inv!.id])),
    ).toMatch(/partnership_not_found/);
  });

  it("rejects invalid state transitions", async () => {
    const adv = await makeAdvertiser("Transition Co");
    const pro = await makeProfessional("transitions");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    expect(await db.fails(() => db.as(pro.uid, "select public.professional_update_partnership($1, 'resume')", [inv!.id]))).toMatch(
      /invalid_transition/,
    );
  });

  it("partnership rows are not directly writable", async () => {
    const adv = await makeAdvertiser("Direct Co");
    const pro = await makeProfessional("directpro");
    const [inv] = await db.as<{ id: string }>(adv.uid, "select public.invite_to_campaign($1, $2) as id", [
      adv.campaignId,
      pro.username,
    ]);
    expect(
      await db.fails(() => db.as(adv.uid, "update public.campaign_partnerships set status = 'active' where id = $1", [inv!.id])),
    ).toMatch(/permission denied/);
  });
});

describe("customer connections and consent", () => {
  async function setup() {
    const pro = await makeProfessional("connpro");
    const customer = await db.createUser("Casey", ["customer"]);
    await db.as(customer, "insert into public.customer_profiles (user_id, display_name) values ($1, 'Casey')", [customer]);
    const [c] = await db.as<{ id: string }>(customer, "select public.request_connection($1) as id", [pro.username]);
    return { pro, customer, connectionId: c!.id };
  }

  it("professional sees only display name and consent flags", async () => {
    const { pro } = await setup();
    const rows = await db.as<Record<string, unknown>>(pro.uid, "select * from public.list_professional_connections()");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.customer_display_name).toBe("Casey");
    expect(JSON.stringify(rows[0])).not.toContain("@example.test");
    // Direct table reads of the customer's private profile are denied by RLS.
    const direct = await db.as(pro.uid, "select * from public.customer_profiles");
    expect(direct).toHaveLength(0);
  });

  it("consent cannot be granted before the connection is accepted", async () => {
    const { customer, connectionId } = await setup();
    expect(
      await db.fails(() => db.as(customer, "select public.set_consent($1, 'marketing', true)", [connectionId])),
    ).toMatch(/connection_not_accepted/);
  });

  it("disconnecting revokes all consent and records history", async () => {
    const { pro, customer, connectionId } = await setup();
    await db.as(pro.uid, "select public.professional_update_connection($1, 'accept')", [connectionId]);
    await db.as(customer, "select public.set_consent($1, 'direct_messages', true)", [connectionId]);
    await db.as(customer, "select public.set_consent($1, 'marketing', true)", [connectionId]);
    await db.as(customer, "select public.customer_update_connection($1, 'disconnect')", [connectionId]);
    const [prefs] = await db.as<Record<string, boolean>>(
      customer,
      "select direct_messages, marketing from public.consent_preferences where connection_id = $1",
      [connectionId],
    );
    expect(prefs).toEqual({ direct_messages: false, marketing: false });
    const history = await db.as<{ granted: boolean }>(
      customer,
      "select granted from public.consent_history where connection_id = $1 order by created_at",
      [connectionId],
    );
    expect(history.map((h) => h.granted)).toEqual([true, true, false, false]);
  });

  it("only the customer can change consent", async () => {
    const { pro, connectionId } = await setup();
    await db.as(pro.uid, "select public.professional_update_connection($1, 'accept')", [connectionId]);
    expect(
      await db.fails(() => db.as(pro.uid, "select public.set_consent($1, 'marketing', true)", [connectionId])),
    ).toMatch(/connection_not_found/);
  });

  it("other customers cannot see the connection", async () => {
    const { connectionId } = await setup();
    const stranger = await db.createUser("stranger", ["customer"]);
    const rows = await db.as(stranger, "select * from public.customer_connections where id = $1", [connectionId]);
    expect(rows).toHaveLength(0);
  });

  it("a customer block hides the connection from the professional and prevents re-requests", async () => {
    const { pro, customer, connectionId } = await setup();
    await db.as(customer, "select public.customer_update_connection($1, 'block')", [connectionId]);
    const rows = await db.as(pro.uid, "select * from public.list_professional_connections()");
    expect(rows).toHaveLength(0);
    expect(await db.fails(() => db.as(customer, "select public.request_connection($1)", [pro.username]))).toMatch(
      /professional_unavailable/,
    );
  });

  it("a professional block prevents the customer from reconnecting", async () => {
    const { pro, customer, connectionId } = await setup();
    await db.as(pro.uid, "select public.professional_update_connection($1, 'block')", [connectionId]);
    expect(await db.fails(() => db.as(customer, "select public.request_connection($1)", [pro.username]))).toMatch(
      /professional_unavailable/,
    );
  });

  it("requires the customer role", async () => {
    const pro = await makeProfessional("rolecheck");
    const nobody = await db.createUser("nobody");
    expect(await db.fails(() => db.as(nobody, "select public.request_connection($1)", [pro.username]))).toMatch(
      /customer_role_required/,
    );
  });
});
