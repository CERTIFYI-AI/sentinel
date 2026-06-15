import { supabase, isSupabaseConfigured } from '../lib/supabase'

import { CONTROLS } from '../data/seed'

const TENANT_ID = 'default'

export async function fetchAllControls(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return CONTROLS
  try {
    const { data, error } = await supabase
      .from('controls')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('controls').select('*').order('created_at', { ascending: false })
        return d2 && d2.length > 0 ? d2 : CONTROLS
      }
      console.warn('[controlService] fetch failed:', error.message); return CONTROLS
    }
    return data && data.length > 0 ? data : CONTROLS
  } catch (e) { return CONTROLS }
}

export async function upsertControl(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('controls')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('controls').upsert(record).select().single()
        return d2 ?? record
      }
      console.warn('[controlService] upsert failed:', error.message); return record
    }
    return data
  } catch (e) { return record }
}

export async function deleteControl(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('controls')
      .delete()
      .eq('id', id)
    if (error) { console.warn('[controlService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchControls = fetchAllControls
export const saveControl = upsertControl
