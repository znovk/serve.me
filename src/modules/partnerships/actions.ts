"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/modules/identity/session";
import { fail, messageForDbError, type ActionState } from "@/modules/shared/action-state";

const professionalAction = z.enum(["accept", "decline", "pause", "resume", "terminate", "block"]);

export async function updatePartnershipAsProfessional(partnershipId: string, action: string): Promise<ActionState> {
  await requireRole("hospitality");
  const id = z.uuid().safeParse(partnershipId);
  const act = professionalAction.safeParse(action);
  if (!id.success || !act.success) return fail("Invalid request.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("professional_update_partnership", {
    p_partnership: id.data,
    p_action: act.data,
  });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true };
}

export async function blockCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("hospitality");
  const id = z.uuid().safeParse(formData.get("categoryId"));
  if (!id.success) return fail("Choose a category.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_advertiser", { p_category: id.data });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true, message: "Category blocked." };
}

export async function removeBlock(blockId: string): Promise<ActionState> {
  await requireRole("hospitality");
  if (!z.uuid().safeParse(blockId).success) return fail("Invalid request.");
  const supabase = await createClient();
  // RLS limits deletes to the caller's own blocks. Unblocking does NOT restore
  // ended partnerships; the advertiser must send a new invitation.
  const { error } = await supabase.from("advertiser_blocks").delete().eq("id", blockId);
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true };
}
