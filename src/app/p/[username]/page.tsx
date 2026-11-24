import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarHeart, Coins, Globe, Link2, MapPin, UserRound } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getConnectionStatusForUsername } from "@/modules/connections/queries";
import { usernameSchema } from "@/modules/hospitality/schemas";
import { getCurrentUser } from "@/modules/identity/session";
import { getPublicProfile } from "@/modules/public-profile/queries";
import type { PublicProfile } from "@/modules/public-profile/types";
import { ConnectButton } from "./connect-button";
import { OfferList } from "./offer-list";

const LINK_ICON = { social: Globe, tip: Coins, personal: Link2, booking: CalendarHeart, other: Link2 } as const;

export async function generateMetadata({ params }: PageProps<"/p/[username]">): Promise<Metadata> {
  const { username } = await params;
  const parsed = usernameSchema.safeParse(username);
  const profile = parsed.success ? await getPublicProfile(parsed.data) : null;
  if (!profile) return { title: "Profile not found", robots: { index: false } };
  return { title: profile.display_name, description: profile.bio ?? undefined };
}

async function ConnectArea({ username }: { username: string }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button variant="brand" className="w-full" asChild>
        <Link href={`/login?next=/p/${username}`}>Connect</Link>
      </Button>
    );
  }
  const { self, status } = await getConnectionStatusForUsername(user.id, username);
  if (self) {
    return (
      <Button variant="outline" className="w-full" asChild>
        <Link href="/dashboard/hospitality/profile">Edit your page</Link>
      </Button>
    );
  }
  if (status === "accepted") return <p className="text-center text-sm text-success">You&apos;re connected.</p>;
  if (status === "pending") return <p className="text-center text-sm text-muted-foreground">Connection request sent.</p>;
  if (status === "declined" || status === "blocked") return null;
  if (!user.roles.includes("customer")) {
    return (
      <Button variant="outline" className="w-full" asChild>
        <Link href="/onboarding">Add a customer account to connect</Link>
      </Button>
    );
  }
  return <ConnectButton username={username} />;
}

function ProfileView({ profile }: { profile: PublicProfile }) {
  const initials = profile.display_name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <article className="grid gap-6">
      <header className="flex flex-col items-center text-center">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied https URL; next/image would require allow-listing every host
          <img
            src={profile.avatar_url}
            alt=""
            width={96}
            height={96}
            referrerPolicy="no-referrer"
            className="size-24 rounded-full border object-cover"
          />
        ) : (
          <div aria-hidden className="grid size-24 place-items-center rounded-full bg-secondary text-2xl font-semibold">
            {initials || <UserRound />}
          </div>
        )}
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
        {profile.workplace_name ? (
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin aria-hidden className="size-4" /> {profile.workplace_name}
          </p>
        ) : null}
        {profile.bio ? <p className="mt-3 max-w-prose whitespace-pre-line text-sm">{profile.bio}</p> : null}
      </header>

      <Suspense fallback={<Skeleton className="h-10" />}>
        <ConnectArea username={profile.username} />
      </Suspense>

      {profile.links.length ? (
        <ul className="grid gap-3" aria-label="Links">
          {profile.links.map((l) => {
            const Icon = LINK_ICON[l.kind];
            return (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex min-h-12 items-center gap-3 rounded-xl border bg-card px-4 py-3 font-medium transition-colors hover:bg-accent/40"
                >
                  <Icon aria-hidden className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-center">{l.label}</span>
                  <span className="size-4" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      <OfferList offers={profile.offers} />
    </article>
  );
}

async function ProfileContent({ params }: { params: PageProps<"/p/[username]">["params"] }) {
  await connection(); // Always render fresh: declines and blocks must take effect immediately.
  const { username } = await params;
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) notFound();
  const profile = await getPublicProfile(parsed.data);
  if (!profile) notFound();
  return <ProfileView profile={profile} />;
}

export default function PublicProfilePage({ params }: PageProps<"/p/[username]">) {
  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <Suspense
        fallback={
          <div className="grid gap-4" aria-busy="true">
            <Skeleton className="mx-auto size-24 rounded-full" />
            <Skeleton className="mx-auto h-6 w-40" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        }
      >
        <ProfileContent params={params} />
      </Suspense>
      <footer className="mt-12 flex justify-center opacity-70">
        <Logo />
      </footer>
    </main>
  );
}
