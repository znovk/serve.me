import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart3, ExternalLink, QrCode } from "lucide-react";
import { DevPlaceholder } from "@/components/layout/dev-placeholder";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { siteUrl } from "@/lib/env";
import { listProfessionalConnections } from "@/modules/connections/queries";
import { getMyHospitalityProfile } from "@/modules/hospitality/queries";
import { requireRole } from "@/modules/identity/session";
import { listMyPartnerships } from "@/modules/partnerships/queries";

export const metadata: Metadata = { title: "Professional dashboard" };

async function Overview() {
  const user = await requireRole("hospitality");
  const profile = await getMyHospitalityProfile(user.id);

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create your public profile</CardTitle>
          <CardDescription>Pick a username, add your links, and get a QR code guests can scan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/hospitality/profile">Create profile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const [partnerships, connections] = await Promise.all([listMyPartnerships(profile.id), listProfessionalConnections()]);
  const pendingInvites = partnerships.filter((p) => p.status === "pending").length;
  const activePartners = partnerships.filter((p) => p.status === "active").length;
  const pendingConnections = connections.filter((c) => c.status === "pending").length;
  const publicUrl = `${siteUrl()}/p/${profile.username}`;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>@{profile.username}</CardTitle>
            {profile.is_published ? <Badge variant="success">Published</Badge> : <Badge>Draft — not public</Badge>}
          </div>
          <CardDescription className="break-all">{publicUrl}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {profile.is_published ? (
            // eslint-disable-next-line @next/next/no-img-element -- same-origin SVG generated on the server
            <img
              src={`/p/${profile.username}/qr?format=svg`}
              alt={`QR code linking to ${publicUrl}`}
              width={144}
              height={144}
              className="rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="grid size-36 place-items-center rounded-lg border border-dashed text-center text-xs text-muted-foreground">
              Publish your profile to activate the QR code
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/p/${profile.username}`} target="_blank">
                <ExternalLink aria-hidden /> View public page
              </Link>
            </Button>
            {profile.is_published ? (
              <>
                <Button variant="outline" asChild>
                  <a href={`/p/${profile.username}/qr?format=png&download=1`}>
                    <QrCode aria-hidden /> Download PNG
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`/p/${profile.username}/qr?format=svg&download=1`}>
                    <QrCode aria-hidden /> Download SVG
                  </a>
                </Button>
              </>
            ) : null}
            <Button asChild>
              <Link href="/dashboard/hospitality/profile">Edit profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pending invitations" value={pendingInvites} href="/dashboard/hospitality/partnerships" />
        <Stat label="Active partners" value={activePartners} href="/dashboard/hospitality/partnerships" />
        <Stat label="Connection requests" value={pendingConnections} href="/dashboard/hospitality/connections" />
      </div>

      <DevPlaceholder title="Analytics and earnings">
        Profile views, offer impressions, clicks, referrals and earnings are a later milestone. No numbers are shown
        until real, verified events are recorded. <BarChart3 aria-hidden className="ml-1 inline size-4" />
      </DevPlaceholder>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent/40">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

export default function HospitalityDashboardPage() {
  return (
    <>
      <PageHeader title="Overview" description="Your public page, QR code and partnership activity." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Overview />
      </Suspense>
    </>
  );
}
