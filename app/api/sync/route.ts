import { env } from "cloudflare:workers";
import { endpoint, json, database } from "@/lib/server";
import { synchronizeDueFeeds } from "@/lib/calendar-sync";
import { Problem } from "@/lib/domain";
export const POST = (request: Request) =>
  endpoint(async () => {
    if (
      !env.SYNC_SECRET ||
      env.SYNC_SECRET.length < 32 ||
      request.headers.get("authorization") !== `Bearer ${env.SYNC_SECRET}`
    )
      throw new Problem(401, "Μη εξουσιοδοτημένο αίτημα.");
    const results = await synchronizeDueFeeds(database());
    return json(
      { results },
      results.some((r) => r.status === "failed") ? 502 : 200,
    );
  });
