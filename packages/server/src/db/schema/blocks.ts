import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { blockTypes } from './content-types.ts';
import { pages } from './pages.ts';
import { users } from './system.ts';

export const blocks = sqliteTable('blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  typeId: integer('type_id').notNull().references(() => blockTypes.id),
  title: text('title'),
  fields: text('fields', { mode: 'json' }).$type<Record<string, unknown>>(),
  isReusable: integer('is_reusable', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  index('idx_blocks_type').on(table.typeId),
  index('idx_blocks_reusable').on(table.isReusable),
]);

export const pageBlocks = sqliteTable('page_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pageId: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  blockId: integer('block_id').notNull().references(() => blocks.id),
  region: text('region').notNull(),
  position: integer('position').notNull(),
  isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(false),
  overrides: text('overrides', { mode: 'json' }).$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_page_blocks_page').on(table.pageId),
  index('idx_page_blocks_block').on(table.blockId),
  index('idx_page_blocks_page_region').on(table.pageId, table.region),
]);
