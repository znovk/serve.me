/**
 * Branding is configurable. "BarConnect" is a working name: never hardcode
 * the product name in components; import `brand` instead.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "BarConnect",
  tagline: "Turn the relationships you build behind the bar into income — on your terms.",
  supportEmail: "support@example.com",
} as const;
