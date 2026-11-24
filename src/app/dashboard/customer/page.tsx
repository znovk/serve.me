import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Heart } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { DevPlaceholder } from "@/components/layout/dev-placeholder";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CONSENT_SCOPES } from "@/modules/connections/consent";
import { updateConnectionAsCustomer } from "@/modules/connections/actions";
import { getMyCustomerProfile, listMyCustomerConnections } from "@/modules/connections/queries";
import { requireRole } from "@/modules/identity/session";
import { ConsentToggle } from "./consent-toggle";
import { VisitorTypeForm } from "./visitor-type-form";

export const metadata: Metadata = { title: "My connections" };

const STATUS_LABEL = { pending: "Request sent", accepted: "Connected", declined: "Not accepted", blocked: "Blocked" } as const;

async function CustomerDashboard() {
  const user = await requireRole("customer");
  const [profile, connections] = await Promise.all([getMyCustomerProfile(user.id), listMyCustomerConnections(user.id)]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitorTypeForm value={profile?.visitor_type ?? null} />
        </CardContent>
      </Card>

      {connections.length ? (
        <ul className="grid gap-4">
          {connections.map((c) => {
            const pro = c.hospitality_profiles;
            const prefs = c.consent_preferences;
            const status = c.status as keyof typeof STATUS_LABEL;
            return (
              <li key={c.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{pro?.display_name ?? "Unavailable profile"}</CardTitle>
                      <Badge variant={status === "accepted" ? "success" : status === "pending" ? "brand" : "default"}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    {pro ? (
                      <CardDescription>
                        <Link href={`/p/${pro.username}`} className="underline underline-offset-4">
                          @{pro.username}
                        </Link>
                        {pro.workplace_name ? ` · ${pro.workplace_name}` : ""}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {status === "accepted" && prefs ? (
                      <div className="divide-y rounded-lg border px-4">
                        {CONSENT_SCOPES.map((s) => (
                          <ConsentToggle
                            key={s.scope}
                            connectionId={c.id}
                            scope={s.scope}
                            label={s.label}
                            description={s.description}
                            granted={prefs[s.scope]}
                          />
                        ))}
                      </div>
                    ) : status === "pending" ? (
                      <p className="text-sm text-muted-foreground">
                        Permissions become available once they accept. Everything starts switched off.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {status === "pending" ? (
                        <ActionButton size="sm" variant="outline" action={updateConnectionAsCustomer.bind(null, c.id, "cancel")}>
                          Cancel request
                        </ActionButton>
                      ) : null}
                      {status === "accepted" ? (
                        <ActionButton
                          size="sm"
                          variant="outline"
                          confirm="Disconnect? All permissions will be revoked immediately."
                          action={updateConnectionAsCustomer.bind(null, c.id, "disconnect")}
                        >
                          Disconnect
                        </ActionButton>
                      ) : null}
                      {status !== "blocked" ? (
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          confirm="Block? They won't see you or be able to contact you."
                          action={updateConnectionAsCustomer.bind(null, c.id, "block")}
                        >
                          Block
                        </ActionButton>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Heart} title="No connections yet">
          Scan a bartender&apos;s or server&apos;s QR code and tap &quot;Connect&quot; to stay in touch on your terms.
        </EmptyState>
      )}

      <DevPlaceholder title="Check-ins, visit history, saved offers, data export and account deletion">
        These customer controls are planned milestones. Until then, contact support to export or delete your data.
      </DevPlaceholder>
    </div>
  );
}

export default function CustomerPage() {
  return (
    <>
      <PageHeader title="My connections" description="You control who can reach you and what they can see." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <CustomerDashboard />
      </Suspense>
    </>
  );
}
