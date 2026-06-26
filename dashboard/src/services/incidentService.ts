import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type IncidentRecord = {
  id: string
  org_id?: string
  title: string
  description?: string
  severity?: string
  status?: string
  type?: string
  affected_system?: string
  detected_at?: string
  resolved_at?: string
  assignee_id?: string
  metadata?: Record<string,any>
  created_at: string
  updated_at: string
  // Legacy/aliased fields retained for backward-compatibility with existing UI
  // code paths that read them. Server mapping is additive; see WS3 audit for
  // the migration plan to deprecate these in favour of snake_case canonicals.
  category?: string
  linkedModel?: string
  linked_model?: string
  reportedDate?: string
}

import { SEED_INCIDENTS } from '../data/seedData'

export async function fetchAllIncidents(filters: Record<string,any> = {}): Promise<IncidentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return SEED_INCIDENTS as any[]
  try {
    let q = supabase.from('incidents').select('*').order('created_at', { ascending: false })
    if (filters.severity) q = q.eq('severity', filters.severity)
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) { console.warn('[incidentService] fetch:', error.message); return SEED_INCIDENTS as any[] }
    return (data && data.length > 0 ? data : SEED_INCIDENTS) as IncidentRecord[]
  } catch { return SEED_INCIDENTS as any[] }
}

export async function upsertIncident(record: Partial<IncidentRecord>): Promise<IncidentRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('incidents').upsert(record).select().single()
    if (error) { console.warn('[incidentService] upsert:', error.message); return null }
    return data as IncidentRecord
  } catch { return null }
}

export async function deleteIncident(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('incidents').delete().eq('id', id)
    if (error) { console.warn('[incidentService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchIncidents = fetchAllIncidents
export const saveIncident = upsertIncident
