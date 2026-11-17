import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, appPassword, sessionToken } from "@/lib/auth";

/**
 * Gate every page and API route behind the app password (see src/lib/auth.ts).
 * Before this, anyone with the URL could read, edit or delete the collection
 * and run Claude calls billed to the app's API key.
 */
export async function middleware(req: NextRequest) {
  const password = appPassword();
  if (!password) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken(password))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except Next's own static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
