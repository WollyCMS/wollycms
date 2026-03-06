import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { pages } from './pages.ts';

export const menus = sqliteTable('menus', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const menuItems = sqliteTable('menu_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuId: integer('menu_id').notNull().references(() => menus.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  title: text('title').notNull(),
  url: text('url'),
  pageId: integer('page_id').references(() => pages.id),
  target: text('target').notNull().default('_self'),
  position: integer('position').notNull().default(0),
  depth: integer('depth').notNull().default(0),
  isExpanded: integer('is_expanded', { mode: 'boolean' }).notNull().default(false),
  attributes: text('attributes', { mode: 'json' }).$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_menu_items_menu').on(table.menuId),
  index('idx_menu_items_parent').on(table.parentId),
]);
