import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { contentTypes } from './content-types.ts';
import { users } from './system.ts';

export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  typeId: integer('type_id').notNull().references(() => contentTypes.id),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .notNull()
    .default('draft'),
  fields: text('fields', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  publishedAt: text('published_at'),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  index('idx_pages_slug').on(table.slug),
  index('idx_pages_type').on(table.typeId),
  index('idx_pages_status').on(table.status),
  index('idx_pages_type_status').on(table.typeId, table.status),
]);
