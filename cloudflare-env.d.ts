declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_TOKEN?: string;
    BOOKING_SECRET?: string;
    PAYMENTS_ENABLED?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SYNC_SECRET?: string;
    SITE_ORIGIN?: string;
  }
}
