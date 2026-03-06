ALTER TABLE `media` ADD `folder` text;--> statement-breakpoint
CREATE INDEX `idx_media_folder` ON `media` (`folder`);