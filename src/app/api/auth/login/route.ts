import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authPassword, safeEqual, sessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const password = authPassword();
  if (!password) {
    // No password configured: the app is open, so there is nothing to log into.
    return NextResponse.json({ ok: true, note: "No password is configured" });
  }

  const body = await req.json().catch(() => ({}));
  const given = typeof body.password === "string" ? body.password : "";

  if (!safeEqual(given, password)) {
    // Blunt brute-forcing a single shared password.
    await new Promise((r) => setTimeout(r, 700));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await sessionToken(password), {
    httpOnly: true,
    // Long-lived: the point is that the phone stays signed in.
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
