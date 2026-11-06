import { database, endpoint, json } from "@/lib/server";
export const GET = () =>
  endpoint(async () => {
    await database().prepare("SELECT key FROM site_settings LIMIT 1").all();
    return json({
      ok: true,
      payments: "disabled",
      time: new Date().toISOString(),
    });
  });
