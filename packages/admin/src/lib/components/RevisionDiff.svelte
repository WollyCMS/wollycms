<script lang="ts">
  import { focusTrap } from '$lib/focusTrap.js';

  let {
    current,
    revision,
    onClose,
    onRestore,
  }: {
    current: { title: string; slug: string; status: string; fields: Record<string, any>; blocks: any[] };
    revision: any;
    onClose: () => void;
    onRestore: (revId: number) => void;
  } = $props();

  type FieldDiff = { key: string; current: string; revision: string; changed: boolean };

  let fieldDiffs = $derived(computeFieldDiffs());
  let blockSummary = $derived(computeBlockSummary());

  function computeFieldDiffs(): FieldDiff[] {
    const diffs: FieldDiff[] = [];
    const check = (key: string, cur: unknown, rev: unknown) => {
      const curStr = cur != null ? String(cur) : '';
      const revStr = rev != null ? String(rev) : '';
      diffs.push({ key, current: curStr, revision: revStr, changed: curStr !== revStr });
    };
    check('Title', current.title, revision.title);
    check('Slug', current.slug, revision.slug);
    check('Status', current.status, revision.status);
    const allKeys = new Set([
      ...Object.keys(current.fields || {}),
      ...Object.keys(revision.fields || {}),
    ]);
    for (const k of allKeys) {
      const cv = (current.fields || {})[k];
      const rv = (revision.fields || {})[k];
      check(`fields.${k}`, typeof cv === 'object' ? JSON.stringify(cv) : cv, typeof rv === 'object' ? JSON.stringify(rv) : rv);
    }
    return diffs;
  }

  function computeBlockSummary() {
    const curBlocks = current.blocks || [];
    const revBlocks = Array.isArray(revision.blocks) ? revision.blocks : [];
    return {
      current: curBlocks.length,
      revision: revBlocks.length,
      added: Math.max(0, curBlocks.length - revBlocks.length),
      removed: Math.max(0, revBlocks.length - curBlocks.length),
    };
  }

  let hasChanges = $derived(fieldDiffs.some((d) => d.changed) || blockSummary.current !== blockSummary.revision);
</script>

<div class="modal-overlay" onclick={onClose} role="dialog" aria-modal="true" aria-labelledby="revision-diff-title">
  <div class="modal diff-modal" onclick={(e) => e.stopPropagation()} use:focusTrap onescape={onClose}>
    <div class="modal-header">
      <h2 id="revision-diff-title">Compare with Revision</h2>
      <button class="btn-icon" onclick={onClose} aria-label="Close">&#10005;</button>
    </div>
    <div class="modal-body" style="max-height: 65vh; overflow-y: auto;">
      <p style="font-size: 0.8rem; color: var(--c-text-light); margin-bottom: 1rem;">
        Revision from {new Date(revision.createdAt).toLocaleString()}
        {#if !hasChanges}
          — <strong>No differences</strong>
        {/if}
      </p>

      <table class="diff-table">
        <thead>
          <tr><th>Field</th><th>Current</th><th>Revision</th></tr>
        </thead>
        <tbody>
          {#each fieldDiffs as d}
            <tr class:diff-changed={d.changed}>
              <td class="diff-key">{d.key}</td>
              <td class="diff-val">{d.current || '(empty)'}</td>
              <td class="diff-val">{d.revision || '(empty)'}</td>
            </tr>
          {/each}
          <tr class:diff-changed={blockSummary.current !== blockSummary.revision}>
            <td class="diff-key">Blocks</td>
            <td class="diff-val">{blockSummary.current} blocks</td>
            <td class="diff-val">{blockSummary.revision} blocks</td>
          </tr>
        </tbody>
      </table>

      {#if Array.isArray(revision.blocks) && revision.blocks.length > 0}
        <h3 style="font-size: 0.9rem; margin: 1rem 0 0.5rem;">Revision Blocks</h3>
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          {#each revision.blocks as block}
            <div style="padding: 0.4rem 0.5rem; background: var(--c-bg-subtle); border-radius: 4px; font-size: 0.8rem; display: flex; justify-content: space-between;">
              <span><strong>{block.blockType}</strong> in {block.region}</span>
              {#if block.isShared}<span class="badge badge-published" style="font-size: 0.65rem;">shared</span>{/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="modal-footer" style="margin-top: 1rem;">
        <button class="btn btn-outline" onclick={onClose}>Close</button>
        <button class="btn btn-primary" onclick={() => onRestore(revision.id)}>Restore This Revision</button>
      </div>
    </div>
  </div>
</div>

<style>
  .diff-modal {
    max-width: 750px;
    width: 90vw;
  }
  .diff-table {
    width: 100%;
    font-size: 0.82rem;
    border-collapse: collapse;
  }
  .diff-table th {
    text-align: left;
    padding: 0.4rem 0.5rem;
    border-bottom: 2px solid var(--c-border);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--c-text-light);
  }
  .diff-table td {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--c-border);
    vertical-align: top;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .diff-key {
    font-weight: 600;
    white-space: nowrap;
    width: 120px;
  }
  .diff-val {
    font-family: monospace;
    font-size: 0.78rem;
    word-break: break-all;
  }
  .diff-changed {
    background: color-mix(in srgb, var(--c-warning), transparent 80%);
  }
  .diff-changed .diff-val:first-of-type {
    color: var(--c-danger);
  }
  .diff-changed .diff-val:last-child {
    color: var(--c-success);
  }
</style>
