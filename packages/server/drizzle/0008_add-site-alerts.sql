CREATE TABLE `site_alerts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `message` text NOT NULL,
  `severity` text NOT NULL DEFAULT 'warning',
  `is_active` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
INSERT INTO `site_alerts` (`id`, `message`, `severity`, `is_active`, `created_at`, `updated_at`)
VALUES (1, '', 'warning', 0, datetime('now'), datetime('now'));
