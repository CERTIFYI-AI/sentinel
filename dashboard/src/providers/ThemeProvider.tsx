import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    (localStorage.getItem('sentinel-theme') as Theme) ?? 'dark'
  );
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemDark.matches ? 'dark' : 'light') : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    localStorage.setItem('sentinel-theme', theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const handler = () => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(systemDark.matches ? 'dark' : 'light');
    };
    systemDark.addEventListener('change', handler);
    return () => systemDark.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () =>
    setThemeState((prev) =>
      prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
    );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
