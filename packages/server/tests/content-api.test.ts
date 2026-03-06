import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDatabase } from './setup.js';

let app: typeof import('../src/app.js').default;

beforeAll(async () => {
  setupTestDatabase();
  const mod = await import('../src/app.js');
  app = mod.default;
});

function get(path: string) {
  return app.request(path, { method: 'GET' });
}

describe('Health Check', () => {
  it('GET /api/health returns ok', async () => {
    const res = await get('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

describe('GET /api/content/pages', () => {
  it('returns all published pages', async () => {
    const res = await get('/api/content/pages');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(8);
    expect(body.meta.total).toBeGreaterThanOrEqual(8);
    for (const page of body.data) {
      expect(page.status).toBe('published');
      expect(page).toHaveProperty('title');
      expect(page).toHaveProperty('slug');
      expect(page).toHaveProperty('type');
    }
  });

  it('filters by content type', async () => {
    const res = await get('/api/content/pages?type=secondary_page');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const page of body.data) {
      expect(page.type).toBe('secondary_page');
    }
  });

  it('returns empty for non-existent type', async () => {
    const res = await get('/api/content/pages?type=nonexistent');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it('supports pagination', async () => {
    const res = await get('/api/content/pages?limit=2&offset=0');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.offset).toBe(0);
  });
});

describe('GET /api/content/pages/:slug', () => {
  it('returns page with resolved blocks per region', async () => {
    const res = await get('/api/content/pages/admissions');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Admissions');
    expect(body.data.slug).toBe('admissions');
    expect(body.data.type).toBe('landing_page');
    expect(body.data.regions).toBeDefined();
    expect(body.data.regions.content).toBeDefined();
    expect(body.data.regions.content.length).toBeGreaterThan(0);
  });

  it('includes shared blocks with is_shared flag', async () => {
    const res = await get('/api/content/pages/admissions');
    const body = await res.json();
    const sidebar = body.data.regions.sidebar;
    expect(sidebar).toBeDefined();
    const sharedBlock = sidebar.find((b: any) => b.is_shared);
    expect(sharedBlock).toBeDefined();
    expect(sharedBlock.block_id).toBeDefined();
  });

  it('returns 404 for non-existent page', async () => {
    const res = await get('/api/content/pages/nonexistent-page');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errors[0].code).toBe('NOT_FOUND');
  });

  it('resolves block types correctly', async () => {
    const res = await get('/api/content/pages/admissions');
    const body = await res.json();
    const contentBlocks = body.data.regions.content;
    const blockTypes = contentBlocks.map((b: any) => b.block_type);
    expect(blockTypes).toContain('rich_text');
    expect(blockTypes).toContain('accordion');
  });
});

describe('GET /api/content/menus/:slug', () => {
  it('returns menu with nested tree', async () => {
    const res = await get('/api/content/menus/main');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('Main Navigation');
    expect(body.data.slug).toBe('main');
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  it('has 3-level deep nesting', async () => {
    const res = await get('/api/content/menus/main');
    const body = await res.json();
    const admissions = body.data.items.find((i: any) => i.title === 'Admissions');
    expect(admissions).toBeDefined();
    expect(admissions.children.length).toBeGreaterThan(0);
    const finAid = admissions.children.find((i: any) => i.title === 'Financial Aid');
    expect(finAid).toBeDefined();
    expect(finAid.children.length).toBeGreaterThan(0);
  });

  it('supports depth limiting', async () => {
    const res = await get('/api/content/menus/main?depth=1');
    const body = await res.json();
    for (const item of body.data.items) {
      expect(item.children).toEqual([]);
    }
  });

  it('returns 404 for non-existent menu', async () => {
    const res = await get('/api/content/menus/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/content/taxonomies/:slug/terms', () => {
  it('returns terms for a taxonomy', async () => {
    const res = await get('/api/content/taxonomies/department/terms');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(5);
    expect(body.data[0]).toHaveProperty('name');
    expect(body.data[0]).toHaveProperty('slug');
  });

  it('returns 404 for non-existent taxonomy', async () => {
    const res = await get('/api/content/taxonomies/nonexistent/terms');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/content/media/:id/:variant', () => {
  it('returns media info for info variant', async () => {
    const res = await get('/api/content/media/1/info');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.filename).toBeDefined();
    expect(body.data.mimeType).toBeDefined();
    expect(body.data.width).toBeDefined();
  });

  it('returns 404 for original variant when file is missing on disk', async () => {
    // Seed data has paths to files that do not exist on disk,
    // so the content API correctly returns FILE_NOT_FOUND.
    const res = await get('/api/content/media/1/original');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errors[0].code).toBe('FILE_NOT_FOUND');
  });

  it('returns 404 for unavailable variant', async () => {
    // Media record 4 (college-logo.png) has empty variants {},
    // so requesting "thumbnail" should return VARIANT_NOT_FOUND.
    const res = await get('/api/content/media/4/thumbnail');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.errors[0].code).toBe('VARIANT_NOT_FOUND');
  });

  it('returns 404 for non-existent media', async () => {
    const res = await get('/api/content/media/999/info');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid variant', async () => {
    const res = await get('/api/content/media/1/invalid');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/content/redirects', () => {
  it('returns all active redirects', async () => {
    const res = await get('/api/content/redirects');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(4);
    expect(body.data[0]).toHaveProperty('fromPath');
    expect(body.data[0]).toHaveProperty('toPath');
    expect(body.data[0]).toHaveProperty('statusCode');
  });
});

describe('GET /api/content/config', () => {
  it('returns site config', async () => {
    const res = await get('/api/content/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.siteName).toBeDefined();
    expect(body.data.tagline).toBeDefined();
  });
});

describe('GET /api/content/schemas', () => {
  it('returns content type and block type schemas', async () => {
    const res = await get('/api/content/schemas');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.contentTypes.length).toBe(3);
    expect(body.data.blockTypes.length).toBe(8);
    expect(body.data.contentTypes[0]).toHaveProperty('fieldsSchema');
    expect(body.data.blockTypes[0]).toHaveProperty('fieldsSchema');
  });
});
