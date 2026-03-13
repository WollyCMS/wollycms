import { sqliteTable, text, integer, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const siteConfig = sqliteTable('site_config', {
  id: integer('id').primaryKey().default(1),
  value: text('value').notNull().default('{}'),
}, (table) => [
  check('single_row', sql`${table.id} = 1`),
]);

export const redirects = sqliteTable('redirects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromPath: text('from_path').notNull(),
  toPath: text('to_path').notNull(),
  statusCode: integer('status_code').notNull().default(301),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
}, (table) => [
  uniqueIndex('idx_redirects_from').on(table.fromPath),
]);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull().default('editor'),
  createdAt: text('created_at').notNull(),
});
