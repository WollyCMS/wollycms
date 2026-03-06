import type { AppDatabase } from '../index.js';
import { blockTypes } from '../schema/index.js';
import type { FieldDefinition } from '../schema/index.js';

interface BlockTypeSeed {
  name: string;
  slug: string;
  description: string;
  fieldsSchema: FieldDefinition[];
  icon: string;
  settings: Record<string, unknown>;
}

export function seedBlockTypes(db: AppDatabase) {
  const types: BlockTypeSeed[] = [
    {
      name: 'Rich Text',
      slug: 'rich_text',
      description: 'Free-form rich text content block.',
      fieldsSchema: [
        { name: 'body', label: 'Body', type: 'richtext', required: true },
      ],
      icon: 'type',
      settings: {},
    },
    {
      name: 'Accordion',
      slug: 'accordion',
      description: 'Expandable accordion with multiple items.',
      fieldsSchema: [
        { name: 'heading', label: 'Heading', type: 'text' },
        {
          name: 'items',
          label: 'Items',
          type: 'repeater',
          fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'body', label: 'Body', type: 'richtext', required: true },
          ],
          min: 1,
        },
        {
          name: 'default_open',
          label: 'First Item Open by Default',
          type: 'boolean',
          default: false,
        },
      ],
      icon: 'list',
      settings: {},
    },
    {
      name: 'CTA Button',
      slug: 'cta_button',
      description: 'Call-to-action button with configurable style.',
      fieldsSchema: [
        { name: 'text', label: 'Button Text', type: 'text', required: true },
        { name: 'url', label: 'URL', type: 'url', required: true },
        {
          name: 'style',
          label: 'Style',
          type: 'select',
          default: 'primary',
          settings: {
            options: [
              { label: 'Primary', value: 'primary' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Outline', value: 'outline' },
            ],
          },
        },
      ],
      icon: 'mouse-pointer',
      settings: {},
    },
    {
      name: 'Contact List',
      slug: 'contact_list',
      description: 'List of contacts with name, role, phone, and email.',
      fieldsSchema: [
        { name: 'heading', label: 'Heading', type: 'text' },
        {
          name: 'contacts',
          label: 'Contacts',
          type: 'repeater',
          fields: [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'role', label: 'Role', type: 'text' },
            { name: 'phone', label: 'Phone', type: 'text' },
            { name: 'email', label: 'Email', type: 'text' },
          ],
          min: 1,
        },
      ],
      icon: 'users',
      settings: {},
    },
    {
      name: 'Location',
      slug: 'location',
      description: 'Physical location details with optional map.',
      fieldsSchema: [
        { name: 'name', label: 'Location Name', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'text', required: true },
        { name: 'city', label: 'City', type: 'text', required: true },
        { name: 'state', label: 'State', type: 'text', required: true },
        { name: 'zip', label: 'Zip Code', type: 'text', required: true },
        { name: 'phone', label: 'Phone', type: 'text' },
        { name: 'hours', label: 'Hours', type: 'text' },
        { name: 'map_url', label: 'Map URL', type: 'url' },
      ],
      icon: 'map-pin',
      settings: {},
    },
    {
      name: 'Link List',
      slug: 'link_list',
      description: 'Curated list of links with optional descriptions.',
      fieldsSchema: [
        { name: 'heading', label: 'Heading', type: 'text' },
        {
          name: 'links',
          label: 'Links',
          type: 'repeater',
          fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'url', label: 'URL', type: 'url', required: true },
            { name: 'description', label: 'Description', type: 'text' },
          ],
          min: 1,
        },
      ],
      icon: 'link',
      settings: {},
    },
    {
      name: 'Image',
      slug: 'image',
      description: 'Single image with caption and optional link.',
      fieldsSchema: [
        { name: 'image', label: 'Image', type: 'media', required: true },
        { name: 'caption', label: 'Caption', type: 'text' },
        { name: 'alt', label: 'Alt Text', type: 'text' },
        { name: 'link_url', label: 'Link URL', type: 'url' },
      ],
      icon: 'image',
      settings: {},
    },
    {
      name: 'Content Listing',
      slug: 'content_listing',
      description: 'Dynamic listing of pages filtered by content type.',
      fieldsSchema: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'content_type', label: 'Content Type Slug', type: 'text' },
        {
          name: 'sort',
          label: 'Sort Order',
          type: 'select',
          default: 'newest',
          settings: {
            options: [
              { label: 'Newest First', value: 'newest' },
              { label: 'Oldest First', value: 'oldest' },
              { label: 'Title A-Z', value: 'title_asc' },
              { label: 'Title Z-A', value: 'title_desc' },
            ],
          },
        },
        {
          name: 'limit',
          label: 'Max Items',
          type: 'number',
          default: 10,
          settings: { min: 1, max: 50 },
        },
        {
          name: 'display',
          label: 'Display Style',
          type: 'select',
          default: 'list',
          settings: {
            options: [
              { label: 'List', value: 'list' },
              { label: 'Card Grid', value: 'card_grid' },
            ],
          },
        },
      ],
      icon: 'grid',
      settings: {},
    },
  ];

  const inserted = db.insert(blockTypes).values(types).returning().all();
  console.log(`  Seeded ${inserted.length} block type(s)`);
  return inserted;
}
