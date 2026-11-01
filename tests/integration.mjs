// Run only against the disposable local D1 preview, never a deployed environment.
import assert from "node:assert/strict";
const base = process.env.API_BASE_URL || "http://127.0.0.1:5174";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Integration tests require loopback.");
const token = process.env.TEST_ADMIN_TOKEN;
if (!token)
  throw new Error("Set TEST_ADMIN_TOKEN to the local preview ADMIN_TOKEN.");
async function call(path, input, auth = false, origin = true) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${token}`;
  if (input !== undefined) {
    headers["Content-Type"] = "application/json";
    if (origin) headers.Origin = base;
  }
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
  return { status: r.status, value };
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
      `/api/availability?propertyId=${id}&checkIn=2027-06-01&checkOut=2027-06-04&guests=2`,
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
  checkIn: "2027-06-01",
  checkOut: "2027-06-04",
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
const blocked = await call(
  `/api/availability?propertyId=${id}&checkIn=2027-06-01&checkOut=2027-06-04&guests=2`,
);
check(
  blocked.status === 200 &&
    blocked.value.available === false &&
    blocked.value.blocked.length === 3,
  "confirmed nights block availability",
);
const adjacent = await call(
  `/api/availability?propertyId=${id}&checkIn=2027-06-04&checkOut=2027-06-06&guests=2`,
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
      `/api/availability?propertyId=${id}&checkIn=2027-06-01&checkOut=2027-06-04&guests=2`,
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
console.log(`${checks} local API integration checks passed.`);
