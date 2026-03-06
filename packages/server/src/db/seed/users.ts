import type { AppDatabase } from '../index.js';
import { users } from '../schema/index.js';

export function seedUsers(db: AppDatabase) {
  const now = new Date().toISOString();

  const inserted = db.insert(users).values({
    email: 'admin@spacelycms.local',
    name: 'Admin',
    passwordHash: 'placeholder-hash',
    role: 'admin',
    createdAt: now,
  }).returning().all();

  console.log(`  Seeded ${inserted.length} user(s)`);
  return inserted;
}
