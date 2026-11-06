import { nightsBetween, Problem } from "./domain.ts";

export type InventoryStay = {
  id: string;
  property_id: string;
  check_in: string;
  check_out: string;
  total?: number | null;
};

/** Claim this site's nights only if the pending request is still available. */
export async function reserveInventory(
  db: D1Database,
  booking: InventoryStay,
  status: "confirmed" | "held",
  timestamps: { now: string; expiresAt: string | null },
) {
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const now = Date.parse(timestamps.now);
  const expires = timestamps.expiresAt && Date.parse(timestamps.expiresAt);
  if (
    !Number.isFinite(now) ||
    !["confirmed", "held"].includes(status) ||
    (status === "held" &&
      (!expires || !Number.isFinite(expires) || expires <= now)) ||
    (status === "confirmed" && timestamps.expiresAt !== null)
  )
    throw new Problem(400, "Μη έγκυρη προσωρινή δέσμευση.");

  // D1 batch is a transaction. Recheck every local source inside the guarded
  // transition, because calendars/manual blocks can change after preflight.
  // changes() is the preceding UPDATE's row count on this transaction's SQLite
  // connection. It gates all inserts, including a repeated request for the same
  // booking, without a SQL statement per night or an intermediate stored state.
  let results: D1Result[];
  try {
    results = await db.batch([
      db
        .prepare(
          `UPDATE bookings SET status=?,expires_at=?,updated_at=?
           WHERE id=? AND status='requested' AND property_id=? AND check_in=? AND check_out=?
           AND (?=0 OR total IS ?)
           AND NOT EXISTS (
             SELECT 1 FROM occupied_nights n WHERE n.property_id=bookings.property_id
             AND n.date>=bookings.check_in AND n.date<bookings.check_out
           )
           AND NOT EXISTS (
             SELECT 1 FROM calendar_blocks m WHERE m.property_id=bookings.property_id
             AND m.released_at IS NULL AND m.start<bookings.check_out AND m.end>bookings.check_in
           )
           AND NOT EXISTS (
             SELECT 1 FROM calendar_events e JOIN calendar_feeds f ON f.id=e.feed_id
             WHERE f.property_id=bookings.property_id AND f.enabled=1
             AND e.start<bookings.check_out AND e.end>bookings.check_in
           )`,
        )
        .bind(
          status,
          status === "held" ? new Date(expires as number).toISOString() : null,
          timestamps.now,
          booking.id,
          booking.property_id,
          booking.check_in,
          booking.check_out,
          booking.total === undefined ? 0 : 1,
          booking.total === undefined ? null : booking.total,
        ),
      db
        .prepare(
          `INSERT INTO occupied_nights (property_id,date,booking_id)
           SELECT b.property_id,j.value,b.id FROM bookings b,json_each(?) j
           WHERE changes()=1 AND b.id=? AND b.status=? AND b.property_id=? AND b.check_in=? AND b.check_out=?`,
        )
        .bind(
          JSON.stringify(nights),
          booking.id,
          status,
          booking.property_id,
          booking.check_in,
          booking.check_out,
        ),
    ]);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed: occupied_nights")
    )
      throw new Problem(409, "Οι ημερομηνίες δεσμεύτηκαν από άλλη κράτηση.");
    throw error;
  }
  if (results[0].meta.changes !== 1)
    throw new Problem(
      409,
      "Η κατάσταση ή η διαθεσιμότητα άλλαξε. Ανανεώστε τη σελίδα.",
    );
  if (results[1].meta.changes !== nights.length)
    throw new Error("Reservation inventory count did not match the stay.");
}
