import { beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase } from './setup.js';

let app: typeof import('../src/app.js').default;

beforeAll(async () => {
  await setupTestDatabase();
  app = (await import('../src/app.js')).default;
});

function post(body: unknown) {
  return app.request('/api/content/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Public batch input limits', () => {
  it('accepts the supported page and menu limits', async () => {
    const response = await post({
      pages: Array.from({ length: 50 }, () => 'admissions'),
      menus: Array.from({ length: 10 }, () => 'main'),
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.pages.admissions.title).toBe('Admissions');
    expect(data.menus).toBeDefined();
  });

  it.each([
    { pages: Array(51).fill('admissions') },
    { menus: Array(11).fill('main') },
    { pages: Array(10_000).fill(null) },
    { pages: 'admissions' },
    { menus: [null] },
    null,
    [],
  ])('rejects invalid collections with a bounded validation error', async (body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      errors: [{ code: 'VALIDATION', message: 'Invalid batch request' }],
    });
  });

  it('keeps empty batch requests compatible', async () => {
    const response = await post({});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: {} });
  });

  it('rejects oversized bodies by bytes, including multibyte characters', async () => {
    const body = JSON.stringify({ pages: ['é'.repeat(33_000)] });
    expect(body.length).toBeLessThan(64 * 1024);
    const response = await app.request('/api/content/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(new TextEncoder().encode(body).byteLength),
      },
      body,
    });
    expect(response.status).toBe(413);
    expect((await response.json()).errors[0].code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects an oversized streamed body without Content-Length', async () => {
    const body = new TextEncoder().encode(JSON.stringify({ pages: ['x'.repeat(70_000)] }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(body.subarray(0, 32_000));
        controller.enqueue(body.subarray(32_000));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: 'half' } = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stream,
      duplex: 'half',
    };
    const response = await app.request('/api/content/batch', init);
    expect(response.status).toBe(413);
    expect((await response.json()).errors[0].code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns the normal validation response for malformed JSON', async () => {
    const response = await app.request('/api/content/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(response.status).toBe(400);
    expect((await response.json()).errors[0].code).toBe('VALIDATION');
  });
});
