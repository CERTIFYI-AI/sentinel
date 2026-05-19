// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// dashboard/src/store/uiStore.ts
import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  activeModel: string | null;
  unreadNotifications: number;
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  toggleSidebar: () => void;
  setActiveModel: (id: string | null) => void;
  setUnreadCount: (n: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UiState>()((set) => ({
  sidebarCollapsed: false,
  activeModel: null,
  unreadNotifications: 0,
  commandPaletteOpen: false,
  shortcutsModalOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveModel: (id) => set({ activeModel: id }),
  setUnreadCount: (n) => set({ unreadNotifications: n }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
}));

// Backwards-compat alias
export const useUiStore = useUIStore;
