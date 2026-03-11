// dashboard/src/store/uiStore.ts
import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  activeModel: string | null;
  unreadNotifications: number;
  toggleSidebar: () => void;
  setActiveModel: (id: string | null) => void;
  setUnreadCount: (n: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  sidebarCollapsed: false,
  activeModel: null,
  unreadNotifications: 0,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActiveModel: (id) => set({ activeModel: id }),
  setUnreadCount: (n) => set({ unreadNotifications: n }),
}));
