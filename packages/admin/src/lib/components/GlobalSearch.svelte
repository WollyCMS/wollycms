<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { api } from '$lib/api.js';
  import { Search, FileText, Blocks, Image, Menu, X } from 'lucide-svelte';

  let query = $state('');
  let results = $state<Record<string, any[]>>({ pages: [], blocks: [], media: [], menus: [] });
  let open = $state(false);
  let loading = $state(false);
  let activeIndex = $state(-1);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let inputEl: HTMLInputElement;

  const totalResults = $derived(
    results.pages.length + results.blocks.length + results.media.length + results.menus.length
  );
  const flattenedResults = $derived([
    ...results.pages.map((item) => ({ kind: 'page' as const, item })),
    ...results.blocks.map((item) => ({ kind: 'block' as const, item })),
    ...results.media.map((item) => ({ kind: 'media' as const, item })),
    ...results.menus.map((item) => ({ kind: 'menu' as const, item })),
  ]);

  function handleInput() {
    clearTimeout(debounceTimer);
    if (query.trim().length < 2) {
      results = { pages: [], blocks: [], media: [], menus: [] };
      activeIndex = -1;
      return;
    }
    debounceTimer = setTimeout(doSearch, 250);
  }

  async function doSearch() {
    loading = true;
    try {
      const res = await api.get<{ data: typeof results }>(`/search?q=${encodeURIComponent(query)}`);
      results = res.data;
      open = true;
      activeIndex = -1;
    } catch {
      results = { pages: [], blocks: [], media: [], menus: [] };
      activeIndex = -1;
    }
    loading = false;
  }

  function navigate(path: string) {
    open = false;
    query = '';
    results = { pages: [], blocks: [], media: [], menus: [] };
    activeIndex = -1;
    goto(`${base}${path}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && open && flattenedResults.length > 0) {
      e.preventDefault();
      activeIndex = Math.min(flattenedResults.length - 1, activeIndex + 1);
      return;
    }
    if (e.key === 'ArrowUp' && open && flattenedResults.length > 0) {
      e.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      return;
    }
    if (e.key === 'Enter' && open && activeIndex >= 0 && flattenedResults[activeIndex]) {
      e.preventDefault();
      const selected = flattenedResults[activeIndex];
      if (selected.kind === 'page') navigate(`/pages/${selected.item.id}`);
      if (selected.kind === 'block') navigate('/blocks');
      if (selected.kind === 'media') navigate('/media');
      if (selected.kind === 'menu') navigate('/menus');
      return;
    }
    if (e.key === 'Escape') {
      open = false;
      inputEl?.blur();
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      inputEl?.focus();
      open = true;
    }
  }

  function handleBlur() {
    // Delay to allow click on results
    setTimeout(() => { open = false; }, 200);
  }
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="global-search" role="search">
  <div class="search-input-wrapper">
    <Search size={16} />
    <input
      bind:this={inputEl}
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onfocus={() => { if (query.length >= 2) open = true; }}
      onblur={handleBlur}
      placeholder="Search... (Ctrl+K)"
      type="search"
      aria-label="Search pages, blocks, and media"
      role="combobox"
      aria-expanded={open}
      aria-controls="global-search-results"
      aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
    />
    {#if query}
      <button class="clear-btn" onclick={() => { query = ''; results = { pages: [], blocks: [], media: [], menus: [] }; open = false; }} aria-label="Clear search">
        <X size={14} />
      </button>
    {/if}
  </div>

  {#if open && (totalResults > 0 || (query.length >= 2 && !loading))}
    <div class="search-dropdown" id="global-search-results" role="listbox">
      {#if totalResults === 0}
        <div class="search-empty">No results for "{query}"</div>
      {:else}
        {#if results.pages.length > 0}
          <div class="search-section-label">Pages</div>
          {#each results.pages as page}
            <button
              class="search-result"
              class:active={flattenedResults[activeIndex]?.kind === 'page' && flattenedResults[activeIndex]?.item?.id === page.id}
              id={"search-result-" + (results.pages.indexOf(page))}
              role="option"
              aria-selected={flattenedResults[activeIndex]?.kind === 'page' && flattenedResults[activeIndex]?.item?.id === page.id}
              onclick={() => navigate(`/pages/${page.id}`)}
            >
              <FileText size={14} />
              <span class="result-title">{page.title}</span>
              <span class="result-meta">{page.typeName} &middot; {page.status}</span>
            </button>
          {/each}
        {/if}
        {#if results.blocks.length > 0}
          <div class="search-section-label">Blocks</div>
          {#each results.blocks as block}
            <button
              class="search-result"
              class:active={flattenedResults[activeIndex]?.kind === 'block' && flattenedResults[activeIndex]?.item?.id === block.id}
              id={"search-result-" + (results.pages.length + results.blocks.indexOf(block))}
              role="option"
              aria-selected={flattenedResults[activeIndex]?.kind === 'block' && flattenedResults[activeIndex]?.item?.id === block.id}
              onclick={() => navigate('/blocks')}
            >
              <Blocks size={14} />
              <span class="result-title">{block.title}</span>
              <span class="result-meta">{block.typeName}</span>
            </button>
          {/each}
        {/if}
        {#if results.media.length > 0}
          <div class="search-section-label">Media</div>
          {#each results.media as m}
            <button
              class="search-result"
              class:active={flattenedResults[activeIndex]?.kind === 'media' && flattenedResults[activeIndex]?.item?.id === m.id}
              id={"search-result-" + (results.pages.length + results.blocks.length + results.media.indexOf(m))}
              role="option"
              aria-selected={flattenedResults[activeIndex]?.kind === 'media' && flattenedResults[activeIndex]?.item?.id === m.id}
              onclick={() => navigate('/media')}
            >
              <Image size={14} />
              <span class="result-title">{m.title || m.originalName}</span>
              <span class="result-meta">{m.mimeType}</span>
            </button>
          {/each}
        {/if}
        {#if results.menus.length > 0}
          <div class="search-section-label">Menus</div>
          {#each results.menus as menu}
            <button
              class="search-result"
              class:active={flattenedResults[activeIndex]?.kind === 'menu' && flattenedResults[activeIndex]?.item?.id === menu.id}
              id={"search-result-" + (results.pages.length + results.blocks.length + results.media.length + results.menus.indexOf(menu))}
              role="option"
              aria-selected={flattenedResults[activeIndex]?.kind === 'menu' && flattenedResults[activeIndex]?.item?.id === menu.id}
              onclick={() => navigate('/menus')}
            >
              <Menu size={14} />
              <span class="result-title">{menu.name}</span>
              <span class="result-meta">/{menu.slug}</span>
            </button>
          {/each}
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .global-search {
    position: relative;
    width: 100%;
    max-width: 400px;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--c-bg, #fff);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 8px;
    padding: 0.4rem 0.75rem;
    transition: border-color 0.15s;
  }

  .search-input-wrapper:focus-within {
    border-color: var(--c-primary, #3182ce);
    box-shadow: 0 0 0 3px var(--c-focus-ring);
  }

  .search-input-wrapper input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.875rem;
    color: var(--c-text, #1a202c);
    min-width: 0;
  }

  .search-input-wrapper input::placeholder {
    color: var(--c-text-light, #5a6878);
  }

  .clear-btn {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--c-text-light, #5a6878);
    padding: 2px;
    border-radius: 4px;
  }

  .clear-btn:hover {
    color: var(--c-text, #1a202c);
  }

  .search-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--c-bg, #fff);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    max-height: 400px;
    overflow-y: auto;
    z-index: 100;
  }

  .search-empty {
    padding: 1rem;
    text-align: center;
    color: var(--c-text-light, #5a6878);
    font-size: 0.875rem;
  }

  .search-section-label {
    padding: 0.5rem 0.75rem 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--c-text-light, #5a6878);
  }

  .search-result {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    font-size: 0.875rem;
    color: var(--c-text, #1a202c);
    transition: background 0.1s;
  }

  .search-result:hover {
    background: var(--c-bg-subtle, #f7fafc);
  }

  .search-result.active {
    background: var(--c-bg-subtle, #f1f5f9);
  }

  .result-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-meta {
    font-size: 0.75rem;
    color: var(--c-text-light, #5a6878);
    flex-shrink: 0;
  }
</style>
