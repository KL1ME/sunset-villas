CREATE TABLE `calendar_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`released_at` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `last_attempt` text;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `next_sync` text;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `failure_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `event_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `etag` text;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `last_modified` text;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `sync_token` text;--> statement-breakpoint
ALTER TABLE `calendar_feeds` ADD `lock_until` text;