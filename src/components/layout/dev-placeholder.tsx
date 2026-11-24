import { Construction } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/** Clearly labeled placeholder for features that are not built yet. */
export function DevPlaceholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Alert variant="placeholder">
      <Construction aria-hidden />
      <AlertTitle>
        {title} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Not built yet</span>
      </AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
