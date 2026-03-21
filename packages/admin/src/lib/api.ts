const API_BASE = '/api/admin';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wolly_token');
}

export function setToken(token: string) {
  localStorage.setItem('wolly_token', token);
}

export function clearToken() {
  localStorage.removeItem('wolly_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts: RequestInit = { method, headers };

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    clearToken();
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (!res.ok) {
    const msg = json.errors?.[0]?.message || `API error ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

interface LoginResult {
  token?: string;
  user?: { id: number; email: string; name: string; role: string };
  requiresTwoFactor?: boolean;
  challengeToken?: string;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),

  login: async (email: string, password: string): Promise<LoginResult> => {
    const res = await request<{ data: LoginResult }>('POST', '/auth/login', { email, password });
    if (res.data.token) {
      setToken(res.data.token);
    }
    return res.data;
  },

  verify2fa: async (challengeToken: string, code: string) => {
    const res = await request<{ data: { token: string; user: any } }>('POST', '/auth/verify-2fa', {
      challengeToken,
      code,
    });
    setToken(res.data.token);
    return res.data;
  },

  upload: async (file: File, title?: string, altText?: string, folder?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    if (altText) form.append('altText', altText);
    if (folder) form.append('folder', folder);
    return request<{ data: any }>('POST', '/media', form);
  },
};
