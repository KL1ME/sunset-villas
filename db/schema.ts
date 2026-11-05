import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  internalCode: text("internal_code").unique(),
  location: text("location").notNull(),
  description: text("description").notNull(),
  maxGuests: integer("max_guests").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  minNights: integer("min_nights").notNull().default(1),
  basePrice: integer("base_price"),
  cleaningFee: integer("cleaning_fee").notNull().default(0),
  published: integer("published").notNull().default(0),
  image: text("image"),
  exportToken: text("export_token").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  guests: integer("guests").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("requested"),
  total: integer("total"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  stripeSession: text("stripe_session").unique(),
  checkoutTokenHash: text("checkout_token_hash"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});
export const occupiedNights = sqliteTable(
  "occupied_nights",
  {
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id),
    date: text("date").notNull(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.date] })],
);
export const calendarFeeds = sqliteTable(
  "calendar_feeds",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id),
    provider: text("provider").notNull(),
    url: text("url").notNull(),
    lastSynced: text("last_synced"),
    error: text("error"),
    lastAttempt: text("last_attempt"),
    nextSync: text("next_sync"),
    failureCount: integer("failure_count").notNull().default(0),
    eventCount: integer("event_count").notNull().default(0),
    etag: text("etag"),
    lastModified: text("last_modified"),
    syncToken: text("sync_token"),
    lockUntil: text("lock_until"),
  },
  (t) => [uniqueIndex("property_provider").on(t.propertyId, t.provider)],
);
export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    feedId: text("feed_id")
      .notNull()
      .references(() => calendarFeeds.id),
    uid: text("uid").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
  },
  (t) => [uniqueIndex("feed_uid").on(t.feedId, t.uid)],
);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: text("expires_at").notNull(),
});
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  processedAt: text("processed_at").notNull(),
});

export const calendarBlocks = sqliteTable("calendar_blocks", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id),
  start: text("start").notNull(),
  end: text("end").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull(),
  releasedAt: text("released_at"),
});
