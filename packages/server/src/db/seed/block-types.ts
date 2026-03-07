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

export async function seedBlockTypes(db: AppDatabase) {
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
    {
      name: 'Hero',
      slug: 'hero',
      description: 'Hero banner with heading, image, and call-to-action.',
      fieldsSchema: [
        { name: 'heading', label: 'Heading', type: 'text' },
        { name: 'subtitle', label: 'Subtitle', type: 'text' },
        { name: 'eyebrow', label: 'Eyebrow Text', type: 'text' },
        { name: 'description', label: 'Description', type: 'text' },
        { name: 'image', label: 'Background Image', type: 'media' },
        { name: 'cta_text', label: 'CTA Button Text', type: 'text' },
        { name: 'cta_url', label: 'CTA Button URL', type: 'url' },
        {
          name: 'style',
          label: 'Style',
          type: 'select',
          default: 'interior',
          settings: {
            options: [
              { label: 'Home (Split)', value: 'home' },
              { label: 'Interior', value: 'interior' },
            ],
          },
        },
      ],
      icon: 'image',
      settings: {},
    },
    {
      name: 'Embed',
      slug: 'embed',
      description: 'Embed external content via HTML/iframe (forms, maps, widgets).',
      fieldsSchema: [
        { name: 'title', label: 'Title (optional)', type: 'text' },
        { name: 'code', label: 'Embed Code', type: 'textarea', required: true },
        {
          name: 'max_width',
          label: 'Max Width',
          type: 'text',
          default: '100%',
        },
        {
          name: 'aspect_ratio',
          label: 'Aspect Ratio',
          type: 'select',
          default: 'none',
          settings: {
            options: [
              { label: 'None (auto height)', value: 'none' },
              { label: '16:9 (video)', value: '16/9' },
              { label: '4:3', value: '4/3' },
              { label: '1:1 (square)', value: '1/1' },
            ],
          },
        },
      ],
      icon: 'code',
      settings: {},
    },
    {
      name: 'Video',
      slug: 'video',
      description: 'Video from upload or YouTube/Vimeo embed.',
      fieldsSchema: [
        {
          name: 'source',
          label: 'Source',
          type: 'select',
          default: 'upload',
          settings: {
            options: [
              { label: 'Upload', value: 'upload' },
              { label: 'YouTube', value: 'youtube' },
              { label: 'Vimeo', value: 'vimeo' },
            ],
          },
        },
        { name: 'media', label: 'Video File', type: 'media' },
        { name: 'url', label: 'Video URL', type: 'url' },
        { name: 'caption', label: 'Caption', type: 'text' },
        { name: 'autoplay', label: 'Autoplay (muted)', type: 'boolean', default: false },
        { name: 'loop', label: 'Loop', type: 'boolean', default: false },
      ],
      icon: 'video',
      settings: {},
    },
  ];

  const inserted = await db.insert(blockTypes).values(types).returning();
  console.log(`  Seeded ${inserted.length} block type(s)`);
  return inserted;
}
