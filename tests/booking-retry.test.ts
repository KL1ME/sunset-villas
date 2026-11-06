import test from "node:test";
import assert from "node:assert/strict";
import { testDatabase, seedProperty } from "./support/d1.ts";
import { hashSecret } from "../lib/auth.ts";
import {
  bookingAccessToken,
  bookingResponse,
  guestBooking,
  type AccessibleBooking,
} from "../lib/booking-access.ts";
import { Problem } from "../lib/domain.ts";

const originalSecret = "offline-retry-test-fixture-original-000000000000";
const rotatedSecret = "offline-retry-test-fixture-rotated-1111111111111";
async function setup() {
  const f = testDatabase();
  seedProperty(f.sqlite);
  const id = crypto.randomUUID(),
    request_key = crypto.randomUUID(),
    token = await bookingAccessToken(originalSecret, { id, request_key });
  f.sqlite
    .prepare(
      "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,status,total,payment_status,created_at,request_key,request_fingerprint,status_token_hash) VALUES (?,'villa','2026-12-01','2026-12-04',2,'PRIVATE GUEST FIXTURE','private-guest@example.invalid','requested',34500,'unpaid','2026-11-07T10:00:00.000Z',?,'private-fingerprint-fixture',?)",
    )
    .run(id, request_key, await hashSecret(token));
  const read = () =>
    f.db
      .prepare(
        "SELECT id,request_key,status_token_hash,status,total,request_fingerprint FROM bookings WHERE id=?",
      )
      .bind(id)
      .first<AccessibleBooking>();
  return { ...f, id, token, read };
}

test("idempotent response recovery after secret rotation issues a working replacement guest token", async () => {
  const f = await setup();
  try {
    // Existing saved links stay usable until a recovery explicitly replaces it.
    assert.equal(
      (await guestBooking(f.db, rotatedSecret, f.id, f.token)).status,
      "requested",
    );
    const response = await bookingResponse(
      rotatedSecret,
      (await f.read())!,
      f.db,
    );
    assert.notEqual(response.statusToken, f.token);
    assert.equal(response.id, f.id);
    assert.equal(response.total, 34500);
    assert.equal(
      (await guestBooking(f.db, rotatedSecret, f.id, response.statusToken)).id,
      f.id,
    );
    await assert.rejects(
      () => guestBooking(f.db, rotatedSecret, f.id, f.token),
      (error) => error instanceof Problem && error.status === 404,
    );
    assert.equal(
      (await f.read())!.status_token_hash,
      await hashSecret(response.statusToken),
    );
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM bookings").get()!.n,
      1,
    );
    assert.doesNotMatch(
      JSON.stringify(response),
      /PRIVATE GUEST FIXTURE|private-guest@example.invalid|private-fingerprint-fixture/,
    );
  } finally {
    f.close();
  }
});

test("concurrent recovery responses for the same idempotent request share a valid token and preserve booking state", async () => {
  const f = await setup();
  try {
    const firstRead = (await f.read())!,
      secondRead = (await f.read())!;
    const [first, second] = await Promise.all([
      bookingResponse(rotatedSecret, firstRead, f.db),
      bookingResponse(rotatedSecret, secondRead, f.db),
    ]);
    assert.equal(first.statusToken, second.statusToken);
    assert.equal(
      (await guestBooking(f.db, rotatedSecret, f.id, first.statusToken)).status,
      "requested",
    );
    const again = await bookingResponse(rotatedSecret, (await f.read())!, f.db);
    assert.equal(again.statusToken, first.statusToken);
    const stored = f.sqlite
      .prepare(
        "SELECT status,total,payment_status,request_key,request_fingerprint FROM bookings WHERE id=?",
      )
      .get(f.id)!;
    assert.equal(stored.status, "requested");
    assert.equal(stored.total, 34500);
    assert.equal(stored.payment_status, "unpaid");
    assert.equal(stored.request_key, firstRead.request_key);
    assert.equal(stored.request_fingerprint, firstRead.request_fingerprint);
  } finally {
    f.close();
  }
});

test("recovery loses its fingerprint guard after anonymization and cannot resurrect guest access", async () => {
  const f = await setup();
  try {
    const previouslyRead = (await f.read())!;
    f.sqlite
      .prepare(
        "UPDATE bookings SET request_key=NULL,request_fingerprint=NULL,status_token_hash=NULL,email='deleted@example.invalid' WHERE id=?",
      )
      .run(f.id);
    await assert.rejects(
      () => bookingResponse(rotatedSecret, previouslyRead, f.db),
      (error) => error instanceof Problem && error.status === 409,
    );
    assert.equal((await f.read())!.status_token_hash, null);
    await assert.rejects(
      () => guestBooking(f.db, rotatedSecret, f.id, f.token),
      (error) => error instanceof Problem && error.status === 404,
    );
  } finally {
    f.close();
  }
});
