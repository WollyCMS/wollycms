<script lang="ts">
  let {
    title,
    metaDescription,
    ogImage,
    siteUrl,
  }: {
    title: string;
    metaDescription: string;
    ogImage: string;
    siteUrl: string;
  } = $props();

  const domain = $derived(siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''));

  const displayTitle = $derived(() => {
    const t = title || 'Untitled Page';
    return t.length > 70 ? t.slice(0, 67) + '...' : t;
  });

  const displayDesc = $derived(() => {
    if (!metaDescription) return '';
    return metaDescription.length > 100 ? metaDescription.slice(0, 97) + '...' : metaDescription;
  });
</script>

<div class="og-preview">
  <div class="og-image">
    {#if ogImage}
      <img src={ogImage} alt="OG preview" />
    {:else}
      <div class="og-image-placeholder">
        <span>No OG image set</span>
      </div>
    {/if}
  </div>
  <div class="og-body">
    <div class="og-domain">{domain}</div>
    <div class="og-title">{displayTitle()}</div>
    {#if displayDesc()}
      <div class="og-desc">{displayDesc()}</div>
    {/if}
  </div>
</div>

<style>
  .og-preview {
    border: 1px solid var(--c-border, #e2e8f0);
    border-radius: var(--radius, 6px);
    overflow: hidden;
    background: var(--c-bg-subtle);
  }

  .og-image {
    width: 100%;
    aspect-ratio: 1.91 / 1;
    overflow: hidden;
    background: var(--c-bg-subtle);
  }

  .og-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .og-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--c-text-light);
    font-size: 0.8rem;
  }

  .og-body {
    padding: 0.6rem 0.75rem;
    background: var(--c-bg-subtle);
  }

  .og-domain {
    font-size: 0.7rem;
    color: var(--c-text-light);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .og-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--c-text);
    line-height: 1.3;
    margin-top: 0.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .og-desc {
    font-size: 0.78rem;
    color: var(--c-text-light);
    line-height: 1.4;
    margin-top: 0.1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
