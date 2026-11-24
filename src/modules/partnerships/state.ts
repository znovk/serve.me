import type { Enums } from "@/lib/supabase/database.types";

export type PartnershipStatus = Enums<"partnership_status">;
export type ProfessionalPartnershipAction = "accept" | "decline" | "pause" | "resume" | "terminate" | "block";
export type AdvertiserPartnershipAction = "withdraw" | "terminate";

/**
 * Mirrors the state machine enforced in public.professional_update_partnership().
 * The database is the source of truth; this only decides which buttons to show.
 */
export function professionalActionsFor(status: PartnershipStatus): ProfessionalPartnershipAction[] {
  switch (status) {
    case "pending":
      return ["accept", "decline", "block"];
    case "active":
      return ["pause", "terminate", "block"];
    case "paused":
      return ["resume", "terminate", "block"];
    case "accepted":
      return ["terminate", "block"];
    case "declined":
    case "expired":
    case "terminated":
      return ["block"];
    case "blocked":
      return [];
  }
}

export function advertiserActionsFor(status: PartnershipStatus): AdvertiserPartnershipAction[] {
  if (status === "pending") return ["withdraw"];
  if (status === "active" || status === "paused" || status === "accepted") return ["terminate"];
  return [];
}

export const PARTNERSHIP_STATUS_LABEL: Record<PartnershipStatus, string> = {
  pending: "Invitation pending",
  accepted: "Accepted",
  declined: "Declined",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
  terminated: "Ended",
  blocked: "Blocked",
};
