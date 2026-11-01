import { endpoint, json, property, blocked, refreshStale } from "@/lib/server";
import { validateStay, quote } from "@/lib/domain";
export const GET = (request: Request) =>
  endpoint(async () => {
    const q = new URL(request.url).searchParams;
    const p = await property(q.get("propertyId"));
    const stay = validateStay(
      {
        checkIn: q.get("checkIn"),
        checkOut: q.get("checkOut"),
        guests: q.get("guests"),
      },
      p,
    );
    const feeds = await refreshStale(p.id);
    const dates = await blocked(p.id, stay.checkIn, stay.checkOut);
    return json({
      available: dates.length === 0,
      blocked: dates,
      total: quote(stay.nights.length, p.base_price, p.cleaning_fee),
      nights: stay.nights.length,
      calendarConnected: feeds > 0,
      requiresHostConfirmation: true,
    });
  });
