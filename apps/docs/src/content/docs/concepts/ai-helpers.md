---
title: AI Helpers
description: Connect an AI model for content suggestions, alt text generation, and SEO descriptions.
---

WollyCMS can connect to an AI provider for content assistance. Configure it once in Settings, then use AI features throughout the admin.

## Supported providers

| Provider | API Format | Notes |
|---|---|---|
| **OpenAI** | OpenAI Chat Completions | GPT-4o, GPT-4, etc. |
| **Anthropic** | Anthropic Messages | Claude Sonnet, Claude Opus, etc. |
| **Google Gemini** | OpenAI-compatible | Gemini 2.0 Flash, Gemini Pro, etc. |
| **Ollama** | OpenAI-compatible | Run models locally — Llama, Mistral, Phi, etc. No API key needed |
| **Custom** | OpenAI-compatible | Any endpoint that implements `/v1/chat/completions` (LM Studio, vLLM, etc.) |

## Setup

Go to **System → Settings → AI Provider**:

1. **Provider** — Select your AI service
2. **API Key** — Your API key (not needed for Ollama)
3. **Model** — The model name (e.g., `gpt-4o`, `claude-sonnet-4-20250514`, `llama3.2`)
4. **Base URL** — Only for Ollama and Custom providers (e.g., `http://localhost:11434`)

Click **Save Settings**. The AI features will be available immediately.

### Ollama (local models)

[Ollama](https://ollama.ai) runs AI models on your own machine. No API key, no cloud dependency, no usage costs.

1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama3.2`
3. In WollyCMS Settings:
   - Provider: **Ollama (local)**
   - Model: `llama3.2`
   - Base URL: `http://localhost:11434`

:::tip
For CMS content tasks (meta descriptions, alt text), smaller models like `llama3.2` or `phi3` work well and run fast on modest hardware.
:::

## AI features

### Suggest meta description

In the page editor's SEO sidebar, click **"Suggest"** to generate a meta description from the page content. The AI reads the page title and body text, then suggests a 120-155 character SEO description.

### Suggest alt text

In the media library, click **"Suggest alt text"** on an image to generate accessible alt text. The AI receives the image URL and any available context.

### General completion

The AI API is available for custom use:

```
POST /api/admin/ai/complete
{
  "prompt": "Summarize this article in 2 sentences: ...",
  "systemPrompt": "You are a content editor.",
  "maxTokens": 200,
  "temperature": 0.5
}
```

## API endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/ai/status` | GET | Check if AI is configured (returns provider + model) |
| `/api/admin/ai/complete` | POST | General-purpose completion |
| `/api/admin/ai/suggest-meta` | POST | Generate meta description from title + content |
| `/api/admin/ai/suggest-alt` | POST | Generate alt text for an image URL |

All AI endpoints require editor role or higher.

## Security notes

- API keys are stored in the site config database (same as other settings)
- AI requests are proxied through the WollyCMS server — API keys never reach the browser
- Content sent to AI providers includes page text and image URLs — use Ollama if data must stay local
- AI responses are suggestions only — editors review and approve before saving
