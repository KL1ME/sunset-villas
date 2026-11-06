import { calendarUrl, parseCalendar, Problem } from "./domain.ts";
export const SYNC_INTERVAL_MS = 15 * 60_000;
const LEASE_MS = 45_000;
export type FeedRecord = {
  id: string;
  property_id: string;
  provider: string;
  url: string;
  enabled: number;
  last_synced: string | null;
  last_attempt: string | null;
  next_sync: string | null;
  failure_count: number;
  event_count: number;
  etag: string | null;
  last_modified: string | null;
  sync_token: string | null;
  lock_until: string | null;
  error: string | null;
};
export type SyncOptions = {
  fetcher?: typeof fetch;
  now?: () => Date;
  force?: boolean;
  enabled?: boolean;
};
export type SyncResult = {
  id: string;
  status:
    "updated" | "unchanged" | "busy" | "deferred" | "superseded" | "paused";
  events: number;
};
function safeHeader(value: string | null) {
  return value && value.length <= 500 ? value : null;
}
async function readCalendar(response: Response) {
  if (Number(response.headers.get("content-length") || 0) > 1_000_000)
    throw new Problem(400, "Το ημερολόγιο είναι πολύ μεγάλο.");
  const reader = response.body?.getReader();
  if (!reader) throw new Problem(502, "Η πλατφόρμα επέστρεψε κενό αρχείο.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "",
    bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1_000_000) {
      await reader.cancel();
      throw new Problem(400, "Το ημερολόγιο είναι πολύ μεγάλο.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
export async function synchronizeFeed(
  db: D1Database,
  id: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const now = options.now || (() => new Date()),
    started = now(),
    token = crypto.randomUUID();
  const feed = await db
    .prepare(
      `UPDATE calendar_feeds SET sync_token=?,lock_until=?,last_attempt=?
   WHERE id=? AND enabled=1 AND (sync_token IS NULL OR lock_until<=?) AND (?=1 OR next_sync IS NULL OR next_sync<=?) RETURNING *`,
    )
    .bind(
      token,
      new Date(started.getTime() + LEASE_MS).toISOString(),
      started.toISOString(),
      id,
      started.toISOString(),
      options.force ? 1 : 0,
      started.toISOString(),
    )
    .first<FeedRecord>();
  if (!feed) {
    const current = await db
      .prepare(
        "SELECT id,enabled,sync_token,lock_until,event_count FROM calendar_feeds WHERE id=?",
      )
      .bind(id)
      .first<FeedRecord>();
    if (!current) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
    return {
      id,
      status:
        current.enabled === 0
          ? "paused"
          : current.sync_token && current.lock_until! > started.toISOString()
            ? "busy"
            : "deferred",
      events: current.event_count,
    };
  }
  try {
    const headers: Record<string, string> = { Accept: "text/calendar" };
    if (feed.last_synced && feed.etag) headers["If-None-Match"] = feed.etag;
    if (feed.last_synced && feed.last_modified)
      headers["If-Modified-Since"] = feed.last_modified;
    const response = await (options.fetcher || fetch)(
      calendarUrl(feed.url, feed.provider),
      // Workers support manual/follow only. Reject non-304 redirects below,
      // without ever fetching their Location (which may leave the allowlist).
      { redirect: "manual", headers, signal: AbortSignal.timeout(12000) },
    );
    const completed = now(),
      next = new Date(completed.getTime() + SYNC_INTERVAL_MS).toISOString();
    if (response.status === 304) {
      if (!feed.last_synced)
        throw new Problem(502, "Η πλατφόρμα δεν έστειλε αρχικό ημερολόγιο.");
      const result = await db
        .prepare(
          "UPDATE calendar_feeds SET last_synced=?,next_sync=?,failure_count=0,error=NULL,sync_token=NULL,lock_until=NULL WHERE id=? AND sync_token=?",
        )
        .bind(completed.toISOString(), next, id, token)
        .run();
      return {
        id,
        status: result.meta.changes ? "unchanged" : "superseded",
        events: feed.event_count,
      };
    }
    if (
      !response.ok &&
      feed.provider === "booking" &&
      response.status === 400
    ) {
      let detail = "";
      try {
        const problem = JSON.parse(await readCalendar(response)) as {
          detail?: unknown;
        };
        if (typeof problem.detail === "string") detail = problem.detail;
      } catch {
        /* Never retain the remote error body. */
      }
      if (detail.trim().toLowerCase() === "invalid token")
        throw new Problem(
          502,
          "Η Booking απορρίπτει το iCal link ως «Invalid Token». Χρειάζεται έλεγχος του export link από τον ιδιοκτήτη.",
        );
    }
    if (!response.ok)
      throw new Problem(
        502,
        `Η πλατφόρμα δεν έστειλε ημερολόγιο (HTTP ${response.status}).`,
      );
    const events = parseCalendar(await readCalendar(response));
    const payload = JSON.stringify(
      events.map((e) => ({ ...e, id: crypto.randomUUID() })),
    );
    // A single JSON insert keeps even 2,000 events within the D1 query budget.
    // All three statements verify the lease; a changed URL invalidates old work.
    const result = await db.batch([
      db
        .prepare(
          "DELETE FROM calendar_events WHERE feed_id=? AND EXISTS(SELECT 1 FROM calendar_feeds WHERE id=? AND sync_token=?)",
        )
        .bind(id, id, token),
      db
        .prepare(
          `INSERT INTO calendar_events (id,feed_id,uid,start,end)
     SELECT json_extract(value,'$.id'),?,json_extract(value,'$.uid'),json_extract(value,'$.start'),json_extract(value,'$.end') FROM json_each(?)
     WHERE EXISTS(SELECT 1 FROM calendar_feeds WHERE id=? AND sync_token=?)
     AND NOT EXISTS(SELECT 1 FROM bookings WHERE property_id=? AND bookings.id||'@sunset-villas'=json_extract(value,'$.uid'))
     AND NOT EXISTS(SELECT 1 FROM calendar_blocks WHERE property_id=? AND 'block-'||calendar_blocks.id||'@sunset-villas'=json_extract(value,'$.uid'))`,
        )
        .bind(id, payload, id, token, feed.property_id, feed.property_id),
      db
        .prepare(
          `UPDATE calendar_feeds SET last_synced=?,next_sync=?,failure_count=0,error=NULL,etag=?,last_modified=?,event_count=(SELECT COUNT(*) FROM calendar_events WHERE feed_id=?),sync_token=NULL,lock_until=NULL WHERE id=? AND sync_token=?`,
        )
        .bind(
          now().toISOString(),
          next,
          safeHeader(response.headers.get("etag")),
          safeHeader(response.headers.get("last-modified")),
          id,
          id,
          token,
        ),
    ]);
    const count = await db
      .prepare("SELECT event_count FROM calendar_feeds WHERE id=?")
      .bind(id)
      .first<{ event_count: number }>();
    return {
      id,
      status: result[2].meta.changes ? "updated" : "superseded",
      events: count?.event_count || 0,
    };
  } catch (error) {
    // Never retain response bodies, remote URLs, query tokens, or guest details.
    const message =
      error instanceof Problem
        ? error.message
        : "Ο συγχρονισμός απέτυχε. Διατηρήθηκε το τελευταίο επιτυχές ημερολόγιο.";
    const failure = now(),
      delay = Math.min(
        SYNC_INTERVAL_MS * 2 ** Math.min(feed.failure_count || 0, 4),
        4 * 60 * 60_000,
      );
    await db
      .prepare(
        "UPDATE calendar_feeds SET error=?,failure_count=failure_count+1,next_sync=?,sync_token=NULL,lock_until=NULL WHERE id=? AND sync_token=?",
      )
      .bind(
        message,
        new Date(failure.getTime() + delay).toISOString(),
        id,
        token,
      )
      .run();
    throw new Problem(502, message);
  }
}
export async function configureCalendarFeed(
  db: D1Database,
  propertyId: string,
  provider: string,
  value: unknown,
  options: SyncOptions = {},
) {
  const url = calendarUrl(value, provider),
    id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO calendar_feeds (id,property_id,provider,url,enabled) VALUES (?,?,?,?,?) ON CONFLICT(property_id,provider) DO UPDATE SET url=excluded.url,enabled=excluded.enabled,last_synced=NULL,last_attempt=NULL,next_sync=NULL,etag=NULL,last_modified=NULL,error=NULL,failure_count=0,sync_token=NULL,lock_until=NULL`,
    )
    .bind(id, propertyId, provider, url, options.enabled === false ? 0 : 1)
    .run();
  const row = await db
    .prepare("SELECT id FROM calendar_feeds WHERE property_id=? AND provider=?")
    .bind(propertyId, provider)
    .first<{ id: string }>();
  if (options.enabled === false)
    return { id: row!.id, status: "paused" as const, events: 0 };
  return synchronizeFeed(db, row!.id, { ...options, force: true });
}
export async function synchronizeDueFeeds(
  db: D1Database,
  options: SyncOptions = {},
) {
  const stamp = (options.now?.() || new Date()).toISOString();
  // Six feeds per invocation leave room for reads/batches on the D1 free tier.
  // Cursor is next_sync: later invocations pick remaining due feeds first.
  const feeds = (
    await db
      .prepare(
        `SELECT id FROM calendar_feeds WHERE enabled=1 AND (next_sync IS NULL OR next_sync<=?) AND (sync_token IS NULL OR lock_until<=?) ORDER BY COALESCE(next_sync,''),id LIMIT 6`,
      )
      .bind(stamp, stamp)
      .all<{ id: string }>()
  ).results;
  const results = [];
  for (const feed of feeds) {
    try {
      results.push(await synchronizeFeed(db, feed.id, options));
    } catch {
      results.push({ id: feed.id, status: "failed" as const });
    }
  }
  return results;
}

export async function setFeedEnabled(
  db: D1Database,
  id: string,
  enabled: boolean,
) {
  if (typeof enabled !== "boolean")
    throw new Problem(400, "Επιλέξτε ενεργή σύνδεση ή παύση.");
  const result = await db
    .prepare(
      "UPDATE calendar_feeds SET enabled=?,sync_token=NULL,lock_until=NULL,next_sync=NULL WHERE id=?",
    )
    .bind(enabled ? 1 : 0, id)
    .run();
  if (!result.meta.changes) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
  return { ok: true, enabled };
}
