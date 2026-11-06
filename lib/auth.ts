import { Problem } from "./domain.ts";

export async function hashSecret(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function sameSecret(a: string, b: string) {
  const first = await hashSecret(a),
    second = await hashSecret(b);
  let difference = 0;
  for (let i = 0; i < first.length; i++)
    difference |= first.charCodeAt(i) ^ second.charCodeAt(i);
  return difference === 0;
}
export async function signValue(secret: string | undefined, value: string) {
  if (!secret || secret.length < 32)
    throw new Problem(503, "Η ασφαλής πρόσβαση χρειάζεται ρύθμιση.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function createAdminSession(secret: string, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + 8 * 3600}.${crypto.randomUUID()}`;
  return payload + "." + (await signValue(secret, "admin-session:" + payload));
}
export async function verifyAdminSession(
  value: string,
  secret: string,
  now = Date.now(),
) {
  const match = /^(\d{10})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (expiry <= now / 1000 || expiry > now / 1000 + 8 * 3600 + 60) return false;
  return sameSecret(
    match[3],
    await signValue(secret, `admin-session:${match[1]}.${match[2]}`),
  );
}
export function sessionCookie(request: Request, value: string, remove = false) {
  return `sunset_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove ? 0 : 8 * 3600}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function readSessionCookie(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("sunset_admin="))
      ?.slice("sunset_admin=".length) || ""
  );
}
