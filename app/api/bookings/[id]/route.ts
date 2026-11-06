import { env } from "cloudflare:workers";
import {
  body,
  database,
  endpoint,
  json,
  sameOrigin,
  expireHolds,
} from "@/lib/server";
import { guestBooking, withdrawBooking } from "@/lib/booking-access";
import { publicSettings } from "@/lib/settings";
import { Problem } from "@/lib/domain";
type Context = { params: Promise<{ id: string }> };
const token = (request: Request) =>
  request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
export const GET = (request: Request, context: Context) =>
  endpoint(async () => {
    const { id } = await context.params;
    await expireHolds();
    const booking = await guestBooking(
      database(),
      env.BOOKING_SECRET || env.ADMIN_TOKEN,
      id,
      token(request),
    );
    return json({ booking, settings: await publicSettings(database()) });
  });
export const POST = (request: Request, context: Context) =>
  endpoint(async () => {
    sameOrigin(request);
    const { id } = await context.params;
    await guestBooking(
      database(),
      env.BOOKING_SECRET || env.ADMIN_TOKEN,
      id,
      token(request),
    );
    const input = await body(request);
    if (input.action !== "withdraw")
      throw new Problem(400, "Άγνωστη ενέργεια.");
    return json(await withdrawBooking(database(), id));
  });
