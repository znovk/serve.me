import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfferList } from "@/app/p/[username]/offer-list";

const offers = [
  { partnership_id: "11111111-1111-4111-8111-111111111111", headline: "Online store", description: null, market_scope: "national" as const, business_name: "Shop", business_verified: false },
  { partnership_id: "22222222-2222-4222-8222-222222222222", headline: "Fishing charter", description: null, market_scope: "tourism" as const, business_name: "Charters", business_verified: true },
];

describe("OfferList", () => {
  it("labels every offer as sponsored and shows a disclosure", () => {
    render(<OfferList offers={offers} />);
    expect(screen.getAllByText("Sponsored")).toHaveLength(2);
    expect(screen.getByText(/paid partnerships or affiliate links/i)).toBeInTheDocument();
  });

  it("links through the controlled redirect with rel=sponsored", () => {
    render(<OfferList offers={offers} />);
    const link = screen.getByRole("link", { name: /fishing charter/i });
    expect(link).toHaveAttribute("href", `/go/${offers[1]!.partnership_id}`);
    expect(link.getAttribute("rel")).toContain("sponsored");
  });

  it("reorders when the visitor says they're visiting", () => {
    render(<OfferList offers={offers} />);
    fireEvent.click(screen.getByRole("button", { name: "I'm visiting" }));
    const items = within(screen.getByRole("list")).getAllByRole("link");
    expect(items[0]).toHaveTextContent("Fishing charter");
  });

  it("renders nothing without offers", () => {
    const { container } = render(<OfferList offers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
