import { beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase } from './setup.js';

let app: typeof import('../src/app.js').default;
let authToken: string;

beforeAll(async () => {
  await setupTestDatabase();
  app = (await import('../src/app.js')).default;
  const response = await app.request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@wollycms.local', password: 'admin123' }),
  });
  expect(response.status).toBe(200);
  authToken = (await response.json()).data.token;
});

function request(path: string, method = 'GET', body?: unknown) {
  return app.request(`/api/admin${path}`, {
    method,
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const fields = {
  heading: 'Keep this content',
  enabled: false,
  image: null,
  count: 3,
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Keep me' }] }] },
  items: [{ label: 'Nested item', settings: { color: 'blue' } }],
};
const fieldsSchema = [{
  name: 'items', type: 'repeater', required: true,
  settings: { collapsed: false }, default: [], min: 1, max: 10,
  fields: [{ name: 'label', type: 'text', default: 'Label', settings: { help: 'Keep this' } }],
}];

const cases = [
  { path: '/pages', key: 'title', body: { title: 'Migration page', slug: 'migration-page', typeId: 1, status: 'published', fields } },
  { path: '/blocks', key: 'title', body: { title: 'Migration block', typeId: 1, fields, isReusable: false } },
  { path: '/block-types', key: 'name', body: { name: 'Migration block type', slug: 'migration-block-type', description: 'Keep description', fieldsSchema, icon: 'box', category: 'content', settings: { custom: true } } },
  { path: '/content-types', key: 'name', body: { name: 'Migration content type', slug: 'migration-content-type', description: 'Keep description', fieldsSchema, regions: [{ name: 'content', label: 'Content', allowed_types: ['rich_text'] }], defaultBlocks: [{ region: 'content', blockTypeSlug: 'rich_text', position: 0, fields: { body: 'Keep default block' } }], settings: { custom: true } } },
  { path: '/redirects', key: 'fromPath', body: { fromPath: '/migration-old', toPath: '/migration-new', statusCode: 302, isActive: false } },
  { path: '/webhooks', key: 'name', body: { name: 'Migration webhook', url: 'https://example.com/hook', events: ['page.published'], isActive: false } },
  { path: '/tracking-scripts', key: 'name', body: { name: 'Migration tracking', code: '<script>/* local fixture */</script>', position: 'body', priority: 42, isActive: false, scope: 'targeted', targetPages: ['migration-page'] } },
];

describe('Validation migration preserves existing editor data', () => {
  for (const { path, key, body } of cases) {
    it(`${path}: a one-field update retains omitted nondefault values`, async () => {
      const created = await request(path, 'POST', body);
      expect(created.status).toBe(201);
      const original = (await created.json()).data;
      const renamed = key === 'fromPath' ? '/migration-renamed' : 'Renamed fixture';
      const response = await request(`${path}/${original.id}`, 'PUT', { [key]: renamed });
      expect(response.status).toBe(200);

      // Read back the saved entity, rather than relying on the PUT response.
      const read = await request(path === '/redirects' ? path : `${path}/${original.id}`);
      expect(read.status).toBe(200);
      const readBody = (await read.json()).data;
      const saved = path === '/redirects'
        ? readBody.find((row: { id: number }) => row.id === original.id)
        : readBody;
      for (const [field, value] of Object.entries(body)) {
        expect(saved[field], `${path}.${field}`).toEqual(field === key ? renamed : value);
      }
    });
  }

  it('keeps create defaults for pages and blocks', async () => {
    const page = await request('/pages', 'POST', { title: 'Default page', typeId: 1 });
    expect(page.status).toBe(201);
    expect((await page.json()).data).toMatchObject({ status: 'draft', fields: {} });
    const block = await request('/blocks', 'POST', { title: 'Default block', typeId: 1 });
    expect(block.status).toBe(201);
    expect((await block.json()).data).toMatchObject({ isReusable: true, fields: {} });
  });

  it('allows explicit clearing of fields and settings', async () => {
    const created = await request('/blocks', 'POST', { title: 'Clear fields', typeId: 1, fields });
    expect(created.status).toBe(201);
    const block = (await created.json()).data;
    const updated = await request(`/blocks/${block.id}`, 'PUT', { fields: {} });
    expect(updated.status).toBe(200);
    expect((await updated.json()).data.fields).toEqual({});
    const createdType = await request('/block-types', 'POST', { name: 'Clear settings', slug: 'clear-settings', settings: { custom: true } });
    expect(createdType.status).toBe(201);
    const type = (await createdType.json()).data;
    const cleared = await request(`/block-types/${type.id}`, 'PUT', { settings: null });
    expect(cleared.status).toBe(200);
    expect((await cleared.json()).data.settings).toBeNull();
  });

  it.each([{ label: 'null', value: null }, { label: 'array', value: [] }, { label: 'string', value: 'invalid' }])('rejects invalid field records ($label) with the API error envelope', async ({ value }) => {
    const response = await request('/pages', 'POST', { title: 'Invalid fields', typeId: 1, fields: value });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0]).toMatchObject({ code: 'VALIDATION', message: expect.any(String), path: ['fields'] });
  });

  it('still rejects invalid nested field definitions', async () => {
    const response = await request('/block-types', 'POST', {
      name: 'Invalid nested field', slug: 'invalid-nested-field',
      fieldsSchema: [{ name: 'items', type: 'repeater', fields: [{ name: '', type: 'text' }] }],
    });
    expect(response.status).toBe(400);
    expect((await response.json()).errors[0].code).toBe('VALIDATION');
  });
});
