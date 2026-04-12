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
  jobTitle?: string;
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

const DEMO_USERS: Record<string, User> = {
  'admin@sentinel-grc.com': {
    id: 'usr-001',
    name: 'Sarah Chen',
    email: 'admin@sentinel-grc.com',
    role: 'admin',
    organization: 'Sentinel Financial Corp',
    tenantId: 'tenant-001',
    jobTitle: 'CISO',
  },
  'auditor@sentinel-grc.com': {
    id: 'usr-002',
    name: 'James Patel',
    email: 'auditor@sentinel-grc.com',
    role: 'auditor',
    organization: 'Sentinel Financial Corp',
    tenantId: 'tenant-001',
    jobTitle: 'Compliance Auditor',
  },
  'viewer@sentinel-grc.com': {
    id: 'usr-003',
    name: 'Emma Wilson',
    email: 'viewer@sentinel-grc.com',
    role: 'viewer',
    organization: 'Sentinel Financial Corp',
    tenantId: 'tenant-001',
    jobTitle: 'Risk Analyst',
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,

      login: async (email: string, _password: string) => {
        await new Promise((r) => setTimeout(r, 700));
        const lower = email.toLowerCase().trim();
        const user: User = DEMO_USERS[lower] ?? {
          id: 'usr-' + Math.random().toString(36).slice(2, 7),
          name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          email: lower,
          role: 'admin',
          organization: 'Your Organization',
          tenantId: 'tenant-001',
          jobTitle: 'Administrator',
        };
        set({
          isAuthenticated: true,
          user,
          token: 'tok_' + Math.random().toString(36).slice(2),
          refreshToken: 'rtok_' + Math.random().toString(36).slice(2),
        });
      },

      signup: async (_data) => {
        await new Promise((r) => setTimeout(r, 700));
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
