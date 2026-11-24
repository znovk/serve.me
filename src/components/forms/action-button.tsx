"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/modules/shared/action-state";

/**
 * Runs a Server Action and shows its error inline. Authorization happens in
 * the action and in the database; this component is presentation only.
 */
export function ActionButton({
  action,
  confirm,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "action"> & {
  action: () => Promise<ActionState>;
  confirm?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        {...props}
        disabled={pending || props.disabled}
        aria-busy={pending || undefined}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          startTransition(async () => {
            const res = await action();
            if (!res.ok && res.message) setError(res.message);
          });
        }}
      >
        {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {children}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </span>
  );
}
