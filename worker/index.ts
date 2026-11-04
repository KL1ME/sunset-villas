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
        const { expireHolds } = await import("../lib/server");
        const { synchronizeDueFeeds } = await import("../lib/calendar-sync");
        await expireHolds();
        const results = await synchronizeDueFeeds(env.DB!);
        if (results.some((result) => result.status === "failed"))
          console.error("Scheduled calendar refresh failed");
      })(),
    );
  },
};
