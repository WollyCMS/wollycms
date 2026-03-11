<script lang="ts">
  import { api } from '$lib/api.js';

  let {
    value = $bindable(null as number | null),
    selectedTitle = $bindable(''),
    placeholder = 'Search pages...',
    onselect,
  }: {
    value?: number | null;
    selectedTitle?: string;
    placeholder?: string;
    onselect?: (page: { id: number; title: string; slug: string } | null) => void;
  } = $props();

  interface PageResult {
    id: number;
    title: string;
    slug: string;
    status: string;
    typeName: string;
  }

  let searchText = $state('');
  let results = $state<PageResult[]>([]);
  let showDropdown = $state(false);
  let highlightIdx = $state(0);
  let searching = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function doSearch(q: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (q.length < 2) {
      results = [];
      showDropdown = false;
      return;
    }
    debounceTimer = setTimeout(async () => {
      searching = true;
      try {
        const res = await api.get<{ data: { pages: PageResult[] } }>(`/search?q=${encodeURIComponent(q)}&limit=12`);
        results = res.data.pages;
        showDropdown = results.length > 0;
        highlightIdx = 0;
      } catch {
        results = [];
      } finally {
        searching = false;
      }
    }, 200);
  }

  function selectPage(page: PageResult) {
    value = page.id;
    selectedTitle = page.title;
    searchText = '';
    results = [];
    showDropdown = false;
    onselect?.({ id: page.id, title: page.title, slug: page.slug });
  }

  function clearSelection() {
    value = null;
    selectedTitle = '';
    onselect?.(null);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIdx = (highlightIdx + 1) % Math.max(results.length, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIdx = (highlightIdx - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightIdx]) selectPage(results[highlightIdx]);
    } else if (e.key === 'Escape') {
      showDropdown = false;
      searchText = '';
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.page-search-wrap')) {
      showDropdown = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="page-search-wrap">
  {#if value}
    <div class="selected-page">
      <span class="selected-page__title">{selectedTitle || `Page #${value}`}</span>
      <button class="selected-page__clear" onclick={clearSelection} title="Remove page link">&times;</button>
    </div>
  {/if}
  <input
    type="text"
    class="form-control page-search-input"
    {placeholder}
    bind:value={searchText}
    oninput={() => doSearch(searchText)}
    onfocus={() => { if (searchText.length >= 2) showDropdown = true; }}
    onkeydown={handleKeydown}
  />
  {#if showDropdown}
    <div class="page-search-dropdown">
      {#each results as pg, i}
        <button
          class="page-search-item"
          class:highlighted={i === highlightIdx}
          onmouseenter={() => highlightIdx = i}
          onclick={() => selectPage(pg)}
        >
          <span class="page-search-item__title">{pg.title}</span>
          <span class="page-search-item__slug">/{pg.slug}</span>
        </button>
      {/each}
    </div>
  {/if}
  {#if searching}
    <span class="page-search-spinner">...</span>
  {/if}
</div>

<style>
  .page-search-wrap {
    position: relative;
  }

  .page-search-input {
    width: 100%;
    box-sizing: border-box;
  }

  .selected-page {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.5rem;
    margin-bottom: 0.35rem;
    font-size: 0.82rem;
    background: var(--c-bg-subtle, #f1f5f9);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
  }

  .selected-page__title {
    flex: 1;
    font-weight: 500;
  }

  .selected-page__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.2rem;
    height: 1.2rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--c-text-light, #94a3b8);
    border-radius: 50%;
  }

  .selected-page__clear:hover {
    background: var(--c-danger, #e53e3e);
    color: white;
  }

  .page-search-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 2px;
    background: var(--c-bg, #fff);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 50;
    max-height: 240px;
    overflow-y: auto;
  }

  .page-search-item {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.4rem 0.6rem;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--c-text, #1a202c);
  }

  .page-search-item.highlighted {
    background: var(--c-bg-subtle, #f1f5f9);
  }

  .page-search-item__title {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .page-search-item__slug {
    font-size: 0.75rem;
    color: var(--c-text-light, #94a3b8);
  }

  .page-search-spinner {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: var(--c-text-light, #94a3b8);
  }
</style>
