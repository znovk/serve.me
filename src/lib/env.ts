import { z } from "zod";

/**
 * Public environment. Only NEXT_PUBLIC_* values may be read here; this module
 * is imported by browser code. Server secrets must never be added to it.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | null = null;

/** Returns validated public env, or null when Supabase is not configured. */
export function getPublicEnv(): PublicEnv | null {
  if (cached) return cached;
  const parsed = publicEnvSchema.safeParse({
    // Referenced explicitly so Next.js inlines them into client bundles.
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) return null;
  cached = parsed.data;
  return cached;
}

export function requirePublicEnv(): PublicEnv {
  const env = getPublicEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return env;
}

/**
 * Canonical origin for QR codes and auth email links.
 * Order: explicit NEXT_PUBLIC_SITE_URL → Vercel preview branch URL →
 * Vercel production URL → localhost. Vercel exposes the NEXT_PUBLIC_VERCEL_*
 * system variables automatically for Next.js projects.
 */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const host =
    (env.NEXT_PUBLIC_VERCEL_ENV === "preview" && env.NEXT_PUBLIC_VERCEL_BRANCH_URL) ||
    env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
    env.NEXT_PUBLIC_VERCEL_URL;
  return host ? `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "http://localhost:3000";
}

export function siteUrl(): string {
  return resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  });
}
