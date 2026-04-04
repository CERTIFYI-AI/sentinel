
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from '@phosphor-icons/react';

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType { theme: Theme; setTheme: (t: Theme) => void; resolved: 'light' | 'dark'; }
const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', setTheme: () => {}, resolved: 'dark' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('sntl-theme') as Theme) || 'dark');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const r = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    setResolved(r);
    document.documentElement.classList.toggle('dark', r === 'dark');
  }, [theme]);

  const setTheme = (t: Theme) => { localStorage.setItem('sntl-theme', t); setThemeState(t); };
  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle() {
  const { resolved, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: 'hsl(var(--text-3))' }}
      title="Toggle theme"
    >
      {resolved === 'dark' ? <Sun size={16} weight="fill" /> : <Moon size={16} weight="fill" />}
    </button>
  );
}
