"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  children,
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingProp ?? formPending;
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending || undefined} {...props}>
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
      {children}
    </Button>
  );
}
