// SPDX-License-Identifier: Apache-2.0
// fallbackService — real reads for the org-scoped `fallback_logs` table
// (model failover events). Trace refs are resolved from `live_traces` so the
// UI can show a human-readable ref (TRC-…) instead of a raw uuid.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type FallbackLogRecord = {
  id: string
  primaryModel: string | null // name snapshot; resolve registry name at render time
  fallbackModel: string | null
  primaryModelId: string | null // uuid → ai_models.id
  fallbackModelId: string | null
  triggerReason: string // timeout | rate_limit | error | quality
  requestId: string | null
  latencyMs: number | null
  succeeded: boolean
  errorMessage: string | null
  occurredAt: string
  traceId: string | null // uuid → live_traces.id
  traceRef: string | null // resolved display ref (e.g. TRC-2026-0001)
}

function mapRow(r: Record<string, unknown>): FallbackLogRecord {
  return {
    id: String(r.id),
    primaryModel: (r.primary_model as string) ?? null,
    fallbackModel: (r.fallback_model as string) ?? null,
    primaryModelId: (r.primary_model_id as string) ?? null,
    fallbackModelId: (r.fallback_model_id as string) ?? null,
    triggerReason: String(r.trigger_reason ?? 'error'),
    requestId: (r.request_id as string) ?? null,
    latencyMs: r.latency_ms == null ? null : Number(r.latency_ms),
    succeeded: Boolean(r.succeeded),
    errorMessage: (r.error_message as string) ?? null,
    occurredAt: String(r.occurred_at),
    traceId: (r.trace_id as string) ?? null,
    traceRef: null, // enriched below
  }
}

export async function fetchFallbackLogs(): Promise<FallbackLogRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('fallback_logs')
    .select('*')
    .order('occurred_at', { ascending: false })
  if (error) { console.warn('[fallbackService] fetch:', error.message); throw new Error(error.message) }
  const rows = (data ?? []).map(mapRow)

  // Resolve linked trace refs (enrichment — a failure here degrades to "—",
  // it does not take down the page).
  const traceIds = [...new Set(rows.map(r => r.traceId).filter((t): t is string => !!t))]
  if (traceIds.length > 0) {
    const { data: traces, error: tErr } = await supabase
      .from('live_traces')
      .select('id, trace_ref')
      .in('id', traceIds)
    if (tErr) {
      console.warn('[fallbackService] trace ref resolution failed:', tErr.message)
    } else {
      const refById = new Map((traces ?? []).map(t => [String(t.id), (t.trace_ref as string) ?? null]))
      for (const row of rows) {
        if (row.traceId && refById.has(row.traceId)) row.traceRef = refById.get(row.traceId) ?? null
      }
    }
  }
  return rows
}
