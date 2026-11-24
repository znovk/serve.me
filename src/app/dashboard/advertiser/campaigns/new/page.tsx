import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyAdvertiserOrganizations } from "@/modules/advertisers/queries";
import { requireRole } from "@/modules/identity/session";
import { CampaignForm } from "./campaign-form";

export const metadata: Metadata = { title: "New campaign" };

async function NewCampaign() {
  const user = await requireRole("advertiser");
  const orgs = (await listMyAdvertiserOrganizations(user.id)).filter((o) => o.memberRole !== "member");
  if (!orgs.length) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Set up your business profile before creating a campaign.</p>
        <Button asChild className="justify-self-start">
          <Link href="/dashboard/advertiser">Set up business</Link>
        </Button>
      </div>
    );
  }
  return (
    <Card className="max-w-2xl">
      <CardContent>
        <CampaignForm
          organizations={orgs.map((o) => ({ id: o.id, name: o.business?.display_name ?? o.name, scope: o.business?.market_scope ?? "local" }))}
        />
      </CardContent>
    </Card>
  );
}

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader title="New campaign" description="Describe the offer professionals will be asked to recommend." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <NewCampaign />
      </Suspense>
    </>
  );
}
