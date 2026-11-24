import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Partnerships for the caller's hospitality profile, with campaign + business info. */
export async function listMyPartnerships(profileId: string) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("campaign_partnerships")
    .select(
      "id, status, created_at, status_changed_at, advertising_campaigns ( id, name, offer_headline, description, market_scope, compensation_model, compensation_amount_minor, compensation_percent_bps, currency, status, organization_id )",
    )
    .eq("hospitality_profile_id", profileId)
    .order("created_at", { ascending: false });

  const orgIds = [...new Set((rows ?? []).map((r) => r.advertising_campaigns?.organization_id).filter(Boolean))] as string[];
  const { data: businesses } = orgIds.length
    ? await supabase
        .from("business_profiles")
        .select("organization_id, display_name, market_scope, verification_status, category_id")
        .in("organization_id", orgIds)
    : { data: [] };
  const byOrg = new Map((businesses ?? []).map((b) => [b.organization_id, b]));

  return (rows ?? []).map((r) => ({
    ...r,
    business: r.advertising_campaigns ? (byOrg.get(r.advertising_campaigns.organization_id) ?? null) : null,
  }));
}

export async function listMyBlocks(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("advertiser_blocks")
    .select("id, organization_id, category_id, created_at, business_categories ( name )")
    .eq("hospitality_profile_id", profileId)
    .order("created_at", { ascending: false });
  const orgIds = (data ?? []).map((b) => b.organization_id).filter(Boolean) as string[];
  const { data: businesses } = orgIds.length
    ? await supabase.from("business_profiles").select("organization_id, display_name").in("organization_id", orgIds)
    : { data: [] };
  const names = new Map((businesses ?? []).map((b) => [b.organization_id, b.display_name]));
  return (data ?? []).map((b) => ({
    id: b.id,
    label: b.organization_id
      ? (names.get(b.organization_id) ?? "Advertiser")
      : `Category: ${b.business_categories?.name ?? "Unknown"}`,
    kind: b.organization_id ? ("organization" as const) : ("category" as const),
  }));
}

export async function listCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("business_categories").select("id, slug, name").order("name");
  return data ?? [];
}
