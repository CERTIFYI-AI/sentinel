// SPDX-License-Identifier: Apache-2.0
// Model analytics service — feeds the Model Detail Performance / Bias History /
// Explainability / Data Lineage tabs from real Supabase tables instead of seed
// data. Everything is keyed by the registry model id (ai_models.id as text) so
// the proxy's per-inference telemetry, bias-audit jobs and explainability jobs
// all line up with the model you're viewing.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface PerfPoint {
  recordedAt: string
  latencyP50: number
  latencyP99: number
  throughput: number
  accuracy: number
  errorRate: number
  driftScore: number
  requestCount: number
  costPerInference: number
}
export interface BiasAuditView {
  id: string
  date: string
  result: 'passed' | 'failed' | 'in_progress'
  overallScore: number            // 0..1
  dataset: string
  framework: string
  auditor: string
  technique?: string
  protectedAttributes: { name: string }[]
  dimensions: { attribute: string; score: number; threshold: number; pass: boolean }[]
  recommendations: string[]
}
export interface ExplanationView {
  method: string
  modelVersion?: string
  sampleSize?: number
  computedAt: string
  shap: { feature: string; importance: number }[]
  lime: { feature: string; impact: number }[]
}
export interface LineageView {
  modelName: string
  baseModel?: string
  trainingDataset?: string
  trainingMethod?: string
  fineTuningMethod?: string
  parametersCount?: number
  contextWindow?: number
  featureCount?: number
  provenance: { stage: string; dataset: string; hash: string; date: string; by: string }[]
}

const num = (v: unknown) => (v == null ? 0 : Number(v))

export async function fetchPerformanceMetrics(modelId: string, modelName?: string): Promise<PerfPoint[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  // Match the registry id (preferred) or the model name, so telemetry emitted
  // by the proxy (name-keyed) and by the ingestion endpoint (id-keyed) both show.
  let q = supabase.from('model_performance_metrics').select('*')
  q = modelName ? q.or(`model_id.eq.${modelId},model_name.eq.${modelName}`) : q.eq('model_id', modelId)
  const { data, error } = await q.order('recorded_at', { ascending: true })
  if (error) { console.warn('[modelAnalytics] perf:', error.message); throw new Error(error.message) }
  return (data ?? []).map(r => ({
    recordedAt: r.recorded_at,
    latencyP50: num(r.latency_p50), latencyP99: num(r.latency_p99),
    throughput: num(r.throughput), accuracy: num(r.accuracy),
    errorRate: num(r.error_rate), driftScore: num(r.drift_score),
    requestCount: num(r.request_count),
    costPerInference: num(r.cost_per_inference),
  }))
}

/** Per-model telemetry series for the fleet-wide Performance Monitoring page. */
export interface ModelPerfSeries {
  /** ai_models.id (uuid, stored as text in model_performance_metrics). */
  modelId: string
  /** Name snapshot recorded with the telemetry row (display fallback only). */
  modelName: string | null
  points: PerfPoint[]
}

/** All performance telemetry for the org, grouped by model_id (recorded_at ascending). */
export async function fetchAllPerformanceMetrics(): Promise<ModelPerfSeries[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('model_performance_metrics')
    .select('*')
    .order('recorded_at', { ascending: true })
  if (error) { console.warn('[modelAnalytics] perf-all:', error.message); throw new Error(error.message) }
  const byModel = new Map<string, ModelPerfSeries>()
  for (const r of data ?? []) {
    const key = String(r.model_id ?? r.model_name ?? 'unknown')
    let series = byModel.get(key)
    if (!series) {
      series = { modelId: key, modelName: r.model_name ?? null, points: [] }
      byModel.set(key, series)
    }
    if (!series.modelName && r.model_name) series.modelName = r.model_name
    series.points.push({
      recordedAt: r.recorded_at,
      latencyP50: num(r.latency_p50), latencyP99: num(r.latency_p99),
      throughput: num(r.throughput), accuracy: num(r.accuracy),
      errorRate: num(r.error_rate), driftScore: num(r.drift_score),
      requestCount: num(r.request_count),
      costPerInference: num(r.cost_per_inference),
    })
  }
  return [...byModel.values()]
}

export async function fetchBiasAudits(modelId: string): Promise<BiasAuditView[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('bias_audits').select('*')
    .eq('model_id', modelId).eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[modelAnalytics] bias:', error.message); throw new Error(error.message) }
  return (data ?? []).map(r => {
    const res = (r.results ?? {}) as Record<string, any>
    const score = num(r.overall_score)
    const threshold = num(r.threshold)
    const result: BiasAuditView['result'] =
      (r.status ?? '').toLowerCase() !== 'completed' ? 'in_progress'
        : score >= threshold ? 'passed' : 'failed'
    return {
      id: r.id, date: r.created_at, result, overallScore: score,
      dataset: r.dataset_id ?? '—', framework: r.framework ?? '—',
      auditor: res.auditor ?? '—', technique: res.technique,
      protectedAttributes: Array.isArray(res.protectedAttributes) ? res.protectedAttributes : [],
      dimensions: Array.isArray(res.dimensions) ? res.dimensions : [],
      recommendations: Array.isArray(res.recommendations) ? res.recommendations : [],
    }
  })
}

export async function fetchExplanation(modelId: string): Promise<ExplanationView | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('model_explanations').select('*')
    .eq('model_id', modelId).order('computed_at', { ascending: false }).limit(1).maybeSingle()
  if (error) { console.warn('[modelAnalytics] explain:', error.message); throw new Error(error.message) }
  if (!data) return null
  return {
    method: data.method, modelVersion: data.model_version ?? undefined,
    sampleSize: data.sample_size ?? undefined, computedAt: data.computed_at,
    shap: Array.isArray(data.shap) ? data.shap : [],
    lime: Array.isArray(data.lime) ? data.lime : [],
  }
}

// Lineage comes from the Model DNA record. Match by the registry uuid first,
// then fall back to a name match (DNA records predate the uuid linkage).
export async function fetchLineage(modelId: string, modelName: string): Promise<LineageView | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('model_dna').select('*')
    .or(`model_id.eq.${modelId},model_name.eq.${modelName}`)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) { console.warn('[modelAnalytics] lineage:', error.message); throw new Error(error.message) }
  if (!data) return null
  const meta = (data.metadata ?? {}) as Record<string, any>
  return {
    modelName: data.model_name ?? modelName,
    baseModel: data.base_model ?? undefined,
    trainingDataset: data.training_dataset ?? undefined,
    trainingMethod: data.training_method ?? undefined,
    fineTuningMethod: data.fine_tuning_method ?? undefined,
    parametersCount: data.parameters_count ?? undefined,
    contextWindow: data.context_window ?? undefined,
    featureCount: meta.featureCount ?? undefined,
    provenance: Array.isArray(data.lineage) ? data.lineage : [],
  }
}
