<script lang="ts">
  import type { SeoCheck } from '$lib/seo.js';
  import { calculateScore } from '$lib/seo.js';

  let { checks }: { checks: SeoCheck[] } = $props();

  let expanded = $state(false);

  const score = $derived(calculateScore(checks));

  const scoreColor = $derived.by(() => {
    if (score >= 80) return '#16a34a';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  });

  const scoreLabel = $derived.by(() => {
    if (score >= 80) return 'Good';
    if (score >= 50) return 'Needs work';
    return 'Poor';
  });

  const statusIcons: Record<string, string> = {
    pass: '\u2713',
    warn: '\u26A0',
    fail: '\u2717',
    info: '\u2139',
  };

  const statusColors: Record<string, string> = {
    pass: '#16a34a',
    warn: '#d97706',
    fail: '#dc2626',
    info: '#6b7280',
  };
</script>

<button class="seo-score-header" onclick={() => expanded = !expanded}>
  <span class="seo-score-label">SEO Score</span>
  <span class="seo-score-badge" style="background: {scoreColor}15; color: {scoreColor}; border-color: {scoreColor}40;">
    {score}% — {scoreLabel}
  </span>
  <span class="seo-chevron" class:rotated={expanded}>&#9662;</span>
</button>

{#if expanded}
  <div class="seo-checks">
    {#each checks as check}
      <div class="seo-check">
        <span class="seo-check-icon" style="color: {statusColors[check.status]}">
          {statusIcons[check.status]}
        </span>
        <div class="seo-check-body">
          <span class="seo-check-label">{check.label}</span>
          <span class="seo-check-msg">{check.message}</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .seo-score-header {
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
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--c-border, #e2e8f0);
  }

  .seo-score-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--c-text, #1e293b);
  }

  .seo-score-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    border: 1px solid;
    margin-left: auto;
  }

  .seo-chevron {
    font-size: 0.7rem;
    color: var(--c-text-light, #94a3b8);
    transition: transform 0.2s;
    flex-shrink: 0;
  }

  .seo-chevron.rotated {
    transform: rotate(180deg);
  }

  .seo-checks {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .seo-check {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.25rem 0;
  }

  .seo-check-icon {
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
    width: 1rem;
    text-align: center;
    margin-top: 0.1rem;
  }

  .seo-check-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .seo-check-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--c-text, #1e293b);
  }

  .seo-check-msg {
    font-size: 0.72rem;
    color: var(--c-text-light, #64748b);
    line-height: 1.4;
  }
</style>
