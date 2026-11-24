"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/modules/identity/session";
import { fail, messageForDbError, type ActionState } from "@/modules/shared/action-state";
import { hospitalityProfileSchema, publicLinkSchema } from "./schemas";
import { getMyHospitalityProfile } from "./queries";

const idSchema = z.uuid();

/** Create or update the caller's hospitality profile. */
export async function saveHospitalityProfile(input: unknown): Promise<ActionState> {
  const user = await requireRole("hospitality");
  const parsed = hospitalityProfileSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const values = {
    username: parsed.data.username,
    display_name: parsed.data.displayName,
    bio: parsed.data.bio ?? null,
    workplace_name: parsed.data.workplaceName ?? null,
    avatar_url: parsed.data.avatarUrl,
    is_published: parsed.data.isPublished,
  };

  const supabase = await createClient();
  const existing = await getMyHospitalityProfile(user.id);
  const { error } = existing
    ? await supabase.from("hospitality_profiles").update(values).eq("id", existing.id)
    : await supabase.from("hospitality_profiles").insert({ ...values, user_id: user.id });

  if (error) {
    const message = messageForDbError(error);
    return fail(message, message.includes("username") ? { username: [message] } : undefined);
  }
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function addPublicLink(input: unknown): Promise<ActionState> {
  const user = await requireRole("hospitality");
  const parsed = publicLinkSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const profile = await getMyHospitalityProfile(user.id);
  if (!profile) return fail("Create your profile first.");

  const supabase = await createClient();
  const { count } = await supabase
    .from("public_links")
    .select("id", { count: "exact", head: true })
    .eq("hospitality_profile_id", profile.id);

  const { error } = await supabase.from("public_links").insert({
    hospitality_profile_id: profile.id,
    kind: parsed.data.kind,
    label: parsed.data.label,
    url: parsed.data.url,
    position: count ?? 0,
  });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true, message: "Link added." };
}

export async function setLinkVisibility(linkId: string, visible: boolean): Promise<ActionState> {
  await requireRole("hospitality");
  if (!idSchema.safeParse(linkId).success) return fail("Invalid link.");
  const supabase = await createClient();
  // RLS restricts the update to links on the caller's own profile.
  const { error } = await supabase.from("public_links").update({ is_visible: Boolean(visible) }).eq("id", linkId);
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true };
}

export async function deletePublicLink(linkId: string): Promise<ActionState> {
  await requireRole("hospitality");
  if (!idSchema.safeParse(linkId).success) return fail("Invalid link.");
  const supabase = await createClient();
  const { error } = await supabase.from("public_links").delete().eq("id", linkId);
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true };
}
