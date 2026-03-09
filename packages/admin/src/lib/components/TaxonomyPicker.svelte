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
    taxonomyId: number;
    taxonomyName: string;
  }

  let taxonomies = $state<Taxonomy[]>([]);
  let assignedTermIds = $state<Set<number>>(new Set());
  let loaded = $state(false);
  let saving = $state(false);
  let expanded = $state(false);
  let dirty = $state(false);
  let initialTermIds = $state<Set<number>>(new Set());

  async function load() {
    try {
      // Fetch all taxonomies with their terms
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

      // Fetch terms assigned to this page
      const termsRes = await api.get<{ data: AssignedTerm[] }>(`/pages/${pageId}/terms`);
      const ids = new Set(termsRes.data.map((t) => t.termId));
      assignedTermIds = ids;
      initialTermIds = new Set(ids);
      loaded = true;
    } catch (err: any) {
      toast.error('Failed to load taxonomies: ' + err.message);
    }
  }

  function toggleTerm(termId: number) {
    const next = new Set(assignedTermIds);
    if (next.has(termId)) {
      next.delete(termId);
    } else {
      next.add(termId);
    }
    assignedTermIds = next;
    dirty = !setsEqual(assignedTermIds, initialTermIds);
  }

  function setsEqual(a: Set<number>, b: Set<number>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  async function save() {
    saving = true;
    try {
      await api.put(`/pages/${pageId}/terms`, {
        termIds: [...assignedTermIds],
      });
      initialTermIds = new Set(assignedTermIds);
      dirty = false;
      toast.success('Tags saved.');
    } catch (err: any) {
      toast.error('Failed to save tags: ' + err.message);
    } finally {
      saving = false;
    }
  }

  function getAssignedCount(tax: Taxonomy): number {
    return tax.terms.filter((t) => assignedTermIds.has(t.id)).length;
  }

  $effect(() => {
    if (expanded && !loaded) {
      load();
    }
  });
</script>

<div class="card" style="margin-bottom: 1rem;">
  <button class="taxonomy-header" onclick={() => expanded = !expanded}>
    <h3 style="font-size: 0.95rem; margin: 0;">
      Tags & Taxonomies
      {#if loaded}
        <span class="term-count">{assignedTermIds.size}</span>
      {/if}
    </h3>
    <span class="chevron" class:expanded>{expanded ? '−' : '+'}</span>
  </button>

  {#if expanded}
    {#if !loaded}
      <p style="font-size: 0.85rem; color: var(--c-text-light); padding-top: 0.5rem;">Loading...</p>
    {:else if taxonomies.length === 0}
      <p style="font-size: 0.85rem; color: var(--c-text-light); padding-top: 0.5rem;">No taxonomies configured.</p>
    {:else}
      {#each taxonomies as tax}
        <div class="taxonomy-group">
          <div class="taxonomy-label">
            {tax.name}
            {#if getAssignedCount(tax) > 0}
              <span class="assigned-badge">{getAssignedCount(tax)}</span>
            {/if}
          </div>
          <div class="term-list">
            {#each tax.terms as term}
              <label class="term-checkbox">
                <input
                  type="checkbox"
                  checked={assignedTermIds.has(term.id)}
                  onchange={() => toggleTerm(term.id)}
                />
                <span class="term-name">{term.name}</span>
              </label>
            {/each}
          </div>
        </div>
      {/each}

      {#if dirty}
        <button class="btn btn-sm btn-primary" style="width: 100%; margin-top: 0.5rem;"
          onclick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Tags'}
        </button>
      {/if}
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
    transition: transform 0.15s;
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

  .taxonomy-group {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  .taxonomy-label {
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.35rem;
    color: var(--c-text, #1a202c);
  }

  .assigned-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    height: 1rem;
    padding: 0 0.25rem;
    font-size: 0.65rem;
    font-weight: 600;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 999px;
    margin-left: 0.3rem;
  }

  .term-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.5rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .term-checkbox {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.82rem;
    cursor: pointer;
    padding: 0.15rem 0;
    white-space: nowrap;
  }

  .term-checkbox input[type="checkbox"] {
    width: 14px;
    height: 14px;
    margin: 0;
    cursor: pointer;
  }

  .term-name {
    color: var(--c-text, #1a202c);
  }
</style>
