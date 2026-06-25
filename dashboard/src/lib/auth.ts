// @ts-nocheck
import { supabase, isSupabaseConfigured } from './supabase';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface AuthUser {
  id: string;
  email: string;
  orgId: string | null;
  role: string;
  fullName: string | null;
  avatarUrl: string | null;
}

const DEMO_USER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000010',
  email: 'admin@sentinel.demo',
  orgId: '00000000-0000-0000-0000-000000000001',
  role: 'admin',
  fullName: 'CISO Admin',
  avatarUrl: null,
};

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  // Demo mode — bypass Supabase auth entirely
  if (DEMO_MODE) {
    return { user: DEMO_USER, error: null };
  }
  if (!isSupabaseConfigured()) {
    return { user: null, error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned');
    const profile = await getProfile(data.user.id);
    return { user: profile, error: null };
  } catch (e: unknown) {
    return { user: null, error: e instanceof Error ? e.message : 'Auth failed' };
  }
}

export async function signUp(email: string, password: string, fullName: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw error;
    return { user: data.user ? { id: data.user.id, email, orgId: null, role: 'viewer', fullName, avatarUrl: null } : null, error: null };
  } catch (e: unknown) {
    return { user: null, error: e instanceof Error ? e.message : 'Signup failed' };
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
}

export async function getProfile(userId: string): Promise<AuthUser | null> {
  if (DEMO_MODE) return DEMO_USER;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      orgId: data.org_id,
      role: data.role,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
    };
  } catch {
    return DEMO_MODE ? DEMO_USER : null;
  }
}

export async function getSession(): Promise<AuthUser | null> {
  if (DEMO_MODE) return DEMO_USER;
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      return getProfile(data.session.user.id);
    }
    return null;
  } catch {
    return null;
  }
}
