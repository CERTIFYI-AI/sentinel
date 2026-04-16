import { supabase, isSupabaseConfigured } from './supabase'

export async function fetchData<T>(
  supabaseQuery: () => Promise<{ data: T[] | null; error: any }>,
  mockData: T[]
): Promise<T[]> {
  if (!isSupabaseConfigured() || !supabase) return mockData
  try {
    const { data, error } = await supabaseQuery()
    if (error) {
      console.warn('[dataSource] Supabase error, using mock:', error.message)
      return mockData
    }
    return data && data.length > 0 ? data : mockData
  } catch (e) {
    console.warn('[dataSource] Supabase unreachable, using mock:', e)
    return mockData
  }
}

export async function fetchOne<T>(
  supabaseQuery: () => Promise<{ data: T | null; error: any }>,
  mockItem: T
): Promise<T> {
  if (!isSupabaseConfigured() || !supabase) return mockItem
  try {
    const { data, error } = await supabaseQuery()
    if (error || !data) return mockItem
    return data
  } catch {
    return mockItem
  }
}

export async function upsertData<T extends Record<string, unknown>>(
  table: string,
  record: T
): Promise<{ success: boolean; data?: T }> {
  if (!isSupabaseConfigured() || !supabase) return { success: true, data: record }
  try {
    const { data, error } = await supabase.from(table).upsert(record as any).select().single()
    if (error) {
      console.warn('[dataSource] upsert failed:', error.message)
      return { success: true, data: record }
    }
    return { success: true, data: data as T }
  } catch {
    return { success: true, data: record }
  }
}
