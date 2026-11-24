import { z } from "zod";
import { SELF_SERVICE_ROLES } from "./roles";

export const emailSchema = z.email("Enter a valid email address.").max(254).transform((v) => v.trim().toLowerCase());

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(80),
  email: emailSchema,
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(72, "Use at most 72 characters."),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const onboardingSchema = z.object({
  role: z.enum(SELF_SERVICE_ROLES, { message: "Choose how you'll use the platform." }),
  confirmAdult: z.literal(true, { message: "You must confirm you are 18 or older." }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
