import test from "node:test";
import assert from "node:assert/strict";
import { testDatabase, seedProperty } from "./support/d1.ts";
import {
  createAdminSession,
  verifyAdminSession,
  sessionCookie,
  readSessionCookie,
  hashSecret,
} from "../lib/auth.ts";
import {
  bookingAccessToken,
  guestBooking,
  statusLink,
  withdrawBooking,
} from "../lib/booking-access.ts";
import { publicSettings, saveSettings } from "../lib/settings.ts";
import { maintainBookings } from "../lib/maintenance.ts";
import { Problem } from "../lib/domain.ts";

// Offline fixtures only: these are not credentials for a running account.
const secret = "offline-admin-test-fixture-key-0000000000000000";
const changedSecret = "offline-rotated-fixture-key-11111111111111111";
const now = Date.parse("2026-11-07T10:00:00.000Z");
const conflict = (error: unknown) =>
  error instanceof Problem && error.status === 409;
const notFound = (error: unknown) =>
  error instanceof Problem && error.status === 404;
const invalid = (error: unknown) =>
  error instanceof Problem && error.status === 400;
function setup() {
  const fixture = testDatabase();
  seedProperty(fixture.sqlite);
  return fixture;
}
type BookingFixture = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  admin_note: string;
  request_key: string | null;
  request_fingerprint: string | null;
  status_token_hash: string | null;
  checkout_token_hash: string | null;
  expires_at: string | null;
};
function insertBooking(
  fixture: ReturnType<typeof setup>,
  overrides: Partial<BookingFixture> = {},
) {
  const row: BookingFixture = {
    id: crypto.randomUUID(),
    check_in: "2026-12-01",
    check_out: "2026-12-04",
    status: "requested",
    name: "Private Fixture Guest",
    email: "guest@fixture.example.invalid",
    phone: "+30 210 000 0000",
    admin_note: "PRIVATE HOST NOTE FIXTURE",
    request_key: crypto.randomUUID(),
    request_fingerprint: "PRIVATE REQUEST FINGERPRINT FIXTURE",
    status_token_hash: "fixture-only-status-hash",
    checkout_token_hash: "fixture-only-checkout-hash",
    expires_at: null,
    ...overrides,
  };
  fixture.sqlite
    .prepare(
      "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,phone,status,total,payment_status,created_at,updated_at,admin_note,request_key,request_fingerprint,status_token_hash,checkout_token_hash,expires_at) VALUES (?,'villa',?,?,2,?,?,?,?,34500,'unpaid','2026-01-01T10:00:00.000Z',NULL,?,?,?,?,?,?)",
    )
    .run(
      row.id,
      row.check_in,
      row.check_out,
      row.name,
      row.email,
      row.phone,
      row.status,
      row.admin_note,
      row.request_key,
      row.request_fingerprint,
      row.status_token_hash,
      row.checkout_token_hash,
      row.expires_at,
    );
  return row;
}
const realModeFixture = {
  business_name: "Fixture Guest Services",
  operator_name: "Fixture Operator",
  contact_email: "booking@sunset-fixture.example.com",
  contact_phone: "+30 210 000 0000",
  privacy_contact: "privacy@sunset-fixture.example.com",
  privacy_retention_days: 7,
  cancellation_policy:
    "Fixture-only cancellation terms for an offline test, never used for real reservations.",
  check_in: "15:00",
  check_out: "11:00",
  demo_mode: false,
};

test("admin sessions reject signature tampering, expiry, future issuance and changed secrets", async () => {
  const session = await createAdminSession(secret, now);
  assert.equal(await verifyAdminSession(session, secret, now), true);
  assert.equal(
    await verifyAdminSession(session, secret, now + 8 * 3600_000 - 1),
    true,
  );
  assert.equal(
    await verifyAdminSession(session, secret, now + 8 * 3600_000),
    false,
  );
  assert.equal(await verifyAdminSession(session, changedSecret, now), false);
  const parts = session.split(".");
  parts[1] = "00000000-0000-4000-8000-000000000000";
  assert.equal(await verifyAdminSession(parts.join("."), secret, now), false);
  const last = session.endsWith("0") ? "1" : "0";
  assert.equal(
    await verifyAdminSession(session.slice(0, -1) + last, secret, now),
    false,
  );
  assert.equal(
    await verifyAdminSession(
      await createAdminSession(secret, now + 3600_000),
      secret,
      now,
    ),
    false,
  );
  assert.equal(await verifyAdminSession("not-a-session", secret, now), false);
});

test("admin session cookies are HTTP-only, same-site and secure on HTTPS; logout expires them", () => {
  const request = new Request("https://fixture.example.com/admin");
  const cookie = sessionCookie(request, "opaque-session-fixture");
  assert.match(cookie, /; HttpOnly;/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /; Secure$/);
  assert.match(cookie, /Max-Age=28800/);
  assert.match(sessionCookie(request, "", true), /Max-Age=0/);
  assert.doesNotMatch(
    sessionCookie(new Request("http://127.0.0.1/admin"), "fixture"),
    /; Secure/,
  );
  assert.equal(
    readSessionCookie(
      new Request(request, {
        headers: {
          Cookie:
            "other=fixture; sunset_admin=opaque-session-fixture; last=value",
        },
      }),
    ),
    "opaque-session-fixture",
  );
});

test("a known booking UUID does not grant guest access; valid access returns only the public stay fields", async () => {
  const fixture = setup();
  try {
    const id = crypto.randomUUID(),
      request_key = crypto.randomUUID();
    const token = await bookingAccessToken(secret, { id, request_key });
    const row = insertBooking(fixture, {
      id,
      request_key,
      status_token_hash: await hashSecret(token),
    });
    for (const supplied of ["", "invalid", "0".repeat(64)])
      await assert.rejects(
        () => guestBooking(fixture.db, secret, id, supplied),
        notFound,
      );
    await assert.rejects(
      () => guestBooking(fixture.db, secret, crypto.randomUUID(), token),
      notFound,
    );
    const view = await guestBooking(fixture.db, secret, id, token);
    assert.equal(view.id, id);
    assert.equal(view.total, 34500);
    assert.equal(view.status, "requested");
    assert.deepEqual(
      Object.keys(view).sort(),
      [
        "id",
        "property_name",
        "check_in",
        "check_out",
        "guests",
        "status",
        "total",
        "created_at",
        "updated_at",
      ].sort(),
    );
    const text = JSON.stringify(view);
    for (const privateValue of [
      row.name,
      row.email,
      row.phone!,
      row.admin_note,
      row.request_key!,
      row.request_fingerprint!,
      row.status_token_hash!,
      row.checkout_token_hash!,
      token,
    ])
      assert.ok(
        !text.includes(privateValue),
        "Guest status output must omit private contact and access data.",
      );
    // A normal admin-key rotation does not invalidate an existing guest link.
    assert.equal(
      (await guestBooking(fixture.db, changedSecret, id, token)).id,
      id,
    );
  } finally {
    fixture.close();
  }
});

test("regenerating a guest link after an admin-key change revokes the old guest token", async () => {
  const fixture = setup();
  try {
    const row = insertBooking(fixture);
    const first = await statusLink(
      fixture.db,
      secret,
      row.id,
      "https://fixture.example.com",
    );
    const firstUrl = new URL(first.url),
      firstToken = firstUrl.hash.slice(1);
    assert.equal(firstUrl.pathname, "/booking/" + row.id);
    assert.equal(
      (await guestBooking(fixture.db, secret, row.id, firstToken)).status,
      "requested",
    );
    const next = await statusLink(
      fixture.db,
      changedSecret,
      row.id,
      "https://fixture.example.com",
    );
    const nextToken = new URL(next.url).hash.slice(1);
    assert.notEqual(firstToken, nextToken);
    await assert.rejects(
      () => guestBooking(fixture.db, changedSecret, row.id, firstToken),
      notFound,
    );
    assert.equal(
      (await guestBooking(fixture.db, changedSecret, row.id, nextToken)).id,
      row.id,
    );
    fixture.sqlite
      .prepare("UPDATE bookings SET email='deleted@example.invalid' WHERE id=?")
      .run(row.id);
    await assert.rejects(
      () =>
        statusLink(
          fixture.db,
          changedSecret,
          row.id,
          "https://fixture.example.com",
        ),
      notFound,
    );
  } finally {
    fixture.close();
  }
});

test("guests may withdraw requested bookings but cannot cancel a confirmed stay or clear its nights", async () => {
  const fixture = setup();
  try {
    const pending = insertBooking(fixture);
    await withdrawBooking(fixture.db, pending.id);
    assert.equal(
      fixture.sqlite
        .prepare("SELECT status FROM bookings WHERE id=?")
        .get(pending.id)!.status,
      "cancelled",
    );
    await assert.rejects(
      () => withdrawBooking(fixture.db, pending.id),
      conflict,
    );
    const confirmed = insertBooking(fixture, { status: "confirmed" });
    fixture.sqlite
      .prepare(
        "INSERT INTO occupied_nights (property_id,date,booking_id) VALUES ('villa','2026-12-01',?)",
      )
      .run(confirmed.id);
    await assert.rejects(
      () => withdrawBooking(fixture.db, confirmed.id),
      conflict,
    );
    assert.equal(
      fixture.sqlite
        .prepare("SELECT status FROM bookings WHERE id=?")
        .get(confirmed.id)!.status,
      "confirmed",
    );
    assert.equal(
      fixture.sqlite
        .prepare("SELECT COUNT(*) AS n FROM occupied_nights WHERE booking_id=?")
        .get(confirmed.id)!.n,
      1,
    );
  } finally {
    fixture.close();
  }
});

test("real booking mode rejects demo identity or dummy contact domains and accepts a complete offline business fixture", async () => {
  const fixture = setup();
  try {
    const initial = await publicSettings(fixture.db);
    assert.equal(initial.demo_mode, true);
    for (const changes of [
      { operator_name: initial.operator_name },
      { operator_name: "Demo Operator" },
      { contact_email: "booking@example.invalid" },
      { privacy_contact: "privacy@example.test" },
      { contact_email: "booking@example.example" },
      { privacy_retention_days: null },
      { cancellation_policy: "" },
      { privacy_retention_days: 0 },
      { cancellation_policy: initial.cancellation_policy },
      { cancellation_policy: "Demo cancellation policy" },
      { cancellation_policy: "Placeholder cancellation policy" },
      { contact_phone: "0000000000" },
      { contact_phone: "+00 (000) 000-00" },
    ])
      await assert.rejects(
        () => saveSettings(fixture.db, { ...realModeFixture, ...changes }),
        invalid,
      );
    const settings = await saveSettings(fixture.db, realModeFixture);
    assert.equal(settings.demo_mode, false);
    assert.equal(settings.booking_enabled, true);
    assert.deepEqual(settings.missing_fields, []);
    assert.equal(settings.operator_name, realModeFixture.operator_name);
    assert.equal(settings.contact_email, realModeFixture.contact_email);
    assert.equal(
      (await publicSettings(fixture.db)).cancellation_policy,
      realModeFixture.cancellation_policy,
    );
  } finally {
    fixture.close();
  }
});

test("malformed stored settings fail closed instead of enabling guest requests", async () => {
  const fixture = setup();
  try {
    fixture.sqlite
      .prepare("INSERT INTO site_settings (key,value) VALUES ('public',?)")
      .run("{broken-json");
    const settings = await publicSettings(fixture.db);
    assert.equal(settings.booking_enabled, false);
    assert.ok(settings.missing_fields.includes("settings"));
  } finally {
    fixture.close();
  }
});

test("wrong-type stored settings fail closed with safe fallback display and no unknown fields", async () => {
  const fixture = setup();
  try {
    const fallback = await publicSettings(fixture.db);
    for (const value of [
      null,
      [],
      "text",
      1,
      true,
      {},
      { ...realModeFixture, contact_email: 123 },
      { ...realModeFixture, demo_mode: "false" },
      { ...realModeFixture, privacy_retention_days: "7" },
      { ...realModeFixture, operator_name: null },
      { ...realModeFixture, cancellation_policy: [] },
      { ...realModeFixture, unknown_secret: "PRIVATE UNKNOWN FIELD" },
      { ...realModeFixture, cancellation_policy: fallback.cancellation_policy },
      { ...realModeFixture, contact_phone: "0000000000" },
    ]) {
      fixture.sqlite
        .prepare(
          "INSERT INTO site_settings (key,value) VALUES ('public',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(JSON.stringify(value));
      const result = await publicSettings(fixture.db);
      assert.equal(result.booking_enabled, false);
      assert.equal(result.demo_mode, fallback.demo_mode);
      assert.equal(result.operator_name, fallback.operator_name);
      assert.equal(result.contact_email, fallback.contact_email);
      assert.deepEqual(result.missing_fields, ["settings"]);
      assert.doesNotMatch(JSON.stringify(result), /PRIVATE UNKNOWN FIELD/);
    }
  } finally {
    fixture.close();
  }
});

test("maintenance anonymizes only terminal stays past checkout retention and preserves current, future and unresolved data", async () => {
  const fixture = setup();
  try {
    await saveSettings(fixture.db, realModeFixture);
    const future = insertBooking(fixture, { status: "confirmed" });
    const current = insertBooking(fixture, {
      status: "confirmed",
      check_in: "2026-11-05",
      check_out: "2026-11-08",
    });
    const recent = insertBooking(fixture, {
      status: "confirmed",
      check_in: "2026-11-03",
      check_out: "2026-11-06",
    });
    const boundary = insertBooking(fixture, {
      status: "cancelled",
      check_in: "2026-10-28",
      check_out: "2026-10-31",
    });
    const cancelledFuture = insertBooking(fixture, { status: "cancelled" });
    const unresolved = insertBooking(fixture, {
      status: "payment_review",
      check_in: "2026-10-20",
      check_out: "2026-10-24",
    });
    const oldCompleted = insertBooking(fixture, {
      status: "completed",
      check_in: "2026-10-20",
      check_out: "2026-10-24",
    });
    const oldConfirmed = insertBooking(fixture, {
      status: "confirmed",
      check_in: "2026-10-20",
      check_out: "2026-10-24",
    });
    const oldPending = insertBooking(fixture, {
      status: "requested",
      check_in: "2026-10-20",
      check_out: "2026-10-24",
    });
    const heldFuture = insertBooking(fixture, {
      status: "held",
      expires_at: "2026-11-07T09:00:00.000Z",
    });
    fixture.sqlite
      .prepare(
        "INSERT INTO occupied_nights (property_id,date,booking_id) VALUES ('villa','2026-12-01',?)",
      )
      .run(future.id);
    fixture.sqlite
      .prepare(
        "INSERT INTO occupied_nights (property_id,date,booking_id) VALUES ('villa','2026-10-20',?)",
      )
      .run(oldConfirmed.id);
    fixture.sqlite
      .prepare(
        "INSERT INTO occupied_nights (property_id,date,booking_id) VALUES ('villa','2026-12-02',?)",
      )
      .run(heldFuture.id);
    await maintainBookings(fixture.db, new Date(now));
    for (const row of [
      future,
      current,
      recent,
      boundary,
      cancelledFuture,
      unresolved,
      heldFuture,
    ]) {
      const stored = fixture.sqlite
        .prepare(
          "SELECT name,email,phone,admin_note,status_token_hash,request_key FROM bookings WHERE id=?",
        )
        .get(row.id)!;
      assert.equal(stored.name, row.name);
      assert.equal(stored.email, row.email);
      assert.equal(stored.phone, row.phone);
      assert.equal(stored.admin_note, row.admin_note);
      assert.equal(stored.status_token_hash, row.status_token_hash);
      assert.equal(stored.request_key, row.request_key);
    }
    for (const row of [oldCompleted, oldConfirmed, oldPending]) {
      const stored = fixture.sqlite
        .prepare("SELECT * FROM bookings WHERE id=?")
        .get(row.id)!;
      assert.equal(stored.name, "Διαγραμμένα στοιχεία");
      assert.equal(stored.email, "deleted@example.invalid");
      for (const key of [
        "phone",
        "status_token_hash",
        "checkout_token_hash",
        "request_key",
        "request_fingerprint",
      ])
        assert.equal(stored[key], null);
      assert.equal(stored.admin_note, "");
      assert.equal(stored.total, 34500);
      assert.ok(["completed", "expired"].includes(String(stored.status)));
    }
    assert.equal(
      fixture.sqlite
        .prepare("SELECT status FROM bookings WHERE id=?")
        .get(recent.id)!.status,
      "completed",
    );
    assert.equal(
      fixture.sqlite
        .prepare("SELECT status FROM bookings WHERE id=?")
        .get(heldFuture.id)!.status,
      "expired",
    );
    assert.equal(
      fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!
        .n,
      1,
    );
    assert.equal(
      fixture.sqlite.prepare("SELECT booking_id FROM occupied_nights").get()!
        .booking_id,
      future.id,
    );
    assert.equal(
      fixture.sqlite
        .prepare("SELECT value FROM site_settings WHERE key='last_maintenance'")
        .get()!.value,
      new Date(now).toISOString(),
    );
  } finally {
    fixture.close();
  }
});
