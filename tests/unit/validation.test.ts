import { describe, expect, it } from "vitest";
import { campaignSchema, organizationSchema } from "@/modules/advertisers/schemas";
import { hospitalityProfileSchema, httpsUrlSchema, publicLinkSchema, usernameSchema } from "@/modules/hospitality/schemas";
import { onboardingSchema, signUpSchema } from "@/modules/identity/schemas";

describe("usernameSchema", () => {
  it.each(["alex", "alex-pours", "a1_b2", "abc"])("accepts %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(true);
  });
  it.each(["ab", "-alex", "alex-", "has space", "émile", "admin", "dashboard", "a".repeat(31)])("rejects %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(false);
  });
  it("normalizes case and whitespace", () => {
    expect(usernameSchema.parse("  Alex-Pours ")).toBe("alex-pours");
  });
});

describe("httpsUrlSchema", () => {
  it("accepts https links", () => {
    expect(httpsUrlSchema.safeParse("https://venmo.com/u/alex").success).toBe(true);
  });
  it.each(["http://example.com", "javascript:alert(1)", "data:text/html,hi", "ftp://x", "not a url", "https://exa mple.com"])(
    "rejects %s",
    (u) => {
      expect(httpsUrlSchema.safeParse(u).success).toBe(false);
    },
  );
});

describe("hospitalityProfileSchema", () => {
  it("turns empty optional fields into null", () => {
    const r = hospitalityProfileSchema.parse({ username: "alex", displayName: "Alex", bio: "", avatarUrl: "", isPublished: true });
    expect(r.bio).toBeNull();
    expect(r.avatarUrl).toBeNull();
  });
  it("limits bio length", () => {
    expect(
      hospitalityProfileSchema.safeParse({ username: "alex", displayName: "Alex", bio: "x".repeat(501), isPublished: false }).success,
    ).toBe(false);
  });
});

describe("publicLinkSchema", () => {
  it("requires a known kind", () => {
    expect(publicLinkSchema.safeParse({ kind: "crypto", label: "x", url: "https://x.com" }).success).toBe(false);
  });
});

describe("identity schemas", () => {
  it("requires a 10+ character password", () => {
    expect(signUpSchema.safeParse({ displayName: "A", email: "a@example.com", password: "short" }).success).toBe(false);
  });
  it("only allows self-service roles in onboarding", () => {
    expect(onboardingSchema.safeParse({ role: "admin", confirmAdult: true }).success).toBe(false);
    expect(onboardingSchema.safeParse({ role: "establishment", confirmAdult: true }).success).toBe(false);
    expect(onboardingSchema.safeParse({ role: "customer", confirmAdult: false }).success).toBe(false);
    expect(onboardingSchema.safeParse({ role: "customer", confirmAdult: true }).success).toBe(true);
  });
});

describe("campaignSchema", () => {
  const base = {
    organizationId: "6f1c1e2a-9b8d-4c3e-8f7a-1b2c3d4e5f60",
    name: "Spring",
    offerHeadline: "10% off",
    destinationUrl: "https://example.com",
    marketScope: "local",
    status: "draft",
  } as const;

  it("converts dollars to integer cents", () => {
    const r = campaignSchema.parse({ ...base, compensationModel: "per_lead", compensationAmount: "25.5", budget: "$1,000" });
    expect(r.compensationAmount).toBe(2550);
    expect(r.budget).toBe(100000);
  });
  it("requires a percentage for percentage commissions", () => {
    expect(campaignSchema.safeParse({ ...base, compensationModel: "percentage_commission" }).success).toBe(false);
    expect(campaignSchema.parse({ ...base, compensationModel: "percentage_commission", compensationPercent: "12.5" }).compensationPercent).toBe(1250);
  });
  it("requires an amount for fixed models", () => {
    expect(campaignSchema.safeParse({ ...base, compensationModel: "per_click" }).success).toBe(false);
  });
  it("rejects malformed money", () => {
    expect(campaignSchema.safeParse({ ...base, compensationModel: "per_click", compensationAmount: "1.234" }).success).toBe(false);
  });
});

describe("organizationSchema", () => {
  it("requires https websites", () => {
    expect(organizationSchema.safeParse({ name: "Acme", marketScope: "local", websiteUrl: "http://acme.com" }).success).toBe(false);
  });
});
