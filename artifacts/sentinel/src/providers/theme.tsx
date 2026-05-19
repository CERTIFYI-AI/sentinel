import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'light' | 'dark';
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  resolved: 'dark',
  cycleTheme: () => {},
});

const STORAGE_KEY = 'sntl-theme';
const CYCLE_ORDER: Theme[] = ['dark', 'light', 'system'];

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
  );
  const [resolved, setResolved] = useState<'light' | 'dark'>(() =>
    resolveTheme((localStorage.getItem(STORAGE_KEY) as Theme) || 'dark')
  );

  useEffect(() => {
    const r = resolveTheme(theme);
    setResolved(r);
    applyThemeToDOM(r);
  }, [theme]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const r = e.matches ? 'dark' : 'light';
      setResolved(r);
      applyThemeToDOM(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  const cycleTheme = () => {
    const idx = CYCLE_ORDER.indexOf(theme);
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

// Convenience toggle component — cycles Dark → Light → System
export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  return (
    <button
      onClick={cycleTheme}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: 'hsl(var(--text-3))' }}
      title={theme === 'dark' ? 'Dark mode — click for Light' : theme === 'light' ? 'Light mode — click for System' : 'System mode — click for Dark'}
      aria-label='Cycle theme'
    >
      {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥'}
    </button>
  );
}
