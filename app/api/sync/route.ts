import { env } from "cloudflare:workers";
import { endpoint, json, database, syncFeed } from "@/lib/server";
import { Problem } from "@/lib/domain";
export const POST = (request: Request) =>
  endpoint(async () => {
    if (
      !env.SYNC_SECRET ||
      env.SYNC_SECRET.length < 32 ||
      request.headers.get("authorization") !== `Bearer ${env.SYNC_SECRET}`
    )
      throw new Problem(401, "Μη εξουσιοδοτημένο αίτημα.");
    const feeds = (
      await database()
        .prepare("SELECT id FROM calendar_feeds LIMIT 100")
        .all<{ id: string }>()
    ).results;
    const results = [];
    for (const f of feeds) {
      try {
        await syncFeed(f.id);
        results.push({ id: f.id, ok: true });
      } catch {
        results.push({ id: f.id, ok: false });
      }
    }
    return json({ results }, results.some((r) => !r.ok) ? 502 : 200);
  });
