// dashboard/src/store/auth-store.ts

import { create } from "zustand";
import { setToken, clearToken } from "../api/client";

interface AuthState {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: localStorage.getItem("sentinel_token") !== null,
  login: (token: string) => {
    setToken(token);
    set({ isAuthenticated: true });
  },
  logout: () => {
    clearToken();
    set({ isAuthenticated: false });
  },
}));