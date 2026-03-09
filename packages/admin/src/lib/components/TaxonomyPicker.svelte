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
  let showDropdown = $state(false);
  let highlightIdx = $state(0);

  /** Default taxonomy ID for creating new terms (first one loaded) */
  let defaultTaxId = $state<number | null>(null);

  /** All terms across all taxonomies, flattened */
  let allTerms = $derived(
    taxonomies.flatMap((tax) =>
      tax.terms.map((t) => ({ ...t, taxonomyId: tax.id }))
    )
  );

  /** Term IDs currently assigned */
  let assignedIds = $derived(new Set(assigned.map((a) => a.termId)));

  /** Filtered suggestions */
  let suggestions = $derived.by(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return [];
    return allTerms
      .filter((t) => !assignedIds.has(t.id) && t.name.toLowerCase().includes(q))
      .slice(0, 12);
  });

  let exactMatch = $derived(
    allTerms.some((t) => t.name.toLowerCase() === searchText.trim().toLowerCase())
  );

  let showCreateOption = $derived(
    searchText.trim().length > 0 && !exactMatch && defaultTaxId !== null
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
      if (allTaxes.length > 0) defaultTaxId = allTaxes[0].id;

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
    } catch (err: any) {
      toast.error('Failed to remove tag: ' + err.message);
    } finally {
      saving = false;
    }
  }

  async function createAndAdd(name: string) {
    if (!defaultTaxId) return;
    saving = true;
    try {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const res = await api.post<{ data: Term }>(`/taxonomies/${defaultTaxId}/terms`, {
        name: name.trim(),
        slug,
      });
      const newTerm = res.data;
      const tax = taxonomies.find((t) => t.id === defaultTaxId);
      if (tax) tax.terms = [...tax.terms, newTerm];
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

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.tag-input-wrap')) {
      showDropdown = false;
    }
  }

  $effect(() => {
    if (expanded && !loaded) load();
  });

  $effect(() => {
    highlightIdx = 0;
  });
</script>

<svelte:window onclick={handleClickOutside} />

<div class="card" style="margin-bottom: 1rem;">
  <button class="taxonomy-header" onclick={() => expanded = !expanded}>
    <h3 style="font-size: 0.95rem; margin: 0;">
      Tags
      {#if loaded && assigned.length > 0}
        <span class="term-count">{assigned.length}</span>
      {/if}
    </h3>
    <span class="chevron">{expanded ? '−' : '+'}</span>
  </button>

  {#if expanded}
    {#if !loaded}
      <p class="status-text">Loading...</p>
    {:else}
      <!-- Flat chip list -->
      {#if assigned.length > 0}
        <div class="tag-chips">
          {#each assigned as term}
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
      {:else}
        <p class="status-text">No tags assigned.</p>
      {/if}

      <!-- Add tag input -->
      <div class="tag-input-wrap">
        <input
          type="text"
          class="tag-input"
          placeholder="Add a tag..."
          bind:value={searchText}
          onfocus={() => showDropdown = true}
          onkeydown={handleKeydown}
          disabled={saving}
        />

        {#if showDropdown && (suggestions.length > 0 || showCreateOption)}
          <div class="dropdown">
            {#each suggestions as s, i}
              <button
                class="dropdown-item"
                class:highlighted={i === highlightIdx}
                onmouseenter={() => highlightIdx = i}
                onclick={() => addTerm(s.id)}
              >{s.name}</button>
            {/each}
            {#if showCreateOption}
              <button
                class="dropdown-item create-item"
                class:highlighted={highlightIdx === suggestions.length}
                onmouseenter={() => highlightIdx = suggestions.length}
                onclick={() => createAndAdd(searchText)}
              >+ Create "{searchText.trim()}"</button>
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

  .status-text {
    font-size: 0.85rem;
    color: var(--c-text-light, #94a3b8);
    padding-top: 0.5rem;
    margin: 0;
  }

  .tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.5rem;
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
    margin-top: 0.5rem;
  }

  .tag-input {
    width: 100%;
    padding: 0.35rem 0.5rem;
    font-size: 0.82rem;
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: 4px;
    background: var(--c-bg, #fff);
    color: var(--c-text, #1a202c);
    outline: none;
    box-sizing: border-box;
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
    display: block;
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

  .create-item {
    color: var(--c-accent, #3182ce);
    font-weight: 500;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }
</style>
