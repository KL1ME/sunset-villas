import { hashSecret, sameSecret, signValue } from "./auth.ts";
import { Problem } from "./domain.ts";

export type AccessibleBooking = {
  id: string;
  request_key: string | null;
  status_token_hash: string | null;
  status: string;
  total: number | null;
  request_fingerprint?: string | null;
  email?: string;
};
export async function bookingAccessToken(
  secret: string | undefined,
  booking: Pick<AccessibleBooking, "id" | "request_key">,
) {
  return signValue(
    secret,
    `guest-booking:${booking.id}:${booking.request_key || booking.id}`,
  );
}
export async function bookingResponse(
  secret: string | undefined,
  booking: AccessibleBooking,
  db?: D1Database,
) {
  const statusToken = await bookingAccessToken(secret, booking);
  const hash = await hashSecret(statusToken);
  if (db && booking.status_token_hash !== hash) {
    const updated = await db
      .prepare(
        "UPDATE bookings SET status_token_hash=? WHERE id=? AND request_fingerprint=?",
      )
      .bind(hash, booking.id, booking.request_fingerprint || null)
      .run();
    if (!updated.meta.changes)
      throw new Problem(
        409,
        "Το αίτημα άλλαξε και η ιδιωτική πρόσβαση δεν ανανεώθηκε. Δοκιμάστε ξανά.",
      );
  }
  return {
    id: booking.id,
    status: booking.status,
    total: booking.total,
    statusToken,
    statusUrl: "/booking/" + booking.id,
  };
}
export async function guestBooking(
  db: D1Database,
  secret: string | undefined,
  id: string,
  token: string,
) {
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(token))
    throw new Problem(
      404,
      "Το ιδιωτικό αίτημα δεν βρέθηκε ή ο σύνδεσμος δεν ισχύει.",
    );
  const booking = await db
    .prepare(
      "SELECT bookings.id,request_key,status_token_hash,bookings.status,total,check_in,check_out,guests,bookings.created_at,updated_at,properties.name AS property_name FROM bookings JOIN properties ON properties.id=bookings.property_id WHERE bookings.id=?",
    )
    .bind(id)
    .first<
      AccessibleBooking & {
        check_in: string;
        check_out: string;
        guests: number;
        created_at: string;
        updated_at: string | null;
        property_name: string;
      }
    >();
  if (
    !booking?.status_token_hash ||
    !(await sameSecret(await hashSecret(token), booking.status_token_hash))
  )
    throw new Problem(
      404,
      "Το ιδιωτικό αίτημα δεν βρέθηκε ή ο σύνδεσμος δεν ισχύει.",
    );
  // The stored hash remains authoritative even after an admin credential change.
  return {
    id: booking.id,
    property_name: booking.property_name,
    check_in: booking.check_in,
    check_out: booking.check_out,
    guests: booking.guests,
    status: booking.status,
    total: booking.total,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
  };
}
export async function statusLink(
  db: D1Database,
  secret: string | undefined,
  id: string,
  origin: string,
) {
  const booking = await db
    .prepare(
      "SELECT id,request_key,status_token_hash,status,total,email FROM bookings WHERE id=?",
    )
    .bind(id)
    .first<AccessibleBooking>();
  if (!booking || booking.email === "deleted@example.invalid")
    throw new Problem(404, "Το αίτημα δεν είναι διαθέσιμο.");
  const token = await bookingAccessToken(secret, booking);
  await db
    .prepare("UPDATE bookings SET status_token_hash=? WHERE id=?")
    .bind(await hashSecret(token), id)
    .run();
  return { url: origin + "/booking/" + id + "#" + token };
}
export async function withdrawBooking(db: D1Database, id: string) {
  const result = await db
    .prepare(
      "UPDATE bookings SET status='cancelled',updated_at=? WHERE id=? AND status='requested' AND payment_status='unpaid'",
    )
    .bind(new Date().toISOString(), id)
    .run();
  if (!result.meta.changes)
    throw new Problem(
      409,
      "Μπορείτε να αποσύρετε μόνο ένα εκκρεμές αίτημα. Για επιβεβαιωμένη κράτηση επικοινωνήστε με τον οικοδεσπότη.",
    );
  return { ok: true };
}
