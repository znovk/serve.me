import type { PublicOffer, VisitorType } from "./types";

/**
 * Orders offers using only the visitor's voluntary local/visitor choice —
 * no location tracking. Locals see local offers first; visitors see tourism
 * offers first. National offers are always included.
 */
export function prioritizeOffers(offers: readonly PublicOffer[], visitorType: VisitorType | null): PublicOffer[] {
  const order: Record<PublicOffer["market_scope"], number> =
    visitorType === "visitor"
      ? { tourism: 0, local: 1, national: 2 }
      : visitorType === "local"
        ? { local: 0, tourism: 1, national: 2 }
        : { local: 0, tourism: 0, national: 1 };
  return offers
    .map((offer, index) => ({ offer, index }))
    .sort((a, b) => order[a.offer.market_scope] - order[b.offer.market_scope] || a.index - b.index)
    .map(({ offer }) => offer);
}

export function groupOffers(offers: readonly PublicOffer[]) {
  return {
    local: offers.filter((o) => o.market_scope === "local"),
    tourism: offers.filter((o) => o.market_scope === "tourism"),
    national: offers.filter((o) => o.market_scope === "national"),
  };
}
