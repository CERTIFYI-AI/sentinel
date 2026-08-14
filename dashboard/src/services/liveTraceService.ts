// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// liveTraceService — real reads over the org-scoped `live_traces` runtime
// table (RLS: org_id = current_user_org_id(), DB-filled default). Rows key
// models/policies/agents by uuid; display names are resolved at read time via
// FK joins — never stored, never shown as raw uuids. Follows modelService
// conventions: fetch errors throw so the UI can render a real error state.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface LiveTrace {
  id: string
  traceRef: string | null
  agentId: string | null
  agentName: string | null
  modelId: string | null
  modelName: string | null
  action: string | null
  /** 'success' | 'blocked' | 'error' (verified live values) */
  status: string | null
  tokensIn: number
  tokensOut: number
  latencyMs: number | null
  costUsd: number | null
  policyId: string | null
  policyRef: string | null
  policyName: string | null
  createdAt: string
}

export interface LiveTraceFilters {
  status?: string
  modelId?: string
  /** ISO timestamp lower bound (created_at >= since) */
  since?: string
  limit?: number
}

const TRACE_SELECT = `
  id, trace_ref, agent_id, model_id, action, status, tokens_in, tokens_out,
  latency_ms, cost_usd, policy_id, created_at,
  model:ai_models ( id, name ),
  policy:trust_policies ( id, policy_ref, name ),
  agent:agents ( id, name )
`

function mapTrace(r: Record<string, any>): LiveTrace {
  return {
    id: r.id,
    traceRef: r.trace_ref ?? null,
    agentId: r.agent_id ?? null,
    agentName: r.agent?.name ?? null,
    modelId: r.model_id ?? null,
    modelName: r.model?.name ?? null,
    action: r.action ?? null,
    status: r.status ?? null,
    tokensIn: r.tokens_in ?? 0,
    tokensOut: r.tokens_out ?? 0,
    latencyMs: r.latency_ms ?? null,
    costUsd: r.cost_usd != null ? Number(r.cost_usd) : null,
    policyId: r.policy_id ?? null,
    policyRef: r.policy?.policy_ref ?? null,
    policyName: r.policy?.name ?? null,
    createdAt: r.created_at,
  }
}

/** Recent traces, newest first. Status/model/date filters run server-side. */
export async function fetchLiveTraces(filters: LiveTraceFilters = {}): Promise<LiveTrace[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase
    .from('live_traces')
    .select(TRACE_SELECT)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  if (filters.since) q = q.gte('created_at', filters.since)
  const { data, error } = await q
  if (error) { console.warn('[liveTraceService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapTrace)
}

// ── 24h KPI aggregates (computed from real rows, independent of list filters)
export interface TraceStats24h {
  total: number
  blocked: number
  /** null when there are no traces in the window (never NaN) */
  errorRatePct: number | null
  /** null when no trace carries a latency measurement */
  avgLatencyMs: number | null
}

export async function fetchTraceStats24h(): Promise<TraceStats24h> {
  if (!isSupabaseConfigured() || !supabase) {
    return { total: 0, blocked: 0, errorRatePct: null, avgLatencyMs: null }
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('live_traces')
    .select('status, latency_ms')
    .gte('created_at', since)
  if (error) { console.warn('[liveTraceService] stats:', error.message); throw new Error(error.message) }
  const rows = data ?? []
  const total = rows.length
  const blocked = rows.filter(r => r.status === 'blocked').length
  const errors = rows.filter(r => r.status === 'error').length
  const latencies = rows
    .map(r => r.latency_ms)
    .filter((v): v is number => typeof v === 'number')
  return {
    total,
    blocked,
    errorRatePct: total > 0 ? (errors / total) * 100 : null,
    avgLatencyMs: latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null,
  }
}
