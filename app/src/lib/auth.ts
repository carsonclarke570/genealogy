/**
 * Minimal single-password gate for the private archive.
 *
 * There is no user system yet (see CLAUDE.md — Auth.js is the planned long-term
 * auth). This is a stopgap so the deployed site is not publicly readable: one
 * shared password (SITE_PASSWORD) unlocks the whole app. On success we set a
 * signed, HttpOnly cookie whose value is an HMAC of a fixed message keyed by
 * AUTH_SECRET — so the cookie can't be forged and the password never lives in it.
 *
 * Uses Web Crypto (globalThis.crypto.subtle) so the same code runs in both the
 * Edge middleware and the Node route handler.
 */

export const SESSION_COOKIE = "fa_session";
const TOKEN_MESSAGE = "fa-authorized-v1";

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The expected value of the session cookie for an authorized visitor. */
export async function sessionToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return hmacHex(secret, TOKEN_MESSAGE);
}

/** Constant-time string comparison to avoid leaking via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
