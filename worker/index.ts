import handler from "vinext/server/fetch-handler";
export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
  async scheduled(
    _event: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    if (!env.DB) return;
    ctx.waitUntil(
      (async () => {
        const { syncFeed, expireHolds } = await import("../lib/server");
        await expireHolds();
        const feeds = await env
          .DB!.prepare("SELECT id FROM calendar_feeds LIMIT 100")
          .all<{ id: string }>();
        for (const feed of feeds.results) {
          try {
            await syncFeed(feed.id);
          } catch {
            console.error("Scheduled calendar refresh failed");
          }
        }
      })(),
    );
  },
};
