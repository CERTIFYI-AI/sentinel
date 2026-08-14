// SPDX-License-Identifier: Apache-2.0
// Model Efficiency benchmarking service, on the platform contract (see
// CLAUDE.md): org-scoped via RLS + DB default (the client never sends org_id
// or a client-minted id), writes THROW on failure so the UI can never report a
// false success, and reads throw so callers render real error states. An empty
// table is an honest empty array — never mock data.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type ModelEfficiencyRecord = {
  id: string
  org_id?: string
  /** Canonical registry link — ai_models.id (uuid). Null for external models. */
  model_id?: string | null
  model_name: string
  version?: string
  task?: string
  latency_p50?: number | null
  latency_p99?: number | null
  throughput?: number | null
  accuracy?: number | null
  f1_score?: number | null
  cost_per_inference?: number | null
  memory_mb?: number | null
  carbon_per_inference?: number | null
  compliance_score?: number | null
  bias_score?: number | null
  explainability_score?: number | null
  overall_score?: number | null
  benchmarked_by?: string
  metadata?: Record<string, any>
  benchmarked_at?: string
  created_at: string
  updated_at: string
}

export async function fetchAllModelEfficiency(_filters: Record<string, any> = {}): Promise<ModelEfficiencyRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('model_efficiency')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.warn('[modelEfficiencyService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as ModelEfficiencyRecord[]
}

// Insert/update a benchmark row. New rows must NOT carry a client-minted id —
// omit `id` and let the DB uuid default fill it; org_id comes from the DB
// default (current_user_org_id()). Returns the persisted row.
export async function upsertModelEfficiency(record: Partial<ModelEfficiencyRecord>): Promise<ModelEfficiencyRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { id, org_id: _org, created_at: _c, updated_at: _u, ...fields } = record
  const payload = id ? { id, ...fields } : fields
  const { data, error } = await supabase.from('model_efficiency').upsert(payload).select().single()
  if (error) { console.warn('[modelEfficiencyService] upsert:', error.message); throw new Error(error.message) }
  return data as ModelEfficiencyRecord
}

export async function deleteModelEfficiency(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('model_efficiency').delete().eq('id', id)
  if (error) { console.warn('[modelEfficiencyService] delete:', error.message); throw new Error(error.message) }
}

export const fetchModelEfficiency = fetchAllModelEfficiency
