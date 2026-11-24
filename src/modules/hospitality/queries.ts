import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type HospitalityProfile = Tables<"hospitality_profiles">;
export type PublicLink = Tables<"public_links">;

export async function getMyHospitalityProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("hospitality_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function getMyLinks(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_links")
    .select("*")
    .eq("hospitality_profile_id", profileId)
    .order("position")
    .order("created_at");
  return data ?? [];
}
