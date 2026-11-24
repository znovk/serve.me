import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { publicProfileSchema, type PublicProfile } from "./types";

/** Anonymous read through the allow-listed public function. */
export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_profile", { p_username: username });
  if (error || !data) return null;
  const parsed = publicProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function resolveOfferRedirect(partnershipId: string): Promise<string | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("resolve_offer_redirect", { p_partnership: partnershipId });
  if (error || !data) return null;
  try {
    const url = new URL(data);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
