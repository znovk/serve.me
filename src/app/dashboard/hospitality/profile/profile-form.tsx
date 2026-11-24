"use client";

import type { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { saveHospitalityProfile } from "@/modules/hospitality/actions";
import { hospitalityProfileSchema, type HospitalityProfileInput } from "@/modules/hospitality/schemas";
import type { ActionState } from "@/modules/shared/action-state";

export function ProfileForm({ defaults, isNew }: { defaults: HospitalityProfileInput; isNew: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const form = useForm<HospitalityProfileInput, unknown, z.output<typeof hospitalityProfileSchema>>({ resolver: zodResolver(hospitalityProfileSchema), defaultValues: defaults });
  const errors = form.formState.errors;
  const serverErr = (k: string) => result?.fieldErrors?.[k]?.[0];

  const onSubmit = form.handleSubmit(() => {
    startTransition(async () => setResult(await saveHospitalityProfile(form.getValues())));
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <Field
        id="username"
        label="Username"
        hint="Your page will be at /p/username. Changing it later breaks printed QR codes."
        error={errors.username?.message ?? serverErr("username")}
      >
        <Input autoCapitalize="none" autoComplete="off" spellCheck={false} {...form.register("username")} />
      </Field>
      <Field id="displayName" label="Display name" error={errors.displayName?.message ?? serverErr("displayName")}>
        <Input {...form.register("displayName")} />
      </Field>
      <Field id="bio" label="Bio" hint="Up to 500 characters." error={errors.bio?.message ?? serverErr("bio")}>
        <Textarea rows={4} {...form.register("bio")} />
      </Field>
      <Field
        id="workplaceName"
        label="Where you work (optional)"
        hint="Shown as text. Verified venue affiliations come later."
        error={errors.workplaceName?.message}
      >
        <Input {...form.register("workplaceName")} />
      </Field>
      <Field
        id="avatarUrl"
        label="Photo URL (optional)"
        hint="An https:// image link. Photo uploads come in a later release."
        error={errors.avatarUrl?.message ?? serverErr("avatarUrl")}
      >
        <Input type="url" inputMode="url" {...form.register("avatarUrl")} />
      </Field>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div>
          <Label htmlFor="isPublished">Publish my page</Label>
          <p className="mt-1 text-xs text-muted-foreground">Unpublished pages and QR codes show &quot;not found&quot;.</p>
        </div>
        <Controller
          control={form.control}
          name="isPublished"
          render={({ field }) => <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>
      <FormMessage state={result} />
      <SubmitButton pending={pending}>{isNew ? "Create profile" : "Save changes"}</SubmitButton>
    </form>
  );
}
