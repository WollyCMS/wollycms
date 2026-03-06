import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './system.ts';

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  altText: text('alt_text'),
  title: text('title'),
  folder: text('folder'),
  path: text('path').notNull(),
  variants: text('variants', { mode: 'json' }).$type<Record<string, string>>(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  index('idx_media_mime').on(table.mimeType),
  index('idx_media_folder').on(table.folder),
]);
