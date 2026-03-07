import { pgTable, text, serial, integer, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { pages } from './pages.ts';

export const menus = pgTable('menus', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  menuId: integer('menu_id').notNull().references(() => menus.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  title: text('title').notNull(),
  url: text('url'),
  pageId: integer('page_id').references(() => pages.id),
  target: text('target').notNull().default('_self'),
  position: integer('position').notNull().default(0),
  depth: integer('depth').notNull().default(0),
  isExpanded: boolean('is_expanded').notNull().default(false),
  attributes: jsonb('attributes').$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_menu_items_menu').on(table.menuId),
  index('idx_menu_items_parent').on(table.parentId),
]);
