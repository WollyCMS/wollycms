-- Add locale and translation support to pages
ALTER TABLE `pages` ADD `locale` text NOT NULL DEFAULT 'en';
--> statement-breakpoint
ALTER TABLE `pages` ADD `translation_group_id` text;
--> statement-breakpoint
ALTER TABLE `page_revisions` ADD `locale` text NOT NULL DEFAULT 'en';
--> statement-breakpoint
-- Replace global slug uniqueness with per-locale uniqueness
DROP INDEX IF EXISTS `pages_slug_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_slug_locale_unique` ON `pages` (`slug`, `locale`);
--> statement-breakpoint
CREATE INDEX `idx_pages_locale` ON `pages` (`locale`);
--> statement-breakpoint
CREATE INDEX `idx_pages_translation_group` ON `pages` (`translation_group_id`);
