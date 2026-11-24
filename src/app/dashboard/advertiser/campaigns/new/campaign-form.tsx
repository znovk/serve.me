"use client";

import type { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCampaign } from "@/modules/advertisers/actions";
import {
  campaignSchema,
  COMPENSATION_LABEL,
  COMPENSATION_MODELS,
  MARKET_SCOPE_LABEL,
  MARKET_SCOPES,
  type CampaignInput,
} from "@/modules/advertisers/schemas";
import type { ActionState } from "@/modules/shared/action-state";

export function CampaignForm({ organizations }: { organizations: { id: string; name: string; scope: (typeof MARKET_SCOPES)[number] }[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const form = useForm<CampaignInput, unknown, z.output<typeof campaignSchema>>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      organizationId: organizations[0]?.id ?? "",
      name: "",
      offerHeadline: "",
      description: "",
      destinationUrl: "",
      marketScope: organizations[0]?.scope ?? "local",
      compensationModel: "per_lead",
      compensationAmount: "",
      compensationPercent: "",
      budget: "",
      status: "draft",
    },
  });
  const e = form.formState.errors;
  const model = useWatch({ control: form.control, name: "compensationModel" });
  const se = (k: string) => result?.fieldErrors?.[k]?.[0];

  return (
    <form
      onSubmit={form.handleSubmit(() => startTransition(async () => setResult(await createCampaign(form.getValues()))))}
      className="grid gap-5"
      noValidate
    >
      {organizations.length > 1 ? (
        <Field id="organizationId" label="Business">
          <NativeSelect {...form.register("organizationId")}>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <input type="hidden" {...form.register("organizationId")} />
      )}
      <Field id="name" label="Internal campaign name" error={e.name?.message ?? se("name")}>
        <Input {...form.register("name")} />
      </Field>
      <Field id="offerHeadline" label="Offer headline" hint="Shown publicly, e.g. “15% off your first charter”." error={e.offerHeadline?.message ?? se("offerHeadline")}>
        <Input {...form.register("offerHeadline")} />
      </Field>
      <Field id="description" label="Offer details (optional)" error={e.description?.message}>
        <Textarea rows={3} {...form.register("description")} />
      </Field>
      <Field id="destinationUrl" label="Destination link" hint="Customers are sent here through a tracked redirect." error={e.destinationUrl?.message ?? se("destinationUrl")}>
        <Input type="url" inputMode="url" placeholder="https://" {...form.register("destinationUrl")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="marketScope" label="Audience">
          <NativeSelect {...form.register("marketScope")}>
            {MARKET_SCOPES.map((s) => (
              <option key={s} value={s}>
                {MARKET_SCOPE_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="compensationModel" label="Compensation model">
          <NativeSelect {...form.register("compensationModel")}>
            {COMPENSATION_MODELS.map((m) => (
              <option key={m} value={m}>
                {COMPENSATION_LABEL[m]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {model !== "percentage_commission" ? (
          <Field id="compensationAmount" label="Amount (USD)" hint="Per click, lead, sale or month." error={e.compensationAmount?.message ?? se("compensationAmount")}>
            <Input inputMode="decimal" placeholder="25.00" {...form.register("compensationAmount")} />
          </Field>
        ) : null}
        {model === "percentage_commission" || model === "hybrid" || model === "network_commission" ? (
          <Field id="compensationPercent" label="Commission (%)" error={e.compensationPercent?.message ?? se("compensationPercent")}>
            <Input inputMode="decimal" placeholder="10" {...form.register("compensationPercent")} />
          </Field>
        ) : null}
        <Field id="budget" label="Budget (USD, optional)" error={e.budget?.message}>
          <Input inputMode="decimal" {...form.register("budget")} />
        </Field>
        <Field id="status" label="Start as">
          <NativeSelect {...form.register("status")}>
            <option value="draft">Draft (not shown publicly)</option>
            <option value="active">Active</option>
          </NativeSelect>
        </Field>
      </div>
      <FormMessage state={result} />
      <SubmitButton pending={pending}>Create campaign</SubmitButton>
      <p className="text-xs text-muted-foreground">
        Budgets and compensation are recorded for planning only. No payments are processed in this development phase.
      </p>
    </form>
  );
}
