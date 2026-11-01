import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  dateOnly,
  nightsBetween,
  validateStay,
  quote,
  todayAthens,
  parseCalendar,
  calendarUrl,
  exportCalendar,
} from "../lib/domain.ts";
import { verifyStripeSignature } from "../lib/payments.ts";
const property = { max_guests: 6, min_nights: 2 },
  now = new Date("2026-11-01T10:00:00Z");
test("date validation rejects impossible dates and accepts leap days", () => {
  for (const d of [
    "2026-02-30",
    "2026-13-01",
    "2026-00-01",
    "not-a-date",
    "2026-01-32",
  ])
    assert.throws(() => dateOnly(d));
  assert.equal(dateOnly("2028-02-29"), "2028-02-29");
});
test("stay nights exclude checkout and ignore DST clock changes", () => {
  assert.deepEqual(nightsBetween("2026-10-24", "2026-10-27"), [
    "2026-10-24",
    "2026-10-25",
    "2026-10-26",
  ]);
  assert.throws(() => nightsBetween("2026-12-02", "2026-12-01"));
  assert.throws(() => nightsBetween("2026-12-01", "2027-03-01"));
});
test("stay enforces capacity, past dates and minimum stay", () => {
  const input = { checkIn: "2026-12-01", checkOut: "2026-12-04", guests: 6 };
  assert.equal(validateStay(input, property, now).nights.length, 3);
  for (const bad of [
    { ...input, guests: 7 },
    { ...input, guests: 1.5 },
    { ...input, checkIn: "2026-10-01" },
    { ...input, checkOut: "2026-12-02" },
  ])
    assert.throws(() => validateStay(bad, property, now));
});
test("Athens date boundary and integer cent quote are server controlled", () => {
  assert.equal(todayAthens(new Date("2026-11-01T22:30:00Z")), "2026-11-02");
  assert.equal(quote(3, 15001, 4000), 49003);
  assert.equal(quote(3, null, 4000), null);
});
test("iCal import skips cancellations and never needs guest data", () => {
  const events = parseCalendar(
    readFileSync(
      new URL("./fixtures/availability.ics", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(events, [
    { uid: "airbnb-reservation-1", start: "2026-12-01", end: "2026-12-04" },
  ]);
});
test("iCal rejects partial, recurrent, timed and duplicate events rather than opening nights", () => {
  const wrap = (event: string) => `BEGIN:VCALENDAR\n${event}\nEND:VCALENDAR`;
  for (const text of [
    "BEGIN:VCALENDAR",
    wrap("BEGIN:VEVENT\nUID:broken"),
    wrap(
      "BEGIN:VEVENT\nUID:x\nDTSTART;VALUE=DATE:20261201\nDTEND;VALUE=DATE:20261204\nRRULE:FREQ=DAILY\nEND:VEVENT",
    ),
    wrap(
      "BEGIN:VEVENT\nUID:x\nDTSTART:20261201T000000Z\nDTEND:20261204T000000Z\nEND:VEVENT",
    ),
  ])
    assert.throws(() => parseCalendar(text));
  const duplicate = readFileSync(
    new URL("./fixtures/availability.ics", import.meta.url),
    "utf8",
  )
    .replace("UID:cancelled-reservation", "UID:airbnb-reservation-1")
    .replace("STATUS:CANCELLED", "STATUS:CONFIRMED");
  assert.throws(() => parseCalendar(duplicate));
});
test("calendar URLs reject SSRF targets, credentials and deceptive hostnames", () => {
  assert.equal(
    new URL(
      calendarUrl(
        "https://www.airbnb.com/calendar/ical/123.ics?s=private",
        "airbnb",
      ),
    ).hostname,
    "www.airbnb.com",
  );
  assert.equal(
    new URL(calendarUrl("https://admin.booking.com/hotel/hoteladmin/ical.html?t=fixture-only", "booking")).hostname,
    "admin.booking.com",
  );
  for (const url of [
    "http://www.airbnb.com/calendar/ical/a.ics",
    "https://127.0.0.1/calendar/ical/a.ics",
    "https://www.airbnb.com.evil.example/calendar/ical/a.ics",
    "https://user:secret@www.airbnb.com/calendar/ical/a.ics",
    "https://admin.booking.com:8443/calendar/a.ics",
  ])
    assert.throws(() => calendarUrl(url, "airbnb"));
});
test("calendar export has exclusive checkout dates and no personal data", () => {
  const text = exportCalendar(
    [{ id: "booking-1", check_in: "2026-12-01", check_out: "2026-12-04" }],
    now,
  );
  assert.match(text, /DTEND;VALUE=DATE:20261204/);
  assert.match(text, /SUMMARY:Reserved/);
  assert.doesNotMatch(text, /EMAIL|ATTENDEE|PHONE/);
  assert.deepEqual(parseCalendar(text), [
    { uid: "booking-1@sunset-villas", start: "2026-12-01", end: "2026-12-04" },
  ]);
});
test("Stripe HMAC checks raw body, timestamp, and key; supports rotated signatures", async () => {
  const raw = JSON.stringify({ id: "evt_test", livemode: false }),
    timestamp = String(Math.floor(now.getTime() / 1000)),
    secret = "whsec_unit_test_fixture_only";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(timestamp + "." + raw),
    ),
    hex = Array.from(new Uint8Array(hash), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  const sig = `t=${timestamp},v1=${"0".repeat(64)},v1=${hex}`;
  await verifyStripeSignature(raw, sig, secret, now.getTime());
  await assert.rejects(() =>
    verifyStripeSignature(raw + " ", sig, secret, now.getTime()),
  );
  await assert.rejects(() =>
    verifyStripeSignature(raw, sig, "wrong-secret", now.getTime()),
  );
  await assert.rejects(() =>
    verifyStripeSignature(raw, sig, secret, now.getTime() + 301000),
  );
});
