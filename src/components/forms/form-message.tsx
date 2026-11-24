import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/modules/shared/action-state";

export function FormMessage({ state }: { state: ActionState | null | undefined }) {
  if (!state?.message) return null;
  return (
    <Alert variant={state.ok ? "success" : "destructive"} aria-live="polite">
      {state.ok ? <CheckCircle2 aria-hidden /> : <AlertCircle aria-hidden />}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
