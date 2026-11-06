import { cleanText, Problem } from "./domain.ts";

const bookingStatuses = new Set([
  "requested",
  "held",
  "confirmed",
  "cancelled",
  "expired",
  "payment_review",
  "completed",
]);

export type AdminBooking = {
  id: string;
  property_id: string;
  property_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  total: number | null;
  payment_status: string;
  expires_at: string | null;
  admin_note: string;
  created_at: string;
  updated_at: string | null;
};

function paginationNumber(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > maximum)
    throw new Problem(400, "Μη έγκυρη σελιδοποίηση κρατήσεων.");
  return Number(value);
}

function optionalFilter(params: URLSearchParams, key: string, max: number) {
  const value = params.get(key) || "";
  if (value.length > max)
    throw new Problem(400, "Το φίλτρο αναζήτησης είναι πολύ μεγάλο.");
  return value.trim();
}

export async function listAdminBookings(
  db: D1Database,
  params: URLSearchParams,
) {
  const requestedPage = paginationNumber(params.get("page"), 1, 1_000_000),
    pageSize = paginationNumber(params.get("pageSize"), 25, 100),
    status = optionalFilter(params, "status", 30),
    propertyId = optionalFilter(params, "propertyId", 100),
    search = optionalFilter(params, "search", 120),
    predicates: string[] = [],
    values: (string | number)[] = [];
  if (status) {
    if (!bookingStatuses.has(status))
      throw new Problem(400, "Μη έγκυρη κατάσταση κράτησης.");
    predicates.push("b.status=?");
    values.push(status);
  }
  if (propertyId) {
    predicates.push("b.property_id=?");
    values.push(propertyId);
  }
  if (search) {
    // LIKE metacharacters are literal guest input, never an implicit wildcard.
    const literal = "%" + search.replace(/[\\%_]/g, "\\$&") + "%";
    predicates.push(
      "(b.id LIKE ? ESCAPE '\\' OR b.name LIKE ? ESCAPE '\\' OR b.email LIKE ? ESCAPE '\\' OR p.name LIKE ? ESCAPE '\\')",
    );
    values.push(literal, literal, literal, literal);
  }
  const from = "FROM bookings b JOIN properties p ON p.id=b.property_id",
    where = predicates.length ? " WHERE " + predicates.join(" AND ") : "";
  const [count, globalStats] = await Promise.all([
    db
      .prepare(`SELECT COUNT(*) AS total ${from}${where}`)
      .bind(...values)
      .first<{ total: number }>(),
    db
      .prepare(
        "SELECT SUM(CASE WHEN status='requested' THEN 1 ELSE 0 END) AS requested,SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) AS confirmed FROM bookings",
      )
      .first<{ requested: number | null; confirmed: number | null }>(),
  ]);
  const total = Number(count?.total || 0),
    pages = Math.max(1, Math.ceil(total / pageSize)),
    page = Math.min(requestedPage, pages);
  // Tokens, request fingerprints, and provider session IDs stay on the server.
  const rows = await db
    .prepare(
      `SELECT b.id,b.property_id,p.name AS property_name,b.check_in,b.check_out,b.guests,b.name,b.email,b.phone,b.status,b.total,b.payment_status,b.expires_at,b.admin_note,b.created_at,b.updated_at ${from}${where} ORDER BY b.created_at DESC,b.id DESC LIMIT ? OFFSET ?`,
    )
    .bind(...values, pageSize, (page - 1) * pageSize)
    .all<AdminBooking>();
  return {
    bookings: rows.results,
    pagination: { page, pageSize, total, pages },
    stats: {
      requested: Number(globalStats?.requested || 0),
      confirmed: Number(globalStats?.confirmed || 0),
    },
  };
}

function euroCents(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number")
    throw new Problem(400, "Συμπληρώστε έγκυρη τιμή σε ευρώ.");
  const text = String(value).trim();
  if (!/^(?:0|[1-9]\d{0,5})(?:[.,]\d{1,2})?$/.test(text))
    throw new Problem(400, "Η τιμή πρέπει να έχει έως δύο δεκαδικά ψηφία.");
  const [whole, fraction = ""] = text.split(/[.,]/),
    total = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (total < 100 || total > 60_000_000)
    throw new Problem(400, "Η τιμή πρέπει να είναι από 1 έως 600.000 ευρώ.");
  return total;
}

async function missingOrConflict(db: D1Database, id: string) {
  const exists = await db
    .prepare("SELECT id FROM bookings WHERE id=?")
    .bind(id)
    .first();
  if (!exists) throw new Problem(404, "Η κράτηση δεν βρέθηκε.");
  throw new Problem(
    409,
    "Η τιμή αλλάζει μόνο σε απλήρωτο αίτημα που περιμένει επιβεβαίωση.",
  );
}

export async function saveBookingQuote(
  db: D1Database,
  id: string,
  value: unknown,
) {
  const bookingId = cleanText(id, 100),
    total = euroCents(value);
  const result = await db
    .prepare(
      "UPDATE bookings SET total=?,updated_at=? WHERE id=? AND status='requested' AND payment_status='unpaid'",
    )
    .bind(total, new Date().toISOString(), bookingId)
    .run();
  if (!result.meta.changes) await missingOrConflict(db, bookingId);
  return { ok: true, total };
}

export async function saveBookingNote(
  db: D1Database,
  id: string,
  note: unknown,
) {
  const bookingId = cleanText(id, 100);
  if (typeof note !== "string" || note.length > 2000)
    throw new Problem(400, "Η σημείωση πρέπει να έχει έως 2.000 χαρακτήρες.");
  const result = await db
    .prepare("UPDATE bookings SET admin_note=?,updated_at=? WHERE id=?")
    .bind(note.trim(), new Date().toISOString(), bookingId)
    .run();
  if (!result.meta.changes) throw new Problem(404, "Η κράτηση δεν βρέθηκε.");
  return { ok: true };
}
