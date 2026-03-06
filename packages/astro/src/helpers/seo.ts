import type { Page, SiteConfig } from '../types.js';

export interface SeoMeta {
  title: string;
  description?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
}

/**
 * Generate meta tag objects from a page's SEO fields.
 * Use with Astro's <head> to render meta tags.
 */
export function getPageSeo(page: Page, siteConfig?: SiteConfig): SeoMeta {
  const seo = page.seo;
  const siteName = siteConfig?.siteName || 'SpacelyCMS';

  return {
    title: seo?.meta_title || `${page.title} | ${siteName}`,
    description: seo?.meta_description || undefined,
    ogImage: seo?.og_image || undefined,
    canonicalUrl: seo?.canonical_url || undefined,
    robots: seo?.robots || undefined,
  };
}

/** Article structured data (JSON-LD) */
export function articleJsonLd(page: Page, options: {
  siteUrl: string;
  siteName?: string;
  authorName?: string;
  ogImage?: string;
}): Record<string, unknown> {
  const seo = page.seo;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: seo?.meta_title || page.title,
    description: seo?.meta_description || undefined,
    image: seo?.og_image || options.ogImage || undefined,
    datePublished: page.meta.published_at || page.meta.created_at,
    dateModified: page.meta.updated_at,
    url: `${options.siteUrl.replace(/\/$/, '')}/${page.slug}`,
    publisher: {
      '@type': 'Organization',
      name: options.siteName || 'SpacelyCMS',
    },
    author: options.authorName ? {
      '@type': 'Person',
      name: options.authorName,
    } : undefined,
  };
}

/** WebPage structured data (JSON-LD) */
export function webPageJsonLd(page: Page, options: {
  siteUrl: string;
  siteName?: string;
}): Record<string, unknown> {
  const seo = page.seo;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo?.meta_title || page.title,
    description: seo?.meta_description || undefined,
    url: `${options.siteUrl.replace(/\/$/, '')}/${page.slug}`,
    datePublished: page.meta.published_at || page.meta.created_at,
    dateModified: page.meta.updated_at,
    isPartOf: {
      '@type': 'WebSite',
      name: options.siteName || 'SpacelyCMS',
      url: options.siteUrl,
    },
  };
}

/** BreadcrumbList structured data from menu hierarchy */
export function breadcrumbJsonLd(
  breadcrumbs: Array<{ title: string; url: string }>,
  siteUrl: string,
): Record<string, unknown> {
  const baseUrl = siteUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.title,
      item: crumb.url.startsWith('http') ? crumb.url : `${baseUrl}${crumb.url}`,
    })),
  };
}

/** Organization structured data */
export function organizationJsonLd(config: SiteConfig, options: {
  siteUrl: string;
  logoUrl?: string;
}): Record<string, unknown> {
  const sameAs: string[] = [];
  if (config.social?.facebook) sameAs.push(config.social.facebook);
  if (config.social?.twitter) sameAs.push(config.social.twitter);
  if (config.social?.instagram) sameAs.push(config.social.instagram);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.siteName,
    url: options.siteUrl,
    logo: options.logoUrl || undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };
}

/** Serialize JSON-LD to a script tag string for use in <head> */
export function jsonLdScript(data: Record<string, unknown>): string {
  // Remove undefined values for cleaner output
  const cleaned = JSON.parse(JSON.stringify(data));
  return `<script type="application/ld+json">${JSON.stringify(cleaned)}</script>`;
}
