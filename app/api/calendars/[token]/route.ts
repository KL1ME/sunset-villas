import { endpoint, database, expireHolds } from "@/lib/server";
import { exportCalendar, Problem } from "@/lib/domain";
export const GET = (
  _request: Request,
  context: { params: Promise<{ token: string }> },
) =>
  endpoint(async () => {
    const { token } = await context.params;
    if (token.length < 64) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
    const p = await database()
      .prepare("SELECT id FROM properties WHERE export_token=?")
      .bind(token)
      .first<{ id: string }>();
    if (!p) throw new Problem(404, "Δεν βρέθηκε ημερολόγιο.");
    await expireHolds();
    const rows = await database()
      .prepare(
        "SELECT id,check_in,check_out FROM bookings WHERE property_id=? AND status IN ('confirmed','held')",
      )
      .bind(p.id)
      .all<{ id: string; check_in: string; check_out: string }>();
    return new Response(exportCalendar(rows.results), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="availability.ics"',
        "X-Robots-Tag": "noindex",
      },
    });
  });
