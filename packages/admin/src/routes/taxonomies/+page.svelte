<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api.js';
  import { focusTrap } from '$lib/focusTrap.js';

  let taxonomies = $state<any[]>([]);
  let selected = $state<any>(null);
  let error = $state('');
  let showCreate = $state(false);
  let showAddTerm = $state(false);
  let newTax = $state({ name: '', slug: '', hierarchical: false });
  let newTerm = $state({ name: '', slug: '' });

  async function load() {
    try {
      const res = await api.get<{ data: any[] }>('/taxonomies');
      taxonomies = res.data;
      if (taxonomies.length > 0 && !selected) loadTaxonomy(taxonomies[0].id);
    } catch (err: any) { error = err.message; }
  }

  async function loadTaxonomy(id: number) {
    const res = await api.get<{ data: any }>(`/taxonomies/${id}`);
    selected = res.data;
  }

  onMount(load);

  async function createTaxonomy() {
    try {
      await api.post('/taxonomies', newTax);
      showCreate = false;
      newTax = { name: '', slug: '', hierarchical: false };
      load();
    } catch (err: any) { error = err.message; }
  }

  async function deleteTaxonomy(id: number) {
    if (!confirm('Delete this taxonomy and all terms?')) return;
    try { await api.del(`/taxonomies/${id}`); selected = null; load(); }
    catch (err: any) { error = err.message; }
  }

  async function addTerm() {
    if (!selected) return;
    try {
      await api.post(`/taxonomies/${selected.id}/terms`, newTerm);
      showAddTerm = false;
      newTerm = { name: '', slug: '' };
      loadTaxonomy(selected.id);
    } catch (err: any) { error = err.message; }
  }

  async function deleteTerm(termId: number) {
    if (!selected || !confirm('Delete this term?')) return;
    try { await api.del(`/taxonomies/${selected.id}/terms/${termId}`); loadTaxonomy(selected.id); }
    catch (err: any) { error = err.message; }
  }

  function flatTerms(terms: any[], depth = 0): any[] {
    const flat: any[] = [];
    for (const t of terms) {
      flat.push({ ...t, depth });
      if (t.children?.length) flat.push(...flatTerms(t.children, depth + 1));
    }
    return flat;
  }
</script>

<div class="page-header">
  <h1>Taxonomies</h1>
  <button class="btn btn-primary" onclick={() => showCreate = true}>+ New Taxonomy</button>
</div>

{#if error}<div class="alert alert-error">{error}</div>{/if}

<div style="display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem;">
  <div class="card" style="padding: 0.5rem;">
    {#each taxonomies as tax}
      <button style="display: block; width: 100%; text-align: left; background: {selected?.id === tax.id ? 'var(--c-bg)' : 'none'}; border: none; padding: 0.5rem 0.75rem; border-radius: var(--radius); cursor: pointer; font-family: var(--font);" onclick={() => loadTaxonomy(tax.id)}>
        {tax.name}
      </button>
    {/each}
  </div>

  <div>
    {#if selected}
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="font-size: 1.1rem;">{selected.name}</h2>
            <p style="font-size: 0.8rem; color: var(--c-text-light);">{selected.hierarchical ? 'Hierarchical' : 'Flat'}</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline" onclick={() => showAddTerm = true}>+ Add Term</button>
            <button class="btn btn-sm btn-danger" onclick={() => deleteTaxonomy(selected.id)}>Delete</button>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Slug</th><th>Weight</th><th></th></tr></thead>
          <tbody>
            {#each flatTerms(selected.terms || []) as term}
              <tr>
                <td style="padding-left: {1 + term.depth * 1.5}rem;">{term.name}</td>
                <td style="color: var(--c-text-light);">{term.slug}</td>
                <td>{term.weight}</td>
                <td style="text-align: right;">
                  <button class="btn btn-sm btn-danger" onclick={() => deleteTerm(term.id)}>Delete</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

{#if showCreate}
  <div class="modal-overlay" onclick={() => showCreate = false} role="dialog" aria-modal="true" aria-labelledby="new-taxonomy-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showCreate = false}>
      <div class="modal-header"><h2 id="new-taxonomy-title">New Taxonomy</h2><button class="btn-icon" onclick={() => showCreate = false} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); createTaxonomy(); }}>
        <div class="form-group"><label>Name</label><input class="form-control" bind:value={newTax.name} required /></div>
        <div class="form-group"><label>Slug</label><input class="form-control" bind:value={newTax.slug} required /></div>
        <div class="form-group"><label><input type="checkbox" bind:checked={newTax.hierarchical} /> Hierarchical</label></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showCreate = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if showAddTerm}
  <div class="modal-overlay" onclick={() => showAddTerm = false} role="dialog" aria-modal="true" aria-labelledby="add-term-title">
    <div class="modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={() => showAddTerm = false}>
      <div class="modal-header"><h2 id="add-term-title">Add Term</h2><button class="btn-icon" onclick={() => showAddTerm = false} aria-label="Close">✕</button></div>
      <form class="modal-body" onsubmit={(e) => { e.preventDefault(); addTerm(); }}>
        <div class="form-group"><label>Name</label><input class="form-control" bind:value={newTerm.name} required /></div>
        <div class="form-group"><label>Slug</label><input class="form-control" bind:value={newTerm.slug} required /></div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick={() => showAddTerm = false}>Cancel</button>
          <button type="submit" class="btn btn-primary">Add</button>
        </div>
      </form>
    </div>
  </div>
{/if}
