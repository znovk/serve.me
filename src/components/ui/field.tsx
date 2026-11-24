import * as React from "react";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/** Label + control + hint + error, wired with aria attributes. */
function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, { id, "aria-invalid": Boolean(error) || undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field };
