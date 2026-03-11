// dashboard/src/store/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isLoading: true,
      setTokens: (access, refresh) =>
        set({ token: access, refreshToken: refresh }),
      setUser: (user) => set({ user, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => {
        set({ token: null, refreshToken: null, user: null, isLoading: false });
        window.location.href = "/login";
      },
    }),
    {
      name: "sentinel_auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);
