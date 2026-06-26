import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type GapRecord = {
  id: string
  org_id?: string
  title: string
  framework?: string
  control_ref?: string
  severity?: string
  progress?: number
  due_date?: string
  owner?: string
  description?: string
  status?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export async function fetchAllGaps(filters: Record<string, any> = {}): Promise<GapRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('gap_analysis').select('*').order('created_at', { ascending: false })
    if (filters.severity) q = q.eq('severity', filters.severity)
    if (filters.framework) q = q.eq('framework', filters.framework)
    const { data, error } = await q
    if (error) { console.warn('[gapService] fetch:', error.message); return [] }
    return (data ?? []) as GapRecord[]
  } catch { return [] }
}

export async function upsertGap(record: Partial<GapRecord>): Promise<GapRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('gap_analysis').upsert(record).select().single()
    if (error) { console.warn('[gapService] upsert:', error.message); return null }
    return data as GapRecord
  } catch { return null }
}

export async function deleteGap(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('gap_analysis').delete().eq('id', id)
    if (error) { console.warn('[gapService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchGaps = fetchAllGaps
export const saveGap = upsertGap
