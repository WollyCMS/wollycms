<script lang="ts">
  let {
    title,
    slug,
    metaDescription,
    siteUrl,
  }: {
    title: string;
    slug: string;
    metaDescription: string;
    siteUrl: string;
  } = $props();

  const displayTitle = $derived(() => {
    const t = title || 'Untitled Page';
    return t.length > 60 ? t.slice(0, 57) + '...' : t;
  });

  const displayUrl = $derived(() => {
    const base = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const path = slug === 'home' ? '' : ` > ${slug.replace(/-/g, ' ')}`;
    return `${base}${path}`;
  });

  const displayDesc = $derived(() => {
    if (!metaDescription) return 'No meta description set. Search engines will auto-generate a snippet from page content.';
    return metaDescription.length > 160 ? metaDescription.slice(0, 157) + '...' : metaDescription;
  });
</script>

<div class="serp-preview">
  <div class="serp-title">{displayTitle()}</div>
  <div class="serp-url">{displayUrl()}</div>
  <div class="serp-desc" class:serp-desc-missing={!metaDescription}>{displayDesc()}</div>
</div>

<style>
  .serp-preview {
    background: var(--c-surface);
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    padding: 0.75rem;
    font-family: Arial, sans-serif;
  }

  .serp-title {
    font-size: 1.1rem;
    line-height: 1.3;
    color: var(--c-accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .serp-title:hover {
    text-decoration: underline;
  }

  .serp-url {
    font-size: 0.8rem;
    color: var(--c-success);
    margin: 0.15rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .serp-desc {
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--c-text-light);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .serp-desc-missing {
    font-style: italic;
    color: var(--c-text-light);
  }
</style>
