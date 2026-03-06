<script lang="ts">
  import { api } from '$lib/api.js';

  let { value, onSelect }: { value: number | null; onSelect: (mediaId: number | null) => void } = $props();

  let open = $state(false);
  let mediaList = $state<any[]>([]);
  let loading = $state(false);
  let selected = $state<any>(null);

  async function loadMedia() {
    loading = true;
    try {
      const res = await api.get<{ data: any[] }>('/media?limit=50');
      mediaList = res.data;
    } catch { /* ignore */ }
    loading = false;
  }

  async function loadSelected() {
    if (!value) { selected = null; return; }
    try {
      const res = await api.get<{ data: any }>(`/media/${value}`);
      selected = res.data;
    } catch { selected = null; }
  }

  $effect(() => { loadSelected(); });

  function openPicker() {
    open = true;
    loadMedia();
  }

  function pick(item: any) {
    onSelect(item.id);
    open = false;
  }

  function clear() {
    onSelect(null);
  }

  function thumbnailUrl(item: any): string {
    return `/api/content/media/${item.id}/thumbnail`;
  }
</script>

<div class="media-picker">
  {#if selected}
    <div class="media-preview">
      {#if selected.mimeType?.startsWith('image/')}
        <img src={thumbnailUrl(selected)} alt={selected.altText || selected.title} />
      {:else if selected.mimeType?.startsWith('video/')}
        <div class="media-file-thumb">🎬 {selected.originalName?.split('.').pop()?.toUpperCase()}</div>
      {:else}
        <div class="media-file-thumb">{selected.originalName?.split('.').pop()?.toUpperCase() || 'FILE'}</div>
      {/if}
      <div class="media-info">
        <span class="media-name">{selected.title || selected.originalName}</span>
        <div class="media-actions">
          <button type="button" class="btn btn-sm btn-outline" onclick={openPicker}>Change</button>
          <button type="button" class="btn btn-sm btn-danger" onclick={clear}>Remove</button>
        </div>
      </div>
    </div>
  {:else}
    <button type="button" class="media-select-btn" onclick={openPicker}>
      Select Media
    </button>
  {/if}
</div>

{#if open}
  <div class="modal-overlay" onclick={() => open = false} role="dialog">
    <div class="modal" style="max-width: 720px;" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Select Media</h2>
        <button class="btn-icon" onclick={() => open = false}>✕</button>
      </div>
      <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
        {#if loading}
          <p style="text-align: center; color: var(--c-text-light);">Loading...</p>
        {:else if mediaList.length === 0}
          <p style="text-align: center; color: var(--c-text-light);">No media uploaded yet. Upload files in the Media section first.</p>
        {:else}
          <div class="media-grid">
            {#each mediaList as item}
              <button class="media-grid-item" class:selected={value === item.id} onclick={() => pick(item)}>
                {#if item.mimeType?.startsWith('image/')}
                  <img src={thumbnailUrl(item)} alt={item.altText || item.title} />
                {:else if item.mimeType?.startsWith('video/')}
                  <div class="media-file-icon">🎬 {item.originalName?.split('.').pop()?.toUpperCase()}</div>
                {:else}
                  <div class="media-file-icon">{item.originalName?.split('.').pop()?.toUpperCase() || 'FILE'}</div>
                {/if}
                <span class="media-grid-label">{item.title || item.originalName}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .media-picker {
    width: 100%;
  }

  .media-preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg-alt, #f8fafc);
  }

  .media-preview img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .media-info {
    flex: 1;
    min-width: 0;
  }

  .media-name {
    display: block;
    font-size: 0.85rem;
    margin-bottom: 0.35rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .media-actions {
    display: flex;
    gap: 0.35rem;
  }

  .media-select-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 1rem;
    border: 2px dashed var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-bg-alt, #f8fafc);
    color: var(--c-text-light, #64748b);
    font-size: 0.85rem;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .media-select-btn:hover {
    border-color: var(--c-primary, #2563eb);
    color: var(--c-primary, #2563eb);
  }

  .media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.75rem;
  }

  .media-grid-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    border: 2px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .media-grid-item:hover {
    border-color: var(--c-primary, #2563eb);
  }

  .media-grid-item.selected {
    border-color: var(--c-primary, #2563eb);
    box-shadow: 0 0 0 1px var(--c-primary, #2563eb);
  }

  .media-grid-item img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 4px;
    margin-bottom: 0.35rem;
  }

  .media-file-thumb {
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-bg-alt, #f8fafc);
    border-radius: 4px;
    flex-shrink: 0;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--c-text-light, #64748b);
  }

  .media-file-icon {
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--c-bg-alt, #f8fafc);
    border-radius: 4px;
    margin-bottom: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-text-light, #64748b);
  }

  .media-grid-label {
    font-size: 0.75rem;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    color: var(--c-text, #1e293b);
  }
</style>
