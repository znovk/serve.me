import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];

/**
 * Refreshes the Supabase session cookie on each request and performs an
 * OPTIMISTIC redirect for signed-out users on private routes. This is not
 * authorization: every page, Server Action and route handler re-checks the
 * user and roles on the server, and RLS enforces access in the database.
 */
const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

/** Public profile URLs with a malformed username get a real 404 status. */
function rejectMalformedProfilePath(pathname: string): NextResponse | null {
  const m = /^\/p\/([^/]+)(\/qr)?\/?$/.exec(pathname);
  if (!m) return null;
  let segment: string;
  try {
    segment = decodeURIComponent(m[1]!);
  } catch {
    segment = "";
  }
  return USERNAME_RE.test(segment) ? null : new NextResponse("Profile not found", { status: 404 });
}

export async function updateSession(request: NextRequest) {
  const rejected = rejectMalformedProfilePath(request.nextUrl.pathname);
  if (rejected) return rejected;

  let response = NextResponse.next({ request });
  const env = getPublicEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between client creation and getClaims(): it refreshes
  // the session and verifies the JWT.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  if (!signedIn && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
