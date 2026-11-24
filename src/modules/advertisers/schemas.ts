import { z } from "zod";
import { httpsUrlSchema, usernameSchema } from "@/modules/hospitality/schemas";
import { parseMoneyToMinor, parsePercentToBps } from "@/modules/shared/money";

export const MARKET_SCOPES = ["local", "tourism", "national"] as const;
export const COMPENSATION_MODELS = [
  "monthly_sponsorship",
  "per_click",
  "per_lead",
  "flat_commission",
  "percentage_commission",
  "network_commission",
  "hybrid",
] as const;

export const MARKET_SCOPE_LABEL: Record<(typeof MARKET_SCOPES)[number], string> = {
  local: "Local",
  tourism: "Tourism",
  national: "National",
};

export const COMPENSATION_LABEL: Record<(typeof COMPENSATION_MODELS)[number], string> = {
  monthly_sponsorship: "Monthly sponsorship",
  per_click: "Pay per verified click",
  per_lead: "Pay per qualified lead",
  flat_commission: "Flat commission per closed sale",
  percentage_commission: "Percentage commission",
  network_commission: "Affiliate network commission",
  hybrid: "Hybrid",
};

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(120),
  marketScope: z.enum(MARKET_SCOPES),
  categoryId: z.union([z.uuid(), z.literal("")]).optional().transform((v) => (v ? v : null)),
  websiteUrl: z.union([httpsUrlSchema, z.literal("")]).optional().transform((v) => (v ? v : null)),
  description: optional(1000),
  serviceArea: optional(120),
});

const moneyField = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const minor = parseMoneyToMinor(v ?? "");
    if (Number.isNaN(minor)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 25 or 25.50." });
      return z.NEVER;
    }
    return minor;
  });

export const campaignSchema = z
  .object({
    organizationId: z.uuid(),
    name: z.string().trim().min(2, "Enter a campaign name.").max(120),
    offerHeadline: z.string().trim().min(2, "Enter the offer customers will see.").max(120),
    description: optional(1000),
    destinationUrl: httpsUrlSchema,
    marketScope: z.enum(MARKET_SCOPES),
    compensationModel: z.enum(COMPENSATION_MODELS),
    compensationAmount: moneyField,
    compensationPercent: z
      .string()
      .optional()
      .transform((v, ctx) => {
        const bps = parsePercentToBps(v ?? "");
        if (Number.isNaN(bps)) {
          ctx.addIssue({ code: "custom", message: "Enter a percentage between 0 and 100." });
          return z.NEVER;
        }
        return bps;
      }),
    budget: moneyField,
    status: z.enum(["draft", "active"]),
  })
  .superRefine((v, ctx) => {
    if (v.compensationModel === "percentage_commission" && v.compensationPercent == null) {
      ctx.addIssue({ code: "custom", path: ["compensationPercent"], message: "Enter the commission percentage." });
    }
    if (
      ["monthly_sponsorship", "per_click", "per_lead", "flat_commission"].includes(v.compensationModel) &&
      v.compensationAmount == null
    ) {
      ctx.addIssue({ code: "custom", path: ["compensationAmount"], message: "Enter the compensation amount." });
    }
  });

export const inviteSchema = z.object({
  campaignId: z.uuid(),
  username: usernameSchema,
});

export type OrganizationInput = z.input<typeof organizationSchema>;
export type CampaignInput = z.input<typeof campaignSchema>;
