import { pgTable, text, serial, jsonb } from 'drizzle-orm/pg-core';
import type { FieldDefinition, RegionDefinition, DefaultBlockDefinition } from '../schema/content-types.ts';

export type { FieldDefinition, RegionDefinition, DefaultBlockDefinition } from '../schema/content-types.ts';

export const contentTypes = pgTable('content_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fieldsSchema: jsonb('fields_schema').$type<FieldDefinition[]>(),
  regions: jsonb('regions').$type<RegionDefinition[]>(),
  defaultBlocks: jsonb('default_blocks').$type<DefaultBlockDefinition[]>(),
  settings: jsonb('settings').$type<Record<string, unknown>>(),
});

export const blockTypes = pgTable('block_types', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  fieldsSchema: jsonb('fields_schema').$type<FieldDefinition[]>(),
  icon: text('icon'),
  category: text('category'),
  settings: jsonb('settings').$type<Record<string, unknown>>(),
});
