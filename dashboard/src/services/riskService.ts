import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Maps production 'risks' table columns to the RiskRecord shape used by the UI
export type RiskRecord = {
  id: string
  org_id?: string
  title: string
  category: string
  likelihood: number
  impact: number
  risk_score: number
  status: string
  owner?: string
  mitigation?: string
  tags?: string[]
  metadata?: Record<string,any>
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
  return {
    id: row.id,
    org_id: row.tenant_id,
    title: row.name ?? row.title ?? '',
    category: Array.isArray(row.categories) ? row.categories[0] ?? '' : (row.category ?? ''),
    likelihood: row.likelihood ?? 3,
    impact: row.severity ?? row.impact ?? 3,
    risk_score: row.risk_score != null ? Number(row.risk_score) : ((row.likelihood ?? 3) * (row.severity ?? 3)),
    status: row.mitigation_status ?? row.status ?? 'Open',
    owner: row.action_owner ?? row.owner ?? '',
    mitigation: row.mitigation_plan ?? row.mitigation ?? '',
    tags: Array.isArray(row.categories) ? row.categories : [],
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Internal: maps RiskRecord UI shape → 'risks' table row for upsert
function mapToRow(record: Partial<RiskRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (record.id) row.id = record.id
  if (record.org_id) row.tenant_id = record.org_id
  if (record.title != null) row.name = record.title
  if (record.category != null) row.categories = [record.category]
  if (record.likelihood != null) row.likelihood = record.likelihood
  if (record.impact != null) row.severity = record.impact
  if (record.risk_score != null) row.risk_score = record.risk_score
  else if (record.likelihood != null && record.impact != null) {
    row.risk_score = record.likelihood * record.impact
  }
  if (record.status != null) row.mitigation_status = record.status
  if (record.owner != null) row.action_owner = record.owner
  if (record.mitigation != null) row.mitigation_plan = record.mitigation
  if (record.tags != null) row.categories = record.tags
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchAllRisks(filters: Record<string,any> = {}): Promise<RiskRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase
      .from('risks')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (filters.status) q = q.eq('mitigation_status', filters.status)
    if (filters.category) q = q.contains('categories', [filters.category])
    const { data, error } = await q
    if (error) { console.warn('[riskService] fetch:', error.message); return [] }
    return (data ?? []).map(mapRow)
  } catch (e) { console.warn('[riskService] fetch exception:', e); return [] }
}

export async function upsertRisk(record: Partial<RiskRecord>): Promise<RiskRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const payload = mapToRow(record)
    const { data, error } = await supabase.from('risks').upsert(payload).select().single()
    if (error) { console.warn('[riskService] upsert:', error.message); return null }
    return mapRow(data)
  } catch { return null }
}

export async function deleteRisk(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    // Soft delete via is_deleted flag
    const { error } = await supabase.from('risks').update({ is_deleted: true }).eq('id', id)
    if (error) { console.warn('[riskService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchRisks = fetchAllRisks
export const saveRisk = upsertRisk
