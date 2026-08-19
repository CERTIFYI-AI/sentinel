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

// SECURITY: never derive role from user_metadata — it is client-mutable via
// supabase.auth.updateUser(), which allowed self-service privilege escalation.
// The authoritative role lives server-side in user_profiles (RLS-protected);
// callers must resolve it with resolveServerRole() and pass it in.
function mapSupabaseUser(su: SupabaseUser, serverRole: string = 'viewer'): User {
  return {
    id: su.id,
    email: su.email || '',
    name: su.user_metadata?.name || su.user_metadata?.full_name || su.email?.split('@')[0] || '',
    role: serverRole,
    avatar: su.user_metadata?.avatar_url,
    tenant: su.user_metadata?.tenant || 'default',
    organization: su.user_metadata?.organization,
  };
}

// Fetch the authoritative role from user_profiles. Falls back to 'viewer'
// when the profile is absent or the lookup fails. Defense-in-depth only:
// RLS still enforces permissions server-side regardless of this value.
async function resolveServerRole(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, org_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      logger.warn('ROLE_LOOKUP_FAILED:', error.message);
      return 'viewer';
    }
    return (data?.role as string) || 'viewer';
  } catch {
    return 'viewer';
  }
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
        // ── Demo bypass (no Supabase required) ───────────────────────────
        // `organization` here is a label on the local demo session only. The
        // authoritative name is `organizations.name`, read through
        // useOrgName() — nothing in the UI renders this field as the org name.
        const DEMO_USERS: Record<string, User> = {
          'admin@certifyi.ai': {
            id: 'demo-ciso-001',
            email: 'admin@certifyi.ai',
            name: 'Alex Rivera',
            role: 'ciso',
            tenant: 'default',
            organization: 'Sentinel AI',
          },
          'auditor@certifyi.ai': {
            id: 'demo-auditor-001',
            email: 'auditor@certifyi.ai',
            name: 'Jordan Lee',
            role: 'auditor',
            tenant: 'default',
            organization: 'Sentinel AI',
          },
        };
        // ── Live Supabase auth (preferred) ────────────────────────────────
        // When Supabase is configured we authenticate for real — including the
        // demo accounts (which exist as real users) — so the resulting session
        // drives RLS/org scoping. Without a real session, org-scoped tables are
        // invisible and the app can only show seed data.
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) { logger.error("SUPABASE_LOGIN_ERROR:", JSON.stringify(error)); throw error; }
          if (data.session && data.user) {
            const serverRole = await resolveServerRole(data.user.id);
            set({
              isAuthenticated: true,
              user: mapSupabaseUser(data.user, serverRole),
              token: data.session.access_token,
              refreshToken: data.session.refresh_token,
              loading: false,
            });
            return;
          }
        }
        // ── Offline demo fallback (Supabase not configured) ────────────────
        if (password === 'Demo@12345' && DEMO_USERS[email]) {
          set({
            isAuthenticated: true,
            user: DEMO_USERS[email],
            token: 'demo-token',
            refreshToken: 'demo-refresh',
            loading: false,
          });
          return;
        }
        throw new Error('Invalid email or password');
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
          const serverRole = await resolveServerRole(data.user.id);
          set({
            isAuthenticated: true,
            user: mapSupabaseUser(data.user, serverRole),
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
          const su = session.user;
          // Set the session immediately with the least-privileged role, then
          // upgrade to the server-side role once user_profiles resolves.
          set({
            isAuthenticated: true,
            user: mapSupabaseUser(su),
            token: session.access_token,
            refreshToken: session.refresh_token,
            loading: false,
          });
          void resolveServerRole(su.id).then((serverRole) => {
            const current = get().user;
            if (current && current.id === su.id) {
              set({ user: { ...current, role: serverRole } });
            }
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
            const serverRole = await resolveServerRole(session.user.id);
            set({
              isAuthenticated: true,
              user: mapSupabaseUser(session.user, serverRole),
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
      // Persist only non-sensitive UI state. The access/refresh tokens are
      // deliberately NOT written to localStorage here: the Supabase client
      // already persists the session under its own key, so a second copy only
      // widens the surface an XSS payload could steal a bearer token from. On
      // reload, initializeAuth()/setSession() rehydrate the in-memory tokens
      // from supabase.auth.getSession(); this store just remembers who is
      // logged in so the UI can render before that resolves.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);
