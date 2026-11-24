import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultDashboardFor } from "@/modules/identity/roles";
import { requireUser } from "@/modules/identity/session";

async function RedirectToDashboard() {
  const user = await requireUser("/dashboard");
  redirect(defaultDashboardFor(user.roles));
  return null;
}

export default function DashboardIndex() {
  return (
    <Suspense fallback={<Skeleton className="h-32" />}>
      <RedirectToDashboard />
    </Suspense>
  );
}
