"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { inviteProfessional } from "@/modules/advertisers/actions";
import { initialActionState } from "@/modules/shared/action-state";

export function InviteForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useActionState(inviteProfessional, initialActionState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <input type="hidden" name="campaignId" value={campaignId} />
      <Field id="username" label="Invite by username" hint="The username from their public page, e.g. /p/alex-pours." error={state.fieldErrors?.username?.[0]}>
        <Input name="username" autoCapitalize="none" spellCheck={false} placeholder="alex-pours" />
      </Field>
      <SubmitButton>Send invitation</SubmitButton>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
