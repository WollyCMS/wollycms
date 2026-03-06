<script lang="ts">
  import type { Snippet } from 'svelte';

  type Item = Record<string, any> & { id: number };

  let {
    items,
    onReorder,
    children,
  }: {
    items: Item[];
    onReorder: (reordered: Item[]) => void;
    children: Snippet<[Item, number]>;
  } = $props();

  let dragIndex = $state<number | null>(null);
  let overIndex = $state<number | null>(null);

  function handleDragStart(e: DragEvent, index: number) {
    dragIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    overIndex = index;
  }

  function handleDragLeave() {
    overIndex = null;
  }

  function handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    overIndex = null;
    if (dragIndex === null || dragIndex === targetIndex) {
      dragIndex = null;
      return;
    }

    const reordered = [...items];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    dragIndex = null;
    onReorder(reordered);
  }

  function handleDragEnd() {
    dragIndex = null;
    overIndex = null;
  }
</script>

<div class="sortable-list">
  {#each items as item, i (item.id)}
    <div
      class="sortable-item"
      class:dragging={dragIndex === i}
      class:drag-over={overIndex === i && dragIndex !== i}
      draggable="false"
      ondragover={(e) => handleDragOver(e, i)}
      ondragleave={handleDragLeave}
      ondrop={(e) => handleDrop(e, i)}
      ondragend={handleDragEnd}
      role="listitem"
    >
      <span
        class="drag-handle"
        draggable="true"
        ondragstart={(e) => handleDragStart(e, i)}
        role="button"
        tabindex="0"
        aria-label="Drag to reorder"
      >&#x2807;</span>
      <div class="sortable-content">
        {@render children(item, i)}
      </div>
    </div>
  {/each}
</div>

<style>
  .sortable-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sortable-item {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    background: #fff;
    transition: border-color 0.15s, background 0.15s, opacity 0.15s;
  }

  .sortable-item.dragging {
    opacity: 0.4;
  }

  .sortable-item.drag-over {
    border-color: var(--c-primary, #2563eb);
    background: #eff6ff;
    box-shadow: 0 0 0 1px var(--c-primary, #2563eb);
  }

  .drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    flex-shrink: 0;
    cursor: grab;
    color: #cbd5e1;
    font-size: 1.2rem;
    user-select: none;
    border-right: 1px solid var(--c-border, #e2e8f0);
    transition: color 0.15s, background 0.15s;
  }

  .drag-handle:hover {
    color: #64748b;
    background: var(--c-bg-alt, #f8fafc);
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .sortable-content {
    flex: 1;
    min-width: 0;
  }
</style>
