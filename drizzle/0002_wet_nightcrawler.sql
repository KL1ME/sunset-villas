ALTER TABLE `properties` ADD `internal_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `properties_internal_code_unique` ON `properties` (`internal_code`);