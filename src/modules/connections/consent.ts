import type { Enums } from "@/lib/supabase/database.types";

export type ConsentScope = Enums<"consent_scope">;

export const CONSENT_SCOPES: { scope: ConsentScope; label: string; description: string; available: boolean }[] = [
  {
    scope: "direct_messages",
    label: "Direct messages",
    description: "Allow this professional to message you. Messaging launches in a later release.",
    available: true,
  },
  {
    scope: "shift_notifications",
    label: "Shift notifications",
    description: "Get notified when they share that they're working.",
    available: true,
  },
  {
    scope: "marketing",
    label: "Recommendations and offers",
    description: "Receive offers they personally recommend.",
    available: true,
  },
  {
    scope: "shared_preferences",
    label: "Share my preferences",
    description: "Let them see the favorites you choose to share (coming later).",
    available: true,
  },
  {
    scope: "loyalty",
    label: "Loyalty notifications",
    description: "Loyalty program updates (coming later).",
    available: true,
  },
];
