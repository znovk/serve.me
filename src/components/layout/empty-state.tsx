import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      <Icon aria-hidden className="size-8 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}
