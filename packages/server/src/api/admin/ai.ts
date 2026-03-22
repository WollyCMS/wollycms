import { Hono } from 'hono';
import { z } from 'zod';
import { requireRole } from '../../auth/rbac.js';
import { aiComplete, getAiConfig } from '../../ai.js';

const app = new Hono();

app.use('/*', requireRole('editor'));

/** GET /status — Check if AI is configured. */
app.get('/status', async (c) => {
  const config = await getAiConfig();
  return c.json({
    data: {
      configured: !!config,
      provider: config?.provider || null,
      model: config?.model || null,
    },
  });
});

const completionSchema = z.object({
  prompt: z.string().min(1).max(10000),
  systemPrompt: z.string().max(2000).optional(),
  maxTokens: z.number().int().min(50).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/** POST /complete — General-purpose AI completion. */
app.post('/complete', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = completionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Valid prompt required' }] }, 400);
  }

  try {
    const messages = [
      ...(parsed.data.systemPrompt
        ? [{ role: 'system' as const, content: parsed.data.systemPrompt }]
        : []),
      { role: 'user' as const, content: parsed.data.prompt },
    ];

    const result = await aiComplete(messages, {
      maxTokens: parsed.data.maxTokens,
      temperature: parsed.data.temperature,
    });

    return c.json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    return c.json({ errors: [{ code: 'AI_ERROR', message }] }, 502);
  }
});

/** POST /suggest-meta — Generate meta description from page content. */
app.post('/suggest-meta', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({
    title: z.string().min(1),
    content: z.string().min(1).max(5000),
  }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Title and content required' }] }, 400);
  }

  try {
    const result = await aiComplete([
      {
        role: 'system',
        content: 'You are an SEO expert. Generate a concise, compelling meta description (120-155 characters) for the given page. Return only the meta description text, nothing else.',
      },
      {
        role: 'user',
        content: `Title: ${parsed.data.title}\n\nContent:\n${parsed.data.content.slice(0, 3000)}`,
      },
    ], { maxTokens: 200, temperature: 0.5 });

    return c.json({ data: { suggestion: result.text.trim() } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    return c.json({ errors: [{ code: 'AI_ERROR', message }] }, 502);
  }
});

/** POST /suggest-alt — Generate alt text for an image. */
app.post('/suggest-alt', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({
    imageUrl: z.string().url(),
    context: z.string().max(500).optional(),
  }).safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Image URL required' }] }, 400);
  }

  try {
    const result = await aiComplete([
      {
        role: 'system',
        content: 'Generate a concise, descriptive alt text for the image at the given URL. The alt text should be informative and accessible (under 125 characters). Return only the alt text, nothing else.',
      },
      {
        role: 'user',
        content: `Image URL: ${parsed.data.imageUrl}${parsed.data.context ? `\nContext: ${parsed.data.context}` : ''}`,
      },
    ], { maxTokens: 100, temperature: 0.3 });

    return c.json({ data: { suggestion: result.text.trim() } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    return c.json({ errors: [{ code: 'AI_ERROR', message }] }, 502);
  }
});

export default app;
