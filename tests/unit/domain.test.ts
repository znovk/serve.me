import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/env";
import { activeSection, isActiveItem, navSectionsFor } from "@/components/layout/nav-config";
import { defaultDashboardFor, isSelfServiceRole, sortRoles } from "@/modules/identity/roles";
import { advertiserActionsFor, professionalActionsFor } from "@/modules/partnerships/state";
import { prioritizeOffers } from "@/modules/public-profile/offers";
import type { PublicOffer } from "@/modules/public-profile/types";
import { messageForDbError } from "@/modules/shared/action-state";
import { formatBps, formatMinor, parseMoneyToMinor, parsePercentToBps } from "@/modules/shared/money";
import { safeNextPath } from "@/modules/shared/safe-redirect";

describe("safeNextPath (open redirect protection)", () => {
  it.each([
    ["/dashboard/customer", "/dashboard/customer"],
    ["/p/alex?x=1", "/p/alex?x=1"],
  ])("allows %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", null, 42, "/\u0000x"])(
    "rejects %s",
    (input) => {
      expect(safeNextPath(input)).toBe("/dashboard");
    },
  );
});

describe("money", () => {
  it("parses dollars into integer cents without floating point errors", () => {
    expect(parseMoneyToMinor("0.1")).toBe(10);
    expect(parseMoneyToMinor("19.99")).toBe(1999);
    expect(parseMoneyToMinor("$1,234.5")).toBe(123450);
    expect(parseMoneyToMinor("")).toBeNull();
    expect(parseMoneyToMinor("-5")).toBeNaN();
    expect(parseMoneyToMinor("abc")).toBeNaN();
  });
  it("formats minor units", () => {
    expect(formatMinor(2550)).toBe("$25.50");
    expect(formatMinor(null)).toBe("—");
  });
  it("handles basis points", () => {
    expect(parsePercentToBps("12.5")).toBe(1250);
    expect(parsePercentToBps("101")).toBeNaN();
    expect(formatBps(1250)).toBe("12.5%");
  });
});

describe("roles", () => {
  it("sends users without roles to onboarding", () => {
    expect(defaultDashboardFor([])).toBe("/onboarding");
  });
  it("prefers the professional dashboard", () => {
    expect(defaultDashboardFor(["customer", "hospitality"])).toBe("/dashboard/hospitality");
  });
  it("dedupes and orders roles", () => {
    expect(sortRoles(["customer", "advertiser", "customer"])).toEqual(["advertiser", "customer"]);
  });
  it("never treats admin as self-service", () => {
    expect(isSelfServiceRole("admin")).toBe(false);
    expect(isSelfServiceRole("establishment")).toBe(false);
    expect(isSelfServiceRole("customer")).toBe(true);
  });
});

describe("partnership UI state machine", () => {
  it("offers accept/decline/block on pending invitations", () => {
    expect(professionalActionsFor("pending")).toEqual(["accept", "decline", "block"]);
  });
  it("offers nothing once blocked", () => {
    expect(professionalActionsFor("blocked")).toEqual([]);
    expect(advertiserActionsFor("blocked")).toEqual([]);
  });
  it("lets advertisers withdraw pending invites", () => {
    expect(advertiserActionsFor("pending")).toEqual(["withdraw"]);
  });
});

describe("prioritizeOffers", () => {
  const offer = (id: string, market_scope: PublicOffer["market_scope"]): PublicOffer => ({
    partnership_id: id,
    headline: id,
    description: null,
    market_scope,
    business_name: "B",
    business_verified: false,
  });
  const offers = [offer("n", "national"), offer("t", "tourism"), offer("l", "local")];

  it("shows tourism first for visitors", () => {
    expect(prioritizeOffers(offers, "visitor").map((o) => o.partnership_id)).toEqual(["t", "l", "n"]);
  });
  it("shows local first for locals", () => {
    expect(prioritizeOffers(offers, "local").map((o) => o.partnership_id)).toEqual(["l", "t", "n"]);
  });
  it("always keeps national offers", () => {
    expect(prioritizeOffers(offers, null)).toHaveLength(3);
  });
});

describe("navigation", () => {
  const sections = navSectionsFor(["hospitality", "customer"]);
  it("resolves the active section from the path", () => {
    expect(activeSection(sections, "/dashboard/customer")?.role).toBe("customer");
    expect(activeSection(sections, "/dashboard/hospitality/profile")?.role).toBe("hospitality");
  });
  it("marks only the overview active on the base path", () => {
    const s = sections[0]!;
    expect(isActiveItem(s.items[0]!, "/dashboard/hospitality/profile", s)).toBe(false);
    expect(isActiveItem(s.items[1]!, "/dashboard/hospitality/profile", s)).toBe(true);
  });
});

describe("messageForDbError", () => {
  it("maps known database errors", () => {
    expect(messageForDbError({ message: "professional_unavailable" })).toMatch(/isn't available/);
  });
  it("never leaks unknown internals", () => {
    expect(messageForDbError({ message: 'relation "secret_table" does not exist' })).toBe("Something went wrong. Please try again.");
  });
  it("detects duplicate usernames", () => {
    expect(messageForDbError({ code: "23505", message: 'duplicate key value violates unique constraint "hospitality_profiles_username_key"' })).toBe(
      "That username is taken.",
    );
  });
});

describe("resolveSiteUrl", () => {
  it("prefers an explicit site URL", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://app.example.com/", NEXT_PUBLIC_VERCEL_URL: "x.vercel.app" })).toBe(
      "https://app.example.com",
    );
  });
  it("uses the branch URL on Vercel previews", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_VERCEL_ENV: "preview",
        NEXT_PUBLIC_VERCEL_BRANCH_URL: "serve-me-git-phase-1.vercel.app",
        NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "serve-me.vercel.app",
      }),
    ).toBe("https://serve-me-git-phase-1.vercel.app");
  });
  it("uses the production URL in production", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_VERCEL_ENV: "production", NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: "serve-me.vercel.app" }),
    ).toBe("https://serve-me.vercel.app");
  });
  it("falls back to localhost", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});
