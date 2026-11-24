import { z } from "zod";

/** Shape returned by public.get_public_profile(); validated at the boundary. */
export const publicProfileSchema = z.object({
  username: z.string(),
  display_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  workplace_name: z.string().nullable(),
  links: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["social", "tip", "personal", "booking", "other"]),
      label: z.string(),
      url: z.string(),
    }),
  ),
  offers: z.array(
    z.object({
      partnership_id: z.string(),
      headline: z.string(),
      description: z.string().nullable(),
      market_scope: z.enum(["local", "tourism", "national"]),
      business_name: z.string(),
      business_verified: z.boolean(),
    }),
  ),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicOffer = PublicProfile["offers"][number];
export type VisitorType = "local" | "visitor";
