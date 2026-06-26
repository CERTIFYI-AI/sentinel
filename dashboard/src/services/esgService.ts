import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type EsgReport = {
  id: string
  org_id?: string
  title: string
  period: string
  framework?: string
  status?: string
  author?: string
  environmental_score?: number
  social_score?: number
  governance_score?: number
  overall_score?: number
  highlights?: string[]
  ai_metrics?: Record<string,any>
  metadata?: Record<string,any>
  published_at?: string
  created_at: string
  updated_at: string
}

const SEED_ESG_REPORTS: EsgReport[] = [
  {
    id: 'esg-1',
    title: 'Q2 2026 Model ESG Disclosures',
    period: 'Q2 2026',
    framework: 'GRI / SASB / EU CSRD',
    status: 'Published',
    author: 'Sarah Chen',
    environmental_score: 88,
    social_score: 92,
    governance_score: 95,
    overall_score: 91,
    highlights: ['Reduced average LLM inference power usage by 18%', 'Enforced k-anonymity compliance on PII models', 'Completed audit on training supply chain governance'],
    ai_metrics: [],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'esg-2',
    title: 'Q1 2026 Model ESG Disclosures',
    period: 'Q1 2026',
    framework: 'GRI / SASB / EU CSRD',
    status: 'Published',
    author: 'James Patel',
    environmental_score: 82,
    social_score: 90,
    governance_score: 92,
    overall_score: 87,
    highlights: ['Optimized training run cluster placement for 100% green energy sourcing', 'Updated human-in-the-loop guidelines for content filter model audits'],
    ai_metrics: [],
    created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 120 * 86400000).toISOString(),
  },
  {
    id: 'esg-3',
    title: 'Q3 2026 Model ESG Disclosures Draft',
    period: 'Q3 2026',
    framework: 'GRI / SASB / EU CSRD',
    status: 'Draft',
    author: 'Sarah Chen',
    environmental_score: 90,
    social_score: 93,
    governance_score: 96,
    overall_score: 93,
    highlights: ['Projected 22% reduction in compute footprint through quantization'],
    ai_metrics: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
]

export async function fetchAllEsgReports(filters: Record<string,any> = {}): Promise<EsgReport[]> {
  if (!isSupabaseConfigured() || !supabase) return SEED_ESG_REPORTS
  try {
    let q = supabase.from('esg_reports').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) { console.warn('[esgService] fetch:', error.message); return SEED_ESG_REPORTS }
    return (data && data.length > 0 ? data : SEED_ESG_REPORTS) as EsgReport[]
  } catch { return SEED_ESG_REPORTS }
}

export async function upsertEsgReport(record: Partial<EsgReport>): Promise<EsgReport | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('esg_reports').upsert(record).select().single()
    if (error) { console.warn('[esgService] upsert:', error.message); return null }
    return data as EsgReport
  } catch { return null }
}

export async function deleteEsgReport(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('esg_reports').delete().eq('id', id)
    if (error) { console.warn('[esgService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchEsgReports = fetchAllEsgReports
