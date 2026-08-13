import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type ModelRecord = {
  id: string
  org_id?: string
  name: string
  slug?: string
  description?: string
  model_type?: string
  provider?: string
  version?: string
  lifecycle_stage?: string
  risk_tier?: string
  risk_score?: number
  trust_score?: number
  use_case?: string
  business_owner?: string
  technical_owner?: string
  deployment_env?: string
  framework?: string
  is_regulated?: boolean
  is_active?: boolean
  requires_human_oversight?: boolean
  fairness_score?: number
  drift_status?: string
  drift_score?: number
  tags?: string[]
  metadata?: Record<string,any>
  created_at: string
  updated_at: string
}

export async function fetchAllModels(filters: Record<string,any> = {}): Promise<ModelRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('ai_models').select('*').order('created_at', { ascending: false })
  if (filters.lifecycle_stage) q = q.eq('lifecycle_stage', filters.lifecycle_stage)
  if (filters.risk_tier) q = q.eq('risk_tier', filters.risk_tier)
  if (filters.is_active !== undefined) q = q.eq('is_active', filters.is_active)
  const { data, error } = await q
  if (error) { console.warn('[modelService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as ModelRecord[]
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success. Never swallow to null.
export async function upsertModel(record: Partial<ModelRecord>): Promise<ModelRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save model.')
  const { data, error } = await supabase.from('ai_models').upsert(record).select().single()
  if (error) { console.warn('[modelService] upsert:', error.message); throw new Error(error.message) }
  return data as ModelRecord
}

export async function deleteModel(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete model.')
  const { error } = await supabase.from('ai_models').delete().eq('id', id)
  if (error) { console.warn('[modelService] delete:', error.message); throw new Error(error.message) }
}

export const fetchModels = fetchAllModels
export const saveModel = upsertModel
