"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setConsent } from "@/modules/connections/actions";

export function ConsentToggle({
  connectionId,
  scope,
  label,
  description,
  granted,
  disabled,
}: {
  connectionId: string;
  scope: string;
  label: string;
  description: string;
  granted: boolean;
  disabled?: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(granted);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const id = `${connectionId}-${scope}`;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
        {error ? (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={optimistic}
        disabled={disabled}
        onCheckedChange={(next) =>
          startTransition(async () => {
            setError(null);
            setOptimistic(next);
            const res = await setConsent(connectionId, scope, next);
            if (!res.ok) setError(res.message ?? "Couldn't update.");
          })
        }
      />
    </div>
  );
}
