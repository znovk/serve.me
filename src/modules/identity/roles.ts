import type { Enums } from "@/lib/supabase/database.types";

export type AppRole = Enums<"app_role">;

/** Roles a user may choose during onboarding. Others are admin-granted. */
export const SELF_SERVICE_ROLES = ["customer", "hospitality", "advertiser"] as const satisfies readonly AppRole[];
export type SelfServiceRole = (typeof SELF_SERVICE_ROLES)[number];

export const ROLE_META: Record<AppRole, { label: string; description: string; dashboard: string }> = {
  hospitality: {
    label: "Hospitality professional",
    description: "Bartenders and servers: a public link-in-bio page, QR code, and partnerships you control.",
    dashboard: "/dashboard/hospitality",
  },
  customer: {
    label: "Customer",
    description: "Follow your favorite bartenders and servers and decide exactly what you share.",
    dashboard: "/dashboard/customer",
  },
  advertiser: {
    label: "Business advertiser",
    description: "Partner with hospitality professionals who choose to recommend you.",
    dashboard: "/dashboard/advertiser",
  },
  establishment: {
    label: "Restaurant or bar",
    description: "Venue tools. Granted by the platform team.",
    dashboard: "/dashboard/establishment",
  },
  admin: {
    label: "Administrator",
    description: "Platform administration. Never self-assigned.",
    dashboard: "/dashboard/admin",
  },
};

/** Display order for navigation and the default dashboard. */
const ROLE_PRIORITY: AppRole[] = ["hospitality", "advertiser", "establishment", "customer", "admin"];

export function sortRoles(roles: readonly AppRole[]): AppRole[] {
  return [...new Set(roles)].sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
}

/** Where to send a signed-in user. No roles yet → onboarding. */
export function defaultDashboardFor(roles: readonly AppRole[]): string {
  const [first] = sortRoles(roles);
  return first ? ROLE_META[first].dashboard : "/onboarding";
}

export function isSelfServiceRole(value: unknown): value is SelfServiceRole {
  return typeof value === "string" && (SELF_SERVICE_ROLES as readonly string[]).includes(value);
}
