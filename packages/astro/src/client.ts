import type {
  SpacelyConfig,
  PageListParams,
  PageSummary,
  Page,
  Menu,
  Term,
  MediaInfo,
  MediaVariant,
  Redirect,
  SiteConfig,
  Schemas,
  ApiResponse,
  PaginatedResponse,
} from './types.js';

export class SpacelyClient {
  private baseUrl: string;

  constructor(config: SpacelyConfig) {
    this.baseUrl = config.apiUrl.replace(/\/+$/, '');
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`SpacelyCMS API error: ${res.status} ${res.statusText} (${url})`);
    }
    return res.json() as Promise<T>;
  }

  readonly pages = {
    list: async (params?: PageListParams): Promise<PaginatedResponse<PageSummary>> => {
      const searchParams = new URLSearchParams();
      if (params?.type) searchParams.set('type', params.type);
      if (params?.taxonomy) searchParams.set('taxonomy', params.taxonomy);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));
      const qs = searchParams.toString();
      return this.fetch(`/pages${qs ? `?${qs}` : ''}`);
    },

    getBySlug: async (slug: string): Promise<Page> => {
      const res = await this.fetch<ApiResponse<Page>>(`/pages/${slug}`);
      return res.data;
    },
  };

  readonly menus = {
    get: async (slug: string, depth?: number): Promise<Menu> => {
      const qs = depth != null ? `?depth=${depth}` : '';
      const res = await this.fetch<ApiResponse<Menu>>(`/menus/${slug}${qs}`);
      return res.data;
    },
  };

  readonly taxonomies = {
    getTerms: async (slug: string): Promise<Term[]> => {
      const res = await this.fetch<ApiResponse<Term[]>>(`/taxonomies/${slug}/terms`);
      return res.data;
    },
  };

  readonly media = {
    getInfo: async (id: number): Promise<MediaInfo> => {
      const res = await this.fetch<ApiResponse<MediaInfo>>(`/media/${id}/info`);
      return res.data;
    },

    getVariant: async (id: number, variant: string): Promise<MediaVariant> => {
      const res = await this.fetch<ApiResponse<MediaVariant>>(`/media/${id}/${variant}`);
      return res.data;
    },

    url: (id: number, variant: string = 'original'): string => {
      return `${this.baseUrl}/media/${id}/${variant}`;
    },
  };

  readonly redirects = {
    list: async (): Promise<Redirect[]> => {
      const res = await this.fetch<ApiResponse<Redirect[]>>('/redirects');
      return res.data;
    },
  };

  readonly config = {
    get: async (): Promise<SiteConfig> => {
      const res = await this.fetch<ApiResponse<SiteConfig>>('/config');
      return res.data;
    },
  };

  readonly schemas = {
    get: async (): Promise<Schemas> => {
      const res = await this.fetch<ApiResponse<Schemas>>('/schemas');
      return res.data;
    },
  };
}

export function createClient(config: SpacelyConfig): SpacelyClient {
  return new SpacelyClient(config);
}
