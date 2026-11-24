import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          © {brand.name}. Development preview. No payments are processed.
        </div>
      </footer>
    </>
  );
}
