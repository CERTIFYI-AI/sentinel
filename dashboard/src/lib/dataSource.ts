import { supabase } from './supabase';

export async function fromDB<T>(
  query: () => Promise<{ data: T[] | null; error: unknown }>,
  fallback: T[]
): Promise<T[]> {
  if (!supabase) return fallback;
  try {
    const { data, error } = await query();
    if (error) throw error;
    return data?.length ? data : fallback;
  } catch (e) {
    console.warn('[Sentinel] DB fallback:', e);
    return fallback;
  }
}

export async function fromDBSingle<T>(
  query: () => Promise<{ data: T | null; error: unknown }>,
  fallback: T | null = null
): Promise<T | null> {
  if (!supabase) return fallback;
  try {
    const { data, error } = await query();
    if (error) throw error;
    return data ?? fallback;
  } catch (e) {
    console.warn('[Sentinel] DB single fallback:', e);
    return fallback;
  }
}

export async function mutateDB<T>(
  mutation: () => Promise<{ data: T | null; error: unknown }>,
  fallbackAction: () => T
): Promise<T> {
  if (!supabase) return fallbackAction();
  try {
    const { data, error } = await mutation();
    if (error) throw error;
    return data ?? fallbackAction();
  } catch (e) {
    console.warn('[Sentinel] Mutation fallback:', e);
    return fallbackAction();
  }
}
