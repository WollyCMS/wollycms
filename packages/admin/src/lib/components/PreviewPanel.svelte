<script lang="ts">
  import { getAuthToken } from '$lib/api.js';

  let {
    slug,
    visible = false,
  }: {
    slug: string;
    visible: boolean;
  } = $props();

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let loading = $state(true);
  let previewUrl = $derived(buildPreviewUrl(slug));

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

  function onLoad() {
    loading = false;
  }
</script>

{#if visible}
  <div class="preview-panel">
    <div class="preview-toolbar">
      <span class="preview-label">Live Preview</span>
      <button class="btn btn-sm btn-outline" onclick={refresh} title="Refresh preview">
        &#x21bb; Refresh
      </button>
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
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--c-bg-subtle);
    border-bottom: 1px solid var(--c-border);
    flex-shrink: 0;
  }
  .preview-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--c-text-light);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .preview-frame-wrap {
    flex: 1;
    position: relative;
    overflow: hidden;
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
  }
</style>
