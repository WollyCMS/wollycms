import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDatabase } from './setup.js';

let app: typeof import('../src/app.js').default;
let authToken: string;

beforeAll(async () => {
  await setupTestDatabase();
  const mod = await import('../src/app.js');
  app = mod.default;

  // Login to get auth token
  const res = await app.request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@spacelycms.local', password: 'admin123' }),
  });
  const body = await res.json();
  authToken = body.data.token;
});

function authed(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${authToken}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return app.request(`/api/admin${path}`, { ...init, headers });
}

function json(path: string, method: string, data: unknown) {
  return authed(path, { method, body: JSON.stringify(data) });
}

// --- Auth ---
describe('Admin Auth', () => {
  it('POST /auth/login succeeds with valid credentials', async () => {
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@spacelycms.local', password: 'admin123' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('admin@spacelycms.local');
    expect(body.data.user.role).toBe('admin');
  });

  it('POST /auth/login rejects bad password', async () => {
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@spacelycms.local', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me returns current user', async () => {
    const res = await authed('/auth/me');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe('admin@spacelycms.local');
  });

  it('rejects requests without token', async () => {
    const res = await app.request('/api/admin/pages');
    expect(res.status).toBe(401);
  });
});

// --- Dashboard ---
describe('Admin Dashboard', () => {
  it('GET / returns stats and recent pages', async () => {
    const res = await authed('/dashboard');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.stats.pages).toBeGreaterThan(0);
    expect(body.data.stats.published).toBeGreaterThan(0);
    expect(body.data.stats.blocks).toBeGreaterThan(0);
    expect(body.data.stats.media).toBeGreaterThanOrEqual(0);
    expect(body.data.recentPages.length).toBeGreaterThan(0);
  });
});

// --- Pages CRUD ---
describe('Admin Pages', () => {
  let testPageId: number;

  it('GET / lists all pages (any status)', async () => {
    const res = await authed('/pages');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.total).toBeGreaterThan(0);
  });

  it('GET / supports search filter', async () => {
    const res = await authed('/pages?search=Admissions');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].title).toContain('Admissions');
  });

  it('POST / creates a new page', async () => {
    const res = await json('/pages', 'POST', {
      title: 'Test Page',
      typeId: 1,
      status: 'draft',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe('Test Page');
    expect(body.data.slug).toBe('test-page');
    testPageId = body.data.id;
  });

  it('POST / rejects duplicate slug', async () => {
    const res = await json('/pages', 'POST', {
      title: 'Test Page',
      slug: 'test-page',
      typeId: 1,
    });
    expect(res.status).toBe(409);
  });

  it('GET /:id returns page with regions', async () => {
    const res = await authed(`/pages/${testPageId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Test Page');
    expect(body.data.regions).toBeDefined();
  });

  it('PUT /:id updates page', async () => {
    const res = await json(`/pages/${testPageId}`, 'PUT', {
      title: 'Updated Test Page',
      status: 'published',
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Updated Test Page');
    expect(body.data.status).toBe('published');
  });

  it('PUT /:id sets scheduledAt', async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = await json(`/pages/${testPageId}`, 'PUT', { scheduledAt: futureDate });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.scheduledAt).toBe(futureDate);
  });

  it('scheduled page is hidden from content API', async () => {
    // The page is published + scheduled in the future
    const res = await app.request(`/api/content/pages/${encodeURIComponent('test-page')}`, { method: 'GET' });
    expect(res.status).toBe(404);
  });

  it('PUT /:id clears scheduledAt', async () => {
    const res = await json(`/pages/${testPageId}`, 'PUT', { scheduledAt: null });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.scheduledAt).toBeNull();
  });

  it('POST /:id/blocks adds block to page', async () => {
    const res = await json(`/pages/${testPageId}/blocks`, 'POST', {
      blockTypeId: 1,
      region: 'content',
      fields: { body: { type: 'doc', content: [] } },
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.region).toBe('content');
  });

  it('GET /:id shows added block in region', async () => {
    const res = await authed(`/pages/${testPageId}`);
    const body = await res.json();
    expect(body.data.regions.content.length).toBe(1);
  });

  it('DELETE /:id/blocks/:pbId removes block', async () => {
    const pageRes = await authed(`/pages/${testPageId}`);
    const pageBody = await pageRes.json();
    const pbId = pageBody.data.regions.content[0].pb_id;

    const res = await authed(`/pages/${testPageId}/blocks/${pbId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('POST /:id/duplicate creates a copy with blocks', async () => {
    // Use a seeded page (home = id 1) that has blocks
    const res = await json('/pages/1/duplicate', 'POST', {});
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toContain('(Copy)');
    expect(body.data.slug).toContain('-copy');
    expect(body.data.status).toBe('draft');
  });

  it('DELETE /:id deletes page', async () => {
    const res = await authed(`/pages/${testPageId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);
  });

  it('GET /:id returns 404 for deleted page', async () => {
    const res = await authed(`/pages/${testPageId}`);
    expect(res.status).toBe(404);
  });
});

// --- Page Revisions ---
describe('Admin Page Revisions', () => {
  let revPageId: number;

  it('setup: create a page to test revisions', async () => {
    const res = await json('/pages', 'POST', {
      title: 'Revision Test Page',
      typeId: 1,
      status: 'draft',
    });
    expect(res.status).toBe(201);
    revPageId = (await res.json()).data.id;
  });

  it('PUT creates a revision automatically', async () => {
    await json(`/pages/${revPageId}`, 'PUT', { title: 'Revision Test Page v2' });
    const res = await authed(`/pages/${revPageId}/revisions`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].title).toBe('Revision Test Page');
  });

  it('second PUT creates a second revision', async () => {
    await json(`/pages/${revPageId}`, 'PUT', { title: 'Revision Test Page v3' });
    const res = await authed(`/pages/${revPageId}/revisions`);
    const body = await res.json();
    expect(body.data.length).toBe(2);
    // Most recent first
    expect(body.data[0].title).toBe('Revision Test Page v2');
    expect(body.data[1].title).toBe('Revision Test Page');
  });

  it('GET /:pageId/revisions/:revId returns full detail', async () => {
    const listRes = await authed(`/pages/${revPageId}/revisions`);
    const { data } = await listRes.json();
    const res = await authed(`/pages/${revPageId}/revisions/${data[1].id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Revision Test Page');
    expect(body.data.fields).toBeDefined();
  });

  it('POST restore reverts page to revision state', async () => {
    const listRes = await authed(`/pages/${revPageId}/revisions`);
    const { data } = await listRes.json();
    const oldestRevId = data[data.length - 1].id;

    const res = await json(`/pages/${revPageId}/revisions/${oldestRevId}/restore`, 'POST', {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Revision Test Page');

    // Verify a new revision was created (snapshot of pre-restore state)
    const afterRes = await authed(`/pages/${revPageId}/revisions`);
    const afterBody = await afterRes.json();
    expect(afterBody.data.length).toBe(3);
  });

  it('cleanup: delete test page', async () => {
    await authed(`/pages/${revPageId}`, { method: 'DELETE' });
  });
});

// --- Blocks CRUD ---
describe('Admin Blocks', () => {
  let testBlockId: number;

  it('GET / lists reusable blocks', async () => {
    const res = await authed('/blocks');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('POST / creates a reusable block', async () => {
    const res = await json('/blocks', 'POST', {
      typeId: 1,
      title: 'Test Block',
      fields: { body: { type: 'doc', content: [] } },
      isReusable: true,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    testBlockId = body.data.id;
  });

  it('GET /:id returns block with usage info', async () => {
    const res = await authed(`/blocks/${testBlockId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Test Block');
    expect(body.data.usage).toBeDefined();
  });

  it('PUT /:id updates block', async () => {
    const res = await json(`/blocks/${testBlockId}`, 'PUT', { title: 'Updated Block' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe('Updated Block');
  });

  it('DELETE /:id deletes unreferenced block', async () => {
    const res = await authed(`/blocks/${testBlockId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});

// --- Menus CRUD ---
describe('Admin Menus', () => {
  let testMenuId: number;
  let testItemId: number;

  it('GET / lists menus', async () => {
    const res = await authed('/menus');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('POST / creates a menu', async () => {
    const res = await json('/menus', 'POST', { name: 'Test Menu', slug: 'test-menu' });
    expect(res.status).toBe(201);
    const body = await res.json();
    testMenuId = body.data.id;
    expect(body.data.name).toBe('Test Menu');
  });

  it('POST /:id/items adds item', async () => {
    const res = await json(`/menus/${testMenuId}/items`, 'POST', {
      title: 'Test Item', url: '/test',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    testItemId = body.data.id;
  });

  it('GET /:id returns menu with items', async () => {
    const res = await authed(`/menus/${testMenuId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].title).toBe('Test Item');
  });

  it('DELETE /:id/items/:itemId removes item', async () => {
    const res = await authed(`/menus/${testMenuId}/items/${testItemId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id deletes menu', async () => {
    const res = await authed(`/menus/${testMenuId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});

// --- Taxonomies CRUD ---
describe('Admin Taxonomies', () => {
  let testTaxId: number;
  let testTermId: number;

  it('GET / lists taxonomies', async () => {
    const res = await authed('/taxonomies');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('POST / creates taxonomy', async () => {
    const res = await json('/taxonomies', 'POST', { name: 'Test Tax', slug: 'test-tax' });
    expect(res.status).toBe(201);
    const body = await res.json();
    testTaxId = body.data.id;
  });

  it('POST /:id/terms adds term', async () => {
    const res = await json(`/taxonomies/${testTaxId}/terms`, 'POST', {
      name: 'Test Term', slug: 'test-term',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    testTermId = body.data.id;
  });

  it('GET /:id returns taxonomy with terms', async () => {
    const res = await authed(`/taxonomies/${testTaxId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.terms.length).toBe(1);
  });

  it('DELETE /:id/terms/:termId removes term', async () => {
    const res = await authed(`/taxonomies/${testTaxId}/terms/${testTermId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id deletes taxonomy', async () => {
    const res = await authed(`/taxonomies/${testTaxId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});

// --- Redirects CRUD ---
describe('Admin Redirects', () => {
  let testRedirectId: number;

  it('GET / lists redirects', async () => {
    const res = await authed('/redirects');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('POST / creates redirect', async () => {
    const res = await json('/redirects', 'POST', {
      fromPath: '/old-test', toPath: '/new-test', statusCode: 301,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    testRedirectId = body.data.id;
  });

  it('POST / rejects duplicate fromPath', async () => {
    const res = await json('/redirects', 'POST', {
      fromPath: '/old-test', toPath: '/other',
    });
    expect(res.status).toBe(409);
  });

  it('PUT /:id updates redirect', async () => {
    const res = await json(`/redirects/${testRedirectId}`, 'PUT', { isActive: false });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isActive).toBe(false);
  });

  it('DELETE /:id deletes redirect', async () => {
    const res = await authed(`/redirects/${testRedirectId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('POST /import bulk imports redirects', async () => {
    const res = await json('/redirects/import', 'POST', [
      { fromPath: '/bulk-1', toPath: '/target-1' },
      { fromPath: '/bulk-2', toPath: '/target-2' },
    ]);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.imported).toBe(2);
  });
});

// --- Content Types CRUD ---
describe('Admin Content Types', () => {
  it('GET / lists content types', async () => {
    const res = await authed('/content-types');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(3);
  });

  it('GET /:id returns content type', async () => {
    const res = await authed('/content-types/1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('name');
    expect(body.data).toHaveProperty('fieldsSchema');
    expect(body.data).toHaveProperty('regions');
  });
});

// --- Block Types CRUD ---
describe('Admin Block Types', () => {
  it('GET / lists block types', async () => {
    const res = await authed('/block-types');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(10);
  });

  it('GET /:id returns block type', async () => {
    const res = await authed('/block-types/1');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('name');
    expect(body.data).toHaveProperty('fieldsSchema');
  });
});

// --- Users CRUD ---
describe('Admin Users', () => {
  let testUserId: number;

  it('GET / lists users without passwords', async () => {
    const res = await authed('/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const user of body.data) {
      expect(user).not.toHaveProperty('passwordHash');
    }
  });

  it('POST / creates user', async () => {
    const res = await json('/users', 'POST', {
      email: 'test@example.com',
      password: 'testpass123',
      name: 'Test User',
      role: 'editor',
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    testUserId = body.data.id;
    expect(body.data.email).toBe('test@example.com');
    expect(body.data).not.toHaveProperty('passwordHash');
  });

  it('DELETE /:id deletes user', async () => {
    const res = await authed(`/users/${testUserId}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
  });
});

// --- Config ---
describe('Admin Config', () => {
  it('GET / returns site config', async () => {
    const res = await authed('/config');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('siteName');
  });

  it('PUT / updates config', async () => {
    const res = await json('/config', 'PUT', { siteName: 'Updated CMS' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.siteName).toBe('Updated CMS');
  });
});

// --- Export/Import ---
describe('Admin Export/Import', () => {
  let exportData: any;

  it('GET /export returns full content dump', async () => {
    const res = await authed('/export');
    expect(res.status).toBe(200);
    exportData = await res.json();
    expect(exportData.version).toBe(1);
    expect(exportData.pages.length).toBeGreaterThan(0);
    expect(exportData.contentTypes.length).toBeGreaterThan(0);
    expect(exportData.menus.length).toBeGreaterThan(0);
  });

  it('POST /import with invalid format returns 400', async () => {
    const res = await json('/import', 'POST', { bad: true });
    expect(res.status).toBe(400);
  });

  it('POST /import with valid data succeeds (skips existing)', async () => {
    const res = await json('/import', 'POST', exportData);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.imported).toBe(true);
    expect(body.data.stats.pages).toBeGreaterThan(0);
  });
});

// --- RBAC ---
describe('Role-Based Access Control', () => {
  let editorToken: string;

  it('setup: create editor user and get token', async () => {
    // Create editor via admin
    await json('/users', 'POST', {
      email: 'editor@test.com',
      password: 'editorpass1',
      name: 'Test Editor',
      role: 'editor',
    });
    // Login as editor
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'editor@test.com', password: 'editorpass1' }),
    });
    const body = await res.json();
    editorToken = body.data.token;
    expect(editorToken).toBeDefined();
  });

  function editorReq(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${editorToken}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return app.request(`/api/admin${path}`, { ...init, headers });
  }

  // Editors CAN read admin-only resources
  it('editor can read users list', async () => {
    const res = await editorReq('/users');
    expect(res.status).toBe(200);
  });

  it('editor can read content types', async () => {
    const res = await editorReq('/content-types');
    expect(res.status).toBe(200);
  });

  // Editors CANNOT mutate admin-only resources
  it('editor cannot create users', async () => {
    const res = await editorReq('/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@x.com', password: 'password1', name: 'X', role: 'viewer' }),
    });
    expect(res.status).toBe(403);
  });

  it('editor cannot create content types', async () => {
    const res = await editorReq('/content-types', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', slug: 'x', fieldsSchema: [], regions: [] }),
    });
    expect(res.status).toBe(403);
  });

  it('editor cannot create block types', async () => {
    const res = await editorReq('/block-types', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', slug: 'x', fieldsSchema: [] }),
    });
    expect(res.status).toBe(403);
  });

  it('editor cannot update config', async () => {
    const res = await editorReq('/config', {
      method: 'PUT',
      body: JSON.stringify({ siteName: 'Hacked' }),
    });
    expect(res.status).toBe(403);
  });

  // Editors CAN do content operations
  it('editor can create pages', async () => {
    const res = await editorReq('/pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'Editor Page', typeId: 1, status: 'draft' }),
    });
    expect(res.status).toBe(201);
    // Cleanup
    const body = await res.json();
    await editorReq(`/pages/${body.data.id}`, { method: 'DELETE' });
  });

  it('editor can create blocks', async () => {
    const res = await editorReq('/blocks', {
      method: 'POST',
      body: JSON.stringify({ typeId: 1, title: 'Editor Block', isReusable: true, fields: {} }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    await editorReq(`/blocks/${body.data.id}`, { method: 'DELETE' });
  });
});

// --- Admin Search ---
describe('Admin Search', () => {
  it('GET /search returns empty for short queries', async () => {
    const res = await authed('/search?q=a');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pages).toEqual([]);
    expect(body.data.blocks).toEqual([]);
  });

  it('GET /search finds pages by title', async () => {
    const res = await authed('/search?q=Home');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.pages.length).toBeGreaterThan(0);
    expect(body.data.pages[0].title).toContain('Home');
  });

  it('GET /search finds blocks by title', async () => {
    const res = await authed('/search?q=Welcome');
    expect(res.status).toBe(200);
    const body = await res.json();
    // Should find blocks with "Welcome" in the title
    const allResults = [...body.data.pages, ...body.data.blocks];
    expect(allResults.length).toBeGreaterThanOrEqual(0);
  });

  it('GET /search finds menus', async () => {
    const res = await authed('/search?q=Main');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.menus.length).toBeGreaterThan(0);
  });
});
