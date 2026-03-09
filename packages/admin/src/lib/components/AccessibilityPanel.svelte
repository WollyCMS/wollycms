<script lang="ts">
  import type { A11yIssue } from '$lib/a11y.js';
  import { AlertTriangle, CheckCircle } from 'lucide-svelte';

  let {
    issues,
    onNavigate,
  }: {
    issues: A11yIssue[];
    onNavigate?: (pbId: number) => void;
  } = $props();

  let expanded = $state(false);

  const issuesByCode = $derived.by(() => {
    const grouped: Record<string, A11yIssue[]> = {};
    for (const issue of issues) {
      if (!grouped[issue.code]) grouped[issue.code] = [];
      grouped[issue.code].push(issue);
    }
    return grouped;
  });

  const codeLabels: Record<string, string> = {
    'heading-skip': 'Heading hierarchy',
    'img-alt': 'Image alt text',
    'img-alt-inline': 'Inline image alt text',
    'link-empty': 'Empty link text',
  };
</script>

<div class="card" style="margin-bottom: 1rem;">
  <button class="a11y-header" onclick={() => expanded = !expanded}>
    <h3 style="font-size: 0.95rem; margin: 0;">Accessibility</h3>
    {#if issues.length === 0}
      <span class="a11y-badge a11y-pass">
        <CheckCircle size={12} /> Pass
      </span>
    {:else}
      <span class="a11y-badge a11y-warn">
        <AlertTriangle size={12} /> {issues.length}
      </span>
    {/if}
    <span class="a11y-chevron" class:rotated={expanded}>&#9662;</span>
  </button>

  {#if expanded}
    <div class="a11y-body">
      {#if issues.length === 0}
        <p class="a11y-ok">No accessibility issues detected.</p>
      {:else}
        {#each Object.entries(issuesByCode) as [code, codeIssues]}
          <div class="a11y-group">
            <span class="a11y-group-label">
              {codeLabels[code] || code}
              <span class="a11y-group-count">{codeIssues.length}</span>
            </span>
            {#each codeIssues as issue}
              <button
                class="a11y-issue"
                onclick={() => { if (issue.blockPbId && onNavigate) onNavigate(issue.blockPbId); }}
                disabled={!issue.blockPbId}
                title={issue.blockPbId ? 'Click to navigate to block' : ''}
              >
                <AlertTriangle size={11} />
                <span class="a11y-issue-msg">{issue.message}</span>
                {#if issue.region}
                  <span class="a11y-issue-region">{issue.region}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .a11y-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    text-align: left;
  }

  .a11y-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.45rem;
    border-radius: 999px;
    margin-left: auto;
  }

  .a11y-pass {
    background: #dcfce7;
    color: #16a34a;
  }

  .a11y-warn {
    background: #fef3c7;
    color: #d97706;
  }

  .a11y-chevron {
    font-size: 0.7rem;
    color: var(--c-text-light, #94a3b8);
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .a11y-chevron.rotated {
    transform: rotate(180deg);
  }

  .a11y-body {
    margin-top: 0.75rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
    padding-top: 0.5rem;
  }

  .a11y-ok {
    font-size: 0.8rem;
    color: #16a34a;
    margin: 0;
  }

  .a11y-group {
    margin-bottom: 0.5rem;
  }

  .a11y-group:last-child {
    margin-bottom: 0;
  }

  .a11y-group-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--c-text-light, #64748b);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .a11y-group-count {
    font-size: 0.65rem;
    font-weight: 700;
    background: #fef3c7;
    color: #d97706;
    border-radius: 10px;
    padding: 0.05rem 0.35rem;
    min-width: 1rem;
    text-align: center;
  }

  .a11y-issue {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    padding: 0.3rem 0.4rem;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    color: #92400e;
    transition: background 0.12s;
  }

  .a11y-issue:not(:disabled):hover {
    background: #fef3c7;
  }

  .a11y-issue:disabled {
    cursor: default;
  }

  .a11y-issue-msg {
    font-size: 0.78rem;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .a11y-issue-region {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--c-text-light, #94a3b8);
    flex-shrink: 0;
    text-transform: uppercase;
  }
</style>
