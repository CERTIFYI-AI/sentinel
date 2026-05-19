// dashboard/src/store/theme-store.ts

import { create } from "zustand";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "system") {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(systemDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

const stored = (localStorage.getItem("sentinel_theme") as Theme) ?? "dark";
applyTheme(stored);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: stored,
  setTheme: (theme: Theme) => {
    localStorage.setItem("sentinel_theme", theme);
    applyTheme(theme);
    set({ theme });
  },
}));