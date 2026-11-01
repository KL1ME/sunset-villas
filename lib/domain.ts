export class Problem extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function dateOnly(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw new Problem(400, "Μη έγκυρη ημερομηνία.");
  return value;
}
export function todayAthens(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function nightsBetween(start: string, end: string) {
  dateOnly(start);
  dateOnly(end);
  const count = (Date.parse(end) - Date.parse(start)) / 86400000;
  if (count < 1 || count > 60)
    throw new Problem(400, "Επιλέξτε από 1 έως 60 διανυκτερεύσεις.");
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10),
  );
}
export function validateStay(
  input: Record<string, unknown>,
  property: { max_guests: number; min_nights: number },
  now = new Date(),
) {
  const checkIn = dateOnly(input.checkIn),
    checkOut = dateOnly(input.checkOut),
    nights = nightsBetween(checkIn, checkOut);
  if (checkIn < todayAthens(now))
    throw new Problem(400, "Η άφιξη πρέπει να είναι από σήμερα και μετά.");
  if (
    checkIn >
    new Date(now.getTime() + 730 * 86400000).toISOString().slice(0, 10)
  )
    throw new Problem(
      400,
      "Μπορείτε να ζητήσετε κράτηση έως δύο χρόνια μπροστά.",
    );
  if (nights.length < property.min_nights)
    throw new Problem(400, `Ελάχιστη διαμονή: ${property.min_nights} νύχτες.`);
  const guests = Number(input.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > property.max_guests)
    throw new Problem(400, `Επιλέξτε έως ${property.max_guests} επισκέπτες.`);
  return { checkIn, checkOut, guests, nights };
}
export function cleanText(value: unknown, max: number, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    throw new Problem(400, "Ελέγξτε τα στοιχεία που συμπληρώσατε.");
  return value.trim();
}
export function emailAddress(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Problem(400, "Συμπληρώστε έγκυρο email.");
  return email;
}
export function quote(nights: number, base: number | null, cleaning: number) {
  return base === null ? null : nights * base + cleaning;
}
export type CalendarEvent = { uid: string; start: string; end: string };
// Whole-day VEVENTs only. Unsupported recurrence/time zones fail the entire refresh,
// preserving the last successful snapshot instead of silently opening dates.
export function parseCalendar(text: string): CalendarEvent[] {
  if (
    text.length > 1_000_000 ||
    !text.includes("BEGIN:VCALENDAR") ||
    !text.includes("END:VCALENDAR")
  )
    throw new Problem(400, "Μη έγκυρο ημερολόγιο iCal.");
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const blocks = [
    ...unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g),
  ];
  if (
    blocks.length !== (unfolded.match(/BEGIN:VEVENT/g) || []).length ||
    blocks.length !== (unfolded.match(/END:VEVENT/g) || []).length
  )
    throw new Problem(400, "Ελλιπές ημερολόγιο iCal.");
  const events: CalendarEvent[] = [];
  for (const [, block] of blocks) {
    const lines = block.split(/\r?\n/);
    let uid = "",
      start = "",
      end = "",
      cancelled = false;
    for (const line of lines) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const key = line.slice(0, separator),
        value = line.slice(separator + 1).trim();
      if (key === "STATUS" && value === "CANCELLED") cancelled = true;
      if (/^(RRULE|RDATE|EXDATE|RECURRENCE-ID)(;|$)/.test(key))
        throw new Problem(
          400,
          "Το ημερολόγιο έχει επαναλαμβανόμενα συμβάντα που χρειάζονται έλεγχο.",
        );
      if (key === "UID") uid = value;
      if (/^DT(START|END)(;|$)/.test(key)) {
        if (
          !/^\d{8}$/.test(value) ||
          (!key.includes("VALUE=DATE") && key.includes(";"))
        )
          throw new Problem(
            400,
            "Απαιτούνται ημερολόγια κρατήσεων με ολοήμερα συμβάντα.",
          );
        const parsed = dateOnly(
          `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
        );
        if (key.startsWith("DTSTART")) start = parsed;
        else end = parsed;
      }
    }
    if (cancelled) continue;
    if (!uid || !start || !end || start >= end)
      throw new Problem(400, "Βρέθηκε ελλιπές συμβάν στο ημερολόγιο.");
    events.push({ uid: uid.slice(0, 500), start, end });
  }
  if (
    events.length > 2000 ||
    new Set(events.map((e) => e.uid)).size !== events.length
  )
    throw new Problem(
      400,
      "Το ημερολόγιο περιέχει υπερβολικά ή διπλά συμβάντα.",
    );
  return events;
}
export function calendarUrl(value: unknown, provider: string) {
  const url = new URL(cleanText(value, 3000));
  const hosts: Record<string, string[]> = {
    airbnb: ["www.airbnb.com", "airbnb.com"],
    booking: ["admin.booking.com", "ical.booking.com"],
  };
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    !hosts[provider]?.includes(url.hostname) ||
    !(
      /\/(calendar|ical)\//.test(url.pathname) ||
      url.pathname.endsWith(".ics") ||
      (provider === "booking" && url.pathname === "/hotel/hoteladmin/ical.html")
    )
  )
    throw new Problem(
      400,
      "Χρησιμοποιήστε το επίσημο HTTPS iCal export URL της επιλεγμένης πλατφόρμας.",
    );
  return url.toString();
}
export function exportCalendar(
  events: { id: string; check_in: string; check_out: string }[],
  now = new Date(),
) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sunset Villas//Reservations//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const e of events)
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@sunset-villas`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${e.check_in.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${e.check_out.replaceAll("-", "")}`,
      "SUMMARY:Reserved",
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  return [...lines, "END:VCALENDAR", ""].join("\r\n");
}
