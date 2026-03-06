<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getAuthToken } from '$lib/api.js';
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
  let previewUrl = $derived(buildPreviewUrl(slug));
  let deviceMode = $state<'mobile' | 'tablet' | 'desktop'>('desktop');

  const deviceWidths = { mobile: 375, tablet: 768, desktop: 0 } as const;

  const PREVIEW_BASE = 'http://localhost:4322/preview';

  function buildPreviewUrl(s: string): string {
    const token = getAuthToken();
    return `${PREVIEW_BASE}/${s}?token=${encodeURIComponent(token || '')}`;
  }

  export function refresh() {
    if (iframeEl?.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'spacely:refresh' }, '*');
    }
  }

  export function highlightBlock(pbId: string) {
    if (iframeEl?.contentWindow) {
      iframeEl.contentWindow.postMessage({ type: 'spacely:highlight-block', pbId }, '*');
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
    if (!e.data || !e.data.type) return;
    if (e.data.type === 'spacely:select-block') {
      onBlockSelect?.(e.data.pbId, e.data.region);
    }
  }

  onMount(() => {
    window.addEventListener('message', handleMessage);
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });
</script>

{#if visible}
  <div class="preview-panel">
    <div class="preview-toolbar">
      <span class="preview-label">Preview</span>
      <div class="device-toggle">
        <button class="device-btn" class:active={deviceMode === 'mobile'} onclick={() => deviceMode = 'mobile'} title="Mobile (375px)">
          <Smartphone size={14} />
        </button>
        <button class="device-btn" class:active={deviceMode === 'tablet'} onclick={() => deviceMode = 'tablet'} title="Tablet (768px)">
          <Tablet size={14} />
        </button>
        <button class="device-btn" class:active={deviceMode === 'desktop'} onclick={() => deviceMode = 'desktop'} title="Desktop (full width)">
          <Monitor size={14} />
        </button>
      </div>
      <div class="preview-actions">
        <button class="preview-action-btn" onclick={copyPreviewLink} title="Copy preview link">
          <LinkIcon size={14} />
        </button>
        <button class="preview-action-btn" onclick={refresh} title="Refresh preview">
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
