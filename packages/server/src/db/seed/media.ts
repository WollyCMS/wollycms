import type { AppDatabase } from '../index.js';

export async function seedMedia(_db: AppDatabase, _adminId: number) {
  // Media records are not seeded — they should be created by uploading
  // real files through the admin UI. Seeding fake records with non-existent
  // file paths causes broken thumbnails and confusing behavior.
  console.log('  Skipped (media is created via uploads, not seed data)');
  return [];
}
