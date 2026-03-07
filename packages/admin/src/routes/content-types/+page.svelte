<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let types = $state<any[]>([]);
  let error = $state('');
  let showCreate = $state(false);
  let editType = $state<any>(null);
  let newType = $state({ name: '', slug: '', description: '', fieldsSchema: '[]', regions: '[]' });

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/content-types');
      types = res.data;
    } catch (err: any) { error = err.message; }
  }

  onMount(load);

  async function createType() {
    try {
      await api.post('/content-types', {
        ...newType,
        fieldsSchema: JSON.parse(newType.fieldsSchema),
        regions: JSON.parse(newType.regions),
      });
      showCreate = false;
      newType = { name: '', slug: '', description: '', fieldsSchema: '[]', regions: '[]' };
      load();
    } catch (err: any) { error = err.message; }
  }

  function startEdit(t: any) {
    editType = {
      ...t,
      fieldsSchema: JSON.stringify(t.fieldsSchema || [], null, 2),
      regions: JSON.stringify(t.regions || [], null, 2),
    };
  }

  async function saveEdit() {
    if (!editType) return;
    try {
      await api.put(`/content-types/${editType.id}`, {
        name: editType.name,
        slug: editType.slug,
        description: editType.description,
        fieldsSchema: JSON.parse(editType.fieldsSchema),
        regions: JSON.parse(editType.regions),
      });
      editType = null;
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteType(id: number) {
    if (!confirm('Delete this content type?')) return;
    try { await api.del(`/content-types/${id}`); load(); }
    catch (err: any) { error = err.message; }
  }
</script>

<div class="page-header">
  <h1>Content Types ({types.length})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Type</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="table-wrap">
  <table>
    <thead><tr><th>Name</th><th>Slug</th><th>Fields</th><th>Regions</th><th></th></tr></thead>
    <tbody>
      {#each types as t}
        <tr>
          <td><strong>{t.name}</strong></td>
          <td style="color: var(--c-text-light);">{t.slug}</td>
          <td>{t.fieldsSchema?.length || 0}</td>
          <td>{t.regions?.length || 0}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-outline" onclick={() => startEdit(t)}>Edit</button>
            <button class="btn btn-sm btn-danger" onclick={() => deleteType(t.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate || editType}
  {@const isEdit = !!editType}
  {@const item = editType || newType}
  <div class="modal-overlay" onclick={() => { showCreate = false; editType = null; }} role="dialog" aria-modal="true" aria-labelledby="content-type-modal-title">
    <div class="modal" style="max-width: 700px;" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => { showCreate = false; editType = null; }}>
      <div class="modal-header"><h2 id="content-type-modal-title">{isEdit ? 'Edit' : 'New'} Content Type</h2><button class="btn-icon" onclick={() => { showCreate = false; editType = null; }} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); isEdit ? saveEdit() : createType(); }}>
        <div class="form-grid">
          <div class="form-group"><label>Name</label><input class="form-control" bind:value={item.name} required /></div>
          <div class="form-group"><label>Slug</label><input class="form-control" bind:value={item.slug} required /></div>
        </div>
        <div class="form-group"><label>Description</label><input class="form-control" bind:value={item.description} /></div>
        <div class="form-group">
          <label>Fields Schema (JSON)</label>
          <textarea class="form-control" bind:value={item.fieldsSchema} style="min-height: 120px; font-family: monospace; font-size: 0.8rem;"></textarea>
        </div>
        <div class="form-group">
          <label>Regions (JSON)</label>
          <textarea class="form-control" bind:value={item.regions} style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => { showCreate = false; editType = null; }}>Cancel</button>
          <button type="submit" class="btn btn-primary">{isEdit ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>
  </div>
{/if}
