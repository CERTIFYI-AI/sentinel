import logger from '@/lib/logger';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  tenant?: string;
  organization?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (params: { name: string; email: string; password: string; organization?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setSession: (session: Session | null) => void;
  initializeAuth: () => Promise<void>;
}

function mapSupabaseUser(su: SupabaseUser): User {
  return {
    id: su.id,
    email: su.email || '',
    name: su.user_metadata?.name || su.user_metadata?.full_name || su.email?.split('@')[0] || '',
    role: su.user_metadata?.role || 'viewer',
    avatar: su.user_metadata?.avatar_url,
    tenant: su.user_metadata?.tenant || 'default',
    organization: su.user_metadata?.organization,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      loading: false,

      login: async (email: string, password: string) => {
        // ── Demo bypass (enabled via VITE_DEMO_MODE=true, default on) ────
        const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
        const DEMO_USERS: Record<string, User> = {
          'admin@sentinel-grc.com': {
            id: 'demo-ciso-001',
            email: 'admin@sentinel-grc.com',
            name: 'Alex Rivera',
            role: 'ciso',
            tenant: 'default',
            organization: 'Sentinel AI',
          },
          'auditor@sentinel-grc.com': {
            id: 'demo-auditor-001',
            email: 'auditor@sentinel-grc.com',
            name: 'Jordan Lee',
            role: 'auditor',
            tenant: 'default',
            organization: 'Sentinel AI',
          },
        };
        if (isDemoMode && password === 'Demo@12345' && DEMO_USERS[email]) {
          set({
            isAuthenticated: true,
            user: DEMO_USERS[email],
            token: 'demo-token',
            refreshToken: 'demo-refresh',
            loading: false,
          });
          return;
        }
        // ── Live Supabase auth ────────────────────────────────────────────
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured. Use demo credentials.');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { logger.error("SUPABASE_SIGNUP_ERROR:", JSON.stringify(error)); throw error; }
        if (data.session && data.user) {
          set({
            isAuthenticated: true,
            user: mapSupabaseUser(data.user),
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            loading: false,
          });
        }
      },

      signup: async ({ name, email, password, organization }) => {
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, organization, role: 'viewer' },
          },
        });
        if (error) { logger.error("SUPABASE_SIGNUP_ERROR:", JSON.stringify(error)); throw error; }
        if (data.session && data.user) {
          set({
            isAuthenticated: true,
            user: mapSupabaseUser(data.user),
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            loading: false,
          });
        }
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut().catch(() => {});
        }
        set({ isAuthenticated: false, user: null, token: null, refreshToken: null, loading: false });
      },

      setUser: (user) => set({ user }),

      setSession: (session) => {
        if (session?.user) {
          set({
            isAuthenticated: true,
            user: mapSupabaseUser(session.user),
            token: session.access_token,
            refreshToken: session.refresh_token,
            loading: false,
          });
        } else {
          set({ isAuthenticated: false, user: null, token: null, refreshToken: null, loading: false });
        }
      },

      initializeAuth: async () => {
        if (!isSupabaseConfigured()) {
          set({ loading: false });
          return;
        }
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            set({
              isAuthenticated: true,
              user: mapSupabaseUser(session.user),
              token: session.access_token,
              refreshToken: session.refresh_token,
              loading: false,
            });
          } else {
            set({ isAuthenticated: false, user: null, token: null, refreshToken: null, loading: false });
          }
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'sentinel-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loading = false;
        }
      },
    }
  )
);
