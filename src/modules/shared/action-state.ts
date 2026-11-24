export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = { ok: false };

/**
 * Maps database exception names (raised by our SECURITY DEFINER functions)
 * to user-facing messages. Unknown errors get a generic message so internal
 * details are never shown to users.
 */
const DB_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Please sign in again.",
  role_not_claimable: "That role can't be selected.",
  adult_confirmation_required: "You must confirm you are 18 or older.",
  advertiser_role_required: "This requires a business advertiser account.",
  organization_limit_reached: "You've reached the limit of businesses for one account.",
  campaign_not_found: "Campaign not found.",
  campaign_not_open: "This campaign isn't accepting new partners.",
  professional_unavailable: "That professional isn't available.",
  already_invited: "That professional already has an invitation or partnership for this campaign.",
  rate_limited: "Too many requests. Please try again later.",
  partnership_not_found: "Partnership not found.",
  invalid_transition: "That action isn't available right now.",
  customer_role_required: "You need a customer account to connect.",
  already_requested: "You've already sent a request.",
  connection_not_found: "Connection not found.",
  connection_not_accepted: "Consent can only be granted on an accepted connection.",
  hospitality_profile_required: "Create your profile first.",
  link_limit_reached: "You've reached the maximum number of links.",
};

export function messageForDbError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "Something went wrong.";
  if (error.code === "23505") {
    if (error.message?.includes("username")) return "That username is taken.";
  }
  const key = Object.keys(DB_ERROR_MESSAGES).find((k) => error.message?.includes(k));
  return key ? DB_ERROR_MESSAGES[key]! : "Something went wrong. Please try again.";
}

export function fail(message: string, fieldErrors?: ActionState["fieldErrors"]): ActionState {
  return { ok: false, message, fieldErrors };
}
