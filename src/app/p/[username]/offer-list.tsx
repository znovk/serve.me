"use client";

import { useSyncExternalStore } from "react";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { prioritizeOffers } from "@/modules/public-profile/offers";
import type { PublicOffer, VisitorType } from "@/modules/public-profile/types";

const STORAGE_KEY = "visitor-type";
const SCOPE_LABEL = { local: "Local pick", tourism: "For visitors", national: "Shop online" } as const;

const listeners = new Set<() => void>();

function readVisitorType(): VisitorType | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "local" || saved === "visitor" ? saved : memoryValue;
  } catch {
    return memoryValue; // Storage unavailable (private mode, embedded views).
  }
}

let memoryValue: VisitorType | null = null;

function writeVisitorType(v: VisitorType) {
  memoryValue = v;
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* keep in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Visitor type is a voluntary, per-browser choice used only to order offers.
 * It is never sent to the server and no location is collected.
 */
export function OfferList({ offers }: { offers: PublicOffer[] }) {
  const visitorType = useSyncExternalStore(subscribe, readVisitorType, () => null);
  const choose = writeVisitorType;

  if (!offers.length) return null;
  const sorted = prioritizeOffers(offers, visitorType);

  return (
    <section aria-labelledby="recs" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recs" className="text-sm font-semibold">
          Recommendations
        </h2>
        <div role="group" aria-label="I'm a…" className="flex rounded-full border p-0.5 text-xs">
          {(["local", "visitor"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={visitorType === v}
              onClick={() => choose(v)}
              className={cn(
                "rounded-full px-3 py-1",
                visitorType === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {v === "local" ? "I'm local" : "I'm visiting"}
            </button>
          ))}
        </div>
      </div>
      <ul className="grid gap-3">
        {sorted.map((o) => (
          <li key={o.partnership_id}>
            <a
              href={`/go/${o.partnership_id}`}
              rel="sponsored noopener"
              target="_blank"
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{SCOPE_LABEL[o.market_scope]}</Badge>
                  <Badge variant="brand">Sponsored</Badge>
                </div>
                <p className="mt-2 font-medium">{o.headline}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  {o.business_name}
                  {o.business_verified ? <BadgeCheck aria-label="Verified business" className="size-4 text-brand" /> : null}
                </p>
                {o.description ? <p className="mt-2 text-sm text-muted-foreground">{o.description}</p> : null}
              </div>
              <ExternalLink aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Disclosure: these are paid partnerships or affiliate links. This professional may earn compensation if you use them.
        They chose each one.
      </p>
    </section>
  );
}
