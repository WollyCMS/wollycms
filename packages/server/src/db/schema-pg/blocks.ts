import { pgTable, text, serial, integer, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { blockTypes } from './content-types.ts';
import { pages } from './pages.ts';
import { users } from './system.ts';

export const blocks = pgTable('blocks', {
  id: serial('id').primaryKey(),
  typeId: integer('type_id').notNull().references(() => blockTypes.id),
  title: text('title'),
  fields: jsonb('fields').$type<Record<string, unknown>>(),
  isReusable: boolean('is_reusable').notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  createdBy: integer('created_by').references(() => users.id),
}, (table) => [
  index('idx_blocks_type').on(table.typeId),
  index('idx_blocks_reusable').on(table.isReusable),
]);

export const pageBlocks = pgTable('page_blocks', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  blockId: integer('block_id').notNull().references(() => blocks.id),
  region: text('region').notNull(),
  position: integer('position').notNull(),
  isShared: boolean('is_shared').notNull().default(false),
  overrides: jsonb('overrides').$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_page_blocks_page').on(table.pageId),
  index('idx_page_blocks_block').on(table.blockId),
  index('idx_page_blocks_page_region').on(table.pageId, table.region),
]);
