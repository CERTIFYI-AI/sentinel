import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { signIn, signUp, signOut, getSession, type AuthUser } from '../lib/auth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        const { user, error } = await signIn(email, password);
        if (error) {
          set({ isLoading: false, error });
        } else {
          set({ user, isLoading: false, isAuthenticated: !!user, error: null });
        }
      },
      register: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null });
        const { user, error } = await signUp(email, password, fullName);
        if (error) {
          set({ isLoading: false, error });
        } else {
          set({ user, isLoading: false, isAuthenticated: !!user, error: null });
        }
      },
      logout: async () => {
        await signOut();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      },
      initialize: async () => {
        set({ isLoading: true });
        const user = await getSession();
        set({ user, isAuthenticated: !!user, isLoading: false });
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
