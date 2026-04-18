import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllIncidents(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('incidents').select('*').order('created_at', { ascending: false })
        return d2 ?? []
      }
      console.warn('[incidentService] fetch failed:', error.message); return []
    }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertIncident(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('incidents')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('incidents').upsert(record).select().single()
        return d2 ?? record
      }
      console.warn('[incidentService] upsert failed:', error.message); return record
    }
    return data
  } catch (e) { return record }
}

export async function deleteIncident(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id)
    if (error) { console.warn('[incidentService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchIncidents = fetchAllIncidents
export const saveIncident = upsertIncident
