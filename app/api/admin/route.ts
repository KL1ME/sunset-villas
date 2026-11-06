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
import { configureCalendarFeed, setFeedEnabled } from "@/lib/calendar-sync";
import { addCalendarBlock, releaseCalendarBlock } from "@/lib/calendar-store";
import { publicSettings, saveSettings } from "@/lib/settings";
import {
  listAdminBookings,
  saveBookingQuote,
  saveBookingNote,
} from "@/lib/admin-bookings";
import { statusLink } from "@/lib/booking-access";
export const GET = (request: Request) =>
  endpoint(async () => {
    await admin(request);
    await seed();
    await expireHolds();
    const db = database();
    const [properties, bookingPage, feeds, settings, maintenance] =
      await Promise.all([
        db.prepare("SELECT * FROM properties ORDER BY created_at,id").all(),
        listAdminBookings(db, new URL(request.url).searchParams),
        db
          .prepare(
            "SELECT id,property_id,provider,enabled,last_synced,error,last_attempt,next_sync,failure_count,event_count,lock_until FROM calendar_feeds",
          )
          .all(),
        publicSettings(db),
        db
          .prepare(
            "SELECT key,value FROM site_settings WHERE key IN ('last_maintenance','last_calendar_sync')",
          )
          .all(),
      ]);
    return json({
      properties: properties.results,
      ...bookingPage,
      feeds: feeds.results,
      settings,
      system: maintenance.results,
      payments: "disabled",
    });
  });
export const POST = (request: Request) =>
  endpoint(async () => {
    sameOrigin(request);
    await admin(request);
    const input = await body(request);
    if (input.action === "settings")
      return json(await saveSettings(database(), input));
    if (input.action === "quote")
      return json(
        await saveBookingQuote(
          database(),
          cleanText(input.id, 100),
          input.total,
        ),
      );
    if (input.action === "note")
      return json(
        await saveBookingNote(database(), cleanText(input.id, 100), input.note),
      );
    if (input.action === "statusLink")
      return json(
        await statusLink(
          database(),
          env.BOOKING_SECRET || env.ADMIN_TOKEN,
          cleanText(input.id, 100),
          new URL(request.url).origin,
        ),
      );
    if (input.action === "feedEnabled")
      return json(
        await setFeedEnabled(
          database(),
          cleanText(input.id, 100),
          input.enabled as boolean,
        ),
      );
    if (input.action === "property") return json(await saveProperty(input));
    if (input.action === "feed") {
      const p = await property(input.propertyId, true);
      return json(
        await configureCalendarFeed(
          database(),
          p.id,
          cleanText(input.provider, 20),
          input.url,
          { enabled: input.enabled !== false },
        ),
      );
    }
    if (input.action === "syncProperty") {
      const p = await property(input.propertyId, true),
        feeds = (
          await database()
            .prepare(
              "SELECT id FROM calendar_feeds WHERE property_id=? AND enabled=1",
            )
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
      if (
        input.expectedTotal !== undefined &&
        (typeof input.expectedTotal !== "number" ||
          !Number.isSafeInteger(input.expectedTotal))
      )
        throw new Problem(400, "Μη έγκυρη συμφωνημένη τιμή.");
      await reserveBooking(
        cleanText(input.id, 100),
        "confirmed",
        input.expectedTotal as number | undefined,
      );
      return json({ ok: true });
    }
    if (input.action === "cancel") {
      await cancelBooking(cleanText(input.id, 100));
      return json({ ok: true });
    }
    throw new Problem(400, "Άγνωστη ενέργεια.");
  });
