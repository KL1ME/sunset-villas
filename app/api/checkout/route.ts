import { env } from "cloudflare:workers";
import {
  endpoint,
  json,
  body,
  sameOrigin,
  admin,
  database,
  reserveBooking,
} from "@/lib/server";
import { Problem, cleanText } from "@/lib/domain";
export const POST = (request: Request) =>
  endpoint(async () => {
    sameOrigin(request);
    await admin(request);
    if (
      !env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ||
      !env.STRIPE_WEBHOOK_SECRET
    )
      throw new Problem(503, "Οι δοκιμαστικές πληρωμές δεν έχουν συνδεθεί.");
    const input = await body(request);
    if (input.calendarReviewed !== true)
      throw new Problem(
        400,
        "Επιβεβαιώστε τον έλεγχο διαθεσιμότητας στις πλατφόρμες.",
      );
    const id = cleanText(input.id, 100),
      db = database();
    const stored = await db
      .prepare("SELECT total FROM bookings WHERE id=?")
      .bind(id)
      .first<{ total: number | null }>();
    if (!stored || stored.total === null || stored.total < 100)
      throw new Problem(
        400,
        "Χρειάζεται εγκεκριμένη τιμή πριν από τη δοκιμή πληρωμής.",
      );
    const origin = env.SITE_ORIGIN;
    if (!origin || new URL(origin).protocol !== "https:")
      throw new Problem(503, "Χρειάζεται ρύθμιση του HTTPS SITE_ORIGIN.");
    const booking = await reserveBooking(id, "held");
    const form = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      customer_email: (await db
        .prepare("SELECT email FROM bookings WHERE id=?")
        .bind(id)
        .first<{ email: string }>())!.email,
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(booking.total),
      "line_items[0][price_data][product_data][name]": `Sunset stay · ${booking.check_in} – ${booking.check_out}`,
      "line_items[0][quantity]": "1",
      "metadata[booking_id]": id,
      success_url: origin + "/?payment=received",
      cancel_url: origin + "/?payment=cancelled",
      expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
    });
    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": "booking-" + id,
        },
        body: form,
      },
    );
    if (!response.ok)
      throw new Problem(
        502,
        "Η Stripe δεν δημιούργησε checkout. Η προσωρινή δέσμευση θα λήξει αυτόματα.",
      );
    const session = (await response.json()) as { id: string; url: string };
    if (!session.id || !session.url?.startsWith("https://checkout.stripe.com/"))
      throw new Problem(502, "Μη έγκυρη απάντηση πληρωμής.");
    await db
      .prepare(
        "UPDATE bookings SET stripe_session=? WHERE id=? AND status='held'",
      )
      .bind(session.id, id)
      .run();
    return json({ url: session.url, testMode: true });
  });
