import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { sortRoles, type AppRole } from "./roles";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  roles: AppRole[];
  onboarded: boolean;
};

/**
 * Data Access Layer entry point. Verifies the session JWT with Supabase and
 * loads roles through RLS (a user can only read their own roles).
 * Deduplicated per request with React cache().
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("display_name, onboarded_at").eq("id", sub).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", sub),
  ]);

  return {
    id: sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    displayName: profile?.display_name ?? null,
    roles: sortRoles((roles ?? []).map((r) => r.role)),
    onboarded: Boolean(profile?.onboarded_at),
  };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Server-side role gate for pages and actions. */
export async function requireRole(role: AppRole): Promise<CurrentUser> {
  const user = await requireUser(`/dashboard`);
  if (!user.roles.includes(role)) {
    redirect(user.roles.length ? "/dashboard?denied=1" : "/onboarding");
  }
  return user;
}
