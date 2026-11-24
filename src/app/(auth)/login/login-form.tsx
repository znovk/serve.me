"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { signIn } from "@/modules/identity/actions";
import { initialActionState } from "@/modules/shared/action-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialActionState);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field id="email" label="Email" error={state.fieldErrors?.email?.[0]}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label="Password" error={state.fieldErrors?.password?.[0]}>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Sign in</SubmitButton>
    </form>
  );
}
