import { env } from "cloudflare:workers";
import { endpoint, json, database } from "@/lib/server";
import { synchronizeDueFeeds } from "@/lib/calendar-sync";
import { Problem } from "@/lib/domain";
import { maintainBookings } from "@/lib/maintenance";
export const POST = (request: Request) =>
  endpoint(async () => {
    if (
      !env.SYNC_SECRET ||
      env.SYNC_SECRET.length < 32 ||
      request.headers.get("authorization") !== `Bearer ${env.SYNC_SECRET}`
    )
      throw new Problem(401, "Μη εξουσιοδοτημένο αίτημα.");
    await maintainBookings(database());
    const results = await synchronizeDueFeeds(database());
    await database()
      .prepare(
        "INSERT INTO site_settings (key,value) VALUES ('last_calendar_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .bind(new Date().toISOString())
      .run();
    return json(
      { results },
      results.some((r) => r.status === "failed") ? 502 : 200,
    );
  });
