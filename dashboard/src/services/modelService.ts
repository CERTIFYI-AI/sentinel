import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TENANT_ID = 'TNT-001'

export interface ModelRecord {
  id: string
  name: string
  type: string
  status: string
  riskLevel: string
  version: string
  description: string
  lastAuditDate: string | null
  vendorId: string | null
  datasetId: string | null
  ownerId: string | null
  tenantId: string
  createdAt: string
  updatedAt: string
}

export async function fetchModels(): Promise<ModelRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('Model')
      .select('*')
      .eq('tenantId', TENANT_ID)
      .order('createdAt', { ascending: false })
    if (error) { console.warn('[modelService] fetch failed:', error.message); return [] }
    return (data || []) as ModelRecord[]
  } catch { return [] }
}

export async function upsertModel(model: Partial<ModelRecord>): Promise<ModelRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const record = { ...model, tenantId: TENANT_ID, updatedAt: new Date().toISOString() }
    if (!record.id) record.id = `MDL-${String(Date.now()).slice(-6)}`
    if (!record.createdAt) record.createdAt = new Date().toISOString()
    const { data, error } = await supabase.from('Model').upsert(record).select().single()
    if (error) { console.warn('[modelService] upsert failed:', error.message); return null }
    return data as ModelRecord
  } catch { return null }
}

export async function deleteModel(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('Model').delete().eq('id', id).eq('tenantId', TENANT_ID)
    if (error) { console.warn('[modelService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
