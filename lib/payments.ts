import { Problem } from "./domain.ts";
export async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
  now = Date.now(),
) {
  const parts = signature.split(",").map((p) => p.split("=")),
    timestamp = parts.find(([key]) => key === "t")?.[1],
    signatures = parts
      .filter(([key]) => key === "v1")
      .map(([, value]) => value);
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    throw new Problem(400, "Μη έγκυρη υπογραφή πληρωμής.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  for (const hex of signatures) {
    if (!/^[a-f0-9]{64}$/i.test(hex)) continue;
    const bytes = Uint8Array.from(hex.match(/../g)!, (b) => parseInt(b, 16));
    if (
      await crypto.subtle.verify(
        "HMAC",
        key,
        bytes,
        new TextEncoder().encode(timestamp + "." + payload),
      )
    )
      return;
  }
  throw new Problem(400, "Μη έγκυρη υπογραφή πληρωμής.");
}
