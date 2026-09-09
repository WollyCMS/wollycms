import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createClient } from '../src/client.js';

const API = 'http://cms.test/api/content';

let fetchMock: ReturnType<typeof vi.fn>;

function requestedUrl(call = 0): URL {
  return new URL(fetchMock.mock.calls[call][0] as string);
}

beforeEach(() => {
  fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ data: [], meta: { total: 0 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('client locale handling', () => {
  const client = createClient({ apiUrl: API });

  it('pages.list serializes locale and status', async () => {
    await client.pages.list({ locale: 'fr', status: 'published', type: 'article' });
    const url = requestedUrl();
    expect(url.pathname).toBe('/api/content/pages');
    expect(url.searchParams.get('locale')).toBe('fr');
    expect(url.searchParams.get('status')).toBe('published');
    expect(url.searchParams.get('type')).toBe('article');
  });

  it('pages.list omits locale when not provided', async () => {
    await client.pages.list({ type: 'article' });
    expect(requestedUrl().searchParams.has('locale')).toBe(false);
  });

  it('pages.getBySlug passes locale', async () => {
    await client.pages.getBySlug('a-propos', { locale: 'fr' });
    const url = requestedUrl();
    expect(url.pathname).toBe('/api/content/pages/a-propos');
    expect(url.searchParams.get('locale')).toBe('fr');
  });

  it('pages.getBySlug without options keeps the bare URL', async () => {
    await client.pages.getBySlug('about');
    const url = requestedUrl();
    expect(url.pathname).toBe('/api/content/pages/about');
    expect(url.search).toBe('');
  });

  it('search.query passes locale', async () => {
    await client.search.query('hello', { locale: 'fr', limit: 5 });
    const url = requestedUrl();
    expect(url.pathname).toBe('/api/content/search');
    expect(url.searchParams.get('q')).toBe('hello');
    expect(url.searchParams.get('locale')).toBe('fr');
    expect(url.searchParams.get('limit')).toBe('5');
  });
});
