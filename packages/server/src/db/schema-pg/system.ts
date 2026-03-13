import { pgTable, text, serial, integer, boolean, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const siteConfig = pgTable('site_config', {
  id: integer('id').primaryKey().default(1),
  value: text('value').notNull().default('{}'),
}, (table) => [
  check('single_row', sql`${table.id} = 1`),
]);

export const redirects = pgTable('redirects', {
  id: serial('id').primaryKey(),
  fromPath: text('from_path').notNull(),
  toPath: text('to_path').notNull(),
  statusCode: integer('status_code').notNull().default(301),
  isActive: boolean('is_active').notNull().default(true),
}, (table) => [
  uniqueIndex('idx_redirects_from').on(table.fromPath),
]);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  createdAt: text('created_at').notNull(),
});
