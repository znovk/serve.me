"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { fail, messageForDbError, type ActionState } from "@/modules/shared/action-state";
import { safeNextPath } from "@/modules/shared/safe-redirect";
import { onboardingSchema, signInSchema, signUpSchema } from "./schemas";
import { defaultDashboardFor, ROLE_META } from "./roles";
import { getCurrentUser } from "./session";

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) {
    // Do not reveal whether an email is already registered.
    return fail(error.status === 429 ? "Too many attempts. Please wait and try again." : "We couldn't create that account.");
  }
  if (data.session) redirect("/onboarding");
  return { ok: true, message: "Check your email to confirm your account, then sign in." };
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the highlighted fields.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return fail(error.status === 429 ? "Too many attempts. Please wait and try again." : "Incorrect email or password.");
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function completeOnboarding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");

  const parsed = onboardingSchema.safeParse({
    role: formData.get("role"),
    confirmAdult: formData.get("confirmAdult") === "on",
  });
  if (!parsed.success) return fail("Check the form.", parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_role", {
    p_role: parsed.data.role,
    p_confirm_adult: parsed.data.confirmAdult,
  });
  if (error) return fail(messageForDbError(error));

  if (parsed.data.role === "customer") {
    await supabase
      .from("customer_profiles")
      .upsert({ user_id: user.id, display_name: user.displayName ?? "Customer" }, { onConflict: "user_id", ignoreDuplicates: true });
  }

  redirect(ROLE_META[parsed.data.role].dashboard ?? defaultDashboardFor([parsed.data.role]));
}
