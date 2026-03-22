type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'wolly_theme';

let theme = $state<Theme>(loadTheme());
let resolved = $state<'light' | 'dark'>(resolveTheme(theme));

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system';
}

function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t !== 'system') return t;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(r: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = r;
}

// Listen for OS preference changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme === 'system') {
      resolved = resolveTheme('system');
      apply(resolved);
    }
  });
  // Apply on load
  apply(resolved);
}

export function getTheme() {
  return {
    get preference() { return theme; },
    get resolved() { return resolved; },
    get isDark() { return resolved === 'dark'; },

    set(t: Theme) {
      theme = t;
      resolved = resolveTheme(t);
      localStorage.setItem(STORAGE_KEY, t);
      apply(resolved);
    },

    cycle() {
      const order: Theme[] = ['light', 'dark', 'system'];
      const next = order[(order.indexOf(theme) + 1) % order.length];
      this.set(next);
    },
  };
}
