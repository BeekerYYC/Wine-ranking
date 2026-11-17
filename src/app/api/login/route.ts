import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, appPassword, sessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const password = appPassword();
  if (!password) return NextResponse.json({ ok: true }); // sign-in is turned off

  const body = await req.json().catch(() => ({}));
  const attempt = typeof body.password === "string" ? body.password : "";
  const expected = await sessionToken(password);

  if ((await sessionToken(attempt)) !== expected) {
    // Slow down password guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return res;
}
