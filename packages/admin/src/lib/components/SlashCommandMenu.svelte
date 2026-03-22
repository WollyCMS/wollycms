<script lang="ts">
  let {
    items,
    selectedIndex,
    onSelect,
  }: {
    items: { label: string; description: string; command: string }[];
    selectedIndex: number;
    onSelect: (index: number) => void;
  } = $props();
</script>

{#if items.length > 0}
  <div class="slash-menu">
    {#each items as item, i}
      <button
        class="slash-menu-item"
        class:selected={i === selectedIndex}
        onclick={() => onSelect(i)}
        onmouseenter={() => { selectedIndex = i; }}
      >
        <span class="slash-menu-label">{item.label}</span>
        <span class="slash-menu-desc">{item.description}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .slash-menu {
    display: flex;
    flex-direction: column;
    background: var(--c-surface);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    max-height: 240px;
    overflow-y: auto;
    min-width: 220px;
    padding: 4px;
  }

  .slash-menu-item {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0.45rem 0.65rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    font-family: inherit;
    transition: background 0.1s;
  }

  .slash-menu-item:hover,
  .slash-menu-item.selected {
    background: var(--c-bg-alt, #f1f5f9);
  }

  .slash-menu-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text, #1e293b);
  }

  .slash-menu-desc {
    font-size: 0.72rem;
    color: var(--c-text-light, #94a3b8);
  }
</style>
