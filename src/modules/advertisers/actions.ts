"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/modules/identity/session";
import { fail, messageForDbError, type ActionState } from "@/modules/shared/action-state";
import { campaignSchema, inviteSchema, organizationSchema } from "./schemas";

export async function createAdvertiserOrganization(input: unknown): Promise<ActionState> {
  await requireRole("advertiser");
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_advertiser_organization", {
    p_name: parsed.data.name,
    p_market_scope: parsed.data.marketScope,
    p_category_id: parsed.data.categoryId ?? undefined,
    p_website_url: parsed.data.websiteUrl ?? undefined,
    p_description: parsed.data.description ?? undefined,
    p_service_area: parsed.data.serviceArea ?? undefined,
  });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/advertiser", "layout");
  return { ok: true, message: "Business profile created." };
}

export async function createCampaign(input: unknown): Promise<ActionState> {
  const user = await requireRole("advertiser");
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);
  const v = parsed.data;

  const supabase = await createClient();
  // RLS rejects the insert unless the caller manages this organization.
  const { data, error } = await supabase
    .from("advertising_campaigns")
    .insert({
      organization_id: v.organizationId,
      name: v.name,
      offer_headline: v.offerHeadline,
      description: v.description,
      destination_url: v.destinationUrl,
      market_scope: v.marketScope,
      compensation_model: v.compensationModel,
      compensation_amount_minor: v.compensationAmount,
      compensation_percent_bps: v.compensationPercent,
      budget_minor: v.budget,
      status: v.status,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return fail(messageForDbError(error));
  revalidatePath("/dashboard/advertiser", "layout");
  redirect(`/dashboard/advertiser/campaigns/${data.id}`);
}

const statusSchema = z.enum(["draft", "active", "paused", "ended"]);

export async function setCampaignStatus(campaignId: string, status: string): Promise<ActionState> {
  await requireRole("advertiser");
  const id = z.uuid().safeParse(campaignId);
  const s = statusSchema.safeParse(status);
  if (!id.success || !s.success) return fail("Invalid request.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("advertising_campaigns")
    .update({ status: s.data })
    .eq("id", id.data)
    .select("id");
  if (error) return fail(messageForDbError(error));
  if (!data?.length) return fail("Campaign not found.");
  revalidatePath("/dashboard/advertiser", "layout");
  return { ok: true };
}

export async function inviteProfessional(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("advertiser");
  const parsed = inviteSchema.safeParse({
    campaignId: formData.get("campaignId"),
    username: formData.get("username"),
  });
  if (!parsed.success) return fail("Check the username.", parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_to_campaign", {
    p_campaign: parsed.data.campaignId,
    p_username: parsed.data.username,
  });
  if (error) return fail(messageForDbError(error));
  revalidatePath(`/dashboard/advertiser/campaigns/${parsed.data.campaignId}`);
  return { ok: true, message: `Invitation sent to @${parsed.data.username}.` };
}

export async function updatePartnershipAsAdvertiser(partnershipId: string, action: string): Promise<ActionState> {
  await requireRole("advertiser");
  const id = z.uuid().safeParse(partnershipId);
  const act = z.enum(["withdraw", "terminate"]).safeParse(action);
  if (!id.success || !act.success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("advertiser_update_partnership", { p_partnership: id.data, p_action: act.data });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/advertiser", "layout");
  return { ok: true };
}
