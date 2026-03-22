import { pgTable, text, serial, integer, index, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { contentTypes } from './content-types.ts';
import { users } from './system.ts';

export const pages = pgTable('pages', {
  id: serial('id').primaryKey(),
  typeId: integer('type_id').notNull().references(() => contentTypes.id),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  status: text('status', { enum: ['draft', 'published', 'archived'] })
    .notNull()
    .default('draft'),
  locale: text('locale').notNull().default('en'),
  translationGroupId: text('translation_group_id'),
  fields: jsonb('fields').$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  publishedAt: text('published_at'),
  scheduledAt: text('scheduled_at'),
  unpublishAt: text('unpublish_at'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogImage: text('og_image'),
  canonicalUrl: text('canonical_url'),
  robots: text('robots'),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  uniqueIndex('pages_slug_locale_unique').on(table.slug, table.locale),
  index('idx_pages_slug').on(table.slug),
  index('idx_pages_type').on(table.typeId),
  index('idx_pages_status').on(table.status),
  index('idx_pages_type_status').on(table.typeId, table.status),
  index('idx_pages_locale').on(table.locale),
  index('idx_pages_translation_group').on(table.translationGroupId),
]);

export const pageRevisions = pgTable('page_revisions', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  status: text('status').notNull(),
  locale: text('locale').notNull().default('en'),
  fields: jsonb('fields').$type<Record<string, unknown>>(),
  blocks: jsonb('blocks').$type<unknown[]>(),
  createdAt: text('created_at').notNull(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  index('idx_revisions_page').on(table.pageId),
]);
