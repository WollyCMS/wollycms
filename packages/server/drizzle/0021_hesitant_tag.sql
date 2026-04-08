ALTER TABLE `block_types` ADD `category` text;
--> statement-breakpoint
UPDATE `block_types` SET `category` = 'Text' WHERE `slug` IN ('rich_text', 'accordion');
--> statement-breakpoint
UPDATE `block_types` SET `category` = 'Media' WHERE `slug` IN ('image', 'video');
--> statement-breakpoint
UPDATE `block_types` SET `category` = 'Navigation' WHERE `slug` IN ('link_list', 'cta_button', 'submenu');
--> statement-breakpoint
UPDATE `block_types` SET `category` = 'Data' WHERE `slug` IN ('contact_list', 'location', 'content_listing');
--> statement-breakpoint
UPDATE `block_types` SET `category` = 'Layout' WHERE `slug` IN ('hero', 'two_column');
--> statement-breakpoint
UPDATE `block_types` SET `category` = 'Media' WHERE `slug` = 'embed';
