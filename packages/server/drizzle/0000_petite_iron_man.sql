CREATE TABLE `blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type_id` integer NOT NULL,
	`title` text,
	`fields` text,
	`is_reusable` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`type_id`) REFERENCES `block_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_blocks_type` ON `blocks` (`type_id`);--> statement-breakpoint
CREATE INDEX `idx_blocks_reusable` ON `blocks` (`is_reusable`);--> statement-breakpoint
CREATE TABLE `page_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`block_id` integer NOT NULL,
	`region` text NOT NULL,
	`position` integer NOT NULL,
	`is_shared` integer DEFAULT false NOT NULL,
	`overrides` text,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_page_blocks_page` ON `page_blocks` (`page_id`);--> statement-breakpoint
CREATE INDEX `idx_page_blocks_block` ON `page_blocks` (`block_id`);--> statement-breakpoint
CREATE INDEX `idx_page_blocks_page_region` ON `page_blocks` (`page_id`,`region`);--> statement-breakpoint
CREATE TABLE `block_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`fields_schema` text,
	`icon` text,
	`settings` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `block_types_slug_unique` ON `block_types` (`slug`);--> statement-breakpoint
CREATE TABLE `content_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`fields_schema` text,
	`regions` text,
	`settings` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `content_types_slug_unique` ON `content_types` (`slug`);--> statement-breakpoint
CREATE TABLE `content_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`term_id` integer NOT NULL,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_content_terms_entity` ON `content_terms` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_content_terms_term` ON `content_terms` (`term_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`alt_text` text,
	`title` text,
	`path` text NOT NULL,
	`variants` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_mime` ON `media` (`mime_type`);--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`menu_id` integer NOT NULL,
	`parent_id` integer,
	`title` text NOT NULL,
	`url` text,
	`page_id` integer,
	`target` text DEFAULT '_self' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`is_expanded` integer DEFAULT false NOT NULL,
	`attributes` text,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_menu_items_menu` ON `menu_items` (`menu_id`);--> statement-breakpoint
CREATE INDEX `idx_menu_items_parent` ON `menu_items` (`parent_id`);--> statement-breakpoint
CREATE TABLE `menus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_slug_unique` ON `menus` (`slug`);--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type_id` integer NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`fields` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text,
	`created_by` integer,
	FOREIGN KEY (`type_id`) REFERENCES `content_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_unique` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pages_slug` ON `pages` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_pages_type` ON `pages` (`type_id`);--> statement-breakpoint
CREATE INDEX `idx_pages_status` ON `pages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_pages_type_status` ON `pages` (`type_id`,`status`);--> statement-breakpoint
CREATE TABLE `redirects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_path` text NOT NULL,
	`to_path` text NOT NULL,
	`status_code` integer DEFAULT 301 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_redirects_from` ON `redirects` (`from_path`);--> statement-breakpoint
CREATE TABLE `taxonomies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`hierarchical` integer DEFAULT false NOT NULL,
	`settings` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `taxonomies_slug_unique` ON `taxonomies` (`slug`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`taxonomy_id` integer NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`weight` integer DEFAULT 0 NOT NULL,
	`fields` text,
	FOREIGN KEY (`taxonomy_id`) REFERENCES `taxonomies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_terms_taxonomy` ON `terms` (`taxonomy_id`);--> statement-breakpoint
CREATE INDEX `idx_terms_parent` ON `terms` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_terms_slug` ON `terms` (`taxonomy_id`,`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);