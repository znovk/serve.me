"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/select";
import { setVisitorType } from "@/modules/connections/actions";
import { initialActionState } from "@/modules/shared/action-state";

export function VisitorTypeForm({ value }: { value: "local" | "visitor" | null }) {
  const [state, action] = useActionState(setVisitorType, initialActionState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <Field id="visitorType" label="Are you usually a local or a visitor?" hint="Used only to order recommendations. We never track your location.">
        <NativeSelect name="visitorType" defaultValue={value ?? ""}>
          <option value="">Prefer not to say</option>
          <option value="local">Local resident</option>
          <option value="visitor">Visitor</option>
        </NativeSelect>
      </Field>
      <SubmitButton variant="outline">Save</SubmitButton>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
