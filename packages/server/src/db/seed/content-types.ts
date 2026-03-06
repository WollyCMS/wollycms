import type { AppDatabase } from '../index.js';
import { contentTypes } from '../schema/index.js';
import type { FieldDefinition, RegionDefinition } from '../schema/index.js';

export function seedContentTypes(db: AppDatabase) {
  const types: {
    name: string;
    slug: string;
    description: string;
    fieldsSchema: FieldDefinition[];
    regions: RegionDefinition[];
    settings: Record<string, unknown>;
  }[] = [
    {
      name: 'Secondary Page',
      slug: 'secondary_page',
      description: 'Standard interior page with content area and sidebar.',
      fieldsSchema: [
        { name: 'subtitle', label: 'Subtitle', type: 'text' },
        { name: 'hero_image', label: 'Hero Image', type: 'media' },
      ],
      regions: [
        { name: 'content', label: 'Content' },
        { name: 'sidebar', label: 'Sidebar' },
        { name: 'bottom', label: 'Bottom' },
      ],
      settings: { icon: 'file-text' },
    },
    {
      name: 'Landing Page',
      slug: 'landing_page',
      description: 'Full-width landing page with hero, features, and CTA areas.',
      fieldsSchema: [
        { name: 'subtitle', label: 'Subtitle', type: 'text' },
        { name: 'hero_image', label: 'Hero Image', type: 'media' },
        { name: 'hero_cta_text', label: 'Hero CTA Text', type: 'text' },
        { name: 'hero_cta_url', label: 'Hero CTA URL', type: 'url' },
      ],
      regions: [
        { name: 'hero', label: 'Hero' },
        { name: 'content', label: 'Content' },
        { name: 'features', label: 'Features' },
        { name: 'bottom', label: 'Bottom' },
      ],
      settings: { icon: 'layout' },
    },
    {
      name: 'Home Page',
      slug: 'home_page',
      description: 'Site homepage with hero, featured content, and highlights.',
      fieldsSchema: [
        { name: 'tagline', label: 'Tagline', type: 'text' },
        { name: 'hero_image', label: 'Hero Image', type: 'media' },
        { name: 'hero_video', label: 'Hero Video', type: 'url' },
      ],
      regions: [
        { name: 'hero', label: 'Hero' },
        { name: 'content', label: 'Content' },
        { name: 'features', label: 'Features' },
        { name: 'bottom', label: 'Bottom' },
      ],
      settings: { icon: 'home', singleton: true },
    },
  ];

  const inserted = db.insert(contentTypes).values(types).returning().all();
  console.log(`  Seeded ${inserted.length} content type(s)`);
  return inserted;
}
