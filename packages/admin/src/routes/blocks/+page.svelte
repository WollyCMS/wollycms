<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';

  let blocks = $state<any[]>([]);
  let blockTypes = $state<any[]>([]);
  let total = $state(0);
  let error = $state('');
  let search = $state('');
  let showCreate = $state(false);
  let newBlock = $state({ title: '', typeId: 0, fields: {} as Record<string, unknown> });

  async function load() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await api.get<{ data: any[]; meta: any }>(`/blocks?${params}`);
      blocks = res.data;
      total = res.meta.total;
    } catch (err: any) { error = err.message; }
  }

  async function loadTypes() {
    const res = await api.get<{ data: any[] }>('/block-types');
    blockTypes = res.data;
    if (blockTypes.length > 0) newBlock.typeId = blockTypes[0].id;
  }

  onMount(() => { load(); loadTypes(); });

  async function createBlock() {
    try {
      await api.post('/blocks', { ...newBlock, isReusable: true });
      showCreate = false;
      newBlock = { title: '', typeId: blockTypes[0]?.id || 0, fields: {} };
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteBlock(id: number) {
    if (!confirm('Delete this block?')) return;
    try { await api.del(`/blocks/${id}`); load(); }
    catch (err: any) { error = err.message; }
  }
</script>

<div class="page-header">
  <h1>Block Library ({total})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Block</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div class="card" style="margin-bottom: 1rem;">
  <input class="form-control" placeholder="Search blocks..." bind:value={search} oninput={() => load()} style="max-width: 300px;" />
</div>

<div class="table-wrap">
  <table>
    <thead><tr><th>Title</th><th>Type</th><th>Updated</th><th></th></tr></thead>
    <tbody>
      {#each blocks as block}
        <tr>
          <td><strong>{block.title || '(untitled)'}</strong></td>
          <td>{block.typeName}</td>
          <td>{new Date(block.updatedAt).toLocaleDateString()}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-danger" onclick={() => deleteBlock(block.id)}>Delete</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header"><h2>New Shared Block</h2><button class="btn-icon" onclick={() => showCreate = false}>✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createBlock(); }}>
        <div class="form-group">
          <label for="nb-title">Title</label>
          <input id="nb-title" class="form-control" bind:value={newBlock.title} required />
        </div>
        <div class="form-group">
          <label for="nb-type">Block Type</label>
          <select id="nb-type" class="form-control" bind:value={newBlock.typeId}>
            {#each blockTypes as bt}<option value={bt.id}>{bt.name}</option>{/each}
          </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  </div>
{/if}
