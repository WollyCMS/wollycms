import { Hono } from 'hono';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { taxonomies, terms } from '../../db/schema/index.js';

interface TermTreeNode {
  id: number;
  name: string;
  slug: string;
  weight: number;
  fields: Record<string, unknown> | null;
  children: TermTreeNode[];
}

const app = new Hono();

/**
 * GET /:slug/terms - Get all terms for a taxonomy by slug.
 * Returns flat list for non-hierarchical taxonomies,
 * nested tree for hierarchical ones.
 */
app.get('/:slug/terms', async (c) => {
  const db = getDb();
  const slug = c.req.param('slug');

  // Fetch taxonomy
  const taxRows = await db
    .select()
    .from(taxonomies)
    .where(eq(taxonomies.slug, slug))
    .limit(1);

  if (taxRows.length === 0) {
    return c.json(
      { errors: [{ code: 'NOT_FOUND', message: 'Taxonomy not found' }] },
      404,
    );
  }

  const taxonomy = taxRows[0];

  // Fetch all terms for this taxonomy
  const termRows = await db
    .select({
      id: terms.id,
      parentId: terms.parentId,
      name: terms.name,
      slug: terms.slug,
      weight: terms.weight,
      fields: terms.fields,
    })
    .from(terms)
    .where(eq(terms.taxonomyId, taxonomy.id))
    .orderBy(asc(terms.weight), asc(terms.name));

  // Return flat list or tree based on whether taxonomy is hierarchical
  if (!taxonomy.hierarchical) {
    const data = termRows.map((t: typeof termRows[0]) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      weight: t.weight,
      fields: t.fields,
    }));
    return c.json({ data });
  }

  // Build tree for hierarchical taxonomies
  const tree = buildTermTree(termRows);
  return c.json({ data: tree });
});

interface FlatTerm {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  weight: number;
  fields: Record<string, unknown> | null;
}

function buildTermTree(items: FlatTerm[]): TermTreeNode[] {
  const nodeMap = new Map<number, TermTreeNode>();
  const roots: TermTreeNode[] = [];

  // Create all nodes
  for (const item of items) {
    nodeMap.set(item.id, {
      id: item.id,
      name: item.name,
      slug: item.slug,
      weight: item.weight,
      fields: item.fields,
      children: [],
    });
  }

  // Build parent-child relationships
  for (const item of items) {
    const node = nodeMap.get(item.id)!;
    if (item.parentId && nodeMap.has(item.parentId)) {
      nodeMap.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export default app;
