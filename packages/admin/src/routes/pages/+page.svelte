<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let pages = $state<any[]>([]);
  let total = $state(0);
  let error = $state('');
  let search = $state('');
  let statusFilter = $state('');
  let showCreate = $state(false);
  let contentTypes = $state<any[]>([]);
  let newPage = $state({ title: '', typeId: 0, status: 'draft' as string });

  async function load() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ data: any[]; meta: any }>(`/pages?${params}`);
      pages = res.data;
      total = res.meta.total;
    } catch (err: any) {
      error = err.message;
    }
  }

  async function loadTypes() {
    const res = await api.get<{ data: any[] }>('/content-types');
    contentTypes = res.data;
    if (contentTypes.length > 0) newPage.typeId = contentTypes[0].id;
  }

  onMount(() => { load(); loadTypes(); });

  async function createPage() {
    try {
      await api.post('/pages', newPage);
      showCreate = false;
      newPage = { title: '', typeId: contentTypes[0]?.id || 0, status: 'draft' };
      load();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function deletePage(id: number) {
    if (!confirm('Delete this page?')) return;
    try {
      await api.del(`/pages/${id}`);
      load();
    } catch (err: any) {
      error = err.message;
    }
  }
</script>

<div class="page-header">
  <h1>Pages ({total})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Page</button>
</div>

{#if error}
  <div class="alert alert-error">{error}</div>
{/if}

<div class="card" style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
  <input class="form-control" placeholder="Search pages..." bind:value={search} oninput={() => load()} style="max-width: 300px;" />
  <select class="form-control" bind:value={statusFilter} onchange={() => load()} style="max-width: 160px;">
    <option value="">All statuses</option>
    <option value="published">Published</option>
    <option value="draft">Draft</option>
    <option value="archived">Archived</option>
  </select>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr><th>Title</th><th>Slug</th><th>Type</th><th>Status</th><th>Updated</th><th></th></tr>
    </thead>
    <tbody>
      {#each pages as page}
        <tr>
          <td><a href="/pages/{page.id}"><strong>{page.title}</strong></a></td>
          <td style="color: var(--c-text-light);">/{page.slug}</td>
          <td>{page.typeName}</td>
          <td><span class="badge badge-{page.status}">{page.status}</span></td>
          <td>{new Date(page.meta.updated_at).toLocaleDateString()}</td>
          <td style="text-align: right;">
            <a href="/pages/{page.id}" class="btn btn-sm btn-outline">Edit</a>
            <button class="btn btn-sm btn-danger" onclick={() => deletePage(page.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>New Page</h2>
        <button class="btn-icon" onclick={() => showCreate = false}>✕</button>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createPage(); }}>
        <div class="form-group">
          <label for="np-title">Title</label>
          <input id="np-title" class="form-control" bind:value={newPage.title} required />
        </div>
        <div class="form-group">
          <label for="np-type">Content Type</label>
          <select id="np-type" class="form-control" bind:value={newPage.typeId}>
            {#each contentTypes as ct}
              <option value={ct.id}>{ct.name}</option>
            {/each}
          </select>
        </div>
        <div class="form-group">
          <label for="np-status">Status</label>
          <select id="np-status" class="form-control" bind:value={newPage.status}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create Page</button>
        </div>
      </form>
    </div>
  </div>
{/if}
