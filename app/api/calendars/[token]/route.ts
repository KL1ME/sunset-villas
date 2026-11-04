import { endpoint, database, expireHolds } from "@/lib/server";
import { Problem } from "@/lib/domain";
import { propertyCalendarExport } from "@/lib/calendar-store";
export const GET = (
  _request: Request,
  context: { params: Promise<{ token: string }> },
) =>
  endpoint(async () => {
    const { token: requested } = await context.params;
    const token = requested.endsWith(".ics")
      ? requested.slice(0, -4)
      : requested;
    if (token.length < 64) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
    const p = await database()
      .prepare("SELECT id FROM properties WHERE export_token=?")
      .bind(token)
      .first<{ id: string }>();
    if (!p) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
    await expireHolds();
    return new Response(await propertyCalendarExport(database(), p.id), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="availability.ics"',
        "X-Robots-Tag": "noindex",
      },
    });
  });
