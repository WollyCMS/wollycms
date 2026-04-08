<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import { base } from '$app/paths';

  interface Crumb {
    label: string;
    href?: string;
  }

  let { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav class="breadcrumb" aria-label="Breadcrumb">
  {#each crumbs as crumb, i}
    {#if i > 0}
      <ChevronRight size={14} class="breadcrumb-sep" />
    {/if}
    {#if crumb.href && i < crumbs.length - 1}
      <a href="{base}{crumb.href}" class="breadcrumb-link">{crumb.label}</a>
    {:else}
      <span class="breadcrumb-current">{crumb.label}</span>
    {/if}
  {/each}
</nav>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
  }

  .breadcrumb-link {
    color: var(--c-text-light);
    text-decoration: none;
  }

  .breadcrumb-link:hover {
    color: var(--c-accent);
  }

  .breadcrumb-current {
    color: var(--c-text);
    font-weight: 500;
  }

  .breadcrumb :global(.breadcrumb-sep) {
    color: var(--c-text-light);
    opacity: 0.5;
  }
</style>
