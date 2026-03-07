import { pgTable, text, serial, integer, index, jsonb } from 'drizzle-orm/pg-core';
import { users } from './system.ts';

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
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
  variants: jsonb('variants').$type<Record<string, string>>(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  index('idx_media_mime').on(table.mimeType),
  index('idx_media_folder').on(table.folder),
]);
