import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyHospitalityProfile, getMyLinks } from "@/modules/hospitality/queries";
import { requireRole } from "@/modules/identity/session";
import { LinksManager } from "./links-manager";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Edit profile" };

async function ProfileEditor() {
  const user = await requireRole("hospitality");
  const profile = await getMyHospitalityProfile(user.id);
  const links = profile ? await getMyLinks(profile.id) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>What guests see on your public page.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            isNew={!profile}
            defaults={{
              username: profile?.username ?? "",
              displayName: profile?.display_name ?? user.displayName ?? "",
              bio: profile?.bio ?? "",
              workplaceName: profile?.workplace_name ?? "",
              avatarUrl: profile?.avatar_url ?? "",
              isPublished: profile?.is_published ?? false,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
          <CardDescription>Personal, social and tipping links. Only https:// links are allowed.</CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <LinksManager links={links} />
          ) : (
            <p className="text-sm text-muted-foreground">Create your profile first, then add links.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HospitalityProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Edit your public link-in-bio page." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProfileEditor />
      </Suspense>
    </>
  );
}
