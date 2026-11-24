"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, Heart, Home, Megaphone, Plus, QrCode, Shield, Store, User, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { activeSection, isActiveItem, type NavIcon, type NavSection } from "./nav-config";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home, user: User, handshake: Handshake, users: Users, megaphone: Megaphone,
  plus: Plus, store: Store, shield: Shield, heart: Heart, qr: QrCode,
};

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="grid gap-6">
      {sections.map((section) => (
        <div key={section.role} className="grid gap-1">
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.label}</p>
          {section.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActiveItem(item, pathname, section);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function BottomNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const section = activeSection(sections, pathname);
  if (!section) return null;
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${section.items.length}, minmax(0, 1fr))` }}>
        {section.items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActiveItem(item, pathname, section);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
                  active && "font-medium text-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function RoleSwitcher({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const current = activeSection(sections, pathname);
  if (sections.length < 2) return null;
  return (
    <div className="flex gap-1 overflow-x-auto md:hidden" role="navigation" aria-label="Switch dashboard">
      {sections.map((s) => (
        <Link
          key={s.role}
          href={s.base}
          aria-current={current?.role === s.role ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1 text-xs",
            current?.role === s.role ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}
