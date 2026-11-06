import handler from "vinext/server/fetch-handler";
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const response = await handler.fetch(request, env, ctx);
    const secured = new Response(response.body, response);
    secured.headers.set("Referrer-Policy", "no-referrer");
    secured.headers.set("X-Content-Type-Options", "nosniff");
    if (/^\/(api|admin|booking)(\/|$)/.test(new URL(request.url).pathname)) {
      secured.headers.set("Cache-Control", "no-store");
      secured.headers.set("X-Robots-Tag", "noindex, nofollow");
      secured.headers.set("X-Frame-Options", "DENY");
    }
    return secured;
  },
  async scheduled(
    _event: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    if (!env.DB) return;
    ctx.waitUntil(
      (async () => {
        const { expireHolds } = await import("../lib/server");
        const { synchronizeDueFeeds } = await import("../lib/calendar-sync");
        const { maintainBookings } = await import("../lib/maintenance");
        await expireHolds();
        await maintainBookings(env.DB!);
        const results = await synchronizeDueFeeds(env.DB!);
        await env
          .DB!.prepare(
            "INSERT INTO site_settings (key,value) VALUES ('last_calendar_sync',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          )
          .bind(new Date().toISOString())
          .run();
        if (results.some((result) => result.status === "failed"))
          console.error("Scheduled calendar refresh failed");
      })(),
    );
  },
};
