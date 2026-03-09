<script lang="ts">
  import { api } from '$lib/api.js';
  import { toast } from '$lib/toast.svelte.js';

  let {
    pageId,
  }: {
    pageId: string;
  } = $props();

  interface Term {
    id: number;
    name: string;
    slug: string;
    taxonomyId: number;
  }

  interface Taxonomy {
    id: number;
    name: string;
    slug: string;
    terms: Term[];
  }

  interface AssignedTerm {
    termId: number;
    termName: string;
    termSlug: string;
    taxonomyId: number;
    taxonomyName: string;
    taxonomySlug: string;
  }

  let taxonomies = $state<Taxonomy[]>([]);
  let assigned = $state<AssignedTerm[]>([]);
  let loaded = $state(false);
  let saving = $state(false);
  let expanded = $state(false);

  // Typeahead state
  let searchText = $state('');
  let activeTaxId = $state<number | null>(null);
  let showDropdown = $state(false);
  let highlightIdx = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  /** All terms across all taxonomies, flattened for search */
  let allTerms = $derived(
    taxonomies.flatMap((tax) =>
      tax.terms.map((t) => ({ ...t, taxonomyId: tax.id, taxonomyName: tax.name }))
    )
  );

  /** Term IDs currently assigned */
  let assignedIds = $derived(new Set(assigned.map((a) => a.termId)));

  /** Filtered suggestions based on search text */
  let suggestions = $derived.by(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return allTerms
      .filter((t) => {
        if (assignedIds.has(t.id)) return false;
        if (activeTaxId && t.taxonomyId !== activeTaxId) return false;
        return t.name.toLowerCase().includes(q);
      })
      .slice(0, 12);
  });

  /** Whether the current search text is an exact match to an existing term */
  let exactMatch = $derived(
    allTerms.some((t) => t.name.toLowerCase() === searchText.trim().toLowerCase())
  );

  /** Show "Create new" option when text doesn't match any existing term */
  let showCreateOption = $derived(
    searchText.trim().length > 0 && !exactMatch && activeTaxId !== null
  );

  async function load() {
    try {
      const taxRes = await api.get<{ data: any[] }>('/taxonomies');
      const allTaxes: Taxonomy[] = [];
      for (const tax of taxRes.data) {
        const detail = await api.get<{ data: any }>(`/taxonomies/${tax.id}`);
        allTaxes.push({
          id: tax.id,
          name: tax.name,
          slug: tax.slug,
          terms: detail.data.terms || [],
        });
      }
      taxonomies = allTaxes;

      const termsRes = await api.get<{ data: AssignedTerm[] }>(`/pages/${pageId}/terms`);
      assigned = termsRes.data;
      loaded = true;
    } catch (err: any) {
      toast.error('Failed to load taxonomies: ' + err.message);
    }
  }

  async function addTerm(termId: number) {
    saving = true;
    try {
      const newIds = [...assignedIds, termId];
      const res = await api.put<{ data: AssignedTerm[] }>(`/pages/${pageId}/terms`, {
        termIds: newIds,
      });
      assigned = res.data;
      searchText = '';
      showDropdown = false;
      toast.success('Tag added.');
    } catch (err: any) {
      toast.error('Failed to add tag: ' + err.message);
    } finally {
      saving = false;
    }
  }

  async function removeTerm(termId: number) {
    saving = true;
    try {
      const newIds = [...assignedIds].filter((id) => id !== termId);
      const res = await api.put<{ data: AssignedTerm[] }>(`/pages/${pageId}/terms`, {
        termIds: newIds,
      });
      assigned = res.data;
      toast.success('Tag removed.');
    } catch (err: any) {
      toast.error('Failed to remove tag: ' + err.message);
    } finally {
      saving = false;
    }
  }

  async function createAndAdd(name: string) {
    if (!activeTaxId) return;
    saving = true;
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const res = await api.post<{ data: Term }>(`/taxonomies/${activeTaxId}/terms`, {
        name: name.trim(),
        slug,
      });
      const newTerm = res.data;

      // Add to local taxonomy list
      const tax = taxonomies.find((t) => t.id === activeTaxId);
      if (tax) tax.terms = [...tax.terms, newTerm];

      // Assign to page
      await addTerm(newTerm.id);
    } catch (err: any) {
      toast.error('Failed to create tag: ' + err.message);
      saving = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    const totalItems = suggestions.length + (showCreateOption ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIdx = (highlightIdx + 1) % Math.max(totalItems, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIdx = (highlightIdx - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx < suggestions.length) {
        addTerm(suggestions[highlightIdx].id);
      } else if (showCreateOption) {
        createAndAdd(searchText);
      }
    } else if (e.key === 'Escape') {
      showDropdown = false;
      searchText = '';
    }
  }

  function handleInputFocus() {
    showDropdown = true;
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.tag-input-wrap')) {
      showDropdown = false;
    }
  }

  /** Group assigned terms by taxonomy for display */
  let assignedByTax = $derived.by(() => {
    const groups: Record<string, { name: string; terms: AssignedTerm[] }> = {};
    for (const t of assigned) {
      if (!groups[t.taxonomyName]) groups[t.taxonomyName] = { name: t.taxonomyName, terms: [] };
      groups[t.taxonomyName].terms.push(t);
    }
    return Object.values(groups);
  });

  $effect(() => {
    if (expanded && !loaded) {
      load();
    }
  });

  $effect(() => {
    // Reset highlight when suggestions change
    highlightIdx = 0;
  });

  // Set default active taxonomy once loaded
  $effect(() => {
    if (loaded && taxonomies.length > 0 && activeTaxId === null) {
      activeTaxId = taxonomies[0].id;
    }
  });
</script>

<svelte:window onclick={handleClickOutside} />

<div class="card" style="margin-bottom: 1rem;">
  <button class="taxonomy-header" onclick={() => expanded = !expanded}>
    <h3 style="font-size: 0.95rem; margin: 0;">
      Tags & Taxonomies
      {#if loaded && assigned.length > 0}
        <span class="term-count">{assigned.length}</span>
      {/if}
    </h3>
    <span class="chevron">{expanded ? '−' : '+'}</span>
  </button>

  {#if expanded}
    {#if !loaded}
      <p class="loading-text">Loading...</p>
    {:else}
      <!-- Assigned tags grouped by taxonomy -->
      {#if assigned.length > 0}
        {#each assignedByTax as group}
          <div class="tag-group">
            <div class="tag-group-label">{group.name}</div>
            <div class="tag-chips">
              {#each group.terms as term}
                <span class="tag-chip">
                  {term.termName}
                  <button
                    class="tag-remove"
                    onclick={() => removeTerm(term.termId)}
                    disabled={saving}
                    title="Remove {term.termName}"
                  >&times;</button>
                </span>
              {/each}
            </div>
          </div>
        {/each}
      {:else}
        <p class="empty-text">No tags assigned.</p>
      {/if}

      <!-- Add tag input -->
      <div class="tag-input-wrap">
        <div class="tag-input-row">
          {#if taxonomies.length > 1}
            <select
              class="tax-select"
              bind:value={activeTaxId}
            >
              {#each taxonomies as tax}
                <option value={tax.id}>{tax.name}</option>
              {/each}
            </select>
          {/if}
          <input
            bind:this={inputEl}
            type="text"
            class="tag-input"
            placeholder="Type to add tag..."
            bind:value={searchText}
            onfocus={handleInputFocus}
            onkeydown={handleKeydown}
            disabled={saving}
          />
        </div>

        {#if showDropdown && (suggestions.length > 0 || showCreateOption)}
          <div class="dropdown">
            {#each suggestions as s, i}
              <button
                class="dropdown-item"
                class:highlighted={i === highlightIdx}
                onmouseenter={() => highlightIdx = i}
                onclick={() => addTerm(s.id)}
              >
                <span class="dropdown-term">{s.name}</span>
                {#if taxonomies.length > 1}
                  <span class="dropdown-tax">{s.taxonomyName}</span>
                {/if}
              </button>
            {/each}
            {#if showCreateOption}
              <button
                class="dropdown-item create-item"
                class:highlighted={highlightIdx === suggestions.length}
                onmouseenter={() => highlightIdx = suggestions.length}
                onclick={() => createAndAdd(searchText)}
              >
                + Create "{searchText.trim()}"
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .taxonomy-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    color: inherit;
  }

  .taxonomy-header:hover {
    opacity: 0.8;
  }

  .chevron {
    font-size: 1.1rem;
    color: var(--c-text-light, #94a3b8);
  }

  .term-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.3rem;
    font-size: 0.7rem;
    font-weight: 600;
    background: var(--c-accent, #3182ce);
    color: white;
    border-radius: 999px;
    margin-left: 0.4rem;
    vertical-align: middle;
  }

  .loading-text, .empty-text {
    font-size: 0.85rem;
    color: var(--c-text-light, #94a3b8);
    padding-top: 0.5rem;
    margin: 0;
  }

  .tag-group {
    margin-top: 0.6rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  .tag-group-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--c-text-light, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 0.3rem;
  }

  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.15rem 0.45rem;
    font-size: 0.78rem;
    background: var(--c-bg-subtle, #f1f5f9);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 999px;
    color: var(--c-text, #1a202c);
    white-space: nowrap;
  }

  .tag-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1;
    color: var(--c-text-light, #94a3b8);
    border-radius: 50%;
  }

  .tag-remove:hover {
    background: var(--c-danger, #e53e3e);
    color: white;
  }

  .tag-input-wrap {
    position: relative;
    margin-top: 0.6rem;
  }

  .tag-input-row {
    display: flex;
    gap: 0.3rem;
  }

  .tax-select {
    flex: 0 0 auto;
    width: 110px;
    padding: 0.3rem 0.4rem;
    font-size: 0.78rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    background: var(--c-bg, #fff);
    color: var(--c-text, #1a202c);
  }

  .tag-input {
    flex: 1;
    padding: 0.3rem 0.5rem;
    font-size: 0.82rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    background: var(--c-bg, #fff);
    color: var(--c-text, #1a202c);
    outline: none;
  }

  .tag-input:focus {
    border-color: var(--c-accent, #3182ce);
    box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.15);
  }

  .dropdown {
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
    max-height: 200px;
    overflow-y: auto;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.8rem;
    text-align: left;
    color: var(--c-text, #1a202c);
    font-family: inherit;
  }

  .dropdown-item.highlighted {
    background: var(--c-bg-subtle, #f1f5f9);
  }

  .dropdown-item:hover {
    background: var(--c-bg-subtle, #f1f5f9);
  }

  .dropdown-tax {
    font-size: 0.7rem;
    color: var(--c-text-light, #94a3b8);
    margin-left: 0.5rem;
    flex-shrink: 0;
  }

  .create-item {
    color: var(--c-accent, #3182ce);
    font-weight: 500;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }
</style>
