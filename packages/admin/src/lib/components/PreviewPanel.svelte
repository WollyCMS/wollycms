<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import { Smartphone, Tablet, Monitor, RefreshCw, LinkIcon } from 'lucide-svelte';

  let {
    slug,
    visible = false,
    onBlockSelect,
  }: {
    slug: string;
    visible: boolean;
    onBlockSelect?: (pbId: string, region: string) => void;
  } = $props();

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let loading = $state(true);
  let deviceMode = $state<'mobile' | 'tablet' | 'desktop'>('desktop');
  let sessionReady = $state(false);
  let previewToken = $state<string | null>(null);
  let siteUrl = $state<string | null>(null);

  const deviceWidths = { mobile: 375, tablet: 768, desktop: 0 } as const;

  let previewOrigin = $derived(siteUrl ? new URL(siteUrl).origin : null);

  function buildPreviewUrl(s: string): string {
    if (!siteUrl || !previewToken) return 'about:blank';
    return `${siteUrl}/preview/${s}?token=${previewToken}`;
  }

  let previewUrl = $state('about:blank');

  async function fetchSiteUrl() {
    if (siteUrl) return;
    try {
      const res = await api.get('/config');
      siteUrl = res.data.siteUrl;
    } catch {
      toast.error('Unable to fetch site config for preview.');
    }
  }

  async function ensurePreviewSession() {
    if (sessionReady) return true;
    try {
      await fetchSiteUrl();
      const res = await api.post('/auth/preview-session');
      previewToken = res.data.token;
      sessionReady = true;
      return true;
    } catch {
      toast.error('Unable to initialize preview session.');
      return false;
    }
  }

  export function refresh() {
    if (iframeEl?.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'wolly:refresh' }, '*');
    }
  }

  export function highlightBlock(pbId: string) {
    if (iframeEl?.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'wolly:highlight-block', pbId }, '*');
    }
  }

  function onLoad() {
    loading = false;
  }

  function copyPreviewLink() {
    navigator.clipboard.writeText(previewUrl).then(() => {
      toast.success('Preview link copied.');
    }).catch(() => {
      toast.error('Failed to copy link.');
    });
  }

  function handleMessage(e: MessageEvent) {
    if (previewOrigin && e.origin !== previewOrigin) return;
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'wolly:select-block') {
      onBlockSelect?.(e.data.pbId, e.data.region);
    }
  }

  onMount(() => {
    window.addEventListener('message', handleMessage);
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });

  $effect(() => {
    if (!visible || !slug) return;
    loading = true;
    ensurePreviewSession().then((ready) => {
      if (ready) previewUrl = buildPreviewUrl(slug);
    });
  });
</script>

{#if visible}
  <div class="preview-panel">
    <div class="preview-toolbar">
      <span class="preview-label">Preview</span>
      <div class="device-toggle">
        <button class="device-btn" class:active={deviceMode === 'mobile'} onclick={() => deviceMode = 'mobile'} title="Mobile (375px)" aria-label="Mobile preview (375px)" aria-pressed={deviceMode === 'mobile'}>
          <Smartphone size={14} />
        </button>
        <button class="device-btn" class:active={deviceMode === 'tablet'} onclick={() => deviceMode = 'tablet'} title="Tablet (768px)" aria-label="Tablet preview (768px)" aria-pressed={deviceMode === 'tablet'}>
          <Tablet size={14} />
        </button>
        <button class="device-btn" class:active={deviceMode === 'desktop'} onclick={() => deviceMode = 'desktop'} title="Desktop (full width)" aria-label="Desktop preview (full width)" aria-pressed={deviceMode === 'desktop'}>
          <Monitor size={14} />
        </button>
      </div>
      <div class="preview-actions">
        <button class="preview-action-btn" onclick={copyPreviewLink} title="Copy preview link" aria-label="Copy preview link">
          <LinkIcon size={14} />
        </button>
        <button class="preview-action-btn" onclick={refresh} title="Refresh preview" aria-label="Refresh preview">
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
    <div class="preview-frame-wrap">
      {#if loading}
        <div class="preview-loading">Loading preview...</div>
      {/if}
      <iframe
        bind:this={iframeEl}
        src={previewUrl}
        title="Page preview"
        onload={onLoad}
        style={deviceMode !== 'desktop' ? `width: ${deviceWidths[deviceMode]}px; margin: 0 auto;` : ''}
      ></iframe>
    </div>
  </div>
{/if}

<style>
  .preview-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-left: 2px solid var(--c-border);
    background: var(--c-bg);
  }
  .preview-toolbar {
    display: flex;
    align-items: center;
    padding: 0.4rem 0.6rem;
    background: var(--c-surface, #fff);
    border-bottom: 1px solid var(--c-border);
    flex-shrink: 0;
    gap: 0.5rem;
  }
  .preview-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-text-light);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .device-toggle {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    overflow: hidden;
    margin-left: auto;
  }
  .device-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 26px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-text-light, #94a3b8);
    transition: all 0.15s;
  }
  .device-btn:not(:last-child) {
    border-right: 1px solid var(--c-border, #e2e8f0);
  }
  .device-btn:hover {
    background: var(--c-bg, #f7f8fa);
    color: var(--c-text, #2d3748);
  }
  .device-btn.active {
    background: var(--c-accent, #3182ce);
    color: white;
  }
  .preview-actions {
    display: flex;
    align-items: center;
    gap: 0.15rem;
  }
  .preview-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius, 6px);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-text-light, #94a3b8);
    transition: all 0.15s;
  }
  .preview-action-btn:hover {
    background: var(--c-bg, #f7f8fa);
    color: var(--c-text, #2d3748);
  }
  .preview-frame-wrap {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #e5e7eb;
  }
  .preview-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--c-text-light);
    background: var(--c-bg);
  }
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    background: white;
    display: block;
    transition: width 0.3s ease;
  }
</style>
