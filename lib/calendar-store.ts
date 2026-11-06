import { dateOnly, cleanText, Problem, exportCalendar } from "./domain.ts";
export type CalendarEntry = {
  id: string;
  source: "site" | "airbnb" | "booking" | "manual";
  start: string;
  end: string;
  title: string;
  status: string;
};
export async function addCalendarBlock(
  db: D1Database,
  propertyId: string,
  input: Record<string, unknown>,
) {
  const start = dateOnly(input.start),
    end = dateOnly(input.end),
    days = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (days < 1 || days > 730)
    throw new Problem(400, "Η δέσμευση πρέπει να είναι από 1 έως 730 νύχτες.");
  const note = input.note ? cleanText(input.note, 140) : "",
    id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO calendar_blocks (id,property_id,start,end,note,created_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(id, propertyId, start, end, note, new Date().toISOString())
    .run();
  return { id };
}
export async function releaseCalendarBlock(db: D1Database, id: string) {
  const result = await db
    .prepare(
      "UPDATE calendar_blocks SET released_at=? WHERE id=? AND released_at IS NULL",
    )
    .bind(new Date().toISOString(), id)
    .run();
  if (!result.meta.changes)
    throw new Problem(404, "Δεν βρέθηκε ενεργή δέσμευση.");
  return { ok: true };
}
export function monthRange(value: unknown) {
  if (typeof value !== "string" || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value))
    throw new Problem(400, "Επιλέξτε έγκυρο μήνα.");
  return {
    start: dateOnly(value + "-01"),
    end: new Date(
      Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)), 1),
    )
      .toISOString()
      .slice(0, 10),
  };
}
export async function calendarEntries(
  db: D1Database,
  propertyId: string,
  start: string,
  end: string,
): Promise<CalendarEntry[]> {
  const [bookings, external, blocks] = await Promise.all([
    db
      .prepare(
        "SELECT id,check_in AS start,check_out AS end,name AS title,status FROM bookings WHERE property_id=? AND status IN ('confirmed','held') AND check_in<? AND check_out>? ORDER BY check_in,id",
      )
      .bind(propertyId, end, start)
      .all<{
        id: string;
        start: string;
        end: string;
        title: string;
        status: string;
      }>(),
    db
      .prepare(
        "SELECT calendar_events.id,start,end,provider FROM calendar_events JOIN calendar_feeds ON calendar_feeds.id=calendar_events.feed_id WHERE property_id=? AND calendar_feeds.enabled=1 AND start<? AND end>? ORDER BY start,calendar_events.id",
      )
      .bind(propertyId, end, start)
      .all<{
        id: string;
        start: string;
        end: string;
        provider: "airbnb" | "booking";
      }>(),
    db
      .prepare(
        "SELECT id,start,end,note FROM calendar_blocks WHERE property_id=? AND released_at IS NULL AND start<? AND end>? ORDER BY start,id",
      )
      .bind(propertyId, end, start)
      .all<{ id: string; start: string; end: string; note: string }>(),
  ]);
  return [
    ...bookings.results.map((b) => ({ ...b, source: "site" as const })),
    ...external.results.map((e) => ({
      id: e.id,
      source: e.provider,
      start: e.start,
      end: e.end,
      title: e.provider === "airbnb" ? "Κράτηση Airbnb" : "Κράτηση Booking",
      status: "imported",
    })),
    ...blocks.results.map((b) => ({
      id: b.id,
      source: "manual" as const,
      start: b.start,
      end: b.end,
      title: b.note || "Κλειστό από οικοδεσπότη",
      status: "blocked",
    })),
  ];
}
export async function propertyCalendarExport(
  db: D1Database,
  propertyId: string,
) {
  const [bookings, blocks] = await Promise.all([
    db
      .prepare(
        "SELECT id,check_in,check_out FROM bookings WHERE property_id=? AND status IN ('confirmed','held') ORDER BY check_in,id",
      )
      .bind(propertyId)
      .all<{ id: string; check_in: string; check_out: string }>(),
    db
      .prepare(
        "SELECT id,start AS check_in,end AS check_out FROM calendar_blocks WHERE property_id=? AND released_at IS NULL ORDER BY start,id",
      )
      .bind(propertyId)
      .all<{ id: string; check_in: string; check_out: string }>(),
  ]);
  // Export this site's own occupancy. Other channels connect directly to each
  // other, so imported events are not endlessly re-exported after cancellation.
  return exportCalendar([
    ...bookings.results,
    ...blocks.results.map((b) => ({ ...b, id: "block-" + b.id })),
  ]);
}
