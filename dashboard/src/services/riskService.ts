import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Maps production 'risks' table columns to the RiskRecord shape used by the UI.
// Live table (org-scoped via RLS: tenant_id = current_user_org_id()::text,
// filled by the DB default — never set tenant_id from the client):
//   id (text pk), tenant_id, name, description, action_owner, categories text[],
//   likelihood int, severity int, risk_score float, mitigation_status,
//   mitigation_plan, applicable_frameworks text[], linked_control_ids uuid[],
//   linked_incident_ids uuid[], deadline, is_deleted, created_at, updated_at
export type RiskRecord = {
  id: string
  org_id?: string
  /** Business code (e.g. RSK-001) — display identity; the uuid `id` stays the key. */
  risk_id?: string | null
  title: string
  description?: string
  category: string
  likelihood: number
  impact: number
  risk_score: number
  status: string
  owner?: string
  mitigation?: string
  frameworks?: string[]
  linked_model_ids?: string[]
  linked_control_ids?: string[]
  linked_incident_ids?: string[]
  residual_likelihood?: number | null
  residual_impact?: number | null
  deadline?: string | null
  tags?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  // Legacy/aliased fields retained for backward-compatibility with existing
  // UI code paths; to be deprecated in WS3 canonical-schema pass.
  severity?: string
  score?: number
  trending?: 'up' | 'down' | 'flat' | string
}

// Internal: maps 'risks' table row → RiskRecord UI shape
function mapRow(row: any): RiskRecord {
  const likelihood = row.likelihood ?? 3
  const impact = row.severity ?? row.impact ?? 3
  // Several legacy rows carry risk_score = 0; derive from L×I so the UI never
  // shows a fabricated-looking zero for a scored risk.
  const stored = row.risk_score != null ? Number(row.risk_score) : 0
  return {
    id: row.id,
    org_id: row.tenant_id,
    risk_id: row.risk_id ?? null,
    title: row.name ?? row.title ?? '',
    description: row.description ?? '',
    category: Array.isArray(row.categories) ? row.categories[0] ?? '' : (row.category ?? ''),
    likelihood,
    impact,
    risk_score: stored > 0 ? stored : likelihood * impact,
    status: row.mitigation_status ?? row.status ?? 'Open',
    owner: row.action_owner ?? row.owner ?? '',
    mitigation: row.mitigation_plan ?? row.mitigation ?? '',
    frameworks: Array.isArray(row.applicable_frameworks) ? row.applicable_frameworks : [],
    linked_model_ids: Array.isArray(row.linked_model_ids) ? row.linked_model_ids : [],
    linked_control_ids: Array.isArray(row.linked_control_ids) ? row.linked_control_ids : [],
    linked_incident_ids: Array.isArray(row.linked_incident_ids) ? row.linked_incident_ids : [],
    residual_likelihood: row.residual_likelihood ?? null,
    residual_impact: row.residual_impact ?? null,
    deadline: row.deadline ?? null,
    tags: Array.isArray(row.categories) ? row.categories : [],
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Internal: maps RiskRecord UI shape → 'risks' table row for upsert.
// Never sets tenant_id — the DB default (current_user_org_id()) scopes the row.
function mapToRow(record: Partial<RiskRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (record.id) row.id = record.id
  // risks.title is NOT NULL with no default — write both columns so inserts
  // succeed on a from-zero schema and display stays consistent with `name`.
  if (record.title != null) { row.name = record.title; row.title = record.title }
  if (record.description != null) row.description = record.description
  if (record.category != null) row.categories = [record.category]
  if (record.tags != null) row.categories = record.tags
  if (record.likelihood != null) row.likelihood = record.likelihood
  if (record.impact != null) row.severity = record.impact
  if (record.risk_score != null) row.risk_score = record.risk_score
  else if (record.likelihood != null && record.impact != null) {
    row.risk_score = record.likelihood * record.impact
  }
  if (record.status != null) row.mitigation_status = record.status
  if (record.owner != null) row.action_owner = record.owner
  if (record.mitigation != null) row.mitigation_plan = record.mitigation
  if (record.risk_id != null) row.risk_id = record.risk_id
  if (record.frameworks != null) row.applicable_frameworks = record.frameworks
  if (record.linked_model_ids != null) row.linked_model_ids = record.linked_model_ids
  if (record.linked_control_ids != null) row.linked_control_ids = record.linked_control_ids
  if (record.residual_likelihood !== undefined) row.residual_likelihood = record.residual_likelihood
  if (record.residual_impact !== undefined) row.residual_impact = record.residual_impact
  if (record.deadline !== undefined) row.deadline = record.deadline
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchAllRisks(filters: Record<string, any> = {}): Promise<RiskRecord[]> {
  // A config failure must surface as an error state, not an honest-looking
  // empty register (platform contract: never fake success).
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — risk data is unavailable')
  }
  let q = supabase
    .from('risks')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (filters.status) q = q.eq('mitigation_status', filters.status)
  if (filters.category) q = q.contains('categories', [filters.category])
  const { data, error } = await q
  if (error) { console.warn('[riskService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapRow)
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success. Never swallow to null.
export async function upsertRisk(record: Partial<RiskRecord>): Promise<RiskRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save risk.')
  const payload = mapToRow(record)
  const { data, error } = await supabase.from('risks').upsert(payload).select().single()
  if (error) { console.warn('[riskService] upsert:', error.message); throw new Error(error.message) }
  return mapRow(data)
}

export async function deleteRisk(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete risk.')
  // Soft delete via is_deleted flag
  const { error } = await supabase.from('risks').update({ is_deleted: true }).eq('id', id)
  if (error) { console.warn('[riskService] delete:', error.message); throw new Error(error.message) }
}

export const fetchRisks = fetchAllRisks
export const saveRisk = upsertRisk
