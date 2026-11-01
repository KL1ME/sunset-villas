import { endpoint, json, body, sameOrigin, createBooking } from "@/lib/server";
export const POST = (request: Request) =>
  endpoint(async () => {
    sameOrigin(request);
    return json(await createBooking(request, await body(request)), 201);
  });
