import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const siteAlerts = sqliteTable('site_alerts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  message: text('message').notNull(),
  severity: text('severity').notNull().default('warning'), // 'info', 'warning', 'emergency'
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
