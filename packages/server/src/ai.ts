/**
 * AI provider abstraction — routes requests to OpenAI, Anthropic,
 * Ollama, or any OpenAI-compatible endpoint.
 *
 * All providers are accessed via the OpenAI-compatible chat completions
 * format. Anthropic uses its own format, handled as a special case.
 *
 * Configuration is stored in site config (no env vars needed).
 */
import { loadConfig } from './api/admin/config.js';

export interface AiConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';
  apiKey?: string;
  model: string;
  baseUrl?: string; // For ollama/custom: http://localhost:11434
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  text: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

/** Get AI config from site config. Returns null if not configured. */
export async function getAiConfig(): Promise<AiConfig | null> {
  const config = await loadConfig();
  const ai = (config as Record<string, unknown>).ai as AiConfig | undefined;
  if (!ai?.provider || !ai.model) return null;
  return ai;
}

/** Send a chat completion request to the configured AI provider. */
export async function aiComplete(
  messages: AiMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<AiResponse> {
  const config = await getAiConfig();
  if (!config) throw new Error('AI provider not configured');

  if (config.provider === 'anthropic') {
    return anthropicComplete(config, messages, options);
  }

  // OpenAI-compatible: works for openai, ollama, custom
  return openaiComplete(config, messages, options);
}

/** OpenAI-compatible chat completion (works for OpenAI, Ollama, LM Studio, vLLM). */
async function openaiComplete(
  config: AiConfig,
  messages: AiMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<AiResponse> {
  const baseUrl = getBaseUrl(config);
  const url = `${baseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: options?.maxTokens ?? 500,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  return {
    text: data.choices?.[0]?.message?.content || '',
    model: data.model || config.model,
    usage: data.usage ? {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    } : undefined,
  };
}

/** Anthropic Messages API. */
async function anthropicComplete(
  config: AiConfig,
  messages: AiMessage[],
  options?: { maxTokens?: number; temperature?: number },
): Promise<AiResponse> {
  const baseUrl = config.baseUrl || 'https://api.anthropic.com';
  const url = `${baseUrl}/v1/messages`;

  // Extract system message (Anthropic handles it separately)
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: options?.maxTokens ?? 500,
      temperature: options?.temperature ?? 0.7,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: chatMessages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
  };

  return {
    text: data.content?.find((c) => c.type === 'text')?.text || '',
    model: data.model || config.model,
    usage: data.usage ? {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    } : undefined,
  };
}

function getBaseUrl(config: AiConfig): string {
  if (config.baseUrl) return config.baseUrl.replace(/\/+$/, '');
  switch (config.provider) {
    case 'openai': return 'https://api.openai.com';
    case 'gemini': return 'https://generativelanguage.googleapis.com';
    case 'ollama': return 'http://localhost:11434';
    default: return 'https://api.openai.com';
  }
}
