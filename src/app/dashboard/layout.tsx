import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { BottomNav, RoleSwitcher, SidebarNav } from "@/components/layout/app-nav";
import { Logo } from "@/components/layout/logo";
import { navSectionsFor } from "@/components/layout/nav-config";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOut } from "@/modules/identity/actions";
import { requireUser } from "@/modules/identity/session";

async function Navigation({ variant }: { variant: "sidebar" | "bottom" | "switcher" }) {
  const user = await requireUser("/dashboard");
  const sections = navSectionsFor(user.roles);
  if (variant === "sidebar") return <SidebarNav sections={sections} />;
  if (variant === "switcher") return <RoleSwitcher sections={sections} />;
  return <BottomNav sections={sections} />;
}

async function AccountName() {
  const user = await requireUser("/dashboard");
  return <span className="truncate text-sm text-muted-foreground">{user.displayName ?? user.email}</span>;
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-card px-3 py-5 md:flex">
        <div className="px-3">
          <Logo href="/dashboard" />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <Suspense fallback={<Skeleton className="mx-3 h-40" />}>
            <Navigation variant="sidebar" />
          </Suspense>
        </div>
        <div className="flex items-center gap-2 border-t px-3 pt-4">
          <Suspense fallback={<Skeleton className="h-4 flex-1" />}>
            <AccountName />
          </Suspense>
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="ghost" size="icon" aria-label="Sign out">
              <LogOut />
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Logo href="/dashboard" />
          <div className="flex items-center">
            <ThemeToggle />
            <form action={signOut}>
              <Button variant="ghost" size="icon" aria-label="Sign out">
                <LogOut />
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 md:pt-10">
          <div className="mb-4">
            <Suspense fallback={null}>
              <Navigation variant="switcher" />
            </Suspense>
          </div>
          {children}
        </main>
        <Suspense fallback={null}>
          <Navigation variant="bottom" />
        </Suspense>
      </div>
    </div>
  );
}
