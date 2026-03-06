<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let items = $state<any[]>([]);
  let error = $state('');
  let uploading = $state(false);
  let editItem = $state<any>(null);

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/media');
      items = res.data;
    } catch (err: any) { error = err.message; }
  }

  onMount(load);

  async function handleUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    uploading = true;
    try {
      for (const file of files) {
        await api.upload(file, file.name);
      }
      load();
    } catch (err: any) { error = err.message; }
    finally { uploading = false; input.value = ''; }
  }

  async function saveEdit() {
    if (!editItem) return;
    try {
      await api.put(`/media/${editItem.id}`, { altText: editItem.altText, title: editItem.title });
      editItem = null;
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteItem(id: number) {
    if (!confirm('Delete this media?')) return;
    try { await api.del(`/media/${id}`); load(); }
    catch (err: any) { error = err.message; }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
</script>

<div class="page-header">
  <h1>Media Library ({items.length})</h1>
  <label class="btn btn-primary" style="cursor: pointer;">
    {uploading ? 'Uploading...' : '+ Upload'}
    <input type="file" multiple accept="image/*,video/*" onchange={handleUpload} style="display: none;" />
  </label>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
  {#each items as item}
    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="height: 140px; background: var(--c-bg); display: flex; align-items: center; justify-content: center; overflow: hidden;">
        {#if item.mimeType?.startsWith('image/')}
          <img src="/api/content/media/{item.id}/thumbnail" alt={item.altText || ''} style="max-width: 100%; max-height: 100%; object-fit: cover;" />
        {:else if item.mimeType?.startsWith('video/')}
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; color: var(--c-text-light);">
            <span style="font-size: 2rem;">🎬</span>
            <span style="font-size: 0.7rem;">{item.mimeType.split('/')[1].toUpperCase()}</span>
          </div>
        {:else}
          <span style="font-size: 2rem;">📁</span>
        {/if}
      </div>
      <div style="padding: 0.75rem;">
        <p style="font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{item.title || item.originalName}</p>
        <p style="font-size: 0.75rem; color: var(--c-text-light);">{formatSize(item.size)}</p>
        <div style="display: flex; gap: 0.25rem; margin-top: 0.5rem;">
          <button class="btn btn-sm btn-outline" onclick={() => editItem = { ...item }}>Edit</button>
          <button class="btn btn-sm btn-danger" onclick={() => deleteItem(item.id)}>Delete</button>
        </div>
      </div>
    </div>
  {/each}
</div>

{#if editItem}
  <div class="modal-overlay" onclick={() => editItem = null} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header"><h2>Edit Media</h2><button class="btn-icon" onclick={() => editItem = null}>✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
        <div class="form-group">
          <label>Title</label>
          <input class="form-control" bind:value={editItem.title} />
        </div>
        <div class="form-group">
          <label>Alt Text</label>
          <input class="form-control" bind:value={editItem.altText} />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => editItem = null}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
{/if}
