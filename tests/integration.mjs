// Run only against the disposable local D1 preview, never a deployed environment.
import assert from "node:assert/strict";
const arrival = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
const departure = new Date(Date.parse(arrival) + 3 * 86400000)
  .toISOString()
  .slice(0, 10);
const adjacentDeparture = new Date(Date.parse(arrival) + 5 * 86400000)
  .toISOString()
  .slice(0, 10);
const base = process.env.API_BASE_URL || "http://127.0.0.1:5174";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Integration tests require loopback.");
const token = process.env.TEST_ADMIN_TOKEN;
if (!token)
  throw new Error("Set TEST_ADMIN_TOKEN to the local preview ADMIN_TOKEN.");
async function call(
  path,
  input,
  auth = false,
  origin = true,
  extraHeaders = {},
) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${token}`;
  if (input !== undefined) {
    headers["Content-Type"] = "application/json";
    if (origin) headers.Origin = base;
  }
  Object.assign(headers, extraHeaders);
  const r = await fetch(base + path, {
    method: input === undefined ? "GET" : "POST",
    headers,
    body: input === undefined ? undefined : JSON.stringify(input),
  });
  const text = await r.text();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    value = text;
  }
  return { status: r.status, value, cookie: r.headers.get("set-cookie") };
}
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
}
check(
  (await call("/api/admin")).status === 401,
  "admin rejects anonymous reads",
);
const login = await call("/api/admin/session", { token });
check(
  login.status === 200 &&
    login.cookie?.includes("HttpOnly") &&
    login.cookie?.includes("SameSite=Strict"),
  "owner login creates a protected session cookie",
);
const sessionHeaders = { Cookie: login.cookie?.split(";")[0] || "" };
check(
  (await call("/api/admin", undefined, false, true, sessionHeaders)).status ===
    200,
  "owner session authenticates admin requests without a browser bearer token",
);
check(
  (await call("/api/admin/session", { token }, false, false)).status === 403,
  "owner login rejects cross-origin requests",
);
const seeded = await call("/api/admin", undefined, true);
const seededK1 = seeded.value.properties.find(
  (p) => p.id === "sunset-luxury-villa",
);
const seededK2 = seeded.value.properties.find(
  (p) => p.id === "sunset-luxury-villa-k2",
);
check(
  seededK1?.internal_code === "K1" && seededK2?.internal_code === "K2",
  "owner calendar codes identify the correct properties",
);
check(
  seededK2.published === 0 &&
    (
      await call(
        `/api/availability?propertyId=${seededK2.id}&checkIn=${arrival}&checkOut=${departure}&guests=2`,
      )
    ).status === 404,
  "second calendar property starts as a private draft",
);
const seededAgain = await call("/api/admin", undefined, true);
check(
  [seededK1, seededK2].every(
    (unit) =>
      seededAgain.value.properties.find((p) => p.id === unit.id)
        ?.export_token === unit.export_token,
  ),
  "repeated initialization preserves existing calendar export tokens",
);
const create = await call(
  "/api/admin",
  {
    action: "property",
    name: "Local integration fixture",
    location: "Test only",
    description: "Disposable local fixture, never deployed",
    maxGuests: 6,
    bedrooms: 2,
    minNights: 2,
    basePrice: 145.5,
    cleaningFee: 30,
    published: false,
    image: "/photos/spiti1.jpg",
  },
  true,
);
check(create.status === 200, "admin creates a draft property");
const id = create.value.id;
check(
  (
    await call(
      `/api/availability?propertyId=${id}&checkIn=${arrival}&checkOut=${departure}&guests=2`,
    )
  ).status === 404,
  "draft stays private",
);
const update = await call(
  "/api/admin",
  {
    action: "property",
    id,
    name: "Local integration fixture",
    location: "Test only",
    description: "Disposable local fixture, never deployed",
    maxGuests: 6,
    bedrooms: 2,
    minNights: 2,
    basePrice: 145.5,
    cleaningFee: 30,
    published: true,
    image: "/photos/spiti1.jpg",
  },
  true,
);
check(update.status === 200, "admin can publish property");
const stay = {
  propertyId: id,
  checkIn: arrival,
  checkOut: departure,
  guests: 2,
  name: "Local test fixture",
  email: `fixture-${Date.now()}@example.invalid`,
  phone: "",
  consent: true,
  total: 1,
};
check(
  (await call("/api/bookings", stay, false, false)).status === 403,
  "cross-origin reservation rejected",
);
check(
  (await call("/api/bookings", { ...stay, guests: 7 })).status === 400,
  "server rejects excess guests",
);
const a = await call("/api/bookings", stay),
  b = await call("/api/bookings", { ...stay, name: "Another local fixture" });
check(
  a.status === 201 && b.status === 201,
  "requests may coexist before approval",
);
check(
  typeof a.value.statusToken === "string" && a.value.statusToken.length === 64,
  "request returns a private guest access token",
);
check(
  (await call(`/api/bookings/${a.value.id}`)).status === 404,
  "a booking UUID alone never reveals guest status",
);
const guestAHeaders = { Authorization: `Bearer ${a.value.statusToken}` };
const privateA = await call(
  `/api/bookings/${a.value.id}`,
  undefined,
  false,
  true,
  guestAHeaders,
);
check(
  privateA.status === 200 &&
    privateA.value.booking.status === "requested" &&
    !JSON.stringify(privateA.value.booking).includes("example.invalid"),
  "private guest status contains stay details without personal contact information",
);
check(
  a.value.total === 46650,
  "server ignores forged total and quotes integer cents",
);
const approvals = await Promise.all(
  [a, b].map((r) =>
    call(
      "/api/admin",
      { action: "confirm", id: r.value.id, calendarReviewed: true },
      true,
    ),
  ),
);
check(
  approvals.filter((r) => r.status === 200).length === 1 &&
    approvals.filter((r) => r.status === 409).length === 1,
  "concurrent overlapping approvals have exactly one winner",
);
const winningId = approvals[0].status === 200 ? a.value.id : b.value.id;
check(
  (
    await call(
      "/api/admin",
      { action: "confirm", id: winningId, calendarReviewed: true },
      true,
    )
  ).status === 409,
  "same-booking confirmation cannot claim its nights twice",
);
const blocked = await call(
  `/api/availability?propertyId=${id}&checkIn=${arrival}&checkOut=${departure}&guests=2`,
);
check(
  blocked.status === 200 &&
    blocked.value.available === false &&
    blocked.value.blocked.length === 3,
  "confirmed nights block availability",
);
const adjacent = await call(
  `/api/availability?propertyId=${id}&checkIn=${departure}&checkOut=${adjacentDeparture}&guests=2`,
);
check(
  adjacent.value.available === true,
  "checkout day remains available for next arrival",
);
const dashboard = await call("/api/admin", undefined, true),
  p = dashboard.value.properties.find((p) => p.id === id);
const calendar = await call("/api/calendars/" + p.export_token);
check(
  calendar.status === 200 &&
    calendar.value.includes("SUMMARY:Reserved") &&
    !calendar.value.includes("Local test fixture") &&
    !calendar.value.includes("example.invalid"),
  "export hides all guest identity",
);
const winner = approvals[0].status === 200 ? a.value.id : b.value.id;
check(
  (await call("/api/admin", { action: "cancel", id: winner }, true)).status ===
    200,
  "unpaid confirmation can be cancelled",
);
check(
  (
    await call(
      `/api/availability?propertyId=${id}&checkIn=${arrival}&checkOut=${departure}&guests=2`,
    )
  ).value.available === true,
  "cancellation releases nights",
);
check(
  (
    await call(
      "/api/admin",
      {
        action: "feed",
        propertyId: id,
        provider: "airbnb",
        url: "https://127.0.0.1/private.ics",
      },
      true,
    )
  ).status === 400,
  "calendar SSRF rejected before fetching",
);
check(
  (
    await call(
      "/api/checkout",
      { id: b.value.id, calendarReviewed: true },
      true,
    )
  ).status === 503,
  "checkout fails closed while Stripe is unconfigured",
);
check(
  (await call("/api/sync", {})).status === 401,
  "scheduled HTTP endpoint rejects unauthenticated callers",
);
const closure = await call(
  "/api/admin",
  {
    action: "blockDates",
    propertyId: id,
    start: arrival,
    end: departure,
    note: "Private owner fixture",
  },
  true,
);
check(closure.status === 200, "owner can close dates without a fake booking");
check(
  (
    await call(
      `/api/availability?propertyId=${id}&checkIn=${arrival}&checkOut=${departure}&guests=2`,
    )
  ).value.available === false,
  "manual closure blocks availability",
);
const exported = await call("/api/calendars/" + p.export_token + ".ics");
check(
  exported.status === 200 &&
    exported.value.includes("SUMMARY:Reserved") &&
    !exported.value.includes("Private owner fixture"),
  "ICS suffix export includes closure but omits private note",
);
const grid = await call(
  `/api/admin/calendar?propertyId=${id}&month=${arrival.slice(0, 7)}`,
  undefined,
  true,
);
check(
  grid.status === 200 &&
    grid.value.entries.some(
      (e) => e.source === "manual" && e.id === closure.value.id,
    ),
  "unified monthly calendar includes manual closure",
);
check(
  (
    await call(
      `/api/admin/calendar?propertyId=${id}&month=${arrival.slice(0, 7)}`,
    )
  ).status === 401,
  "calendar details require owner authentication",
);
check(
  (
    await call(
      `/api/admin/calendar?propertyId=${id}&month=invalid`,
      undefined,
      true,
    )
  ).status === 400,
  "calendar rejects malformed month",
);
check(
  (
    await call(
      "/api/admin",
      { action: "releaseBlock", id: closure.value.id },
      true,
    )
  ).status === 200,
  "owner can release own manual closure",
);
check(
  (
    await call(
      `/api/availability?propertyId=${id}&checkIn=${arrival}&checkOut=${departure}&guests=2`,
    )
  ).value.available === true,
  "release opens dates when no other source blocks them",
);

const laterArrival = new Date(Date.parse(arrival) + 100 * 86400000)
  .toISOString()
  .slice(0, 10);
const laterDeparture = new Date(Date.parse(laterArrival) + 2 * 86400000)
  .toISOString()
  .slice(0, 10);
const retryStay = {
  ...stay,
  checkIn: laterArrival,
  checkOut: laterDeparture,
  requestKey: crypto.randomUUID(),
};
const retryA = await call("/api/bookings", retryStay),
  retryB = await call("/api/bookings", retryStay);
check(
  retryA.status === 201 &&
    retryB.status === 201 &&
    retryA.value.id === retryB.value.id &&
    retryA.value.statusToken === retryB.value.statusToken,
  "retrying the same request is idempotent and preserves its private link",
);
check(
  (await call("/api/bookings", { ...retryStay, name: "Different intent" }))
    .status === 409,
  "an idempotency key cannot submit changed guest details",
);
check(
  (
    await call(
      "/api/admin",
      { action: "quote", id: retryA.value.id, total: "215,35" },
      true,
    )
  ).value.total === 21535,
  "owner can set an exact agreed total in cents",
);
check(
  (
    await call(
      "/api/admin",
      { action: "note", id: retryA.value.id, note: "Private fixture note" },
      true,
    )
  ).status === 200,
  "owner can store a private booking note",
);
const retryHeaders = { Authorization: `Bearer ${retryA.value.statusToken}` };
const refreshedGuest = await call(
  `/api/bookings/${retryA.value.id}`,
  undefined,
  false,
  true,
  retryHeaders,
);
check(
  refreshedGuest.value.booking.total === 21535 &&
    !JSON.stringify(refreshedGuest.value).includes("Private fixture note"),
  "guest sees the agreed total without the private admin note",
);
check(
  (
    await call(
      `/api/bookings/${retryA.value.id}`,
      { action: "withdraw" },
      false,
      true,
      retryHeaders,
    )
  ).status === 200,
  "guest may withdraw a pending request with private authorization",
);
check(
  (
    await call(
      `/api/bookings/${retryA.value.id}`,
      undefined,
      false,
      true,
      retryHeaders,
    )
  ).value.booking.status === "cancelled",
  "guest status reflects withdrawal",
);
const longArrival = new Date(Date.parse(arrival) + 200 * 86400000)
  .toISOString()
  .slice(0, 10);
const longDeparture = new Date(Date.parse(longArrival) + 60 * 86400000)
  .toISOString()
  .slice(0, 10);
const longRequest = await call("/api/bookings", {
  ...stay,
  checkIn: longArrival,
  checkOut: longDeparture,
  requestKey: crypto.randomUUID(),
});
check(
  longRequest.status === 201 &&
    (
      await call(
        "/api/admin",
        { action: "confirm", id: longRequest.value.id, calendarReviewed: true },
        true,
      )
    ).status === 200,
  "native Worker confirms a60-night stay within the D1 statement budget",
);
check(
  (
    await call(
      `/api/availability?propertyId=${id}&checkIn=${longArrival}&checkOut=${longDeparture}&guests=2`,
    )
  ).value.blocked.length === 60,
  "all60 confirmed nights are blocked",
);
await call("/api/admin", { action: "cancel", id: longRequest.value.id }, true);
const paged = await call(
  "/api/admin?pageSize=1&status=cancelled",
  undefined,
  true,
);
check(
  paged.value.bookings.length <= 1 &&
    paged.value.pagination.total >= 1 &&
    typeof paged.value.stats.requested === "number",
  "owner API returns filtered pagination and global stats",
);
check(
  (await call("/api/health")).value.payments === "disabled",
  "public health reports payments disabled",
);
console.log(`${checks} local API integration checks passed.`);
