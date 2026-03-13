CREATE TABLE `site_config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`value` text DEFAULT '{}' NOT NULL,
	CONSTRAINT "single_row" CHECK("site_config"."id" = 1)
);
