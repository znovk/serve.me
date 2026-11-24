import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Users } from "lucide-react";
import { z } from "zod";
import { ActionButton } from "@/components/forms/action-button";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { setCampaignStatus, updatePartnershipAsAdvertiser } from "@/modules/advertisers/actions";
import { getCampaignForAdvertiser } from "@/modules/advertisers/queries";
import { COMPENSATION_LABEL, MARKET_SCOPE_LABEL } from "@/modules/advertisers/schemas";
import { requireRole } from "@/modules/identity/session";
import { advertiserActionsFor, PARTNERSHIP_STATUS_LABEL } from "@/modules/partnerships/state";
import { formatBps, formatMinor } from "@/modules/shared/money";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Campaign" };

const NEXT_STATUS = {
  draft: [{ to: "active", label: "Activate" }],
  active: [
    { to: "paused", label: "Pause" },
    { to: "ended", label: "End campaign" },
  ],
  paused: [
    { to: "active", label: "Resume" },
    { to: "ended", label: "End campaign" },
  ],
  ended: [],
} as const;

async function CampaignDetail({ params }: { params: PageProps<"/dashboard/advertiser/campaigns/[campaignId]">["params"] }) {
  const { campaignId } = await params;
  if (!z.uuid().safeParse(campaignId).success) notFound();
  const user = await requireRole("advertiser");
  const data = await getCampaignForAdvertiser(campaignId, user.id);
  if (!data) notFound();
  const { campaign: c, partnerships, canManage } = data;

  return (
    <>
      <PageHeader title={c.name} description={c.offer_headline} />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={c.status === "active" ? "success" : "default"} className="capitalize">
                {c.status}
              </Badge>
              <Badge variant="outline">{MARKET_SCOPE_LABEL[c.market_scope]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Compensation</dt>
                <dd>
                  {COMPENSATION_LABEL[c.compensation_model]}
                  {c.compensation_amount_minor != null ? ` · ${formatMinor(c.compensation_amount_minor, c.currency)}` : ""}
                  {c.compensation_percent_bps != null ? ` · ${formatBps(c.compensation_percent_bps)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Budget</dt>
                <dd>{formatMinor(c.budget_minor, c.currency)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Destination</dt>
                <dd className="truncate">{c.destination_url}</dd>
              </div>
            </dl>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUS[c.status].map((s) => (
                  <ActionButton
                    key={s.to}
                    size="sm"
                    variant={s.to === "ended" ? "destructive" : "outline"}
                    confirm={s.to === "ended" ? "End this campaign? Offers disappear from every professional's page." : undefined}
                    action={setCampaignStatus.bind(null, c.id, s.to)}
                  >
                    {s.label}
                  </ActionButton>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {canManage && (c.status === "draft" || c.status === "active") ? (
          <Card>
            <CardHeader>
              <CardTitle>Invite professionals</CardTitle>
              <CardDescription>
                Professionals decide whether to accept. Anyone who declined or blocked you can&apos;t be re-invited.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteForm campaignId={c.id} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Partners</CardTitle>
          </CardHeader>
          <CardContent>
            {partnerships.length ? (
              <ul className="divide-y rounded-lg border">
                {partnerships.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                    <span>
                      {p.hospitality_profiles ? (
                        <>
                          {p.hospitality_profiles.display_name}{" "}
                          <span className="text-muted-foreground">@{p.hospitality_profiles.username}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Profile unavailable</span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {/* Blocks are shown as "Ended" so advertisers are not told who blocked them. */}
                      <Badge variant={p.status === "active" ? "success" : "default"}>
                        {p.status === "blocked" ? PARTNERSHIP_STATUS_LABEL.terminated : PARTNERSHIP_STATUS_LABEL[p.status]}
                      </Badge>
                      {canManage
                        ? advertiserActionsFor(p.status).map((a) => (
                            <ActionButton key={a} size="sm" variant="ghost" action={updatePartnershipAsAdvertiser.bind(null, p.id, a)}>
                              {a === "withdraw" ? "Withdraw" : "End"}
                            </ActionButton>
                          ))
                        : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Users} title="No partners yet">
                Invite professionals by username to get started.
              </EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function CampaignPage({ params }: PageProps<"/dashboard/advertiser/campaigns/[campaignId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <CampaignDetail params={params} />
    </Suspense>
  );
}
