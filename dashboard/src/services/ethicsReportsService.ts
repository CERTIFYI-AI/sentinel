import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

const SEED_ETHICS_REPORTS = [
  { id: 'ER-001', date: '2026-03-15', category: 'AI Bias/Discrimination', severity: 'High', source: 'Anonymous', status: 'Under Investigation', assigned_investigator: 'David Kim', priority: 'High', description: 'Credit scoring model consistently outputs lower credit limits for applicants from certain zip codes, correlation with race suspected.', system: 'Auto-Credit Approver', created_at: new Date(Date.now() - 30 * 86400000).toISOString(), updated_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: 'ER-002', date: '2026-03-20', category: 'Privacy Violation', severity: 'Critical', source: 'Anonymous', status: 'Open', assigned_investigator: 'Emma Wilson', priority: 'High', description: 'PII leakage in chatbot system. Model logs and caches show conversational prompts from other users containing social security numbers.', system: 'Customer Support Bot', created_at: new Date(Date.now() - 25 * 86400000).toISOString(), updated_at: new Date(Date.now() - 25 * 86400000).toISOString() },
  { id: 'ER-003', date: '2026-03-10', category: 'Regulatory Non-Compliance', severity: 'High', source: 'Anonymous', status: 'Resolved', assigned_investigator: 'Sarah Chen', priority: 'High', description: 'Inference logs are not being cryptographically hashed. This breaches internal audit policy control ACC-04.', system: 'Llama-3 Inference Pipeline', created_at: new Date(Date.now() - 40 * 86400000).toISOString(), updated_at: new Date(Date.now() - 40 * 86400000).toISOString() }
]

export async function fetchAllEthicsReports(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return SEED_ETHICS_REPORTS
  try {
    let q = supabase.from('ethics_reports').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[ethicsReportsService] fetch:', error.message); return SEED_ETHICS_REPORTS }
    return data && data.length > 0 ? data : SEED_ETHICS_REPORTS
  } catch { return SEED_ETHICS_REPORTS }
}

export async function fetchEthicsReportsById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('ethics_reports').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertEthicsReports(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('ethics_reports').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[ethicsReportsService] upsert:', e); return record }
}

export async function deleteEthicsReports(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('ethics_reports').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
