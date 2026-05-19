import { supabase, isSupabaseConfigured } from './supabase';
import type { PostgrestError } from '@supabase/supabase-js';

export function fromDB<T>(table: string): {
  select: (query?: string) => Promise<{ data: T[]; error: PostgrestError | null }>;
  insert: (record: Partial<T>) => Promise<{ data: null; error: null } | { data: T; error: PostgrestError | null }>;
  update: (id: string, record: Partial<T>) => Promise<{ data: T; error: PostgrestError | null }>;
  delete: (id: string) => Promise<{ error: PostgrestError | null }>;
  find: (column: string, value: any) => Promise<{ data: T[]; error: PostgrestError | null }>;
};
export function fromDB<T>(query: () => any, fallback?: T | (() => T)): Promise<T>;
export function fromDB<T>(tableOrQuery: string | (() => any), fallback?: T | (() => T)): any {
  if (typeof tableOrQuery === 'string') {
    const table = tableOrQuery;
    return {
      select: async (query?: string) => {
        if (!isSupabaseConfigured() || !supabase) return { data: [] as T[], error: null };
        const { data, error } = await (supabase.from(table).select(query ?? '*') as any);
        return { data: (data ?? []) as T[], error };
      },
      insert: async (record: Partial<T>) => {
        if (!isSupabaseConfigured() || !supabase) return { data: null, error: null };
        const { data, error } = await supabase.from(table).insert(record as any).select().single();
        return { data: data as T, error };
      },
      update: async (id: string, record: Partial<T>) => {
        if (!isSupabaseConfigured() || !supabase) return { data: null, error: null };
        const { data, error } = await supabase.from(table).update(record as any).eq('id', id).select().single();
        return { data: data as T, error };
      },
      delete: async (id: string) => {
        if (!isSupabaseConfigured() || !supabase) return { error: null };
        const { error } = await supabase.from(table).delete().eq('id', id);
        return { error };
      },
      find: async (column: string, value: any) => {
        if (!isSupabaseConfigured() || !supabase) return { data: [] as T[], error: null };
        const { data, error } = await supabase.from(table).select('*').eq(column, value);
        return { data: (data ?? []) as T[], error };
      },
    };
  }
  // Query wrapper mode: fromDB(() => supabase.from(...).select(...), fallback)
  const query = tableOrQuery;
  const getFallback = (): T => {
    if (typeof fallback === 'function') return (fallback as () => T)();
    return (fallback ?? null) as any;
  };
  return (async () => {
    if (!isSupabaseConfigured() || !supabase) return getFallback();
    try {
      const result = await query();
      const { data, error } = result ?? {};
      if (error) console.warn('[fromDB] Error:', error);
      return (data ?? getFallback()) as T;
    } catch (e) {
      console.warn('[fromDB] Exception:', e);
      return getFallback();
    }
  })();
}

export async function mutateDB<T>(
  mutation: () => any,
  fallback?: T | (() => T)
): Promise<T> {
  const getFallback = (): T => {
    if (typeof fallback === 'function') return (fallback as () => T)();
    return (fallback ?? null) as any;
  };
  if (!isSupabaseConfigured() || !supabase) {
    return getFallback();
  }
  try {
    const result = await mutation();
    const { data, error } = result ?? {};
    if (error) console.warn('[mutateDB] Error:', error);
    return (data ?? getFallback()) as T;
  } catch (e) {
    console.warn('[mutateDB] Exception:', e);
    return getFallback();
  }
}

export function getTenantId(): string {
  return 'default';
}
