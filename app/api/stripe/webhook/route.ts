import { env } from "cloudflare:workers";
import { endpoint, json, database, expireHolds, boundedText } from "@/lib/server";
import { Problem, nightsBetween } from "@/lib/domain";
import { verifyStripeSignature } from "@/lib/payments";
export const POST = (request: Request) =>
  endpoint(async () => {
    if (!env.STRIPE_WEBHOOK_SECRET)
      throw new Problem(503, "Το webhook δεν έχει ρυθμιστεί.");
    if (Number(request.headers.get("content-length") || 0) > 200000)
      throw new Problem(413, "Υπερβολικά μεγάλο webhook.");
    const payload = await boundedText(request, 200000);
    if (payload.length > 200000)
      throw new Problem(413, "Υπερβολικά μεγάλο webhook.");
    await verifyStripeSignature(
      payload,
      request.headers.get("stripe-signature") || "",
      env.STRIPE_WEBHOOK_SECRET,
    );
    const event = JSON.parse(payload) as {
      id: string;
      type: string;
      livemode: boolean;
      data: {
        object: {
          id: string;
          metadata?: { booking_id?: string };
          payment_status: string;
          amount_total: number;
          currency: string;
        };
      };
    };
    if (!event.id || event.livemode)
      throw new Problem(400, "Υποστηρίζονται μόνο δοκιμαστικές πληρωμές.");
    const db = database();
    if (
      await db
        .prepare("SELECT id FROM webhook_events WHERE id=?")
        .bind(event.id)
        .first()
    )
      return json({ received: true });
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status !== "paid") return json({ received: true });
      const b = await db
        .prepare("SELECT * FROM bookings WHERE id=? AND stripe_session=?")
        .bind(session.metadata?.booking_id || "", session.id)
        .first<{
          id: string;
          total: number;
          status: string;
          check_in: string;
          check_out: string;
        }>();
      if (!b) throw new Problem(409, "Η κράτηση πληρωμής δεν βρέθηκε.");
      if (session.currency !== "eur" || session.amount_total !== b.total)
        throw new Problem(400, "Ασυμφωνία ποσού πληρωμής.");
      await expireHolds();
      const expected = nightsBetween(b.check_in, b.check_out).length;
      await db.batch([
        db
          .prepare(
            "UPDATE bookings SET status=CASE WHEN status='held' AND expires_at>=? AND (SELECT COUNT(*) FROM occupied_nights WHERE booking_id=bookings.id)=? THEN 'confirmed' WHEN status='confirmed' THEN 'confirmed' ELSE 'payment_review' END,payment_status='paid' WHERE id=?",
          )
          .bind(new Date().toISOString(), expected, b.id),
        db
          .prepare(
            "INSERT OR IGNORE INTO webhook_events (id,processed_at) VALUES (?,?)",
          )
          .bind(event.id, new Date().toISOString()),
      ]);
    }
    return json({ received: true });
  });
