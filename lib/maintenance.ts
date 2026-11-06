import { publicSettings } from "./settings.ts";
export async function maintainBookings(db: D1Database, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const settings = await publicSettings(db),
    days = settings.privacy_retention_days;
  const statements = [
    db
      .prepare(
        "UPDATE bookings SET status='completed',updated_at=? WHERE status='confirmed' AND check_out<?",
      )
      .bind(now.toISOString(), today),
    db
      .prepare(
        "UPDATE bookings SET status='expired',updated_at=? WHERE status='requested' AND check_out<?",
      )
      .bind(now.toISOString(), today),
    db
      .prepare(
        "UPDATE bookings SET status='expired',updated_at=? WHERE status='held' AND expires_at<?",
      )
      .bind(now.toISOString(), now.toISOString()),
    db.prepare(
      "DELETE FROM occupied_nights WHERE booking_id IN (SELECT id FROM bookings WHERE status IN ('expired','cancelled','completed'))",
    ),
    db
      .prepare("DELETE FROM rate_limits WHERE expires_at<?")
      .bind(now.toISOString()),
  ];
  if (days)
    statements.push(
      db
        .prepare(
          "UPDATE bookings SET name='Διαγραμμένα στοιχεία',email='deleted@example.invalid',phone=NULL,admin_note='',status_token_hash=NULL,checkout_token_hash=NULL,request_key=NULL,request_fingerprint=NULL WHERE status IN ('expired','cancelled','completed') AND check_out<? AND email!='deleted@example.invalid'",
        )
        .bind(
          new Date(Date.parse(today) - days * 86400000)
            .toISOString()
            .slice(0, 10),
        ),
    );
  await db.batch(statements);
  await db
    .prepare(
      "INSERT INTO site_settings (key,value) VALUES ('last_maintenance',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .bind(now.toISOString())
    .run();
}
