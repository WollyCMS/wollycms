<script lang="ts">
  import { api } from '$lib/api.js';
  import RichTextEditor from './RichTextEditor.svelte';
  import SortableList from './SortableList.svelte';
  import MediaPicker from './MediaPicker.svelte';

  let {
    pageData,
    pageId,
    contentType,
    blockTypes,
    activeRegion = $bindable('content'),
    error = $bindable(''),
    onReload,
  }: {
    pageData: any;
    pageId: string;
    contentType: any;
    blockTypes: any[];
    activeRegion: string;
    error: string;
    onReload: () => void;
  } = $props();

  let showAddBlock = $state(false);

  function getRegionBlocks(region: string): any[] {
    return pageData?.regions?.[region] || [];
  }

  function getFieldSchema(blockTypeSlug: string) {
    const bt = blockTypes.find((t: any) => t.slug === blockTypeSlug);
    return bt?.fieldsSchema || [];
  }

  function isFieldVisible(field: any, allFields: any[], blockFields: Record<string, any>): boolean {
    if (field.name === 'media' && allFields.some((f: any) => f.name === 'source')) {
      return blockFields['source'] === 'upload' || !blockFields['source'];
    }
    if (field.name === 'url' && allFields.some((f: any) => f.name === 'source')) {
      return blockFields['source'] === 'youtube' || blockFields['source'] === 'vimeo';
    }
    return true;
  }

  function sortableBlocks(region: string) {
    return getRegionBlocks(region).map((b: any) => ({ ...b, id: b.pb_id }));
  }

  async function addBlock(blockTypeId: number) {
    try {
      await api.post(`/pages/${pageId}/blocks`, { blockTypeId, region: activeRegion, fields: {} });
      showAddBlock = false;
      onReload();
    } catch (err: any) { error = err.message; }
  }

  async function removeBlock(pbId: number) {
    if (!confirm('Remove this block?')) return;
    try { await api.del(`/pages/${pageId}/blocks/${pbId}`); onReload(); }
    catch (err: any) { error = err.message; }
  }

  async function updateBlockField(pbId: number, blockId: number, fieldName: string, value: unknown) {
    const regionBlocks = pageData.regions[activeRegion] || [];
    const block = regionBlocks.find((b: any) => b.pb_id === pbId);
    if (!block) return;
    block.fields[fieldName] = value;
    if (block.is_shared) {
      await api.put(`/pages/${pageId}/blocks/${pbId}`, { overrides: { [fieldName]: value } });
    } else {
      await api.put(`/blocks/${blockId}`, { fields: block.fields });
    }
  }

  async function reorderBlocks(reordered: any[]) {
    const order = reordered.map((b: any) => b.pb_id);
    pageData.regions[activeRegion] = reordered;
    try {
      await api.put(`/pages/${pageId}/blocks-order`, { region: activeRegion, order });
    } catch (err: any) { error = err.message; onReload(); }
  }
</script>

{#if contentType?.regions?.length > 0}
  <div class="tabs">
    {#each contentType.regions as region}
      <button class="tab" class:active={activeRegion === region.name} onclick={() => activeRegion = region.name}>
        {region.label} ({getRegionBlocks(region.name).length})
      </button>
    {/each}
  </div>
  <div class="card">
    <SortableList items={sortableBlocks(activeRegion)} onReorder={reorderBlocks}>
      {#snippet children(block, i)}
        <div class="block-editor" style="padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <strong style="font-size: 0.9rem;">
              {block.block_type}
              {#if block.is_shared}<span class="badge badge-published" style="margin-left: 0.5rem;">shared</span>{/if}
            </strong>
            <button class="btn btn-sm btn-danger" onclick={() => removeBlock(block.pb_id)}>Remove</button>
          </div>
          {#each getFieldSchema(block.block_type) as field}
            {#if isFieldVisible(field, getFieldSchema(block.block_type), block.fields)}
              <div class="form-group">
                <label style="font-size: 0.8rem;">{field.label || field.name}</label>
                {#if field.type === 'richtext'}
                  <RichTextEditor content={block.fields[field.name] || ''}
                    onUpdate={(json) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, json)} />
                {:else if field.type === 'media'}
                  <MediaPicker value={block.fields[field.name] || null}
                    onSelect={(mediaId) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, mediaId)} />
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
                    onblur={(e) => { try { updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* ignore */ } }}
                    style="min-height: 100px; font-family: monospace; font-size: 0.8rem;"></textarea>
                {:else if field.type === 'url'}
                  <input type="url" class="form-control" value={block.fields[field.name] || ''} placeholder="https://..."
                    oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                {:else}
                  <input class="form-control" value={block.fields[field.name] || ''}
                    oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      {/snippet}
    </SortableList>
    <button class="btn btn-outline" style="width: 100%; margin-top: 0.75rem;" onclick={() => showAddBlock = true}>
      + Add Block to {activeRegion}
    </button>
  </div>
{/if}

{#if showAddBlock}
  <div class="modal-overlay" onclick={() => showAddBlock = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h2>Add Block to "{activeRegion}"</h2>
        <button class="btn-icon" onclick={() => showAddBlock = false}>&#10005;</button>
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
