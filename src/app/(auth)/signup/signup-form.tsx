"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { signUp } from "@/modules/identity/actions";
import { signUpSchema, type SignUpInput } from "@/modules/identity/schemas";
import { initialActionState } from "@/modules/shared/action-state";

export function SignupForm() {
  const [state, action] = useActionState(signUp, initialActionState);
  const [pending, startTransition] = useTransition();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: "", email: "", password: "" },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.set(k, v));
    startTransition(() => action(fd));
  });

  if (state.ok) return <FormMessage state={state} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <Field id="displayName" label="Your name" error={errors.displayName?.message ?? state.fieldErrors?.displayName?.[0]}>
        <Input autoComplete="name" {...form.register("displayName")} />
      </Field>
      <Field id="email" label="Email" error={errors.email?.message ?? state.fieldErrors?.email?.[0]}>
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field
        id="password"
        label="Password"
        hint="At least 10 characters."
        error={errors.password?.message ?? state.fieldErrors?.password?.[0]}
      >
        <Input type="password" autoComplete="new-password" {...form.register("password")} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pending={pending}>
        Create account
      </SubmitButton>
      <p className="text-xs text-muted-foreground">
        You&apos;ll choose how you use the platform after confirming your email. Accounts are for adults 18 and older.
      </p>
    </form>
  );
}
