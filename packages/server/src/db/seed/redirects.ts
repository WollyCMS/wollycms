import type { AppDatabase } from '../index.js';
import { redirects } from '../schema/index.js';

export async function seedRedirects(db: AppDatabase) {
  const records = [
    {
      fromPath: '/old-admissions',
      toPath: '/admissions',
      statusCode: 301,
      isActive: true,
    },
    {
      fromPath: '/programs',
      toPath: '/academic-programs',
      statusCode: 301,
      isActive: true,
    },
    {
      fromPath: '/info',
      toPath: '/about-us',
      statusCode: 301,
      isActive: true,
    },
    {
      fromPath: '/old-apply',
      toPath: '/apply-now',
      statusCode: 302,
      isActive: true,
    },
  ];

  const inserted = await db.insert(redirects).values(records).returning();
  console.log(`  Seeded ${inserted.length} redirect(s)`);
  return inserted;
}
