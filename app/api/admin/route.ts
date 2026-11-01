import { env } from "cloudflare:workers";
import {
  endpoint,
  json,
  body,
  sameOrigin,
  admin,
  database,
  seed,
  expireHolds,
  saveProperty,
  syncFeed,
  reserveBooking,
  cancelBooking,
  property,
} from "@/lib/server";
import { Problem, calendarUrl, cleanText } from "@/lib/domain";
export const GET = (request: Request) =>
  endpoint(async () => {
    await admin(request);
    await seed();
    await expireHolds();
    const db = database();
    const [properties, bookings, feeds] = await Promise.all([
      db.prepare("SELECT * FROM properties ORDER BY created_at,id").all(),
      db
        .prepare(
          "SELECT bookings.*,properties.name AS property_name FROM bookings JOIN properties ON properties.id=bookings.property_id ORDER BY bookings.created_at DESC LIMIT 200",
        )
        .all(),
      db
        .prepare(
          "SELECT id,property_id,provider,last_synced,error FROM calendar_feeds",
        )
        .all(),
    ]);
    return json({
      properties: properties.results,
      bookings: bookings.results,
      feeds: feeds.results,
      payments:
        env.STRIPE_SECRET_KEY?.startsWith("sk_test_") &&
        !!env.STRIPE_WEBHOOK_SECRET
          ? "test"
          : "unconfigured",
    });
  });
export const POST = (request: Request) =>
  endpoint(async () => {
    sameOrigin(request);
    await admin(request);
    const input = await body(request);
    if (input.action === "property") return json(await saveProperty(input));
    if (input.action === "feed") {
      const p = await property(input.propertyId, true),
        provider = cleanText(input.provider, 20),
        url = calendarUrl(input.url, provider),
        id = crypto.randomUUID();
      await database()
        .prepare(
          "INSERT INTO calendar_feeds (id,property_id,provider,url) VALUES (?,?,?,?) ON CONFLICT(property_id,provider) DO UPDATE SET url=excluded.url,last_synced=NULL,error=NULL",
        )
        .bind(id, p.id, provider, url)
        .run();
      const feed = await database()
        .prepare(
          "SELECT id FROM calendar_feeds WHERE property_id=? AND provider=?",
        )
        .bind(p.id, provider)
        .first<{ id: string }>();
      return json(await syncFeed(feed!.id));
    }
    if (input.action === "sync")
      return json(await syncFeed(cleanText(input.id, 100)));
    if (input.action === "confirm") {
      if (input.calendarReviewed !== true)
        throw new Problem(
          400,
          "Επιβεβαιώστε πρώτα τον έλεγχο διαθεσιμότητας στις πλατφόρμες.",
        );
      await reserveBooking(cleanText(input.id, 100), "confirmed");
      return json({ ok: true });
    }
    if (input.action === "cancel") {
      await cancelBooking(cleanText(input.id, 100));
      return json({ ok: true });
    }
    throw new Problem(400, "Άγνωστη ενέργεια.");
  });
