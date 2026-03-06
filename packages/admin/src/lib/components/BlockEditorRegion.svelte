<script lang="ts">
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';
  import {
    Type, List, MousePointer, Users, MapPin, Link, ImageIcon, Grid3X3,
    Video, Rows3, Pencil, Copy, ArrowRightLeft, Trash2,
  } from 'lucide-svelte';
  import RichTextEditor from './RichTextEditor.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import RepeaterEditor from './RepeaterEditor.svelte';

  const lucideMap: Record<string, any> = {
    'type': Type, 'list': List, 'mouse-pointer': MousePointer,
    'users': Users, 'map-pin': MapPin, 'link': Link,
    'image': ImageIcon, 'grid': Grid3X3, 'video': Video, 'rows-3': Rows3,
  };

  let {
    pageData,
    pageId,
    contentType,
    blockTypes,
    activeRegion = $bindable('content'),
    error = $bindable(''),
    onReload,
    onBlockExpand,
  }: {
    pageData: any;
    pageId: string;
    contentType: any;
    blockTypes: any[];
    activeRegion: string;
    error: string;
    onReload: () => void;
    onBlockExpand?: (pbId: string) => void;
  } = $props();

  let showAddBlock = $state(false);
  let addBlockTab = $state<'new' | 'library'>('new');
  let libraryBlocks = $state<any[]>([]);
  let librarySearch = $state('');
  let libraryFilter = $state('');
  let expandedBlocks = $state(new Set<number>());

  // Drag state
  let dragPbId = $state<number | null>(null);
  let dragSourceRegion = $state<string | null>(null);
  let dropTargetRegion = $state<string | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  let filteredLibrary = $derived(
    libraryBlocks.filter((b) => {
      if (libraryFilter && b.typeSlug !== libraryFilter) return false;
      if (librarySearch && !b.title?.toLowerCase().includes(librarySearch.toLowerCase())) return false;
      return true;
    })
  );

  const regions = $derived<{ name: string; label: string }[]>(contentType?.regions || []);

  function getRegionBlocks(region: string): any[] {
    return pageData?.regions?.[region] || [];
  }

  function getBlockTypeName(slug: string): string {
    return blockTypes.find((t: any) => t.slug === slug)?.name || slug;
  }

  function getFieldSchema(slug: string) {
    return blockTypes.find((t: any) => t.slug === slug)?.fieldsSchema || [];
  }

  function isFieldVisible(field: any, allFields: any[], blockFields: Record<string, any>): boolean {
    const fields = blockFields || {};
    if (field.name === 'media' && allFields.some((f: any) => f.name === 'source'))
      return fields['source'] === 'upload' || !fields['source'];
    if (field.name === 'url' && allFields.some((f: any) => f.name === 'source'))
      return fields['source'] === 'youtube' || fields['source'] === 'vimeo';
    return true;
  }

  function toggleExpanded(pbId: number) {
    const next = new Set(expandedBlocks);
    if (next.has(pbId)) {
      next.delete(pbId);
    } else {
      next.add(pbId);
      onBlockExpand?.(`pb_${pbId}`);
    }
    expandedBlocks = next;
  }

  /** Scroll to and expand a block by its content-API pb_id (e.g. "pb_42") */
  export function scrollToBlock(pbIdStr: string) {
    const numericId = parseInt(pbIdStr.replace('pb_', ''), 10);
    if (isNaN(numericId)) return;

    // Expand the block
    const next = new Set(expandedBlocks);
    next.add(numericId);
    expandedBlocks = next;

    // Scroll to it after DOM update
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-block-pb-id="${numericId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /** Extract plain text from TipTap JSON */
  function extractTipTapText(node: any): string {
    if (!node || typeof node !== 'object') return '';
    if (node.type === 'text') return node.text || '';
    if (Array.isArray(node.content)) return node.content.map(extractTipTapText).join(' ');
    return '';
  }

  function getBlockTitle(block: any): string {
    if (block.title) return block.title;
    const flds = block.fields || {};
    if (flds.heading) return flds.heading;
    if (flds.text) return flds.text;
    if (flds.name) return flds.name;
    return '';
  }

  /** Get a content preview for blocks that lack a clear title */
  function getBlockPreview(block: any): string {
    const flds = block.fields || {};
    // Try to extract text from richtext body
    if (flds.body && typeof flds.body === 'object' && flds.body.type === 'doc') {
      const text = extractTipTapText(flds.body).trim();
      if (text) return text.length > 80 ? text.slice(0, 80) + '...' : text;
    }
    // For other blocks, try common text fields
    for (const key of ['subtitle', 'description', 'address', 'label']) {
      if (flds[key] && typeof flds[key] === 'string') {
        return flds[key].length > 80 ? flds[key].slice(0, 80) + '...' : flds[key];
      }
    }
    return '';
  }

  /** Safe field access — ensures block.fields is always an object */
  function f(block: any): Record<string, any> {
    if (!block.fields) block.fields = {};
    return block.fields;
  }

  // Track recently dropped block for flash animation
  let justDroppedPbId = $state<number | null>(null);

  const regionColors: Record<string, string> = {
    hero: '#c4962c',
    content: '#2563eb',
    sidebar: '#0d9488',
    bottom: '#7c3aed',
    features: '#ea580c',
  };

  function getRegionColor(name: string): string {
    return regionColors[name] || '#6b7280';
  }

  // === Drag and Drop ===

  function onDragStart(e: DragEvent, pbId: number, region: string) {
    dragPbId = pbId;
    dragSourceRegion = region;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(pbId));
    }
    // Style the dragged element
    const el = (e.target as HTMLElement).closest('.block-card') as HTMLElement;
    if (el) {
      requestAnimationFrame(() => el.classList.add('is-dragging'));
    }
  }

  function onDragOverSlot(e: DragEvent, region: string, index: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dropTargetRegion = region;
    dropTargetIndex = index;
  }

  function onDragLeaveSlot(e: DragEvent) {
    const related = e.relatedTarget as HTMLElement | null;
    const current = e.currentTarget as HTMLElement;
    if (!related || !current.contains(related)) {
      dropTargetRegion = null;
      dropTargetIndex = null;
    }
  }

  function onDragEnd() {
    // Remove dragging class from all
    document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
    dragPbId = null;
    dragSourceRegion = null;
    dropTargetRegion = null;
    dropTargetIndex = null;
  }

  async function onDropSlot(e: DragEvent, targetRegion: string, targetIndex: number) {
    e.preventDefault();
    if (!dragPbId || !dragSourceRegion) {
      onDragEnd();
      return;
    }

    const pbId = dragPbId;
    const sourceRegion = dragSourceRegion;
    onDragEnd();

    const sourceBlocks = getRegionBlocks(sourceRegion);
    const sourceIndex = sourceBlocks.findIndex((b: any) => b.pb_id === pbId);
    if (sourceIndex === -1) return;

    if (sourceRegion === targetRegion) {
      // Same-region reorder
      if (sourceIndex === targetIndex || sourceIndex + 1 === targetIndex) return;
      const reordered = [...sourceBlocks];
      const [moved] = reordered.splice(sourceIndex, 1);
      const insertAt = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
      reordered.splice(insertAt, 0, moved);
      pageData.regions[targetRegion] = reordered;
      const order = reordered.map((b: any) => b.pb_id);
      justDroppedPbId = pbId;
      setTimeout(() => { justDroppedPbId = null; }, 1200);
      try {
        await api.put(`/pages/${pageId}/blocks-order`, { region: targetRegion, order });
      } catch (err: any) {
        error = err.message;
        onReload();
      }
    } else {
      // Cross-region move
      try {
        await api.put(`/pages/${pageId}/blocks/${pbId}`, {
          region: targetRegion,
          position: targetIndex,
        });
        // Normalize both regions
        const movedBlock = sourceBlocks.find((b: any) => b.pb_id === pbId);
        const targetBlocks = [...getRegionBlocks(targetRegion)];
        targetBlocks.splice(targetIndex, 0, movedBlock);
        const targetOrder = targetBlocks.map((b: any) => b.pb_id);
        await api.put(`/pages/${pageId}/blocks-order`, { region: targetRegion, order: targetOrder });

        const remainingSource = sourceBlocks.filter((b: any) => b.pb_id !== pbId);
        if (remainingSource.length > 0) {
          const sourceOrder = remainingSource.map((b: any) => b.pb_id);
          await api.put(`/pages/${pageId}/blocks-order`, { region: sourceRegion, order: sourceOrder });
        }
        justDroppedPbId = pbId;
        setTimeout(() => { justDroppedPbId = null; }, 1200);
        onReload();
      } catch (err: any) {
        error = err.message;
        onReload();
      }
    }
  }

  function isDropTarget(region: string, index: number): boolean {
    return dropTargetRegion === region && dropTargetIndex === index;
  }

  // === Block CRUD ===

  async function addBlock(blockTypeId: number) {
    try {
      await api.post(`/pages/${pageId}/blocks`, { blockTypeId, region: activeRegion, fields: {} });
      showAddBlock = false;
      onReload();
    } catch (err: any) { error = err.message; }
  }

  async function addSharedBlock(blockId: number) {
    try {
      await api.post(`/pages/${pageId}/blocks`, { blockId, region: activeRegion, isShared: true });
      showAddBlock = false;
      onReload();
    } catch (err: any) { error = err.message; }
  }

  async function removeBlock(pbId: number) {
    if (!confirm('Remove this block from this region?')) return;
    try { await api.del(`/pages/${pageId}/blocks/${pbId}`); onReload(); }
    catch (err: any) { error = err.message; }
  }

  async function updateBlockField(pbId: number, blockId: number, fieldName: string, value: unknown) {
    for (const r of regions) {
      const regionBlocks = pageData.regions[r.name] || [];
      const block = regionBlocks.find((b: any) => b.pb_id === pbId);
      if (!block) continue;
      block.fields[fieldName] = value;
      try {
        if (block.is_shared) {
          await api.put(`/pages/${pageId}/blocks/${pbId}`, { overrides: { [fieldName]: value } });
        } else {
          await api.put(`/blocks/${blockId}`, { fields: block.fields });
        }
        toast.success('Block saved.');
      } catch (err: any) {
        toast.error(err.message);
      }
      return;
    }
  }

  const blockCategories: Record<string, string[]> = {
    'Text': ['rich_text', 'accordion'],
    'Media': ['image', 'video'],
    'Navigation': ['link_list', 'cta_button'],
    'Data': ['contact_list', 'location', 'content_listing'],
    'Layout': ['hero'],
  };

  function getBlockCategory(slug: string): string {
    for (const [cat, slugs] of Object.entries(blockCategories)) {
      if (slugs.includes(slug)) return cat;
    }
    return 'Other';
  }

  const groupedBlockTypes = $derived.by(() => {
    const groups: Record<string, any[]> = {};
    for (const bt of blockTypes) {
      const cat = getBlockCategory(bt.slug);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(bt);
    }
    return groups;
  });

  let moveRegionBlock = $state<{ pbId: number; currentRegion: string } | null>(null);

  async function duplicateBlock(pbId: number, region: string) {
    const blocks = getRegionBlocks(region);
    const block = blocks.find((b: any) => b.pb_id === pbId);
    if (!block) return;
    try {
      await api.post(`/pages/${pageId}/blocks`, {
        blockTypeId: blockTypes.find((t: any) => t.slug === block.block_type)?.id,
        region,
        fields: { ...block.fields },
      });
      toast.success('Block duplicated.');
      onReload();
    } catch (err: any) { toast.error(err.message); }
  }

  async function moveBlockToRegion(pbId: number, targetRegion: string) {
    try {
      await api.put(`/pages/${pageId}/blocks/${pbId}`, { region: targetRegion });
      toast.success(`Block moved to ${targetRegion}.`);
      moveRegionBlock = null;
      onReload();
    } catch (err: any) { toast.error(err.message); }
  }

  async function openAddBlock(regionName: string) {
    activeRegion = regionName;
    showAddBlock = true;
    addBlockTab = 'new';
    librarySearch = '';
    libraryFilter = '';
    try {
      const res = await api.get<{ data: any[] }>('/blocks?reusable=true');
      libraryBlocks = res.data;
    } catch { libraryBlocks = []; }
  }
</script>

{#if regions.length > 0}
  <div class="region-editor">
    {#each regions as region}
      {@const rBlocks = getRegionBlocks(region.name)}
      {@const color = getRegionColor(region.name)}
      <div class="region-section" class:region-drag-active={dropTargetRegion === region.name}>
        <div class="region-header" style="--region-color: {color}">
          <div class="region-header-left">
            <span class="region-indicator" style="background: {color}"></span>
            <span class="region-name">{region.label}</span>
            <span class="region-count">{rBlocks.length}</span>
          </div>
          <button class="region-add-btn" onclick={() => openAddBlock(region.name)} title="Add block to {region.label}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>

        <div
          class="region-blocks"
          ondragover={(e) => { if (rBlocks.length === 0) onDragOverSlot(e, region.name, 0); }}
          ondragleave={onDragLeaveSlot}
          ondrop={(e) => { if (rBlocks.length === 0) onDropSlot(e, region.name, 0); }}
        >
          {#if rBlocks.length === 0}
            <div class="region-empty" class:drop-active={dropTargetRegion === region.name && dragPbId !== null}>
              {#if dragPbId !== null}
                <span>Drop here</span>
              {:else}
                <span>No blocks yet — click + to add</span>
              {/if}
            </div>
          {:else}
            {#each rBlocks as block, i (block.pb_id)}
              <!-- Drop zone before this block -->
              <div
                class="drop-zone"
                class:drop-active={isDropTarget(region.name, i)}
                ondragover={(e) => onDragOverSlot(e, region.name, i)}
                ondragleave={onDragLeaveSlot}
                ondrop={(e) => onDropSlot(e, region.name, i)}
              ></div>

              <div
                class="block-card"
                class:is-expanded={expandedBlocks.has(block.pb_id)}
                class:just-dropped={justDroppedPbId === block.pb_id}
                data-block-pb-id={block.pb_id}
                ondragend={onDragEnd}
              >
                <div class="block-card-header">
                  <span class="block-position">{i + 1}</span>
                  <span
                    class="block-drag-handle"
                    draggable="true"
                    ondragstart={(e) => onDragStart(e, block.pb_id, region.name)}
                    role="button"
                    tabindex="0"
                    aria-label="Drag to reorder"
                  >&#x2807;</span>
                  <button class="block-card-toggle" onclick={() => toggleExpanded(block.pb_id)}>
                    <span class="picker-icon-inline">
                      {#if lucideMap[blockTypes.find((t) => t.slug === block.block_type)?.icon]}
                        <svelte:component this={lucideMap[blockTypes.find((t) => t.slug === block.block_type)?.icon]} size={14} />
                      {/if}
                    </span>
                    <span class="block-type-badge" style="background: {color}20; color: {color}; border-color: {color}40;">
                      {getBlockTypeName(block.block_type)}
                    </span>
                    {#if getBlockTitle(block)}
                      <span class="block-title">{getBlockTitle(block)}</span>
                    {:else if getBlockPreview(block)}
                      <span class="block-preview">{getBlockPreview(block)}</span>
                    {/if}
                    {#if block.is_shared}
                      <span class="badge-shared">shared</span>
                    {/if}
                    <span class="expand-chevron" class:rotated={expandedBlocks.has(block.pb_id)}>&#9662;</span>
                  </button>
                  <div class="block-actions">
                    <button class="block-action-btn" onclick={() => toggleExpanded(block.pb_id)} title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button class="block-action-btn" onclick={() => duplicateBlock(block.pb_id, region.name)} title="Duplicate">
                      <Copy size={13} />
                    </button>
                    {#if regions.length > 1}
                      <button class="block-action-btn" onclick={() => moveRegionBlock = { pbId: block.pb_id, currentRegion: region.name }} title="Move to region">
                        <ArrowRightLeft size={13} />
                      </button>
                    {/if}
                    <button class="block-action-btn block-action-danger" onclick={() => removeBlock(block.pb_id)} title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {#if expandedBlocks.has(block.pb_id)}
                  <div class="block-card-body">
                    {#each getFieldSchema(block.block_type) as field}
                      {#if isFieldVisible(field, getFieldSchema(block.block_type), block.fields || {})}
                        <div class="form-group">
                          <label style="font-size: 0.8rem;">{field.label || field.name}</label>
                          {#if field.type === 'richtext'}
                            <RichTextEditor content={f(block)[field.name] || ''}
                              onUpdate={(json) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, json)} />
                          {:else if field.type === 'media'}
                            <MediaPicker value={f(block)[field.name] || null}
                              onSelect={(mediaId) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, mediaId)} />
                          {:else if field.type === 'select'}
                            <select class="form-control" value={f(block)[field.name] || field.default || ''}
                              onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLSelectElement).value)}>
                              {#each (field.settings?.options || field.options || []) as opt}
                                <option value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</option>
                              {/each}
                            </select>
                          {:else if field.type === 'boolean'}
                            <input type="checkbox" checked={!!f(block)[field.name]}
                              onchange={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).checked)} />
                          {:else if field.type === 'number'}
                            <input type="number" class="form-control" value={f(block)[field.name] || ''}
                              oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, Number((e.target as HTMLInputElement).value))} />
                          {:else if field.type === 'repeater'}
                            <RepeaterEditor {field} value={Array.isArray(f(block)[field.name]) ? f(block)[field.name] : []}
                              onUpdate={(items) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, items)} />
                          {:else if field.type === 'url'}
                            <input type="url" class="form-control" value={f(block)[field.name] || ''} placeholder="https://..."
                              oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                          {:else}
                            <input class="form-control" value={f(block)[field.name] || ''}
                              oninput={(e) => updateBlockField(block.pb_id, block.block_id || block.pb_id, field.name, (e.target as HTMLInputElement).value)} />
                          {/if}
                        </div>
                      {/if}
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
            <!-- Drop zone after last block -->
            <div
              class="drop-zone drop-zone-end"
              class:drop-active={isDropTarget(region.name, rBlocks.length)}
              ondragover={(e) => onDragOverSlot(e, region.name, rBlocks.length)}
              ondragleave={onDragLeaveSlot}
              ondrop={(e) => onDropSlot(e, region.name, rBlocks.length)}
            ></div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

{#if showAddBlock}
  <div class="modal-overlay" onclick={() => showAddBlock = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 600px;">
      <div class="modal-header">
        <h2>Add Block to "{activeRegion}"</h2>
        <button class="btn-icon" onclick={() => showAddBlock = false}>&#10005;</button>
      </div>
      <div class="modal-body">
        <div class="tabs" style="margin-bottom: 1rem;">
          <button class="tab" class:active={addBlockTab === 'new'} onclick={() => addBlockTab = 'new'}>New Block</button>
          <button class="tab" class:active={addBlockTab === 'library'} onclick={() => addBlockTab = 'library'}>From Library</button>
        </div>

        {#if addBlockTab === 'new'}
          <div class="block-picker">
            {#each Object.entries(groupedBlockTypes) as [category, types]}
              <div class="picker-category">
                <span class="picker-category-label">{category}</span>
                <div class="picker-grid">
                  {#each types as bt}
                    <button class="picker-item" onclick={() => addBlock(bt.id)} title={bt.description || bt.name}>
                      <span class="picker-icon">
                        {#if lucideMap[bt.icon]}
                          <svelte:component this={lucideMap[bt.icon]} size={20} />
                        {:else}
                          <Grid3X3 size={20} />
                        {/if}
                      </span>
                      <span class="picker-label">{bt.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
            <input class="form-control" placeholder="Search blocks..." bind:value={librarySearch} style="flex: 1;" />
            <select class="form-control" bind:value={libraryFilter} style="width: auto;">
              <option value="">All types</option>
              {#each blockTypes as bt}
                <option value={bt.slug}>{bt.name}</option>
              {/each}
            </select>
          </div>
          {#if filteredLibrary.length === 0}
            <p style="color: var(--c-text-light); font-size: 0.85rem; text-align: center; padding: 1rem;">
              {libraryBlocks.length === 0 ? 'No shared blocks in library yet.' : 'No blocks match your search.'}
            </p>
          {:else}
            <div style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
              {#each filteredLibrary as block}
                <button class="card" style="cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center;"
                  onclick={() => addSharedBlock(block.id)}>
                  <div>
                    <strong style="font-size: 0.9rem;">{block.title || 'Untitled'}</strong>
                    <span style="font-size: 0.75rem; color: var(--c-text-light); margin-left: 0.5rem;">{block.typeSlug}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--c-text-light);">{block.usageCount} uses</span>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if moveRegionBlock}
  <div class="modal-overlay" onclick={() => moveRegionBlock = null} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()} style="max-width: 360px;">
      <div class="modal-header">
        <h2>Move to Region</h2>
        <button class="btn-icon" onclick={() => moveRegionBlock = null}>&#10005;</button>
      </div>
      <div class="modal-body">
        <div class="move-region-list">
          {#each regions.filter(r => r.name !== moveRegionBlock?.currentRegion) as region}
            <button class="move-region-option" onclick={() => moveBlockToRegion(moveRegionBlock!.pbId, region.name)}>
              <span class="region-indicator" style="background: {getRegionColor(region.name)}"></span>
              {region.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .region-editor {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .region-section {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: #fff;
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .region-section.region-drag-active {
    border-color: var(--c-primary, #2563eb);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-primary, #2563eb) 15%, transparent);
  }

  .region-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--c-border, #e2e8f0);
    background: var(--c-bg-alt, #f8fafc);
    border-radius: var(--radius, 6px) var(--radius, 6px) 0 0;
  }

  .region-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .region-indicator {
    width: 4px;
    height: 20px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .region-name {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--c-text, #1e293b);
  }

  .region-count {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--c-text-light, #94a3b8);
    background: var(--c-border, #e2e8f0);
    border-radius: 10px;
    padding: 0.1rem 0.45rem;
    min-width: 1.2rem;
    text-align: center;
  }

  .region-add-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius, 6px);
    border: 1px dashed var(--c-border, #e2e8f0);
    background: transparent;
    color: var(--c-text-light, #94a3b8);
    cursor: pointer;
    transition: all 0.15s;
  }

  .region-add-btn:hover {
    border-color: var(--c-primary, #2563eb);
    color: var(--c-primary, #2563eb);
    background: color-mix(in srgb, var(--c-primary, #2563eb) 5%, transparent);
  }

  .region-blocks {
    padding: 0.5rem;
    min-height: 0;
  }

  .region-empty {
    padding: 1.5rem;
    text-align: center;
    color: var(--c-text-light, #94a3b8);
    font-size: 0.85rem;
    border: 2px dashed transparent;
    border-radius: var(--radius, 6px);
    transition: all 0.2s;
  }

  .region-empty.drop-active {
    border-color: var(--c-primary, #2563eb);
    background: color-mix(in srgb, var(--c-primary, #2563eb) 5%, transparent);
    color: var(--c-primary, #2563eb);
  }

  /* Drop zones */
  .drop-zone {
    height: 4px;
    margin: 0 0.25rem;
    border-radius: 2px;
    transition: all 0.15s;
    position: relative;
  }

  .drop-zone.drop-active {
    height: 4px;
    background: var(--c-primary, #2563eb);
    margin: 4px 0.25rem;
    box-shadow: 0 0 6px color-mix(in srgb, var(--c-primary, #2563eb) 30%, transparent);
  }

  .drop-zone.drop-active::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--c-primary, #2563eb);
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px var(--c-primary, #2563eb);
  }

  .drop-zone-end {
    height: 8px;
  }

  /* Block cards */
  .block-card {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: #fff;
    transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s;
    overflow: hidden;
  }

  .block-card:hover {
    border-color: #cbd5e1;
  }

  .block-card.is-expanded {
    border-color: #cbd5e1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  :global(.block-card.is-dragging) {
    opacity: 0.35;
    border-style: dashed;
  }

  @keyframes flash-drop {
    0% { background: #dbeafe; border-color: var(--c-primary, #2563eb); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-primary, #2563eb) 20%, transparent); }
    100% { background: #fff; border-color: var(--c-border, #e2e8f0); box-shadow: none; }
  }

  .block-card.just-dropped {
    animation: flash-drop 1.2s ease-out;
  }

  .block-position {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--c-text-light, #94a3b8);
    width: 20px;
    text-align: center;
    flex-shrink: 0;
    user-select: none;
  }

  .block-card-header {
    display: flex;
    align-items: center;
    gap: 0;
    min-height: 40px;
  }

  .block-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    flex-shrink: 0;
    cursor: grab;
    color: #cbd5e1;
    font-size: 1.1rem;
    user-select: none;
    align-self: stretch;
    transition: color 0.15s, background 0.15s;
  }

  .block-drag-handle:hover {
    color: #64748b;
    background: var(--c-bg-alt, #f8fafc);
  }

  .block-drag-handle:active {
    cursor: grabbing;
  }

  .block-card-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    min-width: 0;
    font-family: inherit;
  }

  .block-card-toggle:hover {
    background: var(--c-bg-alt, #f8fafc);
  }

  .block-type-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    border: 1px solid;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .block-title {
    font-size: 0.85rem;
    color: var(--c-text, #1e293b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .block-preview {
    font-size: 0.78rem;
    color: var(--c-text-light, #94a3b8);
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .badge-shared {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    background: #dbeafe;
    color: #2563eb;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .expand-chevron {
    font-size: 0.7rem;
    color: var(--c-text-light, #94a3b8);
    margin-left: auto;
    flex-shrink: 0;
    transition: transform 0.2s;
  }

  .expand-chevron.rotated {
    transform: rotate(180deg);
  }

  /* Block quick-action bar */
  .block-actions {
    display: flex;
    align-items: center;
    gap: 0;
    border-left: 1px solid var(--c-border, #e2e8f0);
    align-self: stretch;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .block-card:hover .block-actions,
  .block-card.is-expanded .block-actions {
    opacity: 1;
  }

  .block-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    align-self: stretch;
    background: none;
    border: none;
    color: var(--c-text-light, #94a3b8);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }

  .block-action-btn:hover {
    color: var(--c-accent, #3182ce);
    background: rgba(49, 130, 206, 0.06);
  }

  .block-action-btn.block-action-danger:hover {
    color: #ef4444;
    background: #fef2f2;
  }

  /* Inline icon next to block type badge */
  .picker-icon-inline {
    display: flex;
    align-items: center;
    color: var(--c-text-light, #94a3b8);
    flex-shrink: 0;
  }

  /* Block picker styles */
  .block-picker {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .picker-category {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .picker-category-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--c-text-light, #94a3b8);
    padding-left: 0.25rem;
  }

  .picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
  }

  .picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    padding: 0.75rem 0.5rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-surface, #fff);
    cursor: pointer;
    transition: all 0.15s;
  }

  .picker-item:hover {
    border-color: var(--c-accent, #3182ce);
    background: rgba(49, 130, 206, 0.04);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .picker-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--c-bg, #f7f8fa);
    color: var(--c-text, #2d3748);
    transition: background 0.15s, color 0.15s;
  }

  .picker-item:hover .picker-icon {
    background: rgba(49, 130, 206, 0.1);
    color: var(--c-accent, #3182ce);
  }

  .picker-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--c-text, #2d3748);
    text-align: center;
    line-height: 1.2;
  }

  /* Move to region modal */
  .move-region-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .move-region-option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: var(--c-surface, #fff);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--c-text, #2d3748);
    font-family: inherit;
    transition: all 0.15s;
  }

  .move-region-option:hover {
    border-color: var(--c-accent, #3182ce);
    background: rgba(49, 130, 206, 0.04);
  }

  .block-card-body {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
    background: var(--c-bg-alt, #f8fafc);
  }
</style>
