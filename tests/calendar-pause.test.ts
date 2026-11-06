import test from "node:test";
import assert from "node:assert/strict";
import { testDatabase, seedProperty } from "./support/d1.ts";
import {
  setFeedEnabled,
  synchronizeFeed,
  synchronizeDueFeeds,
} from "../lib/calendar-sync.ts";
import { calendarEntries } from "../lib/calendar-store.ts";
import { reserveInventory } from "../lib/inventory.ts";
import { Problem } from "../lib/domain.ts";

const instant = "2026-11-07T10:00:00.000Z";
const now = () => new Date(instant);
const calendar = (uid: string, start = "20261201", end = "20261204") =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
const fetchCalendar = (text: string) =>
  (async () => new Response(text)) as typeof fetch;
async function setup() {
  const f = testDatabase();
  seedProperty(f.sqlite);
  for (const provider of ["airbnb", "booking"])
    f.sqlite
      .prepare(
        "INSERT INTO calendar_feeds (id,property_id,provider,url) VALUES (?,'villa',?,?)",
      )
      .run(
        provider,
        provider,
        provider === "airbnb"
          ? "https://www.airbnb.gr/calendar/ical/123.ics?t=fixture-only"
          : "https://ical.booking.com/v1/export?t=fixture-only",
      );
  await synchronizeFeed(f.db, "airbnb", {
    now,
    fetcher: fetchCalendar(calendar("airbnb-original")),
  });
  await synchronizeFeed(f.db, "booking", {
    now,
    fetcher: fetchCalendar(
      calendar("booking-original", "20261210", "20261212"),
    ),
  });
  return f;
}

test("paused feed is never fetched by explicit forced sync or due-feed cron", async () => {
  const f = await setup();
  try {
    await setFeedEnabled(f.db, "booking", false);
    const fetched: string[] = [];
    const fetcher = (async (url) => {
      fetched.push(new URL(String(url)).hostname);
      return new Response(calendar("updated"));
    }) as typeof fetch;
    const paused = await synchronizeFeed(f.db, "booking", {
      now,
      force: true,
      fetcher,
    });
    assert.equal(paused.status, "paused");
    assert.deepEqual(fetched, []);
    const due = await synchronizeDueFeeds(f.db, {
      now: () => new Date(Date.parse(instant) + 16 * 60_000),
      fetcher,
    });
    assert.deepEqual(
      due.map((result) => result.id),
      ["airbnb"],
    );
    assert.deepEqual(fetched, ["www.airbnb.gr"]);
    assert.equal(
      f.sqlite
        .prepare("SELECT enabled FROM calendar_feeds WHERE id='booking'")
        .get()!.enabled,
      0,
    );
  } finally {
    f.close();
  }
});

test("pause excludes a retained snapshot from the common calendar and resume refreshes it", async () => {
  const f = await setup();
  try {
    assert.equal(
      (await calendarEntries(f.db, "villa", "2026-12-01", "2027-01-01")).length,
      2,
    );
    await setFeedEnabled(f.db, "airbnb", false);
    const entries = await calendarEntries(
      f.db,
      "villa",
      "2026-12-01",
      "2027-01-01",
    );
    assert.deepEqual(
      entries.map((entry) => entry.source),
      ["booking"],
    );
    assert.equal(
      f.sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM calendar_events WHERE feed_id='airbnb'",
        )
        .get()!.n,
      1,
    );
    await setFeedEnabled(f.db, "airbnb", true);
    const refreshed = await synchronizeDueFeeds(f.db, {
      now,
      fetcher: fetchCalendar(calendar("airbnb-resumed")),
    });
    assert.equal(refreshed.length, 1);
    assert.equal(refreshed[0].id, "airbnb");
    assert.equal(refreshed[0].status, "updated");
    assert.equal(
      f.sqlite
        .prepare("SELECT uid FROM calendar_events WHERE feed_id='airbnb'")
        .get()!.uid,
      "airbnb-resumed",
    );
    assert.equal(
      (await calendarEntries(f.db, "villa", "2026-12-01", "2027-01-01")).length,
      2,
    );
  } finally {
    f.close();
  }
});

test("pausing an in-flight refresh invalidates its lease and prevents a late snapshot write", async () => {
  const f = await setup();
  try {
    let release!: (response: Response) => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetcher = (async () => {
      started();
      return response;
    }) as typeof fetch;
    const pending = synchronizeFeed(f.db, "airbnb", {
      now,
      force: true,
      fetcher,
    });
    await entered;
    await setFeedEnabled(f.db, "airbnb", false);
    release(new Response(calendar("late-snapshot")));
    assert.equal((await pending).status, "superseded");
    const row = f.sqlite
      .prepare(
        "SELECT enabled,sync_token,lock_until FROM calendar_feeds WHERE id='airbnb'",
      )
      .get()!;
    assert.equal(row.enabled, 0);
    assert.equal(row.sync_token, null);
    assert.equal(row.lock_until, null);
    assert.equal(
      f.sqlite
        .prepare("SELECT uid FROM calendar_events WHERE feed_id='airbnb'")
        .get()!.uid,
      "airbnb-original",
    );
    assert.deepEqual(
      (await calendarEntries(f.db, "villa", "2026-12-01", "2027-01-01")).map(
        (entry) => entry.source,
      ),
      ["booking"],
    );
  } finally {
    f.close();
  }
});

test("resume preserves active source errors and snapshots when the provider still fails", async () => {
  const f = await setup();
  try {
    const fail = (async () => {
      throw new Error("PRIVATE-UPSTREAM-ERROR-FIXTURE");
    }) as typeof fetch;
    await assert.rejects(
      () =>
        synchronizeFeed(f.db, "booking", { now, force: true, fetcher: fail }),
      (error) => error instanceof Problem && error.status === 502,
    );
    await setFeedEnabled(f.db, "booking", false);
    await setFeedEnabled(f.db, "booking", true);
    const results = await synchronizeDueFeeds(f.db, { now, fetcher: fail });
    assert.deepEqual(results, [{ id: "booking", status: "failed" }]);
    const row = f.sqlite
      .prepare(
        "SELECT enabled,error,failure_count,event_count FROM calendar_feeds WHERE id='booking'",
      )
      .get()!;
    assert.equal(row.enabled, 1);
    assert.ok(row.error);
    assert.doesNotMatch(String(row.error), /PRIVATE-UPSTREAM/);
    assert.equal(row.failure_count, 2);
    assert.equal(row.event_count, 1);
    assert.equal(
      f.sqlite
        .prepare("SELECT uid FROM calendar_events WHERE feed_id='booking'")
        .get()!.uid,
      "booking-original",
    );
  } finally {
    f.close();
  }
});

test("paused source occupancy is ignored by atomic claims while enabled occupancy still conflicts", async () => {
  const f = await setup();
  try {
    await setFeedEnabled(f.db, "airbnb", false);
    const insert = (id: string, start: string, end: string) => {
      f.sqlite
        .prepare(
          "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,status,total,created_at) VALUES (?,'villa',?,?,2,'Fixture','fixture@example.invalid','requested',10000,?)",
        )
        .run(id, start, end, instant);
      return { id, property_id: "villa", check_in: start, check_out: end };
    };
    const ignored = insert("paused-overlap", "2026-12-01", "2026-12-03");
    await reserveInventory(f.db, ignored, "confirmed", {
      now: instant,
      expiresAt: null,
    });
    assert.equal(
      f.sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM occupied_nights WHERE booking_id='paused-overlap'",
        )
        .get()!.n,
      2,
    );
    const active = insert("enabled-overlap", "2026-12-10", "2026-12-12");
    await assert.rejects(
      () =>
        reserveInventory(f.db, active, "confirmed", {
          now: instant,
          expiresAt: null,
        }),
      (error) => error instanceof Problem && error.status === 409,
    );
    assert.equal(
      f.sqlite
        .prepare("SELECT status FROM bookings WHERE id='enabled-overlap'")
        .get()!.status,
      "requested",
    );
  } finally {
    f.close();
  }
});
