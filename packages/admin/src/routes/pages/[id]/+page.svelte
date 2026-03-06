<script lang="ts">
  import { onMount } from 'svelte';
  import { page as routePage } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api.js';

  let pageData = $state<any>(null);
  let contentType = $state<any>(null);
  let blockTypes = $state<any[]>([]);
  let error = $state('');
  let success = $state('');
  let activeRegion = $state('content');
  let showAddBlock = $state(false);
  let saving = $state(false);

  const id = $derived($routePage.params.id);

  async function load() {
    try {
      const [pageRes, btRes] = await Promise.all([
        api.get<{ data: any }>(`/pages/${id}`),
        api.get<{ data: any[] }>('/block-types'),
      ]);
      pageData = pageRes.data;
      blockTypes = btRes.data;
      if (pageData.typeId) {
        const ctRes = await api.get<{ data: any }>(`/content-types/${pageData.typeId}`);
        contentType = ctRes.data;
        if (contentType.regions?.length > 0) {
          activeRegion = contentType.regions[0].name;
        }
      }
    } catch (err: any) {
      error = err.message;
    }
  }

  onMount(load);

  async function save() {
    saving = true;
    error = '';
    success = '';
    try {
      await api.put(`/pages/${id}`, {
        title: pageData.title,
        slug: pageData.slug,
        status: pageData.status,
        fields: pageData.fields || {},
      });
      success = 'Page saved.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) {
      error = err.message;
    } finally {
      saving = false;
    }
  }

  async function publish() {
    try {
      await api.put(`/pages/${id}`, { status: 'published' });
      pageData.status = 'published';
      success = 'Page published.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) {
      error = err.message;
    }
  }

  async function unpublish() {
    try {
      await api.put(`/pages/${id}`, { status: 'draft' });
      pageData.status = 'draft';
      success = 'Page unpublished.';
      setTimeout(() => success = '', 3000);
    } catch (err: any) {
      error = err.message;
    }
  }

  async function addBlock(blockTypeId: number) {
    try {
      await api.post(`/pages/${id}/blocks`, {
        blockTypeId,
        region: activeRegion,
        fields: {},
      });
      showAddBlock = false;
      load();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function removeBlock(pbId: number) {
    if (!confirm('Remove this block?')) return;
    try {
      await api.del(`/pages/${id}/blocks/${pbId}`);
      load();
    } catch (err: any) {
      error = err.message;
    }
  }

  async function updateBlockField(pbId: number, blockId: number, fieldName: string, value: unknown) {
    const regionBlocks = pageData.regions[activeRegion] || [];
    const block = regionBlocks.find((b: any) => b.pb_id === pbId);
    if (!block) return;
    block.fields[fieldName] = value;

    if (block.is_shared) {
      await api.put(`/pages/${id}/blocks/${pbId}`, { overrides: { [fieldName]: value } });
    } else {
      await api.put(`/blocks/${blockId}`, { fields: block.fields });
    }
  }

  function getRegionBlocks(region: string): any[] {
    return pageData?.regions?.[region] || [];
  }

  function getFieldSchema(blockTypeSlug: string) {
    const bt = blockTypes.find((t: any) => t.slug === blockTypeSlug);
    return bt?.fieldsSchema || [];
  }
</script>

{#if !pageData}
  <div class="loading">Loading page...</div>
{:else}
  <div class="page-header">
    <div>
      <a href="/pages" style="color: var(--c-text-light); text-decoration: none; font-size: 0.85rem;">← Back to Pages</a>
      <h1 style="margin-top: 0.25rem;">Edit: {pageData.title}</h1>
    </div>
    <div style="display: flex; gap: 0.5rem;">
      {#if pageData.status === 'draft'}
        <button class="btn btn-primary" onclick={publish}>Publish</button>
      {:else}
        <button class="btn btn-outline" onclick={unpublish}>Unpublish</button>
      {/if}
      <button class="btn btn-primary" onclick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  </div>

  {#if error}<div class="alert alert-error">{error}</div>{/if}
  {#if success}<div class="alert alert-success">{success}</div>{/if}

  <div style="display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem;">
    <div>
      <!-- Page fields -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="form-group">
          <label for="pe-title">Title</label>
          <input id="pe-title" class="form-control" bind:value={pageData.title} />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label for="pe-slug">Slug</label>
            <input id="pe-slug" class="form-control" bind:value={pageData.slug} />
          </div>
          <div class="form-group">
            <label for="pe-status">Status</label>
            <select id="pe-status" class="form-control" bind:value={pageData.status}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {#if contentType?.fieldsSchema?.length > 0}
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid var(--c-border);" />
          <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Fields</h3>
          {#each contentType.fieldsSchema as field}
            <div class="form-group">
              <label>{field.label || field.name}</label>
              <input class="form-control" value={pageData.fields?.[field.name] || ''} oninput={(e) => {
                if (!pageData.fields) pageData.fields = {};
                pageData.fields[field.name] = (e.target as HTMLInputElement).value;
              }} />
            </div>
          {/each}
        {/if}
      </div>

      <!-- Blocks by region -->
      {#if contentType?.regions?.length > 0}
        <div class="tabs">
          {#each contentType.regions as region}
            <button class="tab" class:active={activeRegion === region.name} onclick={() => activeRegion = region.name}>
              {region.label} ({getRegionBlocks(region.name).length})
            </button>
          {/each}
        </div>

        <div class="card">
          {#each getRegionBlocks(activeRegion) as block, i}
            <div class="block-editor" style="padding: 1rem; border: 1px solid var(--c-border); border-radius: var(--radius); margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <strong style="font-size: 0.9rem;">
                  {block.block_type}
                  {#if block.is_shared}<span class="badge badge-published" style="margin-left: 0.5rem;">shared</span>{/if}
                </strong>
                <button class="btn btn-sm btn-danger" onclick={() => removeBlock(block.pb_id)}>Remove</button>
              </div>
              {#each getFieldSchema(block.block_type) as field}
                <div class="form-group">
                  <label style="font-size: 0.8rem;">{field.label || field.name}</label>
                  {#if field.type === 'richtext'}
                    <textarea class="form-control" value={typeof block.fields[field.name] === 'object' ? JSON.stringify(block.fields[field.name], null, 2) : (block.fields[field.name] || '')}
                      onblur={(e) => {
                        try {
                          const val = JSON.parse((e.target as HTMLTextAreaElement).value);
                          updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, val);
                        } catch { /* keep as string */ }
                      }}
                      style="min-height: 120px; font-family: monospace; font-size: 0.8rem;"
                    ></textarea>
                  {:else if field.type === 'select'}
                    <select class="form-control" value={block.fields[field.name] || field.default || ''}
                      onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLSelectElement).value)}>
                      {#each (field.settings?.options || field.options || []) as opt}
                        <option value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
                      {/each}
                    </select>
                  {:else if field.type === 'boolean'}
                    <input type="checkbox" checked={!!block.fields[field.name]}
                      onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).checked)} />
                  {:else if field.type === 'number'}
                    <input type="number" class="form-control" value={block.fields[field.name] || ''}
                      oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, Number((e.target as HTMLInputElement).value))} />
                  {:else if field.type === 'repeater'}
                    <textarea class="form-control" value={JSON.stringify(block.fields[field.name] || [], null, 2)}
                      onblur={(e) => {
                        try {
                          const val = JSON.parse((e.target as HTMLTextAreaElement).value);
                          updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, val);
                        } catch { /* ignore parse errors */ }
                      }}
                      style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"
                    ></textarea>
                  {:else}
                    <input class="form-control" value={block.fields[field.name] || ''}
                      oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                  {/if}
                </div>
              {/each}
            </div>
          {/each}

          <button class="btn btn-outline" style="width: 100%;" onclick={() => showAddBlock = true}>
            + Add Block to {activeRegion}
          </button>
        </div>
      {/if}
    </div>

    <!-- Sidebar info -->
    <div>
      <div class="card" style="margin-bottom: 1rem;">
        <h3 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Page Info</h3>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Type: {pageData.type}</p>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Status: <span class="badge badge-{pageData.status}">{pageData.status}</span></p>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Created: {new Date(pageData.meta.created_at).toLocaleString()}</p>
        <p style="font-size: 0.85rem; color: var(--c-text-light);">Updated: {new Date(pageData.meta.updated_at).toLocaleString()}</p>
      </div>
    </div>
  </div>

  {#if showAddBlock}
    <div class="modal-overlay" onclick={() => showAddBlock = false} role="dialog">
      <div class="modal" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2>Add Block to "{activeRegion}"</h2>
          <button class="btn-icon" onclick={() => showAddBlock = false}>✕</button>
        </div>
        <div class="modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            {#each blockTypes as bt}
              <button class="card" style="cursor: pointer; text-align: left;" onclick={() => addBlock(bt.id)}>
                <strong style="font-size: 0.9rem;">{bt.name}</strong>
                {#if bt.description}<p style="font-size: 0.8rem; color: var(--c-text-light); margin-top: 0.25rem;">{bt.description}</p>{/if}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
