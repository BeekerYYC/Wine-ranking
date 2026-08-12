/**
 * Single-user access control.
 *
 * The app was fully open: anyone with the URL could read the cellar and, more to
 * the point, modify or delete it — no credentials of any kind. This gates it
 * behind one shared password.
 *
 * Deliberately inert unless APP_PASSWORD is set, so deploying this cannot lock
 * the owner out of their own app before the variable exists in the environment.
 *
 * The cookie stores an HMAC of a fixed string keyed by the password, never the
 * password itself, so the stored value cannot be read back into the password.
 * Web Crypto is used rather than node:crypto because the middleware runs on the
 * Edge runtime.
 */
export const AUTH_COOKIE = "wr_session";

/** Callers may also authenticate with this header — scripts, curl, importers. */
export const AUTH_HEADER = "x-app-password";

const SESSION_MESSAGE = "wine-ranker-session-v1";

export function authPassword(): string | undefined {
  const p = process.env.APP_PASSWORD;
  return p && p.length > 0 ? p : undefined;
}

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(SESSION_MESSAGE));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent comparison, so a wrong guess leaks nothing via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
