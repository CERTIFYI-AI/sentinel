import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'auditor' | 'viewer';
  organization: string;
  tenantId: string;
  avatarUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; organization: string }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: true,
      user: {
        id: 'usr-001',
        name: 'Bhaskar Admin',
        email: 'admin@sentinel-grc.com',
        role: 'admin',
        organization: 'Sentinel Financial Corp',
        tenantId: 'tenant-001',
      },
      token: 'demo_token',
      refreshToken: null,
      login: async (email: string, _password: string) => {
        // Simulate API call
        await new Promise((r) => setTimeout(r, 500));
        const user: User = {
          id: 'usr-001',
          name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          email,
          role: 'admin',
          organization: 'Certifyi Inc.',
          tenantId: 'tenant-001',
        };
        set({
          isAuthenticated: true,
          user,
          token: 'tok_' + Math.random().toString(36).slice(2),
          refreshToken: 'rtok_' + Math.random().toString(36).slice(2),
        });
      },
      signup: async (_data) => {
        await new Promise((r) => setTimeout(r, 500));
        // Signup just succeeds, user must login after
      },
      logout: () => {
        set({ isAuthenticated: false, user: null, token: null, refreshToken: null });
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
