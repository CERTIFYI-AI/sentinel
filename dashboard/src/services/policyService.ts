// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function fetchAllPolicys(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    // Try Policy (PascalCase Prisma table, has data) first, fallback to policies
    const { data, error } = await supabase.from('Policy').select('*').order('createdAt', { ascending: false })
    if (error) {
      // Fallback to snake_case
      const { data: d2, error: e2 } = await supabase.from('policies').select('*').order('created_at', { ascending: false })
      if (e2) { console.warn('[policyService] fetch failed:', e2.message); return [] }
      return d2 ?? []
    }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertPolicy(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase.from('Policy').upsert(record).select().single()
    if (error) {
      const { data: d2 } = await supabase.from('policies').upsert(record).select().single()
      return d2 ?? record
    }
    return data
  } catch (e) { return record }
}

export async function deletePolicy(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('Policy').delete().eq('id', id)
    if (error) {
      const { error: e2 } = await supabase.from('policies').delete().eq('id', id)
      if (e2) { console.warn('[policyService] delete failed:', e2.message); return false }
    }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchPolicys = fetchAllPolicys
export const savePolicy = upsertPolicy
