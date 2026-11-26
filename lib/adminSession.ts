/*
 * Panel session: a cookie "<expiresAtMs>.<signature>", signed with HMAC-SHA256 over the expiry using a key derived
 * from ADMIN_USER and ADMIN_PASSWORD. Changing either one ends every open session. Web Crypto only, so the same
 * code runs in the middleware (edge) and in the login route (node).
 */

export const ADMIN_SESSION_COOKIE = "metamorfose_painel";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(expiresAt: string, user: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(`${user}\u0000${password}`), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign"
  ]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`painel:${expiresAt}`)));
}

/** Compares every character, so the response time does not tell how much of the secret matched. */
export function safeEqual(received: string, expected: string): boolean {
  const length = Math.max(received.length, expected.length);
  let difference = received.length ^ expected.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (received.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function createAdminSession(user: string, password: string, now = Date.now()): Promise<string> {
  const expiresAt = String(now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${await sign(expiresAt, user, password)}`;
}

export async function verifyAdminSession(token: string | undefined, user: string, password: string, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (extra !== undefined || !expiresAt || !signature || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= now) return false;
  return safeEqual(signature, await sign(expiresAt, user, password));
}

/** Where to go after login: only a path inside the panel, never another site or the login screen itself. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) return "/";
  return next;
}
