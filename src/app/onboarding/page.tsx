import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SELF_SERVICE_ROLES } from "@/modules/identity/roles";
import { requireUser } from "@/modules/identity/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Get started" };

async function OnboardingContent() {
  const user = await requireUser("/onboarding");
  const remaining = SELF_SERVICE_ROLES.filter((r) => !user.roles.includes(r));
  if (!remaining.length) {
    return (
      <p className="text-sm text-muted-foreground">
        You already have every self-service role.{" "}
        <Link href="/dashboard" className="underline">
          Go to your dashboard
        </Link>
        .
      </p>
    );
  }
  return <OnboardingForm existingRoles={user.roles} />;
}

export default function OnboardingPage() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1>Welcome</h1>
          </CardTitle>
          <CardDescription>Choose a role to set up your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <OnboardingContent />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
