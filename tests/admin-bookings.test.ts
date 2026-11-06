import test from "node:test";
import assert from "node:assert/strict";
import { testDatabase, seedProperty } from "./support/d1.ts";
import {
  listAdminBookings,
  saveBookingQuote,
  saveBookingNote,
} from "../lib/admin-bookings.ts";
import { Problem } from "../lib/domain.ts";

function setup() {
  const f = testDatabase();
  seedProperty(f.sqlite);
  seedProperty(f.sqlite, "other");
  f.sqlite
    .prepare("UPDATE properties SET name='Second property' WHERE id='other'")
    .run();
  return f;
}
function insert(
  f: ReturnType<typeof setup>,
  id: string,
  options: Partial<{
    property: string;
    name: string;
    email: string;
    status: string;
    payment: string;
    created: string;
  }> = {},
) {
  f.sqlite
    .prepare(
      "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,status,payment_status,total,created_at,status_token_hash,request_key,request_fingerprint,checkout_token_hash,stripe_session) VALUES (?,?,'2026-12-01','2026-12-04',2,?,?,?,?,1000,?,?,?,?,?,?)",
    )
    .run(
      id,
      options.property || "villa",
      options.name || "Guest " + id,
      options.email || id + "@example.invalid",
      options.status || "requested",
      options.payment || "unpaid",
      options.created || "2026-11-07T10:00:00.000Z",
      "PRIVATE-STATUS-" + id,
      "PRIVATE-REQUEST-" + id,
      "PRIVATE-FINGERPRINT-" + id,
      "PRIVATE-CHECKOUT-" + id,
      "PRIVATE-SESSION-" + id,
    );
}
const failure = (status: number) => (error: unknown) =>
  error instanceof Problem && error.status === status;

test("pagination and status filters retain pending requests older than the latest 200", async () => {
  const f = setup();
  try {
    insert(f, "old-pending", { created: "2026-01-01T00:00:00.000Z" });
    for (let i = 0; i < 250; i++)
      insert(f, "new-" + String(i).padStart(3, "0"), { status: "confirmed" });
    const first = await listAdminBookings(f.db, new URLSearchParams());
    assert.deepEqual(first.pagination, {
      page: 1,
      pageSize: 25,
      total: 251,
      pages: 11,
    });
    assert.equal(first.bookings.length, 25);
    assert.deepEqual(first.stats, { requested: 1, confirmed: 250 });
    const last = await listAdminBookings(
      f.db,
      new URLSearchParams({ page: "11" }),
    );
    assert.equal(last.bookings.at(-1)?.id, "old-pending");
    const pending = await listAdminBookings(
      f.db,
      new URLSearchParams({ status: "requested" }),
    );
    assert.equal(pending.bookings[0].id, "old-pending");
    assert.equal(pending.pagination.total, 1);
    assert.deepEqual(pending.stats, first.stats);
  } finally {
    f.close();
  }
});

test("pagination reaches records beyond page 100 instead of hiding older requests", async () => {
  const f = setup();
  try {
    for (let i = 0; i < 2501; i++)
      insert(f, "archive-" + String(i).padStart(4, "0"));
    const result = await listAdminBookings(
      f.db,
      new URLSearchParams({ page: "101" }),
    );
    assert.deepEqual(result.pagination, {
      page: 101,
      pageSize: 25,
      total: 2501,
      pages: 101,
    });
    assert.deepEqual(
      result.bookings.map((row) => row.id),
      ["archive-0000"],
    );
  } finally {
    f.close();
  }
});

test("ordering is stable and property/status/search filters combine with bound values", async () => {
  const f = setup();
  try {
    insert(f, "tie-a");
    insert(f, "tie-z");
    insert(f, "match", {
      property: "other",
      name: "Unique guest",
      status: "completed",
    });
    const all = await listAdminBookings(f.db, new URLSearchParams());
    assert.deepEqual(
      all.bookings.map((b) => b.id),
      ["tie-z", "tie-a", "match"],
    );
    const filtered = await listAdminBookings(
      f.db,
      new URLSearchParams({
        propertyId: "other",
        status: "completed",
        search: "Unique",
      }),
    );
    assert.deepEqual(
      filtered.bookings.map((b) => b.id),
      ["match"],
    );
    const propertyName = await listAdminBookings(
      f.db,
      new URLSearchParams({ search: "Second property" }),
    );
    assert.deepEqual(
      propertyName.bookings.map((b) => b.id),
      ["match"],
    );
    const email = await listAdminBookings(
      f.db,
      new URLSearchParams({ search: "tie-a@example.invalid" }),
    );
    assert.deepEqual(
      email.bookings.map((b) => b.id),
      ["tie-a"],
    );
  } finally {
    f.close();
  }
});

test("search treats percent, underscore and backslash as literals, including injection-like strings", async () => {
  const f = setup();
  try {
    insert(f, "literal", { name: "Guest 50%_\\owner" });
    insert(f, "decoy", { name: "Guest 50anythingowner" });
    const result = await listAdminBookings(
      f.db,
      new URLSearchParams({ search: "50%_\\" }),
    );
    assert.deepEqual(
      result.bookings.map((b) => b.id),
      ["literal"],
    );
    const injection = await listAdminBookings(
      f.db,
      new URLSearchParams({ search: "' OR 1=1 --" }),
    );
    assert.equal(injection.pagination.total, 0);
    assert.equal(injection.bookings.length, 0);
  } finally {
    f.close();
  }
});

test("admin list exposes explicit useful fields without secret tokens, fingerprints or provider sessions", async () => {
  const f = setup();
  try {
    insert(f, "private");
    await saveBookingNote(f.db, "private", "Private owner note");
    const result = await listAdminBookings(f.db, new URLSearchParams());
    const row = result.bookings[0];
    assert.equal(row.admin_note, "Private owner note");
    assert.ok(row.created_at && row.updated_at);
    assert.equal(row.property_name, "Test villa");
    assert.doesNotMatch(
      JSON.stringify(result),
      /PRIVATE-STATUS|PRIVATE-REQUEST|PRIVATE-FINGERPRINT|PRIVATE-CHECKOUT|PRIVATE-SESSION/,
    );
    for (const key of [
      "status_token_hash",
      "request_key",
      "request_fingerprint",
      "checkout_token_hash",
      "stripe_session",
    ])
      assert.equal(key in row, false);
  } finally {
    f.close();
  }
});

test("pagination clamps to the last available page and empty stats are numeric zero", async () => {
  const f = setup();
  try {
    const empty = await listAdminBookings(
      f.db,
      new URLSearchParams({ page: "99" }),
    );
    assert.deepEqual(empty.pagination, {
      page: 1,
      pageSize: 25,
      total: 0,
      pages: 1,
    });
    assert.deepEqual(empty.stats, { requested: 0, confirmed: 0 });
    insert(f, "one");
    assert.equal(
      (
        await listAdminBookings(
          f.db,
          new URLSearchParams({ page: "99", pageSize: "100" }),
        )
      ).pagination.page,
      1,
    );
    const invalidParams: Record<string, string>[] = [
      { page: "0" },
      { page: "1000001" },
      { page: "1.5" },
      { page: "NaN" },
      { pageSize: "0" },
      { pageSize: "101" },
      { pageSize: "-1" },
      { status: "unknown" },
      { propertyId: "x".repeat(101) },
      { search: "x".repeat(121) },
    ];
    for (const params of invalidParams)
      await assert.rejects(
        () => listAdminBookings(f.db, new URLSearchParams(params)),
        failure(400),
      );
  } finally {
    f.close();
  }
});

test("quotes parse euro decimals into exact cents and timestamp the pending unpaid request", async () => {
  const f = setup();
  try {
    insert(f, "quote");
    for (const [value, cents] of [
      ["1", 100],
      [1.1, 110],
      ["12.34", 1234],
      ["12,34", 1234],
      ["600000.00", 60000000],
    ] as const) {
      assert.deepEqual(await saveBookingQuote(f.db, "quote", value), {
        ok: true,
        total: cents,
      });
      const row = f.sqlite
        .prepare(
          "SELECT total,updated_at,created_at FROM bookings WHERE id='quote'",
        )
        .get()!;
      assert.equal(row.total, cents);
      assert.match(String(row.updated_at), /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(row.created_at, "2026-11-07T10:00:00.000Z");
    }
  } finally {
    f.close();
  }
});

test("invalid, free, oversized and fractional-cent quotes are rejected without mutating the request", async () => {
  const f = setup();
  try {
    insert(f, "quote");
    for (const value of [
      "",
      " ",
      0,
      "0",
      "0.99",
      -1,
      null,
      undefined,
      NaN,
      Infinity,
      "1e3",
      "1.001",
      "1,000.00",
      "+12",
      600000.01,
      {},
      [],
      true,
    ])
      await assert.rejects(
        () => saveBookingQuote(f.db, "quote", value),
        failure(400),
      );
    const row = f.sqlite
      .prepare("SELECT total,updated_at FROM bookings WHERE id='quote'")
      .get()!;
    assert.equal(row.total, 1000);
    assert.equal(row.updated_at, null);
  } finally {
    f.close();
  }
});

test("quote updates cannot change terminal, held or paid requests", async () => {
  const f = setup();
  try {
    for (const status of [
      "held",
      "confirmed",
      "cancelled",
      "expired",
      "payment_review",
      "completed",
    ]) {
      insert(f, status, { status });
      await assert.rejects(
        () => saveBookingQuote(f.db, status, "500"),
        failure(409),
      );
    }
    insert(f, "paid", { payment: "paid" });
    await assert.rejects(
      () => saveBookingQuote(f.db, "paid", "500"),
      failure(409),
    );
    assert.equal(
      f.sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM bookings WHERE total<>1000 OR updated_at IS NOT NULL",
        )
        .get()!.n,
      0,
    );
    await assert.rejects(
      () => saveBookingQuote(f.db, "missing", "500"),
      failure(404),
    );
  } finally {
    f.close();
  }
});

test("notes remain private admin metadata, preserve line breaks and can be cleared", async () => {
  const f = setup();
  try {
    insert(f, "note", { status: "completed" });
    assert.deepEqual(
      await saveBookingNote(f.db, "note", "  First line\nSecond line  "),
      { ok: true },
    );
    const row = f.sqlite
      .prepare(
        "SELECT admin_note,status,total,updated_at FROM bookings WHERE id='note'",
      )
      .get()!;
    assert.equal(row.admin_note, "First line\nSecond line");
    assert.equal(row.status, "completed");
    assert.equal(row.total, 1000);
    assert.ok(row.updated_at);
    await saveBookingNote(f.db, "note", "");
    assert.equal(
      f.sqlite.prepare("SELECT admin_note FROM bookings WHERE id='note'").get()!
        .admin_note,
      "",
    );
    for (const value of [null, 1, {}, "x".repeat(2001)])
      await assert.rejects(
        () => saveBookingNote(f.db, "note", value),
        failure(400),
      );
    await assert.rejects(
      () => saveBookingNote(f.db, "missing", "Note"),
      failure(404),
    );
  } finally {
    f.close();
  }
});
