import type { Metadata } from "next";
import { Suspense } from "react";
import { Handshake } from "lucide-react";
import { ActionButton } from "@/components/forms/action-button";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { COMPENSATION_LABEL, MARKET_SCOPE_LABEL } from "@/modules/advertisers/schemas";
import { getMyHospitalityProfile } from "@/modules/hospitality/queries";
import { requireRole } from "@/modules/identity/session";
import { removeBlock, updatePartnershipAsProfessional } from "@/modules/partnerships/actions";
import { listCategories, listMyBlocks, listMyPartnerships } from "@/modules/partnerships/queries";
import { PARTNERSHIP_STATUS_LABEL, professionalActionsFor, type ProfessionalPartnershipAction } from "@/modules/partnerships/state";
import { formatBps, formatMinor } from "@/modules/shared/money";
import { BlockCategoryForm } from "./block-category-form";

export const metadata: Metadata = { title: "Partnerships" };

const ACTION_LABEL: Record<ProfessionalPartnershipAction, string> = {
  accept: "Accept",
  decline: "Decline",
  pause: "Pause",
  resume: "Resume",
  terminate: "End partnership",
  block: "Block advertiser",
};

async function Partnerships() {
  const user = await requireRole("hospitality");
  const profile = await getMyHospitalityProfile(user.id);
  if (!profile) {
    return (
      <EmptyState icon={Handshake} title="Create your profile first">
        Advertisers can only invite published profiles.
      </EmptyState>
    );
  }
  const [partnerships, blocks, categories] = await Promise.all([
    listMyPartnerships(profile.id),
    listMyBlocks(profile.id),
    listCategories(),
  ]);

  return (
    <div className="grid gap-6">
      {partnerships.length ? (
        <ul className="grid gap-4">
          {partnerships.map((p) => {
            const c = p.advertising_campaigns;
            if (!c) return null;
            return (
              <li key={p.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{c.offer_headline}</CardTitle>
                      <Badge variant={p.status === "active" ? "success" : p.status === "pending" ? "brand" : "default"}>
                        {PARTNERSHIP_STATUS_LABEL[p.status]}
                      </Badge>
                      <Badge variant="outline">{MARKET_SCOPE_LABEL[c.market_scope]}</Badge>
                    </div>
                    <CardDescription>
                      {p.business?.display_name ?? "Advertiser"}
                      {p.business?.verification_status === "verified" ? " · Verified business" : " · Unverified business"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {c.description ? <p className="text-sm">{c.description}</p> : null}
                    <dl className="grid gap-1 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Compensation</dt>
                        <dd>
                          {COMPENSATION_LABEL[c.compensation_model]}
                          {c.compensation_amount_minor != null ? ` · ${formatMinor(c.compensation_amount_minor, c.currency)}` : ""}
                          {c.compensation_percent_bps != null ? ` · ${formatBps(c.compensation_percent_bps)}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Campaign status</dt>
                        <dd className="capitalize">{c.status}</dd>
                      </div>
                    </dl>
                    <p className="text-xs text-muted-foreground">
                      Compensation terms are informational during development. No payments are made yet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {professionalActionsFor(p.status).map((a) => (
                        <ActionButton
                          key={a}
                          size="sm"
                          variant={a === "accept" ? "brand" : a === "block" ? "destructive" : "outline"}
                          confirm={
                            a === "block"
                              ? `Block ${p.business?.display_name ?? "this advertiser"}? All of their offers will be removed from your page and they can't invite you again.`
                              : undefined
                          }
                          action={updatePartnershipAsProfessional.bind(null, p.id, a)}
                        >
                          {ACTION_LABEL[a]}
                        </ActionButton>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Handshake} title="No invitations yet">
          When a business invites you, it will appear here. Nothing shows on your page until you accept.
        </EmptyState>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Blocked advertisers and categories</CardTitle>
          <CardDescription>Blocked advertisers can&apos;t invite you, and their offers never appear on your page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {blocks.length ? (
            <ul className="divide-y rounded-lg border">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  {b.label}
                  <ActionButton size="sm" variant="ghost" action={removeBlock.bind(null, b.id)}>
                    Unblock
                  </ActionButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing blocked.</p>
          )}
          <BlockCategoryForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PartnershipsPage() {
  return (
    <>
      <PageHeader title="Partnerships" description="You decide which businesses appear on your page." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Partnerships />
      </Suspense>
    </>
  );
}
