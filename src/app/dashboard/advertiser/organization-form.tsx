"use client";

import type { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAdvertiserOrganization } from "@/modules/advertisers/actions";
import { MARKET_SCOPE_LABEL, MARKET_SCOPES, organizationSchema, type OrganizationInput } from "@/modules/advertisers/schemas";
import type { ActionState } from "@/modules/shared/action-state";

export function OrganizationForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const form = useForm<OrganizationInput, unknown, z.output<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "", marketScope: "local", categoryId: "", websiteUrl: "", description: "", serviceArea: "" },
  });
  const e = form.formState.errors;
  return (
    <form
      onSubmit={form.handleSubmit(() => startTransition(async () => setResult(await createAdvertiserOrganization(form.getValues()))))}
      className="grid gap-4"
      noValidate
    >
      <Field id="name" label="Business name" error={e.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="marketScope" label="Market" hint="Local, tourism or national.">
          <NativeSelect {...form.register("marketScope")}>
            {MARKET_SCOPES.map((s) => (
              <option key={s} value={s}>
                {MARKET_SCOPE_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="categoryId" label="Category">
          <NativeSelect {...form.register("categoryId")}>
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id="websiteUrl" label="Website (optional)" error={e.websiteUrl?.message}>
        <Input type="url" inputMode="url" placeholder="https://" {...form.register("websiteUrl")} />
      </Field>
      <Field id="serviceArea" label="Service area (optional)" hint="City or region, e.g. Tampa Bay." error={e.serviceArea?.message}>
        <Input {...form.register("serviceArea")} />
      </Field>
      <Field id="description" label="About (optional)" error={e.description?.message}>
        <Textarea rows={3} {...form.register("description")} />
      </Field>
      <FormMessage state={result} />
      <SubmitButton pending={pending}>Create business profile</SubmitButton>
      <p className="text-xs text-muted-foreground">New businesses start unverified. Verification is done by the platform team.</p>
    </form>
  );
}
