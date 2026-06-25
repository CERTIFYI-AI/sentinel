// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type FrameworkRecord = {
  id: string
  org_id?: string
  name: string
  version?: string
  description?: string
  category?: string
  status?: string
  compliance_score?: number
  controls_count?: number
  metadata?: Record<string,any>
  created_at: string
  updated_at: string
}

export async function fetchAllFrameworks(filters: Record<string, any> = {}): Promise<FrameworkRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('frameworks').select('*').order('name', { ascending: true })
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) { console.warn('[frameworkService] fetch:', error.message); return [] }
    return (data ?? []) as FrameworkRecord[]
  } catch { return [] }
}

export async function upsertFramework(record: Partial<FrameworkRecord>): Promise<FrameworkRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('frameworks').upsert(record).select().single()
    if (error) { console.warn('[frameworkService] upsert:', error.message); return null }
    return data as FrameworkRecord
  } catch { return null }
}

export async function deleteFramework(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('frameworks').delete().eq('id', id)
    if (error) { console.warn('[frameworkService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchFrameworks = fetchAllFrameworks
