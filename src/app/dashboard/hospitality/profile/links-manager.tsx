"use client";

import type { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Link2, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { addPublicLink, deletePublicLink, setLinkVisibility } from "@/modules/hospitality/actions";
import { LINK_KINDS, publicLinkSchema, type PublicLinkInput } from "@/modules/hospitality/schemas";
import type { ActionState } from "@/modules/shared/action-state";

const KIND_LABEL: Record<(typeof LINK_KINDS)[number], string> = {
  social: "Social",
  tip: "Tips",
  personal: "Personal",
  booking: "Private events",
  other: "Other",
};

type LinkRow = { id: string; kind: (typeof LINK_KINDS)[number]; label: string; url: string; is_visible: boolean };

export function LinksManager({ links }: { links: LinkRow[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const form = useForm<PublicLinkInput, unknown, z.output<typeof publicLinkSchema>>({
    resolver: zodResolver(publicLinkSchema),
    defaultValues: { kind: "social", label: "", url: "" },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(() => {
    startTransition(async () => {
      const values = form.getValues();
      const res = await addPublicLink(values);
      setResult(res);
      if (res.ok) form.reset({ kind: values.kind, label: "", url: "" });
    });
  });

  return (
    <div className="grid gap-6">
      {links.length ? (
        <ul className="divide-y rounded-lg border">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {l.label} <Badge variant="outline">{KIND_LABEL[l.kind]}</Badge>
                  {!l.is_visible ? <Badge>Hidden</Badge> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{l.url}</p>
              </div>
              <ActionButton
                variant="ghost"
                size="icon"
                aria-label={l.is_visible ? `Hide ${l.label}` : `Show ${l.label}`}
                action={() => setLinkVisibility(l.id, !l.is_visible)}
              >
                {l.is_visible ? <EyeOff /> : <Eye />}
              </ActionButton>
              <ActionButton
                variant="ghost"
                size="icon"
                aria-label={`Delete ${l.label}`}
                confirm={`Delete "${l.label}"?`}
                action={() => deletePublicLink(l.id)}
              >
                <Trash2 />
              </ActionButton>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Link2} title="No links yet">
          Add your socials, tip links and a way to book you for private events.
        </EmptyState>
      )}

      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[10rem_1fr]" noValidate>
        <Field id="kind" label="Type" error={errors.kind?.message}>
          <NativeSelect {...form.register("kind")}>
            {LINK_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="label" label="Label" error={errors.label?.message}>
          <Input placeholder="Instagram" {...form.register("label")} />
        </Field>
        <Field id="url" label="Link" className="sm:col-span-2" error={errors.url?.message ?? result?.fieldErrors?.url?.[0]}>
          <Input type="url" inputMode="url" placeholder="https://" {...form.register("url")} />
        </Field>
        <div className="grid gap-3 sm:col-span-2">
          <FormMessage state={result} />
          <SubmitButton pending={pending} variant="outline" className="justify-self-start">
            Add link
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
