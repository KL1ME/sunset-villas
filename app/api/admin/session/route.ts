import { env } from "cloudflare:workers";
import {
  admin,
  body,
  database,
  endpoint,
  json,
  sameOrigin,
} from "@/lib/server";
import {
  createAdminSession,
  hashSecret,
  sameSecret,
  sessionCookie,
} from "@/lib/auth";
import { Problem } from "@/lib/domain";
export const GET = (request: Request) =>
  endpoint(async () => {
    await admin(request);
    return json({ authenticated: true });
  });
export const POST = (request: Request) =>
  endpoint(async () => {
    sameOrigin(request);
    const input = await body(request),
      expected = env.ADMIN_TOKEN;
    if (!expected || expected.length < 32)
      throw new Problem(503, "Η πρόσβαση διαχείρισης δεν έχει ρυθμιστεί.");
    const bucket = Math.floor(Date.now() / (15 * 60000));
    const key =
      "login:" +
      (await hashSecret(
        (request.headers.get("cf-connecting-ip") || "loopback") + ":" + bucket,
      ));
    const count = await database()
      .prepare(
        "INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
      )
      .bind(key, new Date(Date.now() + 30 * 60000).toISOString())
      .first<{ count: number }>();
    if (count && count.count > 20)
      throw new Problem(
        429,
        "Πολλές προσπάθειες σύνδεσης. Δοκιμάστε σε 15 λεπτά.",
      );
    if (
      typeof input.token !== "string" ||
      input.token.length > 1000 ||
      !(await sameSecret(expected, input.token))
    )
      throw new Problem(401, "Μη έγκυρο κλειδί διαχείρισης.");
    return Response.json(
      { authenticated: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": sessionCookie(
            request,
            await createAdminSession(expected),
          ),
        },
      },
    );
  });
export const DELETE = (request: Request) =>
  endpoint(async () => {
    sameOrigin(request);
    return Response.json(
      { authenticated: false },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": sessionCookie(request, "", true),
        },
      },
    );
  });
