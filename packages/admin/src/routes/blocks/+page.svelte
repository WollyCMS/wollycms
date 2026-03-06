<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import MediaPicker from '$lib/components/MediaPicker.svelte';

  let blocks = $state<any[]>([]);
  let blockTypes = $state<any[]>([]);
  let total = $state(0);
  let error = $state('');
  let success = $state('');
  let search = $state('');
  let showCreate = $state(false);
  let editBlock = $state<any>(null);
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

  function startEdit(block: any) {
    const bt = blockTypes.find((t: any) => t.id === block.typeId);
    editBlock = { ...block, fieldsSchema: bt?.fieldsSchema || [] };
  }

  async function saveEdit() {
    if (!editBlock) return;
    try {
      await api.put(`/blocks/${editBlock.id}`, { title: editBlock.title, fields: editBlock.fields });
      editBlock = null;
      success = 'Block saved.';
      setTimeout(() => success = '', 3000);
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteBlock(id: number) {
    if (!confirm('Delete this block?')) return;
    try { await api.del(`/blocks/${id}`); load(); }
    catch (err: any) { error = err.message; }
  }

  function getFieldSchema(typeSlug: string) {
    const bt = blockTypes.find((t: any) => t.slug === typeSlug);
    return bt?.fieldsSchema || [];
  }
</script>

<div class="page-header">
  <h1>Block Library ({total})</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Block</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}
{#if success}<div class="alert alert-success">{success}</div>{/if}

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
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-outline" onclick={() => startEdit(block)}>Edit</button>
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

{#if editBlock}
  <div class="modal-overlay" onclick={() => editBlock = null} role="dialog">
    <div class="modal" style="max-width: 700px;" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Edit: {editBlock.typeName}</h2>
        <button class="btn-icon" onclick={() => editBlock = null}>✕</button>
      </div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
        <div class="form-group">
          <label>Title</label>
          <input class="form-control" bind:value={editBlock.title} required />
        </div>
        <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--c-border);" />
        {#each editBlock.fieldsSchema as field}
          <div class="form-group">
            <label style="font-size: 0.85rem;">{field.label || field.name}</label>
            {#if field.type === 'richtext'}
              <RichTextEditor
                content={editBlock.fields[field.name] || ''}
                onUpdate={(json) => { editBlock.fields[field.name] = json; }}
              />
            {:else if field.type === 'media'}
              <MediaPicker
                value={editBlock.fields[field.name] || null}
                onSelect={(mediaId) => { editBlock.fields[field.name] = mediaId; }}
              />
            {:else if field.type === 'select'}
              <select class="form-control" value={editBlock.fields[field.name] || field.default || ''}
                onchange={(e) => { editBlock.fields[field.name] = (e.target as HTMLSelectElement).value; }}>
                {#each (field.settings?.options || []) as opt}
                  <option value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
                {/each}
              </select>
            {:else if field.type === 'boolean'}
              <input type="checkbox" checked={!!editBlock.fields[field.name]}
                onchange={(e) => { editBlock.fields[field.name] = (e.target as HTMLInputElement).checked; }} />
            {:else if field.type === 'number'}
              <input type="number" class="form-control" value={editBlock.fields[field.name] || ''}
                oninput={(e) => { editBlock.fields[field.name] = Number((e.target as HTMLInputElement).value); }} />
            {:else if field.type === 'repeater'}
              <textarea class="form-control" value={JSON.stringify(editBlock.fields[field.name] || [], null, 2)}
                onblur={(e) => {
                  try { editBlock.fields[field.name] = JSON.parse((e.target as HTMLTextAreaElement).value); }
                  catch { /* ignore */ }
                }}
                style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"
              ></textarea>
            {:else if field.type === 'url'}
              <input type="url" class="form-control" value={editBlock.fields[field.name] || ''} placeholder="https://..."
                oninput={(e) => { editBlock.fields[field.name] = (e.target as HTMLInputElement).value; }} />
            {:else}
              <input class="form-control" value={editBlock.fields[field.name] || ''}
                oninput={(e) => { editBlock.fields[field.name] = (e.target as HTMLInputElement).value; }} />
            {/if}
          </div>
        {/each}
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => editBlock = null}>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
{/if}
