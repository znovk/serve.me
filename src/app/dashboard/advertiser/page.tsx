import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Megaphone, Plus } from "lucide-react";
import { DevPlaceholder } from "@/components/layout/dev-placeholder";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listCampaigns, listMyAdvertiserOrganizations } from "@/modules/advertisers/queries";
import { MARKET_SCOPE_LABEL } from "@/modules/advertisers/schemas";
import { requireRole } from "@/modules/identity/session";
import { listCategories } from "@/modules/partnerships/queries";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Advertiser dashboard" };

async function AdvertiserHome() {
  const user = await requireRole("advertiser");
  const orgs = await listMyAdvertiserOrganizations(user.id);

  if (!orgs.length) {
    const categories = await listCategories();
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Set up your business profile</CardTitle>
          <CardDescription>This is what hospitality professionals see when you invite them.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm categories={categories} />
        </CardContent>
      </Card>
    );
  }

  const campaigns = await listCampaigns(orgs.map((o) => o.id));
  const orgName = new Map(orgs.map((o) => [o.id, o.business?.display_name ?? o.name]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        {orgs.map((o) => (
          <Badge key={o.id} variant="outline">
            {o.business?.display_name ?? o.name} · {o.business?.verification_status === "verified" ? "Verified" : "Unverified"}
          </Badge>
        ))}
      </div>
      {campaigns.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((c) => {
            const active = c.campaign_partnerships.filter((p) => p.status === "active").length;
            const pending = c.campaign_partnerships.filter((p) => p.status === "pending").length;
            return (
              <li key={c.id}>
                <Link href={`/dashboard/advertiser/campaigns/${c.id}`} className="block h-full">
                  <Card className="h-full transition-colors hover:bg-accent/30">
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle>{c.name}</CardTitle>
                        <Badge variant={c.status === "active" ? "success" : "default"} className="capitalize">
                          {c.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {orgName.get(c.organization_id)} · {MARKET_SCOPE_LABEL[c.market_scope]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {active} active partner{active === 1 ? "" : "s"} · {pending} pending invitation{pending === 1 ? "" : "s"}
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Megaphone} title="No campaigns yet">
          Create a campaign, then invite hospitality professionals by username.
        </EmptyState>
      )}
      <DevPlaceholder title="Performance reports, billing and professional discovery">
        Aggregated campaign analytics, monthly reports, subscriptions (Stripe Billing) and searchable professional
        discovery are later milestones. No charges are made.
      </DevPlaceholder>
    </div>
  );
}

export default function AdvertiserPage() {
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Offers that professionals can choose to recommend."
        actions={
          <Button asChild>
            <Link href="/dashboard/advertiser/campaigns/new">
              <Plus aria-hidden /> New campaign
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <AdvertiserHome />
      </Suspense>
    </>
  );
}
