import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Advertiser organizations the caller belongs to (RLS-scoped). */
export async function listMyAdvertiserOrganizations(userId: string) {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("member_role, organizations ( id, name, kind )")
    .eq("user_id", userId);
  const orgs = (memberships ?? [])
    .filter((m) => m.organizations?.kind === "advertiser")
    .map((m) => ({ ...m.organizations!, memberRole: m.member_role }));
  if (!orgs.length) return [];
  const { data: profiles } = await supabase
    .from("business_profiles")
    .select("*")
    .in("organization_id", orgs.map((o) => o.id));
  const byId = new Map((profiles ?? []).map((p) => [p.organization_id, p]));
  return orgs.map((o) => ({ ...o, business: byId.get(o.id) ?? null }));
}

export async function listCampaigns(organizationIds: string[]) {
  if (!organizationIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("advertising_campaigns")
    .select("*, campaign_partnerships ( status )")
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Returns null when the campaign doesn't exist OR the caller can't see it. */
export async function getCampaignForAdvertiser(campaignId: string, userId: string) {
  const supabase = await createClient();
  const { data: campaign } = await supabase.from("advertising_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!campaign) return null;
  // Campaign rows are also visible to invited professionals; require membership.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("member_role")
    .eq("organization_id", campaign.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) return null;

  const { data: partnerships } = await supabase
    .from("campaign_partnerships")
    .select("id, status, created_at, status_changed_at, hospitality_profiles ( username, display_name )")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  return { campaign, canManage: membership.member_role !== "member", partnerships: partnerships ?? [] };
}
