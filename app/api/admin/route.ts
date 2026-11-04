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
import { Problem, cleanText } from "@/lib/domain";
import { configureCalendarFeed } from "@/lib/calendar-sync";
import { addCalendarBlock, releaseCalendarBlock } from "@/lib/calendar-store";
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
          "SELECT id,property_id,provider,last_synced,error,last_attempt,next_sync,failure_count,event_count,lock_until FROM calendar_feeds",
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
      const p = await property(input.propertyId, true);
      return json(
        await configureCalendarFeed(
          database(),
          p.id,
          cleanText(input.provider, 20),
          input.url,
        ),
      );
    }
    if (input.action === "syncProperty") {
      const p = await property(input.propertyId, true),
        feeds = (
          await database()
            .prepare("SELECT id FROM calendar_feeds WHERE property_id=?")
            .bind(p.id)
            .all<{ id: string }>()
        ).results;
      const results = [];
      for (const feed of feeds) {
        try {
          results.push(await syncFeed(feed.id));
        } catch {
          results.push({ id: feed.id, status: "failed" });
        }
      }
      const failed = results.some((r) => r.status === "failed");
      return json(
        {
          results,
          ...(failed
            ? {
                error:
                  "Ένα ή περισσότερα ημερολόγια δεν ανανεώθηκαν. Διατηρήθηκαν οι προηγούμενες δεσμεύσεις.",
              }
            : {}),
        },
        failed ? 502 : 200,
      );
    }
    if (input.action === "blockDates") {
      const p = await property(input.propertyId, true);
      return json(await addCalendarBlock(database(), p.id, input));
    }
    if (input.action === "releaseBlock")
      return json(
        await releaseCalendarBlock(database(), cleanText(input.id, 100)),
      );
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
