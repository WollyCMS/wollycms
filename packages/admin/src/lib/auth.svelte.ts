import { api, isAuthenticated, clearToken } from './api.js';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled?: boolean;
}

let user = $state<User | null>(null);
let loaded = $state(false);

export function getAuth() {
  async function load() {
    if (!isAuthenticated()) {
      loaded = true;
      return;
    }
    try {
      const res = await api.get<{ data: User }>('/auth/me');
      user = res.data;
    } catch {
      clearToken();
    }
    loaded = true;
  }

  function logout() {
    clearToken();
    user = null;
    window.location.href = '/admin/login';
  }

  return {
    get user() { return user; },
    set user(v: User | null) { user = v; },
    get loaded() { return loaded; },
    load,
    logout,
  };
}
