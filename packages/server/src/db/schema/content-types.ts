import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const contentTypes = sqliteTable('content_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fieldsSchema: text('fields_schema', { mode: 'json' }).$type<FieldDefinition[]>(),
  regions: text('regions', { mode: 'json' }).$type<RegionDefinition[]>(),
  defaultBlocks: text('default_blocks', { mode: 'json' }).$type<DefaultBlockDefinition[]>(),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export const blockTypes = sqliteTable('block_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fieldsSchema: text('fields_schema', { mode: 'json' }).$type<FieldDefinition[]>(),
  icon: text('icon'),
  category: text('category'),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export interface FieldDefinition {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  default?: unknown;
  settings?: Record<string, unknown>;
  fields?: FieldDefinition[];
  min?: number;
  max?: number;
}

export interface RegionDefinition {
  name: string;
  label: string;
  allowed_types?: string[];
}

export interface DefaultBlockDefinition {
  region: string;
  blockTypeSlug: string;
  position: number;
  fields?: Record<string, unknown>;
}
