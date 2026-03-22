/**
 * Full-text search indexing for pages.
 * Uses SQLite FTS5 on D1/SQLite, stubs for PostgreSQL.
 */
import { sql } from 'drizzle-orm';
import { getDb } from './db/index.js';
import { getDialect } from './env.js';

/** Extract plain text from TipTap JSON content (recursive). */
export function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const n = node as Record<string, unknown>;

  // Text node
  if (n.type === 'text' && typeof n.text === 'string') {
    return n.text;
  }

  // Recurse into children
  if (Array.isArray(n.content)) {
    return n.content.map(extractText).join(' ');
  }

  return '';
}

/** Extract all searchable text from a page's blocks. */
export function extractPageBody(
  blocks: Array<{ fields: Record<string, unknown> }>,
): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (!block.fields) continue;
    for (const [, value] of Object.entries(block.fields)) {
      if (typeof value === 'string') {
        // Plain text or HTML — strip tags
        parts.push(value.replace(/<[^>]*>/g, ' '));
      } else if (value && typeof value === 'object') {
        // TipTap JSON
        parts.push(extractText(value));
      }
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Index a page in the FTS table. Idempotent (deletes then inserts). */
export async function indexPage(
  pageId: number,
  title: string,
  slug: string,
  body: string,
  metaDescription: string | null,
): Promise<void> {
  if (getDialect() === 'postgresql') return;

  const db = getDb();
  try {
    await db.run(sql`DELETE FROM pages_fts WHERE page_id = ${pageId}`);
    await db.run(sql`INSERT INTO pages_fts (page_id, title, slug, body, meta_description)
      VALUES (${pageId}, ${title}, ${slug}, ${body}, ${metaDescription || ''})`);
  } catch {
    // FTS table may not exist yet — skip silently
  }
}

/** Remove a page from the FTS index. */
export async function deindexPage(pageId: number): Promise<void> {
  if (getDialect() === 'postgresql') return;

  const db = getDb();
  try {
    await db.run(sql`DELETE FROM pages_fts WHERE page_id = ${pageId}`);
  } catch {
    // FTS table may not exist — skip
  }
}

/** Full-text search using FTS5 MATCH with BM25 ranking. */
export async function ftsSearch(
  query: string,
  limit: number,
): Promise<Array<{ pageId: number; rank: number }>> {
  if (getDialect() === 'postgresql') return [];

  const db = getDb();
  try {
    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .map((w) => `"${w.replace(/"/g, '')}"*`)
      .join(' ');

    const result = await db.run(
      sql`SELECT page_id, rank FROM pages_fts WHERE pages_fts MATCH ${ftsQuery} ORDER BY rank LIMIT ${limit}`,
    );
    const rows = (result as unknown as { rows: Array<{ page_id: number; rank: number }> }).rows
      ?? (result as unknown as Array<{ page_id: number; rank: number }>);
    if (!Array.isArray(rows)) return [];
    return rows.map((r: { page_id: number; rank: number }) => ({ pageId: r.page_id, rank: r.rank }));
  } catch {
    return [];
  }
}

/** Rebuild the entire FTS index from all published pages. */
export async function rebuildSearchIndex(): Promise<number> {
  if (getDialect() === 'postgresql') return 0;

  const db = getDb();
  try {
    await db.run(sql`DELETE FROM pages_fts`);

    const result = await db.run(
      sql`SELECT id, title, slug, meta_description FROM pages WHERE status = 'published'`,
    );
    const pageRows = (result as unknown as { rows: Array<Record<string, unknown>> }).rows
      ?? (result as unknown as Array<Record<string, unknown>>);
    if (!Array.isArray(pageRows)) return 0;

    for (const page of pageRows) {
      const blockResult = await db.run(
        sql`SELECT b.fields FROM page_blocks pb
            INNER JOIN blocks b ON pb.block_id = b.id
            WHERE pb.page_id = ${page.id}`,
      );
      const blockRows = (blockResult as unknown as { rows: Array<{ fields: string }> }).rows
        ?? (blockResult as unknown as Array<{ fields: string }>);
      const blocks = (Array.isArray(blockRows) ? blockRows : []).map((r: { fields: string }) => ({
        fields: typeof r.fields === 'string' ? JSON.parse(r.fields) : r.fields,
      }));
      const body = extractPageBody(blocks);

      await db.run(sql`INSERT INTO pages_fts (page_id, title, slug, body, meta_description)
        VALUES (${page.id}, ${String(page.title)}, ${String(page.slug)}, ${body}, ${String(page.meta_description || '')})`);
    }

    return pageRows.length;
  } catch {
    return 0;
  }
}
