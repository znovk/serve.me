import type { AppRole } from "@/modules/identity/roles";

export type NavIcon =
  | "home" | "user" | "handshake" | "users" | "megaphone" | "plus" | "store" | "shield" | "heart" | "qr";

export type NavItem = { href: string; label: string; icon: NavIcon };
export type NavSection = { role: AppRole; label: string; base: string; items: NavItem[] };

const SECTIONS: Record<AppRole, NavSection> = {
  hospitality: {
    role: "hospitality",
    label: "Professional",
    base: "/dashboard/hospitality",
    items: [
      { href: "/dashboard/hospitality", label: "Overview", icon: "home" },
      { href: "/dashboard/hospitality/profile", label: "Profile", icon: "user" },
      { href: "/dashboard/hospitality/partnerships", label: "Partners", icon: "handshake" },
      { href: "/dashboard/hospitality/connections", label: "Guests", icon: "users" },
    ],
  },
  customer: {
    role: "customer",
    label: "Customer",
    base: "/dashboard/customer",
    items: [{ href: "/dashboard/customer", label: "My connections", icon: "heart" }],
  },
  advertiser: {
    role: "advertiser",
    label: "Advertiser",
    base: "/dashboard/advertiser",
    items: [
      { href: "/dashboard/advertiser", label: "Campaigns", icon: "megaphone" },
      { href: "/dashboard/advertiser/campaigns/new", label: "New campaign", icon: "plus" },
    ],
  },
  establishment: {
    role: "establishment",
    label: "Establishment",
    base: "/dashboard/establishment",
    items: [{ href: "/dashboard/establishment", label: "Venue", icon: "store" }],
  },
  admin: {
    role: "admin",
    label: "Admin",
    base: "/dashboard/admin",
    items: [{ href: "/dashboard/admin", label: "Administration", icon: "shield" }],
  },
};

export function navSectionsFor(roles: readonly AppRole[]): NavSection[] {
  return roles.map((r) => SECTIONS[r]);
}

/** The section whose base path best matches the current pathname. */
export function activeSection(sections: readonly NavSection[], pathname: string): NavSection | undefined {
  return [...sections]
    .filter((s) => pathname === s.base || pathname.startsWith(`${s.base}/`))
    .sort((a, b) => b.base.length - a.base.length)[0] ?? sections[0];
}

export function isActiveItem(item: NavItem, pathname: string, section: NavSection): boolean {
  if (item.href === section.base) return pathname === section.base;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
