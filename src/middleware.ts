import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_HEADER, authPassword, safeEqual, sessionToken } from "@/lib/auth";

/**
 * Gate everything behind the shared password once APP_PASSWORD is set.
 *
 * Without that variable the app behaves exactly as before, so this can be
 * deployed and the password added afterwards without a window where the owner is
 * locked out.
 */

// Reachable without a session. The icons and manifest stay open so iOS can fetch
// them while installing to the home screen, and so the login page can render.
const PUBLIC = [
  /^\/login$/,
  /^\/api\/auth\/login$/,
  /^\/manifest\.webmanifest$/,
  /^\/favicon\.ico$/,
  /^\/apple-touch-icon\.png$/,
  /^\/icon-[\w-]+\.png$/,
];

export async function middleware(req: NextRequest) {
  const password = authPassword();
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionToken(password))) {
    return NextResponse.next();
  }

  const header = req.headers.get(AUTH_HEADER);
  if (header && safeEqual(header, password)) {
    return NextResponse.next();
  }

  // An API caller wants a status code, not a login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except build assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
