import type { Metadata } from "next";
import { Suspense } from "react";
import { DevPlaceholder } from "@/components/layout/dev-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/modules/identity/session";

export const metadata: Metadata = { title: "Administration" };

async function Gate({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <>{children}</>;
}

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Administration" description="Platform operations. Admin access is never self-assigned." />
      <Suspense fallback={<Skeleton className="h-32" />}>
        <Gate>
          <div className="grid gap-4">
            <DevPlaceholder title="Users, organizations and business verification">
              Admin tooling arrives in a later milestone. Until then, verification and role grants are done in the
              Supabase dashboard by the project owner (see docs/SECURITY.md).
            </DevPlaceholder>
            <DevPlaceholder title="Moderation, disputes, payouts and audited analytics">
              Planned. The audit_logs table already records role claims, partnership and connection changes.
            </DevPlaceholder>
          </div>
        </Gate>
      </Suspense>
    </>
  );
}
