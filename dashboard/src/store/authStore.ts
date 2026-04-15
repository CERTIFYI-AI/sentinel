import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
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
      loading: true,

      login: async (email: string, password: string) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { console.error("SUPABASE_SIGNUP_ERROR:", JSON.stringify(error)); throw error; }
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
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, organization, role: 'viewer' },
          },
        });
        if (error) { console.error("SUPABASE_SIGNUP_ERROR:", JSON.stringify(error)); throw error; }
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
        if (supabase) {
          await supabase.auth.signOut();
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
        if (!supabase) {
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
    }
  )
);
