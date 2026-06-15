// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type ModelEfficiencyRecord = {
  id: string
  org_id?: string
  model_name: string
  version?: string
  task?: string
  latency_p50?: number
  latency_p99?: number
  throughput?: number
  accuracy?: number
  f1_score?: number
  cost_per_inference?: number
  memory_mb?: number
  carbon_per_inference?: number
  compliance_score?: number
  bias_score?: number
  explainability_score?: number
  overall_score?: number
  benchmarked_by?: string
  metadata?: Record<string,any>
  benchmarked_at?: string
  created_at: string
  updated_at: string
}

const MOCK_MODEL_EFFICIENCY: ModelEfficiencyRecord[] = [
  {
    id: 'BMK-001',
    model_name: 'GPT-4o',
    version: '2024-05-13',
    task: 'Summarization',
    latency_p50: 120,
    latency_p99: 250,
    throughput: 85,
    accuracy: 0.92,
    f1_score: 0.91,
    cost_per_inference: 0.005,
    memory_mb: 4096,
    carbon_per_inference: 0.012,
    compliance_score: 95,
    bias_score: 88,
    explainability_score: 75,
    overall_score: 88,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'BMK-002',
    model_name: 'Claude 3.5 Sonnet',
    version: 'v1.0',
    task: 'Code Generation',
    latency_p50: 180,
    latency_p99: 380,
    throughput: 62,
    accuracy: 0.94,
    f1_score: 0.93,
    cost_per_inference: 0.015,
    memory_mb: 8192,
    carbon_per_inference: 0.024,
    compliance_score: 92,
    bias_score: 91,
    explainability_score: 80,
    overall_score: 91,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: 'BMK-003',
    model_name: 'Llama 3 70B Instruct',
    version: 'v1.1',
    task: 'Agentic Reasoning',
    latency_p50: 240,
    latency_p99: 510,
    throughput: 45,
    accuracy: 0.89,
    f1_score: 0.88,
    cost_per_inference: 0.002,
    memory_mb: 16384,
    carbon_per_inference: 0.035,
    compliance_score: 88,
    bias_score: 82,
    explainability_score: 85,
    overall_score: 86,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 'BMK-004',
    model_name: 'Mistral Large 2',
    version: 'v2.0',
    task: 'Translation',
    latency_p50: 150,
    latency_p99: 310,
    throughput: 72,
    accuracy: 0.90,
    f1_score: 0.89,
    cost_per_inference: 0.008,
    memory_mb: 12288,
    carbon_per_inference: 0.018,
    compliance_score: 90,
    bias_score: 85,
    explainability_score: 70,
    overall_score: 84,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 86400000).toISOString()
  }
]

export async function fetchAllModelEfficiency(filters: Record<string,any> = {}): Promise<ModelEfficiencyRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return MOCK_MODEL_EFFICIENCY
  try {
    let q = supabase.from('model_efficiency').select('*').order('created_at', { ascending: false })
    const { data, error } = await q
    if (error) { console.warn('[modelEfficiencyService] fetch:', error.message); return MOCK_MODEL_EFFICIENCY }
    return (data && data.length > 0 ? data : MOCK_MODEL_EFFICIENCY) as ModelEfficiencyRecord[]
  } catch { return MOCK_MODEL_EFFICIENCY }
}

export async function upsertModelEfficiency(record: Partial<ModelEfficiencyRecord>): Promise<ModelEfficiencyRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('model_efficiency').upsert(record).select().single()
    if (error) { console.warn('[modelEfficiencyService] upsert:', error.message); return null }
    return data as ModelEfficiencyRecord
  } catch { return null }
}

export async function deleteModelEfficiency(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('model_efficiency').delete().eq('id', id)
    if (error) { console.warn('[modelEfficiencyService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchModelEfficiency = fetchAllModelEfficiency
