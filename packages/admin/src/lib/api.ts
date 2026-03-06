const API_BASE = '/api/admin';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('spacely_token');
}

export function setToken(token: string) {
  localStorage.setItem('spacely_token', token);
}

export function clearToken() {
  localStorage.removeItem('spacely_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getAuthToken(): string | null {
  return getToken();
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
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (!res.ok) {
    const msg = json.errors?.[0]?.message || `API error ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),

  login: async (email: string, password: string) => {
    const res = await request<{ data: { token: string; user: any } }>('POST', '/auth/login', { email, password });
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
