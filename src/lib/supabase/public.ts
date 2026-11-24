import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Anonymous, cookie-less client for public pages. Runs as the `anon` role,
 * which has no table access; it may only call public functions such as
 * get_public_profile().
 */
export function createPublicClient() {
  const env = requirePublicEnv();
  return createSupabaseClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
