import { NextResponse, type NextRequest } from "next/server";
import { siteUrl } from "@/lib/env";
import { usernameSchema } from "@/modules/hospitality/schemas";
import { getPublicProfile } from "@/modules/public-profile/queries";
import { qrPng, qrSvg } from "@/modules/public-profile/qr";

/**
 * QR code for a PUBLISHED profile. The code encodes the canonical public URL
 * (NEXT_PUBLIC_SITE_URL), never a request-derived host.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/p/[username]/qr">) {
  const { username } = await ctx.params;
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return new NextResponse("Not found", { status: 404 });
  const profile = await getPublicProfile(parsed.data);
  if (!profile) return new NextResponse("Not found", { status: 404 });

  const url = `${siteUrl()}/p/${profile.username}`;
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const download = request.nextUrl.searchParams.get("download") === "1";
  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${profile.username}-qr.${format}"`;

  if (format === "png") {
    const body = await qrPng(url);
    return new NextResponse(new Uint8Array(body), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new NextResponse(await qrSvg(url), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
