import test from "node:test";
import assert from "node:assert/strict";
import { testDatabase, seedProperty } from "./support/d1.ts";
import {
  synchronizeFeed,
  configureCalendarFeed,
  synchronizeDueFeeds,
} from "../lib/calendar-sync.ts";
import {
  addCalendarBlock,
  releaseCalendarBlock,
  calendarEntries,
  propertyCalendarExport,
} from "../lib/calendar-store.ts";
import { parseCalendar, calendarUrl } from "../lib/domain.ts";
const now = () => new Date("2026-11-04T10:00:00.000Z");
const event = (uid: string, start = "20261201", end = "20261204") =>
  `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nSUMMARY:PRIVATE GUEST NAME\r\nEND:VEVENT`;
const ics = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR", ""].join(
    "\r\n",
  );
const fetchText = (text: string, headers: Record<string, string> = {}) =>
  (async () => new Response(text, { headers })) as typeof fetch;
function setup() {
  const fixture = testDatabase();
  seedProperty(fixture.sqlite);
  fixture.sqlite
    .prepare(
      "INSERT INTO calendar_feeds (id,property_id,provider,url) VALUES (?,?,?,?)",
    )
    .run(
      "airbnb",
      "villa",
      "airbnb",
      "https://www.airbnb.com/calendar/ical/123.ics?s=fixture-only",
    );
  return fixture;
}
test("real sync SQL imports all dates, does not retain guest data, and replaces snapshots on cancellation", async () => {
  const f = setup();
  try {
    await synchronizeFeed(f.db, "airbnb", {
      now,
      fetcher: fetchText(
        ics(event("one"), event("two", "20261208", "20261210")),
      ),
    });
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM calendar_events").get()!.n,
      2,
    );
    const rows = await calendarEntries(
      f.db,
      "villa",
      "2026-12-01",
      "2027-01-01",
    );
    assert.equal(rows[0].source, "airbnb");
    assert.equal(JSON.stringify(rows).includes("PRIVATE GUEST"), false);
    await synchronizeFeed(f.db, "airbnb", {
      now,
      force: true,
      fetcher: fetchText(ics(event("two", "20261208", "20261210"))),
    });
    assert.deepEqual(
      f.sqlite
        .prepare("SELECT uid FROM calendar_events")
        .all()
        .map((r) => r.uid),
      ["two"],
    );
    await synchronizeFeed(f.db, "airbnb", {
      now,
      force: true,
      fetcher: fetchText(ics()),
    });
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM calendar_events").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});
test("invalid or failed refresh preserves the previous snapshot and schedules retry without storing secrets", async () => {
  const f = setup();
  try {
    await synchronizeFeed(f.db, "airbnb", {
      now,
      fetcher: fetchText(ics(event("keep"))),
    });
    await assert.rejects(() =>
      synchronizeFeed(f.db, "airbnb", {
        now,
        force: true,
        fetcher: fetchText("BEGIN:VCALENDAR\nBEGIN:VEVENT"),
      }),
    );
    assert.equal(
      f.sqlite.prepare("SELECT uid FROM calendar_events").get()!.uid,
      "keep",
    );
    const row = f.sqlite
      .prepare(
        "SELECT failure_count,error,next_sync,last_synced FROM calendar_feeds",
      )
      .get()!;
    assert.equal(row.failure_count, 1);
    assert.equal(row.next_sync, "2026-11-04T10:15:00.000Z");
    assert.equal(row.last_synced, now().toISOString());
    const fail = (async () => {
      throw new Error("PRIVATE UPSTREAM URL ?token=secret");
    }) as typeof fetch;
    await assert.rejects(() =>
      synchronizeFeed(f.db, "airbnb", { now, force: true, fetcher: fail }),
    );
    assert.doesNotMatch(
      String(f.sqlite.prepare("SELECT error FROM calendar_feeds").get()!.error),
      /PRIVATE|token|secret/,
    );
    assert.equal(
      f.sqlite.prepare("SELECT next_sync FROM calendar_feeds").get()!.next_sync,
      "2026-11-04T10:30:00.000Z",
    );
  } finally {
    f.close();
  }
});
test("ETag 304 retains events and confirms freshness; an initial 304 is rejected", async () => {
  const f = setup();
  try {
    await assert.rejects(() =>
      synchronizeFeed(f.db, "airbnb", {
        now,
        fetcher: (async () =>
          new Response(null, { status: 304 })) as typeof fetch,
      }),
    );
    await synchronizeFeed(f.db, "airbnb", {
      now,
      force: true,
      fetcher: fetchText(ics(event("keep")), { ETag: '"fixture-v1"' }),
    });
    let sent = false;
    const fetcher = (async (_url: unknown, init: RequestInit) => {
      sent = new Headers(init.headers).get("If-None-Match") === '"fixture-v1"';
      return new Response(null, { status: 304 });
    }) as typeof fetch;
    const result = await synchronizeFeed(f.db, "airbnb", {
      force: true,
      now: () => new Date("2026-11-04T11:00:00Z"),
      fetcher,
    });
    assert.equal(sent, true);
    assert.equal(result.status, "unchanged");
    assert.equal(result.events, 1);
    assert.equal(
      f.sqlite.prepare("SELECT last_synced FROM calendar_feeds").get()!
        .last_synced,
      "2026-11-04T11:00:00.000Z",
    );
  } finally {
    f.close();
  }
});
test("overlapping cron/manual refreshes fetch once; a changed URL invalidates old in-flight writes", async () => {
  const f = setup();
  try {
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((r) => (release = r)),
      started = new Promise<void>((r) => (entered = r));
    let calls = 0;
    const slow = (async () => {
      calls++;
      entered();
      await gate;
      return new Response(ics(event("old")));
    }) as typeof fetch;
    const old = synchronizeFeed(f.db, "airbnb", {
      now,
      force: true,
      fetcher: slow,
    });
    await started;
    const concurrent = await synchronizeFeed(f.db, "airbnb", {
      now,
      force: true,
      fetcher: slow,
    });
    assert.equal(concurrent.status, "busy");
    assert.equal(calls, 1);
    await configureCalendarFeed(
      f.db,
      "villa",
      "airbnb",
      "https://www.airbnb.com/calendar/ical/new.ics?s=fixture-new",
      { now, fetcher: fetchText(ics(event("new"))) },
    );
    release();
    assert.equal((await old).status, "superseded");
    assert.equal(
      f.sqlite.prepare("SELECT uid FROM calendar_events").get()!.uid,
      "new",
    );
  } finally {
    f.close();
  }
});
test("expired lease is recoverable and cron respects retry times", async () => {
  const f = setup();
  try {
    f.sqlite
      .prepare("UPDATE calendar_feeds SET sync_token=?,lock_until=?")
      .run("abandoned", "2026-11-04T09:00:00.000Z");
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return new Response(ics(event("one")));
    }) as typeof fetch;
    assert.equal(
      (await synchronizeDueFeeds(f.db, { now, fetcher }))[0].status,
      "updated",
    );
    assert.deepEqual(await synchronizeDueFeeds(f.db, { now, fetcher }), []);
    assert.equal(calls, 1);
  } finally {
    f.close();
  }
});
test("large imports use bounded JSON statements and isolate properties and providers", async () => {
  const f = setup();
  try {
    seedProperty(f.sqlite, "second");
    f.sqlite
      .prepare(
        "INSERT INTO calendar_feeds (id,property_id,provider,url) VALUES (?,?,?,?)",
      )
      .run(
        "second-feed",
        "second",
        "booking",
        "https://ical.booking.com/v1/export?t=fixture",
      );
    await synchronizeFeed(f.db, "airbnb", {
      now,
      fetcher: fetchText(
        ics(...Array.from({ length: 1500 }, (_, i) => event("uid-" + i))),
      ),
    });
    await synchronizeFeed(f.db, "second-feed", {
      now,
      fetcher: fetchText(ics(event("other"))),
    });
    assert.equal(
      f.sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM calendar_events WHERE feed_id='airbnb'",
        )
        .get()!.n,
      1500,
    );
    assert.equal(
      (await calendarEntries(f.db, "second", "2026-12-01", "2027-01-01"))
        .length,
      1,
    );
  } finally {
    f.close();
  }
});
test("manual closures export no private note; release removes them and returned own UIDs are ignored", async () => {
  const f = setup();
  try {
    const block = await addCalendarBlock(f.db, "villa", {
      start: "2026-12-01",
      end: "2026-12-04",
      note: "PRIVATE OWNER NOTE",
    });
    const exported = await propertyCalendarExport(f.db, "villa");
    assert.doesNotMatch(exported, /PRIVATE OWNER/);
    assert.match(exported, /block-/);
    assert.equal(
      (await calendarEntries(f.db, "villa", "2026-12-01", "2026-12-04"))[0]
        .source,
      "manual",
    );
    await releaseCalendarBlock(f.db, block.id);
    assert.equal(
      parseCalendar(await propertyCalendarExport(f.db, "villa")).length,
      0,
    );
    await synchronizeFeed(f.db, "airbnb", {
      now,
      fetcher: fetchText(exported),
    });
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM calendar_events").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});
test("site exports exclude imports to prevent cross-channel echo loops", async () => {
  const f = setup();
  try {
    await synchronizeFeed(f.db, "airbnb", {
      now,
      fetcher: fetchText(ics(event("external-only"))),
    });
    assert.equal(
      parseCalendar(await propertyCalendarExport(f.db, "villa")).length,
      0,
    );
  } finally {
    f.close();
  }
});
test("Booking v1 export URL is supported and invalid URLs report a controlled validation error", () => {
  assert.equal(
    calendarUrl("https://ical.booking.com/v1/export?t=fixture", "booking"),
    "https://ical.booking.com/v1/export?t=fixture",
  );
  for (const u of [
    "not-a-url",
    "https://ical.booking.com.evil.example/v1/export?t=fixture",
    "https://ical.booking.com/v1/export?t=fixture#fragment",
  ])
    assert.throws(
      () => calendarUrl(u, "booking"),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 400,
    );
});
test("parser accepts folded lines and cancellations without dates, but rejects malformed structures and duplicates", () => {
  assert.equal(
    parseCalendar(
      ics("BEGIN:VEVENT\r\nUID:cancelled\r\nSTATUS:CANCELLED\r\nEND:VEVENT"),
    ).length,
    0,
  );
  assert.equal(
    parseCalendar(ics(event("folded-\r\n uid")))[0].uid,
    "folded-uid",
  );
  for (const source of [
    ics(event("same"), event("same")),
    ics(event("first")).replace("END:VCALENDAR", ""),
    ics(event("first")) + "AFTER:INVALID",
    ics(event("first")).replace("END:VEVENT", "END:VALARM"),
    ics(event("first")).replace(
      "DTSTART;VALUE=DATE:20261201",
      "DTSTART;VALUE=DATE:20260230",
    ),
  ])
    assert.throws(() => parseCalendar(source));
});

test("Greek Airbnb exports are accepted without broadening host access", () => {
  assert.equal(
    new URL(
      calendarUrl(
        "https://www.airbnb.gr/calendar/ical/123.ics?t=fixture-only",
        "airbnb",
      ),
    ).hostname,
    "www.airbnb.gr",
  );
  assert.throws(() =>
    calendarUrl(
      "https://www.airbnb.gr.evil.example/calendar/ical/123.ics?t=fixture-only",
      "airbnb",
    ),
  );
  assert.throws(() =>
    calendarUrl(
      "https://airbnb.example/calendar/ical/123.ics?t=fixture-only",
      "airbnb",
    ),
  );
});
test("redirects use the Workers-compatible manual mode and never follow Location", async () => {
  const f = setup();
  let requests = 0;
  try {
    const fetcher = (async (_url, init) => {
      requests++;
      assert.equal(init?.redirect, "manual");
      return new Response(null, {
        status: 302,
        headers: { Location: "http://127.0.0.1/private" },
      });
    }) as typeof fetch;
    await assert.rejects(
      () => synchronizeFeed(f.db, "airbnb", { now, fetcher }),
      /HTTP 302/,
    );
    assert.equal(requests, 1);
    assert.equal(
      f.sqlite.prepare("SELECT COUNT(*) AS n FROM calendar_events").get()!.n,
      0,
    );
  } finally {
    f.close();
  }
});
test("Booking invalid-token errors are actionable without retaining the token or remote body", async () => {
  const f = setup();
  try {
    f.sqlite
      .prepare("UPDATE calendar_feeds SET provider=?,url=? WHERE id=?")
      .run(
        "booking",
        "https://ical.booking.com/v1/export?t=fixture-only",
        "airbnb",
      );
    const fetcher = (async () =>
      new Response(
        JSON.stringify({
          title: "Bad Request",
          detail: "Invalid Token",
          instance: "PRIVATE-UPSTREAM-INSTANCE",
        }),
        {
          status: 400,
          headers: { "content-type": "application/problem+json" },
        },
      )) as typeof fetch;
    await assert.rejects(
      () => synchronizeFeed(f.db, "airbnb", { now, fetcher }),
      /Invalid Token/,
    );
    const stored = String(
      f.sqlite.prepare("SELECT error FROM calendar_feeds").get()!.error,
    );
    assert.doesNotMatch(stored, /fixture-only|PRIVATE-UPSTREAM|https:\/\//);
  } finally {
    f.close();
  }
});
