import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

async function LoginFormWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <LoginForm next={next} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1" className="text-xl">Sign in</CardTitle>
        <CardDescription>Welcome back.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Suspense fallback={<LoginForm />}>
          <LoginFormWithParams searchParams={searchParams} />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
