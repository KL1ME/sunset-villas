import {
  endpoint,
  json,
  admin,
  property,
  database,
  expireHolds,
} from "@/lib/server";
import { monthRange, calendarEntries } from "@/lib/calendar-store";
export const GET = (request: Request) =>
  endpoint(async () => {
    await admin(request);
    const params = new URL(request.url).searchParams,
      p = await property(params.get("propertyId"), true),
      { start, end } = monthRange(params.get("month"));
    await expireHolds();
    return json({
      propertyId: p.id,
      start,
      end,
      entries: await calendarEntries(database(), p.id, start, end),
    });
  });
