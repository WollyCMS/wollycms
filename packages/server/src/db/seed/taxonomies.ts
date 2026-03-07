import type { AppDatabase } from '../index.js';
import { taxonomies, terms } from '../schema/index.js';

export async function seedTaxonomies(db: AppDatabase) {
  // --- Department taxonomy ---
  const [deptTax] = await db.insert(taxonomies).values({
    name: 'Department',
    slug: 'department',
    description: 'Organizational departments within the college.',
    hierarchical: false,
    settings: {},
  }).returning();

  const deptTerms = await db.insert(terms).values([
    { taxonomyId: deptTax.id, name: 'Admissions', slug: 'admissions', weight: 0 },
    { taxonomyId: deptTax.id, name: 'Academic Affairs', slug: 'academic-affairs', weight: 1 },
    { taxonomyId: deptTax.id, name: 'Student Services', slug: 'student-services', weight: 2 },
    { taxonomyId: deptTax.id, name: 'Information Technology', slug: 'information-technology', weight: 3 },
    { taxonomyId: deptTax.id, name: 'Nursing', slug: 'nursing', weight: 4 },
  ]).returning();

  // --- Tags taxonomy ---
  const [tagsTax] = await db.insert(taxonomies).values({
    name: 'Tags',
    slug: 'tags',
    description: 'General-purpose content tags.',
    hierarchical: false,
    settings: {},
  }).returning();

  const tagTerms = await db.insert(terms).values([
    { taxonomyId: tagsTax.id, name: 'Featured', slug: 'featured', weight: 0 },
    { taxonomyId: tagsTax.id, name: 'News', slug: 'news', weight: 1 },
    { taxonomyId: tagsTax.id, name: 'Events', slug: 'events', weight: 2 },
    { taxonomyId: tagsTax.id, name: 'Resources', slug: 'resources', weight: 3 },
    { taxonomyId: tagsTax.id, name: 'STEM', slug: 'stem', weight: 4 },
  ]).returning();

  const totalTerms = deptTerms.length + tagTerms.length;
  console.log(`  Seeded 2 taxonomy/ies, ${totalTerms} term(s)`);
  return { deptTax, tagsTax, deptTerms, tagTerms };
}
