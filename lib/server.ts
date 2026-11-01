import { env } from "cloudflare:workers";
import {
  Problem,
  calendarUrl,
  parseCalendar,
  nightsBetween,
  validateStay,
  cleanText,
  emailAddress,
  quote,
} from "./domain";
import { villa, type Property } from "./catalog";
export function database() {
  if (!env.DB) throw new Problem(503, "Η βάση δεδομένων δεν είναι διαθέσιμη.");
  return env.DB;
}
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Problem(415, "Απαιτείται JSON.");
  const text = await boundedText(request, 16000);
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new Problem(400, "Μη έγκυρο αίτημα.");
  }
}
export async function boundedText(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new Problem(413, "Το αίτημα είναι πολύ μεγάλο.");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      throw new Problem(413, "Το αίτημα είναι πολύ μεγάλο.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Problem(403, "Μη επιτρεπόμενη προέλευση αιτήματος.");
}
export async function admin(request: Request) {
  const expected = env.ADMIN_TOKEN;
  if (!expected || expected.length < 32)
    throw new Problem(503, "Το backend χρειάζεται ρύθμιση του ADMIN_TOKEN.");
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const digest = async (v: string) =>
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    );
  const a = await digest(expected),
    b = await digest(provided);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (difference !== 0) throw new Problem(401, "Μη έγκυρο κλειδί διαχείρισης.");
}
export async function endpoint(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Problem)
      return json({ error: error.message }, error.status);
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed: occupied_nights")
    )
      return json(
        {
          error:
            "Οι ημερομηνίες δεσμεύτηκαν από άλλη κράτηση. Επιλέξτε άλλες ημερομηνίες.",
        },
        409,
      );
    console.error("Reservation operation failed");
    return json({ error: "Η ενέργεια δεν ολοκληρώθηκε. Δοκιμάστε ξανά." }, 500);
  }
}
export async function seed() {
  const db = database();
  await db
    .prepare(
      "INSERT OR IGNORE INTO properties (id,slug,name,location,description,max_guests,bedrooms,min_nights,base_price,cleaning_fee,published,image,export_token,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      villa.id,
      villa.slug,
      villa.name,
      villa.location,
      villa.description,
      6,
      2,
      1,
      null,
      0,
      1,
      villa.image,
      crypto.randomUUID() + crypto.randomUUID(),
      new Date().toISOString(),
    )
    .run();
}
export async function properties() {
  await seed();
  return (
    await database()
      .prepare(
        "SELECT id,slug,name,location,description,max_guests,bedrooms,min_nights,base_price,cleaning_fee,published,image FROM properties WHERE published=1 ORDER BY created_at,id",
      )
      .all<Property>()
  ).results;
}
export async function property(id: unknown, includeDraft = false) {
  if (typeof id !== "string" || id.length > 100)
    throw new Problem(400, "Επιλέξτε κατάλυμα.");
  await seed();
  const p = await database()
    .prepare(
      `SELECT * FROM properties WHERE id=? ${includeDraft ? "" : "AND published=1"}`,
    )
    .bind(id)
    .first<Property>();
  if (!p) throw new Problem(404, "Το κατάλυμα δεν βρέθηκε.");
  return p;
}
export async function expireHolds() {
  const db = database();
  await db.batch([
    db
      .prepare(
        "UPDATE bookings SET status='expired' WHERE status='held' AND expires_at < ?",
      )
      .bind(new Date().toISOString()),
    db.prepare(
      "DELETE FROM occupied_nights WHERE booking_id IN (SELECT id FROM bookings WHERE status IN ('expired','cancelled'))",
    ),
  ]);
}
export async function syncFeed(id: string) {
  const db = database();
  const feed = await db
    .prepare("SELECT * FROM calendar_feeds WHERE id=?")
    .bind(id)
    .first<{
      id: string;
      url: string;
      provider: string;
      property_id: string;
    }>();
  if (!feed) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
  try {
    const url = calendarUrl(feed.url, feed.provider);
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "text/calendar" },
    });
    if (!response.ok)
      throw new Problem(502, "Η πλατφόρμα δεν επέστρεψε το ημερολόγιο.");
    if (Number(response.headers.get("content-length") || 0) > 1_000_000)
      throw new Problem(400, "Το ημερολόγιο είναι πολύ μεγάλο.");
    // Bound decoded download size even when Content-Length is absent or incorrect.
    const reader = response.body?.getReader();
    if (!reader) throw new Problem(502, "Κενό ημερολόγιο.");
    const decoder = new TextDecoder();
    let text = "",
      size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) {
        await reader.cancel();
        throw new Problem(400, "Το ημερολόγιο είναι πολύ μεγάλο.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const events = parseCalendar(text);
    const statements = [
      db.prepare("DELETE FROM calendar_events WHERE feed_id=?").bind(id),
      ...events.map((e) =>
        db
          .prepare(
            "INSERT INTO calendar_events (id,feed_id,uid,start,end) VALUES (?,?,?,?,?)",
          )
          .bind(crypto.randomUUID(), id, e.uid, e.start, e.end),
      ),
      db
        .prepare(
          "UPDATE calendar_feeds SET last_synced=?,error=NULL WHERE id=?",
        )
        .bind(new Date().toISOString(), id),
    ];
    await db.batch(statements);
    return { ok: true, events: events.length };
  } catch (error) {
    const message =
      error instanceof Problem
        ? error.message
        : "Ο συγχρονισμός απέτυχε. Διατηρήθηκε το τελευταίο επιτυχές ημερολόγιο.";
    await db
      .prepare("UPDATE calendar_feeds SET error=? WHERE id=?")
      .bind(message, id)
      .run();
    throw new Problem(502, message);
  }
}
export async function refreshStale(propertyId: string) {
  const feeds = (
    await database()
      .prepare("SELECT id,last_synced FROM calendar_feeds WHERE property_id=?")
      .bind(propertyId)
      .all<{ id: string; last_synced: string | null }>()
  ).results;
  for (const feed of feeds)
    if (
      !feed.last_synced ||
      Date.parse(feed.last_synced) < Date.now() - 15 * 60_000
    )
      await syncFeed(feed.id);
  return feeds.length;
}
export async function blocked(propertyId: string, start: string, end: string) {
  await expireHolds();
  const db = database();
  const [own, external] = await Promise.all([
    db
      .prepare(
        "SELECT date FROM occupied_nights WHERE property_id=? AND date>=? AND date<?",
      )
      .bind(propertyId, start, end)
      .all<{ date: string }>(),
    db
      .prepare(
        "SELECT start,end FROM calendar_events WHERE feed_id IN (SELECT id FROM calendar_feeds WHERE property_id=?) AND start<? AND end>?",
      )
      .bind(propertyId, end, start)
      .all<{ start: string; end: string }>(),
  ]);
  const dates = new Set(own.results.map((n) => n.date));
  for (const e of external.results) {
    let day = e.start > start ? e.start : start;
    const until = e.end < end ? e.end : end;
    while (day < until) {
      dates.add(day);
      day = new Date(Date.parse(day) + 86400000).toISOString().slice(0, 10);
    }
  }
  return [...dates].sort();
}
export async function rateLimit(request: Request, email: string) {
  const db = database(),
    now = new Date(),
    bucket = now.toISOString().slice(0, 10),
    ip = request.headers.get("cf-connecting-ip") || "preview";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip + bucket),
  );
  const ipKey = Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
  for (const key of [
    "ip:" + ipKey + ":" + bucket,
    "email:" + email + ":" + bucket,
  ]) {
    const r = await db
      .prepare(
        "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
      )
      .bind(key, new Date(now.getTime() + 2 * 86400000).toISOString())
      .first<{ count: number }>();
    if (r && r.count > 10)
      throw new Problem(
        429,
        "Έχουν σταλεί αρκετά αιτήματα σήμερα. Δοκιμάστε ξανά αύριο.",
      );
  }
  await db
    .prepare("DELETE FROM rate_limits WHERE expires_at<?")
    .bind(now.toISOString())
    .run();
}
export async function createBooking(
  request: Request,
  input: Record<string, unknown>,
) {
  const p = await property(input.propertyId),
    stay = validateStay(input, p);
  const name = cleanText(input.name, 120, 2),
    email = emailAddress(input.email),
    phone = input.phone ? cleanText(input.phone, 40) : null;
  if (input.consent !== true)
    throw new Problem(400, "Απαιτείται αποδοχή της ενημέρωσης απορρήτου.");
  if (input.website) throw new Problem(400, "Μη έγκυρο αίτημα.");
  await rateLimit(request, email);
  await refreshStale(p.id);
  if ((await blocked(p.id, stay.checkIn, stay.checkOut)).length)
    throw new Problem(409, "Υπάρχει δέσμευση στις ημερομηνίες που επιλέξατε.");
  const id = crypto.randomUUID(),
    total = quote(stay.nights.length, p.base_price, p.cleaning_fee);
  await database()
    .prepare(
      "INSERT INTO bookings (id,property_id,check_in,check_out,guests,name,email,phone,status,total,payment_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      id,
      p.id,
      stay.checkIn,
      stay.checkOut,
      stay.guests,
      name,
      email,
      phone,
      "requested",
      total,
      "unpaid",
      new Date().toISOString(),
    )
    .run();
  return { id, status: "requested", total };
}
export async function reserveBooking(id: string, status: "confirmed" | "held") {
  const db = database();
  await expireHolds();
  const booking = await db
    .prepare("SELECT * FROM bookings WHERE id=?")
    .bind(id)
    .first<{
      id: string;
      property_id: string;
      check_in: string;
      check_out: string;
      guests: number;
      status: string;
      total: number | null;
    }>();
  if (!booking) throw new Problem(404, "Η κράτηση δεν βρέθηκε.");
  if (booking.status !== "requested")
    throw new Problem(409, "Το αίτημα δεν είναι πλέον σε αναμονή.");
  const p = await property(booking.property_id, true);
  validateStay(
    {
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      guests: booking.guests,
    },
    p,
  );
  await refreshStale(p.id);
  if ((await blocked(p.id, booking.check_in, booking.check_out)).length)
    throw new Problem(409, "Οι ημερομηνίες δεν είναι διαθέσιμες.");
  const expiry = new Date(Date.now() + 35 * 60_000).toISOString();
  await db.batch([
    db
      .prepare(
        "UPDATE bookings SET status=?,expires_at=? WHERE id=? AND status='requested'",
      )
      .bind(status, status === "held" ? expiry : null, id),
    ...nightsBetween(booking.check_in, booking.check_out).map((date) =>
      db
        .prepare(
          "INSERT INTO occupied_nights (property_id,date,booking_id) SELECT property_id,?,id FROM bookings WHERE id=? AND status=?",
        )
        .bind(date, id, status),
    ),
  ]);
  const current = await db
    .prepare("SELECT status FROM bookings WHERE id=?")
    .bind(id)
    .first<{ status: string }>();
  if (current?.status !== status)
    throw new Problem(
      409,
      "Η κατάσταση της κράτησης άλλαξε. Ανανεώστε τη σελίδα.",
    );
  return booking;
}
export async function cancelBooking(id: string) {
  const db = database();
  const b = await db
    .prepare("SELECT payment_status FROM bookings WHERE id=?")
    .bind(id)
    .first<{ payment_status: string }>();
  if (!b) throw new Problem(404, "Δεν βρέθηκε κράτηση.");
  if (b.payment_status === "paid")
    throw new Problem(
      409,
      "Απαιτείται πρώτα διαδικασία επιστροφής από τον πάροχο πληρωμών.",
    );
  await db.batch([
    db
      .prepare(
        "UPDATE bookings SET status='cancelled' WHERE id=? AND payment_status!='paid'",
      )
      .bind(id),
    db
      .prepare(
        "DELETE FROM occupied_nights WHERE booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND status='cancelled')",
      )
      .bind(id, id),
  ]);
}
export async function saveProperty(input: Record<string, unknown>) {
  const db = database(),
    id = typeof input.id === "string" ? input.id : crypto.randomUUID();
  const name = cleanText(input.name, 120, 2),
    location = cleanText(input.location, 180),
    description = cleanText(input.description, 1500),
    guests = Number(input.maxGuests),
    bedrooms = Number(input.bedrooms),
    min = Number(input.minNights);
  const price =
      input.basePrice === "" || input.basePrice === null
        ? null
        : Math.round(Number(input.basePrice) * 100),
    cleaning = Math.round(Number(input.cleaningFee || 0) * 100);
  if (
    !Number.isInteger(guests) ||
    guests < 1 ||
    guests > 30 ||
    !Number.isInteger(bedrooms) ||
    bedrooms < 1 ||
    bedrooms > 20 ||
    !Number.isInteger(min) ||
    min < 1 ||
    min > 60 ||
    (price !== null &&
      (!Number.isSafeInteger(price) || price < 100 || price > 1_000_000)) ||
    !Number.isSafeInteger(cleaning) ||
    cleaning < 0 ||
    cleaning > 100_000
  )
    throw new Problem(400, "Ελέγξτε τιμές, ελάχιστη διαμονή και χωρητικότητα.");
  let image: string | null = null;
  if (input.image) {
    image = cleanText(input.image, 2000);
    if (!/^\/(photos|images)\/[A-Za-z0-9._-]+$/.test(image)) {
      const u = new URL(image);
      if (u.protocol !== "https:" || u.username || u.password)
        throw new Problem(400, "Η φωτογραφία πρέπει να έχει HTTPS URL.");
    }
  }
  await db
    .prepare(
      "INSERT INTO properties (id,slug,name,location,description,max_guests,bedrooms,min_nights,base_price,cleaning_fee,published,image,export_token,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,location=excluded.location,description=excluded.description,max_guests=excluded.max_guests,bedrooms=excluded.bedrooms,min_nights=excluded.min_nights,base_price=excluded.base_price,cleaning_fee=excluded.cleaning_fee,published=excluded.published,image=excluded.image",
    )
    .bind(
      id,
      "villa-" + id,
      name,
      location,
      description,
      guests,
      bedrooms,
      min,
      price,
      cleaning,
      input.published === true ? 1 : 0,
      image,
      crypto.randomUUID() + crypto.randomUUID(),
      new Date().toISOString(),
    )
    .run();
  return { id };
}
