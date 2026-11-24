"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { completeOnboarding } from "@/modules/identity/actions";
import { ROLE_META, SELF_SERVICE_ROLES, type AppRole } from "@/modules/identity/roles";
import { initialActionState } from "@/modules/shared/action-state";
import { cn } from "@/lib/utils";

export function OnboardingForm({ existingRoles }: { existingRoles: AppRole[] }) {
  const [state, action] = useActionState(completeOnboarding, initialActionState);
  const available = SELF_SERVICE_ROLES.filter((r) => !existingRoles.includes(r));
  return (
    <form action={action} className="grid gap-6">
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">How will you use the platform?</legend>
        {available.map((role, i) => (
          <label
            key={role}
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50",
              "has-[:checked]:border-brand has-[:checked]:bg-accent/60",
            )}
          >
            <input type="radio" name="role" value={role} defaultChecked={i === 0} className="mt-1 accent-[var(--brand)]" />
            <span>
              <span className="block font-medium">{ROLE_META[role].label}</span>
              <span className="block text-sm text-muted-foreground">{ROLE_META[role].description}</span>
            </span>
          </label>
        ))}
        {state.fieldErrors?.role ? <p className="text-xs text-destructive">{state.fieldErrors.role[0]}</p> : null}
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="confirmAdult" className="mt-0.5 size-4 accent-[var(--brand)]" required />
        <span>I confirm I am 18 or older and agree to use the platform responsibly.</span>
      </label>
      {state.fieldErrors?.confirmAdult ? (
        <p className="-mt-4 text-xs text-destructive">{state.fieldErrors.confirmAdult[0]}</p>
      ) : null}
      <FormMessage state={state} />
      <SubmitButton>Continue</SubmitButton>
      <p className="text-xs text-muted-foreground">
        You can add more roles later. Restaurant, bar and administrator access is granted by the platform team.
      </p>
    </form>
  );
}
