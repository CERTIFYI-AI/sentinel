import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

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
  expiry_date?: string | null
  auto_collected?: boolean | null
  description?: string | null
  file_url?: string | null
  file_name?: string | null
  url?: string | null
  linked_controls?: string[] | null    // → controls.id (uuid)
  linked_models?: string[] | null
  linked_use_cases?: string[] | null
  linked_incident_id?: string | null   // → incidents.id (uuid)
  linked_assessment_id?: string | null // → conformity_assessments.id (text)
  /** Derived at READ time from expiry_date ?? collection_date — never a
   *  permanent write-time label that goes stale in the row. */
  freshness_status?: string | null
  is_deleted?: boolean | null
  created_at?: string
  updated_at?: string
}

const DAY_MS = 86_400_000

/**
 * Freshness is a function of today, so it is computed on read, never stored:
 * - with an expiry_date: past = expired, within 30d = aging, else fresh;
 * - without one, from collection_date age: ≤30d fresh, ≤90d aging, else stale;
 * - with neither date the status is unknown (null), not asserted.
 */
export function deriveFreshness(record: Pick<EvidenceRecord, 'expiry_date' | 'collection_date'>): string | null {
  const now = Date.now()
  if (record.expiry_date) {
    const exp = new Date(record.expiry_date).getTime()
    if (!isNaN(exp)) {
      if (exp < now) return 'expired'
      if (exp - now <= 30 * DAY_MS) return 'aging'
      return 'fresh'
    }
  }
  if (record.collection_date) {
    const col = new Date(record.collection_date).getTime()
    if (!isNaN(col)) {
      const days = Math.floor((now - col) / DAY_MS)
      if (days <= 30) return 'fresh'
      if (days <= 90) return 'aging'
      return 'stale'
    }
  }
  return null
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
  const { data, error } = await q
  if (error) { console.warn('[evidenceService] fetch:', error.message); throw new Error(error.message) }
  // Freshness is derived per-row at read time (the stored column is legacy).
  let rows = ((data ?? []) as EvidenceRecord[]).map((r) => ({
    ...r,
    freshness_status: deriveFreshness(r),
  }))
  // The freshness filter applies to the DERIVED value, so it is client-side.
  if (filters.freshness_status) {
    rows = rows.filter((r) => (r.freshness_status ?? '') === filters.freshness_status)
  }
  return rows
}

export async function upsertEvidence(record: Partial<EvidenceRecord>): Promise<EvidenceRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save evidence.')
  // Never send the scoping column from the client — DB default + RLS own it.
  // freshness_status is derived on read, so a write never pins a stale label.
  const { tenant_id: _omit, freshness_status: _derived, ...payload } = record
  const { data, error } = await supabase.from('evidence').upsert(payload).select().single()
  if (error) { console.warn('[evidenceService] upsert:', error.message); throw new Error(error.message) }
  const saved = data as EvidenceRecord
  // EU AI Act Art. 12 traceability — fire-and-forget after the write resolved.
  void logAction({ module: 'evidence', entityType: 'evidence', entityId: saved.id, entityName: saved.title, action: record.id ? 'update' : 'create' })
  return { ...saved, freshness_status: deriveFreshness(saved) }
}

// Soft delete: the table carries `is_deleted` so custody history stays intact.
export async function deleteEvidence(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete evidence.')
  const { error } = await supabase.from('evidence').update({ is_deleted: true }).eq('id', id)
  if (error) { console.warn('[evidenceService] delete:', error.message); throw new Error(error.message) }
  void logAction({ module: 'evidence', entityType: 'evidence', entityId: id, action: 'delete' })
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
