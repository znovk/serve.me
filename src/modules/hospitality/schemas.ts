import { z } from "zod";

export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "api", "app", "auth", "dashboard", "help", "login",
  "logout", "onboarding", "p", "root", "settings", "signup", "support", "system",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/,
    "3–30 characters: lowercase letters, numbers, hyphens or underscores. Must start and end with a letter or number.",
  )
  .refine((v) => !RESERVED_USERNAMES.has(v), "That username is reserved.");

export const httpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !/\s/.test(v);
    } catch {
      return false;
    }
  }, "Enter a full https:// link.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const hospitalityProfileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Enter a display name.").max(80),
  bio: optionalText(500),
  workplaceName: optionalText(120),
  avatarUrl: z
    .union([httpsUrlSchema, z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  isPublished: z.boolean(),
});

export const LINK_KINDS = ["social", "tip", "personal", "booking", "other"] as const;

export const publicLinkSchema = z.object({
  kind: z.enum(LINK_KINDS),
  label: z.string().trim().min(1, "Enter a label.").max(60),
  url: httpsUrlSchema,
});

export type HospitalityProfileInput = z.input<typeof hospitalityProfileSchema>;
export type PublicLinkInput = z.input<typeof publicLinkSchema>;
