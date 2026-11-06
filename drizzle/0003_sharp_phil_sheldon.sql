CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `status_token_hash` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `request_fingerprint` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `admin_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `updated_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_request_key_unique` ON `bookings` (`request_key`);--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `enabled` integer DEFAULT 1 NOT NULL;