import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Real org-scoped `evidence` table. RLS scopes rows to the caller's org
// (tenant_id = current_user_org_id()::text) and the DB default fills
// tenant_id on insert — the client never chooses its own tenant.
// Writes throw on failure so the UI surfaces a real error.

export type EvidenceRecord = {
  id: string
  tenant_id?: string
  title: string
  type?: string | null
  source?: string | null
  collection_date?: string | null
  auto_collected?: boolean | null
  description?: string | null
  file_url?: string | null
  file_name?: string | null
  url?: string | null
  linked_controls?: string[] | null
  linked_models?: string[] | null
  linked_use_cases?: string[] | null
  freshness_status?: string | null
  is_deleted?: boolean | null
  created_at?: string
  updated_at?: string
}

// Append-only hash-chain custody ledger (org-scoped, insert/select only).
// Entries are written by the Workers audit pipeline; the UI only reads.
export type EvidenceChainEntry = {
  id: string
  org_id: string
  entity_type: string
  entity_id: string
  action: string
  actor: string | null
  prev_hash: string | null
  hash: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export async function fetchAllEvidences(filters: Record<string, any> = {}): Promise<EvidenceRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase
    .from('evidence')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (filters.type) q = q.eq('type', filters.type)
  if (filters.freshness_status) q = q.eq('freshness_status', filters.freshness_status)
  const { data, error } = await q
  if (error) { console.warn('[evidenceService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as EvidenceRecord[]
}

export async function upsertEvidence(record: Partial<EvidenceRecord>): Promise<EvidenceRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save evidence.')
  // Never send the scoping column from the client — DB default + RLS own it.
  const { tenant_id: _omit, ...payload } = record
  const { data, error } = await supabase.from('evidence').upsert(payload).select().single()
  if (error) { console.warn('[evidenceService] upsert:', error.message); throw new Error(error.message) }
  return data as EvidenceRecord
}

// Soft delete: the table carries `is_deleted` so custody history stays intact.
export async function deleteEvidence(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete evidence.')
  const { error } = await supabase.from('evidence').update({ is_deleted: true }).eq('id', id)
  if (error) { console.warn('[evidenceService] delete:', error.message); throw new Error(error.message) }
}

export async function fetchEvidenceChain(limit = 200): Promise<EvidenceChainEntry[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('evidence_chain')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) { console.warn('[evidenceService] chain fetch:', error.message); throw new Error(error.message) }
  return (data ?? []) as EvidenceChainEntry[]
}

// Backward-compatible aliases
export const fetchEvidences = fetchAllEvidences
export const saveEvidence = upsertEvidence
