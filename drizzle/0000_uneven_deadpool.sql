CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`guests` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`total` integer,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`stripe_session` text,
	`checkout_token_hash` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_stripe_session_unique` ON `bookings` (`stripe_session`);--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`feed_id` text NOT NULL,
	`uid` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	FOREIGN KEY (`feed_id`) REFERENCES `calendar_feeds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feed_uid` ON `calendar_events` (`feed_id`,`uid`);--> statement-breakpoint
CREATE TABLE `calendar_feeds` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`provider` text NOT NULL,
	`url` text NOT NULL,
	`last_synced` text,
	`error` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_provider` ON `calendar_feeds` (`property_id`,`provider`);--> statement-breakpoint
CREATE TABLE `occupied_nights` (
	`property_id` text NOT NULL,
	`date` text NOT NULL,
	`booking_id` text NOT NULL,
	PRIMARY KEY(`property_id`, `date`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`max_guests` integer NOT NULL,
	`bedrooms` integer NOT NULL,
	`min_nights` integer DEFAULT 1 NOT NULL,
	`base_price` integer,
	`cleaning_fee` integer DEFAULT 0 NOT NULL,
	`published` integer DEFAULT 0 NOT NULL,
	`image` text,
	`export_token` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `properties_slug_unique` ON `properties` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `properties_export_token_unique` ON `properties` (`export_token`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`processed_at` text NOT NULL
);
