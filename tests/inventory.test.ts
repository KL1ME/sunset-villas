import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(
      readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8"),
    );
  db.prepare(
    "INSERT INTO properties (id,slug,name,location,description,max_guests,bedrooms,export_token,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(
    "villa",
    "villa",
    "Test villa",
    "Test",
    "Fixture",
    6,
    2,
    "test-token",
    "2026-11-01",
  );
  return db;
}
function booking(db: DatabaseSync, id: string, start: string, end: string) {
  db.prepare(
    "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    "villa",
    start,
    end,
    2,
    "Fixture",
    "fixture@example.invalid",
    "requested",
    "2026-11-01",
  );
}
function claim(db: DatabaseSync, id: string, dates: string[]) {
  db.exec("BEGIN");
  try {
    db.prepare(
      "UPDATE bookings SET status='confirmed' WHERE id=? AND status='requested'",
    ).run(id);
    for (const date of dates)
      db.prepare(
        "INSERT INTO occupied_nights (property_id,date,booking_id) SELECT property_id,?,id FROM bookings WHERE id=? AND status='confirmed'",
      ).run(date, id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
test("overlapping confirmations roll back every night and status for the losing booking", () => {
  const db = setup();
  booking(db, "first", "2026-12-01", "2026-12-04");
  booking(db, "second", "2026-12-03", "2026-12-06");
  claim(db, "first", ["2026-12-01", "2026-12-02", "2026-12-03"]);
  assert.throws(
    () => claim(db, "second", ["2026-12-04", "2026-12-03", "2026-12-05"]),
    /UNIQUE/,
  );
  assert.equal(
    db.prepare("SELECT status FROM bookings WHERE id=?").get("second")!.status,
    "requested",
  );
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS n FROM occupied_nights WHERE booking_id=?")
      .get("second")!.n,
    0,
  );
  db.close();
});
test("checkout day can be another booking arrival and cancellation frees inventory", () => {
  const db = setup();
  booking(db, "first", "2026-12-01", "2026-12-03");
  booking(db, "next", "2026-12-03", "2026-12-04");
  claim(db, "first", ["2026-12-01", "2026-12-02"]);
  claim(db, "next", ["2026-12-03"]);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
    3,
  );
  db.exec(
    "BEGIN;UPDATE bookings SET status='cancelled' WHERE id='first';DELETE FROM occupied_nights WHERE booking_id='first';COMMIT;",
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
    1,
  );
  db.close();
});
test("late paid webhook cannot confirm an expired hold whose nights were freed", () => {
  const db = setup();
  booking(db, "late", "2026-12-01", "2026-12-03");
  db.exec(
    "UPDATE bookings SET status='expired',expires_at='2026-11-01T12:00:00.000Z' WHERE id='late'",
  );
  db.prepare(
    "UPDATE bookings SET status=CASE WHEN status='held' AND expires_at>=? AND (SELECT COUNT(*) FROM occupied_nights WHERE booking_id=bookings.id)=? THEN 'confirmed' WHEN status='confirmed' THEN 'confirmed' ELSE 'payment_review' END,payment_status='paid' WHERE id=?",
  ).run("2026-11-01T13:00:00.000Z", 2, "late");
  const b = db
    .prepare("SELECT status,payment_status FROM bookings WHERE id=?")
    .get("late")!;
  assert.equal(b.status, "payment_review");
  assert.equal(b.payment_status, "paid");
  db.close();
});
