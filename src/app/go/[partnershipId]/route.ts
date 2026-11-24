import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveOfferRedirect } from "@/modules/public-profile/queries";

/**
 * Controlled redirect for offer clicks. Only redirects while the partnership
 * and campaign are active and not blocked. Click recording, bot filtering and
 * attribution are a later milestone — no click is counted yet.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/go/[partnershipId]">) {
  const { partnershipId } = await ctx.params;
  if (!z.uuid().safeParse(partnershipId).success) return new NextResponse("Not found", { status: 404 });
  const destination = await resolveOfferRedirect(partnershipId);
  if (!destination) return new NextResponse("This offer is no longer available.", { status: 410 });
  return NextResponse.redirect(destination, {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
