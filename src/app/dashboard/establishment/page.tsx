import type { Metadata } from "next";
import { Suspense } from "react";
import { DevPlaceholder } from "@/components/layout/dev-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/modules/identity/session";

export const metadata: Metadata = { title: "Establishment" };

async function Gate({ children }: { children: React.ReactNode }) {
  await requireRole("establishment");
  return <>{children}</>;
}

export default function EstablishmentPage() {
  return (
    <>
      <PageHeader title="Venue" description="Tools for restaurants and bars." />
      <Suspense fallback={<Skeleton className="h-32" />}>
        <Gate>
          <div className="grid gap-4">
            <DevPlaceholder title="Establishment profile and employee affiliations">
              Venue profiles, verified staff affiliations and workplace advertising policies are a later milestone.
            </DevPlaceholder>
            <DevPlaceholder title="Check-ins, loyalty and retention analytics">
              Venue-owned customer data will be stored separately from bartender–customer connections.
            </DevPlaceholder>
          </div>
        </Gate>
      </Suspense>
    </>
  );
}
