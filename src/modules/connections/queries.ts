import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function listMyCustomerConnections(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_connections")
    .select(
      "id, status, blocked_by, requested_at, hospitality_profiles ( username, display_name, workplace_name ), consent_preferences ( direct_messages, shift_notifications, marketing, shared_preferences, loyalty )",
    )
    .eq("customer_user_id", userId)
    .in("status", ["pending", "accepted", "blocked", "declined"])
    .order("requested_at", { ascending: false });
  return data ?? [];
}

/** Professional view: only display names and consent flags (via RPC). */
export async function listProfessionalConnections() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_professional_connections");
  return data ?? [];
}

export async function getMyCustomerProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

/** Connection status between the signed-in customer and a professional (for the public page). */
export async function getConnectionStatusForUsername(userId: string, username: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("hospitality_profiles")
    .select("id, user_id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return { self: false, status: null };
  if (profile.user_id === userId) return { self: true, status: null };
  const { data } = await supabase
    .from("customer_connections")
    .select("status")
    .eq("customer_user_id", userId)
    .eq("hospitality_profile_id", profile.id)
    .maybeSingle();
  return { self: false, status: data?.status ?? null };
}
