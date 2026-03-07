import { pgTable, text, serial, integer, boolean, index, jsonb } from 'drizzle-orm/pg-core';

export const taxonomies = pgTable('taxonomies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  hierarchical: boolean('hierarchical').notNull().default(false),
  settings: jsonb('settings').$type<Record<string, unknown>>(),
});

export const terms = pgTable('terms', {
  id: serial('id').primaryKey(),
  taxonomyId: integer('taxonomy_id').notNull().references(() => taxonomies.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  weight: integer('weight').notNull().default(0),
  fields: jsonb('fields').$type<Record<string, unknown>>(),
}, (table) => [
  index('idx_terms_taxonomy').on(table.taxonomyId),
  index('idx_terms_parent').on(table.parentId),
  index('idx_terms_slug').on(table.taxonomyId, table.slug),
]);

export const contentTerms = pgTable('content_terms', {
  id: serial('id').primaryKey(),
  entityType: text('entity_type', { enum: ['page', 'block'] }).notNull(),
  entityId: integer('entity_id').notNull(),
  termId: integer('term_id').notNull().references(() => terms.id, { onDelete: 'cascade' }),
}, (table) => [
  index('idx_content_terms_entity').on(table.entityType, table.entityId),
  index('idx_content_terms_term').on(table.termId),
]);
