"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole, requireUser } from "@/modules/identity/session";
import { usernameSchema } from "@/modules/hospitality/schemas";
import { fail, messageForDbError, type ActionState } from "@/modules/shared/action-state";

export async function requestConnection(username: string): Promise<ActionState> {
  const user = await requireUser();
  if (!user.roles.includes("customer")) {
    return fail("Add a customer account in onboarding to connect with professionals.");
  }
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return fail("Invalid profile.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_connection", { p_username: parsed.data });
  if (error) return fail(messageForDbError(error));
  revalidatePath(`/p/${parsed.data}`);
  revalidatePath("/dashboard/customer");
  return { ok: true, message: "Request sent. You'll be connected once they accept." };
}

export async function updateConnectionAsCustomer(connectionId: string, action: string): Promise<ActionState> {
  await requireRole("customer");
  const id = z.uuid().safeParse(connectionId);
  const act = z.enum(["cancel", "disconnect", "block"]).safeParse(action);
  if (!id.success || !act.success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("customer_update_connection", { p_connection: id.data, p_action: act.data });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/customer");
  return { ok: true };
}

export async function updateConnectionAsProfessional(connectionId: string, action: string): Promise<ActionState> {
  await requireRole("hospitality");
  const id = z.uuid().safeParse(connectionId);
  const act = z.enum(["accept", "decline", "disconnect", "block"]).safeParse(action);
  if (!id.success || !act.success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("professional_update_connection", { p_connection: id.data, p_action: act.data });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/hospitality", "layout");
  return { ok: true };
}

const scopeSchema = z.enum(["direct_messages", "shift_notifications", "marketing", "shared_preferences", "loyalty"]);

export async function setConsent(connectionId: string, scope: string, granted: boolean): Promise<ActionState> {
  await requireRole("customer");
  const id = z.uuid().safeParse(connectionId);
  const s = scopeSchema.safeParse(scope);
  if (!id.success || !s.success) return fail("Invalid request.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_consent", { p_connection: id.data, p_scope: s.data, p_granted: Boolean(granted) });
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/customer");
  return { ok: true };
}

export async function setVisitorType(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("customer");
  const v = z.enum(["local", "visitor", ""]).safeParse(formData.get("visitorType") ?? "");
  if (!v.success) return fail("Invalid choice.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_profiles")
    .update({ visitor_type: v.data === "" ? null : v.data })
    .eq("user_id", user.id);
  if (error) return fail(messageForDbError(error));
  revalidatePath("/dashboard/customer");
  return { ok: true, message: "Saved." };
}
