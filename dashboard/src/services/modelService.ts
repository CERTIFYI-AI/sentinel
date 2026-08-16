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
  const isNew = !record.id
  const { data, error } = await supabase.from('ai_models').upsert(record).select().single()
  if (error) { console.warn('[modelService] upsert:', error.message); throw new Error(error.message) }
  const saved = data as ModelRecord
  if (isNew && saved?.id) {
    // Registering a model is the head of the largest governance cascade
    // (11 registered agents): the mesh opens the initial risk, maps controls
    // and raises HITL review where the tier demands it. Payload follows the
    // declared ModelRegisteredPayload contract. Deliberately fire-and-forget
    // and never rethrown: an agent failure must not roll back or fail the
    // user's save — cascade outcomes are observable in Agent Control and
    // governance_events, not in this call's result.
    const tierNum = Number(String((saved as any).risk_tier ?? '').replace(/\D/g, '')) || 3
    const { governanceBus } = await import('../lib/governance/eventBus')
    void governanceBus.emit('MODEL_REGISTERED', 'ai-inventory', {
      modelId: saved.id,
      modelName: (saved as any).name ?? 'Unnamed model',
      modelType: 'OTHER',
      owner: (saved as any).business_owner ?? (saved as any).technical_owner ?? 'unassigned',
      riskTier: (Math.min(4, Math.max(1, tierNum)) as 1 | 2 | 3 | 4),
      purpose: (saved as any).purpose ?? (saved as any).description ?? 'unspecified',
      vendor: (saved as any).vendor ?? undefined,
      deploymentScope: ((saved as any).deployment_env ?? 'DEV').toUpperCase().includes('PROD') ? 'PROD' : 'DEV',
      dataSensitivity: 'CONFIDENTIAL',
    })
  }
  return saved
}

export async function deleteModel(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete model.')
  const { error } = await supabase.from('ai_models').delete().eq('id', id)
  if (error) { console.warn('[modelService] delete:', error.message); throw new Error(error.message) }
}

export const fetchModels = fetchAllModels
export const saveModel = upsertModel
