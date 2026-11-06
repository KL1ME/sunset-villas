import test from "node:test";
import assert from "node:assert/strict";
import { testDatabase, seedProperty } from "./support/d1.ts";
import { reserveInventory, type InventoryStay } from "../lib/inventory.ts";
import { Problem } from "../lib/domain.ts";

const timestamps = { now: "2026-11-07T10:00:00.000Z", expiresAt: null };
const heldTimes = {
  now: timestamps.now,
  expiresAt: "2026-11-07T10:35:00.000Z",
};
function setup() {
  const f = testDatabase();
  seedProperty(f.sqlite);
  // D1 serializes batch transactions. The lightweight shared SQLite adapter
  // needs the same scheduling when callers invoke batches concurrently.
  const raw = f.db;
  let pending: Promise<unknown> = Promise.resolve();
  f.db = {
    prepare: raw.prepare.bind(raw),
    batch: (statements: D1PreparedStatement[]) => {
      const next = pending.then(() => raw.batch(statements));
      pending = next.catch(() => undefined);
      return next;
    },
  } as unknown as D1Database;
  return f;
}
function booking(
  f: ReturnType<typeof setup>,
  id: string,
  start = "2026-12-01",
  end = "2026-12-04",
): InventoryStay {
  f.sqlite
    .prepare(
      "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      "villa",
      start,
      end,
      2,
      "Fixture",
      "fixture@example.invalid",
      "requested",
      timestamps.now,
    );
  return { id, property_id: "villa", check_in: start, check_out: end };
}
function conflict(error: unknown) {
  return error instanceof Problem && error.status === 409;
}

test("competing overlapping bookings have one winner with no losing status or nights", async () => {
  const f = setup();
  try {
    const first = booking(f, "first"),
      second = booking(f, "second", "2026-12-03", "2026-12-06");
    const results = await Promise.allSettled([
      reserveInventory(f.db, first, "confirmed", timestamps),
      reserveInventory(f.db, second, "confirmed", timestamps),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.find((r) => r.status === "rejected");
    assert.ok(rejected?.status === "rejected" && conflict(rejected.reason));
    assert.deepEqual(
      f.sqlite
        .prepare("SELECT id,status FROM bookings ORDER BY id")
        .all()
        .map((r) => ({ ...r })),
      [
        { id: "first", status: "confirmed" },
        { id: "second", status: "requested" },
      ],
    );
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      3,
    );
  } finally {
    f.close();
  }
});

test("same-booking concurrent confirmations return exactly one success", async () => {
  const f = setup();
  try {
    const b = booking(f, "same");
    const results = await Promise.allSettled([
      reserveInventory(f.db, b, "confirmed", timestamps),
      reserveInventory(f.db, b, "confirmed", timestamps),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.find((r) => r.status === "rejected");
    assert.ok(rejected?.status === "rejected" && conflict(rejected.reason));
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      3,
    );
  } finally {
    f.close();
  }
});

for (const source of ["manual", "airbnb", "booking"] as const) {
  test(`${source} occupancy appearing after preflight prevents the atomic claim`, async () => {
    const f = setup();
    try {
      const b = booking(f, "late-" + source);
      let injected = false;
      const db = {
        prepare: f.db.prepare.bind(f.db),
        batch: async (statements: D1PreparedStatement[]) => {
          assert.equal(injected, false);
          injected = true;
          if (source === "manual")
            f.sqlite
              .prepare(
                "INSERT INTO calendar_blocks (id,property_id,start,end,note,created_at) VALUES ('closure','villa','2026-12-02','2026-12-03','Fixture',?)",
              )
              .run(timestamps.now);
          else {
            f.sqlite
              .prepare(
                "INSERT INTO calendar_feeds (id,property_id,provider,url) VALUES ('feed','villa',?,?)",
              )
              .run(source, "https://example.invalid/fixture-only.ics");
            f.sqlite
              .prepare(
                "INSERT INTO calendar_events (id,feed_id,uid,start,end) VALUES ('event','feed','fixture','2026-12-02','2026-12-03')",
              )
              .run();
          }
          return f.db.batch(statements);
        },
      } as unknown as D1Database;
      await assert.rejects(
        () => reserveInventory(db, b, "confirmed", timestamps),
        conflict,
      );
      assert.equal(injected, true);
      assert.equal(
        f.sqlite.prepare("SELECT status FROM bookings WHERE id=?").get(b.id)!
          .status,
        "requested",
      );
      assert.equal(
        f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
        0,
      );
    } finally {
      f.close();
    }
  });
}

test("cancellation between preflight and claim stays cancelled", async () => {
  const f = setup();
  try {
    const b = booking(f, "cancelled");
    f.sqlite
      .prepare("UPDATE bookings SET status='cancelled' WHERE id=?")
      .run(b.id);
    await assert.rejects(
      () => reserveInventory(f.db, b, "confirmed", timestamps),
      conflict,
    );
    assert.equal(
      f.sqlite.prepare("SELECT status FROM bookings WHERE id=?").get(b.id)!
        .status,
      "cancelled",
    );
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});

test("checkout boundaries and released manual closures leave adjacent arrivals open", async () => {
  const f = setup();
  try {
    const first = booking(f, "first", "2026-12-01", "2026-12-03"),
      next = booking(f, "next", "2026-12-03", "2026-12-04");
    f.sqlite
      .prepare(
        "INSERT INTO calendar_blocks (id,property_id,start,end,note,created_at,released_at) VALUES ('released','villa','2026-12-03','2026-12-04','Fixture',?,?)",
      )
      .run(timestamps.now, timestamps.now);
    await reserveInventory(f.db, first, "confirmed", timestamps);
    await reserveInventory(f.db, next, "held", heldTimes);
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      3,
    );
    assert.equal(
      f.sqlite.prepare("SELECT expires_at FROM bookings WHERE id='next'").get()!
        .expires_at,
      heldTimes.expiresAt,
    );
  } finally {
    f.close();
  }
});

test("a 60-night stay uses two SQL statements and claims every night", async () => {
  const f = setup();
  try {
    const b = booking(f, "long", "2026-12-01", "2027-01-30");
    let batchLength = 0;
    const db = {
      prepare: f.db.prepare.bind(f.db),
      batch: async (statements: D1PreparedStatement[]) => {
        batchLength = statements.length;
        return f.db.batch(statements);
      },
    } as unknown as D1Database;
    await reserveInventory(db, b, "confirmed", timestamps);
    assert.equal(batchLength, 2);
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      60,
    );
  } finally {
    f.close();
  }
});

test("stale stay details cannot claim a different property or set of dates", async () => {
  const f = setup();
  try {
    const b = booking(f, "stale");
    await assert.rejects(
      () =>
        reserveInventory(
          f.db,
          { ...b, check_out: "2026-12-05" },
          "confirmed",
          timestamps,
        ),
      conflict,
    );
    assert.equal(
      f.sqlite.prepare("SELECT status FROM bookings WHERE id=?").get(b.id)!
        .status,
      "requested",
    );
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});

test("a quote changed after preflight cannot be confirmed until the new total is reviewed", async () => {
  const f = setup();
  try {
    const b = { ...booking(f, "repriced"), total: 10000 };
    f.sqlite.prepare("UPDATE bookings SET total=10000 WHERE id=?").run(b.id);
    const db = {
      prepare: f.db.prepare.bind(f.db),
      batch: async (statements: D1PreparedStatement[]) => {
        f.sqlite
          .prepare("UPDATE bookings SET total=20000 WHERE id=?")
          .run(b.id);
        return f.db.batch(statements);
      },
    } as unknown as D1Database;
    await assert.rejects(
      () => reserveInventory(db, b, "confirmed", timestamps),
      conflict,
    );
    const unchanged = f.sqlite
      .prepare("SELECT status,total FROM bookings WHERE id=?")
      .get(b.id)!;
    assert.equal(unchanged.status, "requested");
    assert.equal(unchanged.total, 20000);
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      0,
    );
    await reserveInventory(
      f.db,
      { ...b, total: 20000 },
      "confirmed",
      timestamps,
    );
    assert.equal(
      f.sqlite.prepare("SELECT status FROM bookings WHERE id=?").get(b.id)!
        .status,
      "confirmed",
    );
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM occupied_nights").get()!.n,
      3,
    );
  } finally {
    f.close();
  }
});

// Retain the existing payment-state regression while payment integration is
// excluded from this task. This does not call a provider or enable checkout.
test("late paid webhook cannot confirm an expired hold whose nights were freed", () => {
  const f = setup();
  try {
    booking(f, "late", "2026-12-01", "2026-12-03");
    f.sqlite.exec(
      "UPDATE bookings SET status='expired',expires_at='2026-11-01T12:00:00.000Z' WHERE id='late'",
    );
    f.sqlite
      .prepare(
        "UPDATE bookings SET status=CASE WHEN status='held' AND expires_at>=? AND (SELECT COUNT(*) FROM occupied_nights WHERE booking_id=bookings.id)=? THEN 'confirmed' WHEN status='confirmed' THEN 'confirmed' ELSE 'payment_review' END,payment_status='paid' WHERE id=?",
      )
      .run("2026-11-01T13:00:00.000Z", 2, "late");
    const row = f.sqlite
      .prepare("SELECT status,payment_status FROM bookings WHERE id='late'")
      .get()!;
    assert.equal(row.status, "payment_review");
    assert.equal(row.payment_status, "paid");
  } finally {
    f.close();
  }
});
