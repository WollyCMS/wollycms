import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const taxonomies = sqliteTable('taxonomies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  hierarchical: integer('hierarchical', { mode: 'boolean' }).notNull().default(false),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export const terms = sqliteTable('terms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taxonomyId: integer('taxonomy_id').notNull().references(() => taxonomies.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  weight: integer('weight').notNull().default(0),
  fields: text('fields', { mode: 'json' }).$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_terms_taxonomy').on(table.taxonomyId),
  index('idx_terms_parent').on(table.parentId),
  index('idx_terms_slug').on(table.taxonomyId, table.slug),
]);

export const contentTerms = sqliteTable('content_terms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type', { enum: ['page', 'block'] }).notNull(),
  entityId: integer('entity_id').notNull(),
  termId: integer('term_id').notNull().references(() => terms.id, { onDelete: 'cascade' }),
}, (table) => [
  index('idx_content_terms_entity').on(table.entityType, table.entityId),
  index('idx_content_terms_term').on(table.termId),
]);
