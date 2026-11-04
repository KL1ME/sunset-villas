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
// Reservation calendars: whole-day, non-recurring VEVENTs. Unknown/partial
// structure fails the complete refresh so the previous snapshot stays closed.
export function parseCalendar(text: string): CalendarEvent[] {
  if (new TextEncoder().encode(text).length > 1_000_000)
    throw new Problem(400, "Το ημερολόγιο είναι πολύ μεγάλο.");
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r?\n[ \t]/g, "")
    .split(/\r?\n/);
  const stack: string[] = [];
  const events: CalendarEvent[] = [];
  let calendarCount = 0,
    version = "",
    event: Map<string, { parameters: string; value: string }> | null = null;
  const fail = () => {
    throw new Problem(400, "Μη έγκυρο ή ελλιπές ημερολόγιο iCal.");
  };
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const colon = raw.indexOf(":");
    if (colon < 1) fail();
    const key = raw.slice(0, colon),
      value = raw.slice(colon + 1).trim();
    const name = key.split(";", 1)[0].toUpperCase();
    if (name === "BEGIN") {
      const component = value.toUpperCase();
      if (!stack.length) {
        if (component !== "VCALENDAR" || ++calendarCount !== 1) fail();
      } else if (
        component === "VCALENDAR" ||
        (component === "VEVENT" && stack.at(-1) !== "VCALENDAR")
      )
        fail();
      if (["VTODO", "VJOURNAL", "VFREEBUSY"].includes(component))
        throw new Problem(
          400,
          "Χρειάζεται ημερολόγιο κρατήσεων με συμβάντα VEVENT.",
        );
      if (component === "VEVENT") event = new Map();
      stack.push(component);
      continue;
    }
    if (name === "END") {
      if (!stack.length || stack.at(-1) !== value.toUpperCase()) fail();
      if (stack.at(-1) === "VEVENT") {
        if (!event) fail();
        const fields = event!;
        if (
          fields.get("STATUS")?.value.toUpperCase() !== "CANCELLED" &&
          fields.get("TRANSP")?.value.toUpperCase() !== "TRANSPARENT"
        ) {
          if (
            ["RRULE", "RDATE", "EXDATE", "RECURRENCE-ID"].some((key) =>
              fields.has(key),
            )
          )
            throw new Problem(
              400,
              "Το ημερολόγιο έχει επαναλαμβανόμενα συμβάντα που χρειάζονται έλεγχο.",
            );
          const uid = fields.get("UID")?.value;
          if (!uid || uid.length > 500 || /[\x00-\x1f]/.test(uid)) fail();
          const readDate = (key: string) => {
            const field = fields.get(key);
            if (
              !field ||
              !/^\d{8}$/.test(field.value) ||
              (field.parameters &&
                field.parameters.toUpperCase() !== ";VALUE=DATE")
            )
              throw new Problem(
                400,
                "Απαιτούνται ημερολόγια κρατήσεων με ολοήμερα συμβάντα.",
              );
            const v = field.value;
            return dateOnly(
              `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`,
            );
          };
          const start = readDate("DTSTART"),
            end = readDate("DTEND");
          if (start >= end) fail();
          events.push({ uid: uid!, start, end });
        }
        event = null;
      }
      stack.pop();
      continue;
    }
    if (!stack.length) fail();
    if (stack.length === 1 && name === "VERSION") {
      if (version || value !== "2.0") fail();
      version = value;
    }
    if (stack.at(-1) === "VEVENT" && event) {
      // Notes, guest names, descriptions, URLs and attendees are not retained.
      if (
        [
          "UID",
          "DTSTART",
          "DTEND",
          "STATUS",
          "TRANSP",
          "RRULE",
          "RDATE",
          "EXDATE",
          "RECURRENCE-ID",
        ].includes(name)
      ) {
        if (event.has(name)) fail();
        event.set(name, { parameters: key.slice(name.length), value });
      }
    }
  }
  if (
    stack.length ||
    calendarCount !== 1 ||
    version !== "2.0" ||
    events.length > 2000 ||
    new Set(events.map((e) => e.uid)).size !== events.length
  )
    fail();
  return events;
}
export function calendarUrl(value: unknown, provider: string) {
  let url: URL;
  try {
    url = new URL(cleanText(value, 3000));
  } catch {
    throw new Problem(400, "Συμπληρώστε έγκυρο HTTPS iCal export URL.");
  }
  const hosts: Record<string, string[]> = {
    airbnb: ["www.airbnb.com", "airbnb.com"],
    booking: ["admin.booking.com", "ical.booking.com"],
  };
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !hosts[provider]?.includes(url.hostname) ||
    !(
      /\/(calendar|ical)\//.test(url.pathname) ||
      url.pathname.endsWith(".ics") ||
      (provider === "booking" &&
        (url.pathname === "/hotel/hoteladmin/ical.html" ||
          (url.hostname === "ical.booking.com" &&
            url.pathname === "/v1/export")))
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
