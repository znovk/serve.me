import type { Metadata } from "next";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { DevPlaceholder } from "@/components/layout/dev-placeholder";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CONSENT_SCOPES } from "@/modules/connections/consent";
import { updateConnectionAsProfessional } from "@/modules/connections/actions";
import { listProfessionalConnections } from "@/modules/connections/queries";
import { requireRole } from "@/modules/identity/session";

export const metadata: Metadata = { title: "Guest connections" };

async function Connections() {
  await requireRole("hospitality");
  const rows = await listProfessionalConnections();
  if (!rows.length) {
    return (
      <EmptyState icon={Users} title="No connection requests yet">
        Guests can request to connect from your public page. You only ever see what they choose to share.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((c) => {
        const granted = CONSENT_SCOPES.filter((s) => c[s.scope]);
        return (
          <li key={c.id} className="grid gap-3 p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-medium">
                {c.customer_display_name}
                <Badge variant={c.status === "accepted" ? "success" : c.status === "pending" ? "brand" : "destructive"}>
                  {c.status === "accepted" ? "Connected" : c.status === "pending" ? "Requested" : "Blocked"}
                </Badge>
              </p>
              {c.status === "accepted" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {granted.length ? `Allows: ${granted.map((g) => g.label.toLowerCase()).join(", ")}` : "Hasn't granted any permissions yet."}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.status === "pending" ? (
                <>
                  <ActionButton size="sm" variant="brand" action={updateConnectionAsProfessional.bind(null, c.id, "accept")}>
                    Accept
                  </ActionButton>
                  <ActionButton size="sm" variant="outline" action={updateConnectionAsProfessional.bind(null, c.id, "decline")}>
                    Decline
                  </ActionButton>
                </>
              ) : null}
              {c.status === "accepted" ? (
                <ActionButton size="sm" variant="outline" action={updateConnectionAsProfessional.bind(null, c.id, "disconnect")}>
                  Disconnect
                </ActionButton>
              ) : null}
              {c.status !== "blocked" ? (
                <ActionButton
                  size="sm"
                  variant="ghost"
                  confirm="Block this person? They won't be able to request to connect again."
                  action={updateConnectionAsProfessional.bind(null, c.id, "block")}
                >
                  Block
                </ActionButton>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function ConnectionsPage() {
  return (
    <>
      <PageHeader title="Guests" description="Customers who asked to stay connected with you." />
      <div className="grid gap-6">
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Connections />
        </Suspense>
        <DevPlaceholder title="Messaging, visit history and shared preferences">
          Messaging requires an accepted connection plus the guest&apos;s direct-message permission, and arrives in a later
          milestone along with check-ins and shared favorites.
        </DevPlaceholder>
      </div>
    </>
  );
}
