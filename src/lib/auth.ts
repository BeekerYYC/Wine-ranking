/**
 * Single-password sign-in for a personal app.
 *
 * Set APP_PASSWORD in the environment (Vercel → Project → Settings →
 * Environment Variables) to turn it on. While it is unset the app stays open,
 * as it was before, so deploying this can't lock anyone out.
 *
 * The cookie holds a hash of the password, never the password itself, and
 * changing the password signs every device out. Runs in both the Edge
 * middleware and Node routes, so it uses Web Crypto.
 */
export const AUTH_COOKIE = "wr_session";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365; // one year

export function appPassword(): string | null {
  return process.env.APP_PASSWORD || null;
}

export async function sessionToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`wine-ranking-session:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only allow redirects back into this app (no "//evil.example" or full URLs). */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
