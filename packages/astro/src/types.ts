/** API response wrapper */
export interface ApiResponse<T> {
  data: T;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

/** Page metadata */
export interface PageMeta {
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/** Page summary (from list endpoint) */
/** Taxonomy term attached to a page */
export interface PageTerm {
  taxonomy: string;
  term: string;
  weight: number;
}

export interface PageSummary {
  id: number;
  type: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  locale?: string;
  fields: Record<string, unknown>;
  terms?: PageTerm[];
  meta: PageMeta;
}

export interface PageTranslation {
  id: number;
  locale: string;
  slug: string;
  title: string;
}

/** Resolved block in a page region */
export interface ResolvedBlock {
  id: string;
  block_type: string;
  title?: string;
  is_shared?: boolean;
  block_id?: number;
  fields: Record<string, unknown>;
}

/** SEO metadata for a page (matches content API snake_case keys) */
export interface PageSeo {
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots: string | null;
}

/** Full page with resolved regions */
export interface Page extends PageSummary {
  regions: Record<string, ResolvedBlock[]>;
  seo?: PageSeo;
  translationGroupId?: string | null;
  translations?: PageTranslation[];
}

/** Menu item (recursive tree) */
export interface MenuItem {
  id: number;
  title: string;
  url: string | null;
  page_slug: string | null;
  target: string;
  attributes: Record<string, unknown> | null;
  children: MenuItem[];
}

/** Menu */
export interface Menu {
  id: number;
  name: string;
  slug: string;
  items: MenuItem[];
}

/** Taxonomy term */
export interface Term {
  id: number;
  name: string;
  slug: string;
  weight: number;
  fields: Record<string, unknown> | null;
  children?: Term[];
}

/** Media info */
export interface MediaInfo {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string | null;
  variants: Record<string, string>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/** Media variant reference */
export interface MediaVariant {
  id: number;
  variant: string;
  mimeType: string;
  path: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string | null;
}

/** Redirect */
export interface Redirect {
  id: number;
  fromPath: string;
  toPath: string;
  statusCode: number;
}

/** Site config */
export interface SiteConfig {
  siteName: string;
  tagline: string;
  logo: string | null;
  footer: { text: string };
  social: {
    facebook: string | null;
    twitter: string | null;
    instagram: string | null;
  };
}

/** Field schema definition */
export interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  fields?: FieldDefinition[];
  min?: number;
  max?: number;
}

/** Content type schema */
export interface ContentTypeSchema {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  fieldsSchema: FieldDefinition[];
  regions: Array<{
    name: string;
    label: string;
    allowed_types: string[] | null;
  }>;
}

/** Block type schema */
export interface BlockTypeSchema {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  fieldsSchema: FieldDefinition[];
  icon: string | null;
  category: string | null;
}

/** Schemas response */
export interface Schemas {
  contentTypes: ContentTypeSchema[];
  blockTypes: BlockTypeSchema[];
}

/** Block component props */
export interface BlockProps {
  fields: Record<string, unknown>;
  block: {
    id: string;
    type: string;
    title?: string;
    is_shared?: boolean;
  };
  region: string;
  position: number;
}

/** Client configuration */
export interface WollyConfig {
  apiUrl: string;
}

/** Page list query parameters */
export interface PageListParams {
  type?: string;
  taxonomy?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  status?: string;
  locale?: string;
}

/** Site configuration (from content API /config) */
export interface SiteConfig {
  siteName: string;
  tagline: string;
  logo: string | null;
  footer: { text: string };
  social: { facebook: string | null; twitter: string | null; instagram: string | null };
  defaultLocale: string;
  supportedLocales: string[];
}
