// SPDX-License-Identifier: Apache-2.0
// toolCallService — real reads for the org-scoped `tool_call_logs` table
// (agent tool invocations). Trace refs are resolved from `live_traces` so the
// UI shows a human-readable ref instead of a raw uuid.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type ToolCallRecord = {
  id: string
  agentId: string | null
  agentName: string | null
  toolName: string
  invocationId: string | null
  arguments: unknown // jsonb — pretty-printed in the detail sheet
  result: unknown // jsonb
  status: string // success | error | blocked
  latencyMs: number | null
  errorMessage: string | null
  modelId: string | null // uuid → ai_models.id
  traceId: string | null // uuid → live_traces.id
  traceRef: string | null // resolved display ref
  invokedAt: string
}

function mapRow(r: Record<string, unknown>): ToolCallRecord {
  return {
    id: String(r.id),
    agentId: (r.agent_id as string) ?? null,
    agentName: (r.agent_name as string) ?? null,
    toolName: String(r.tool_name ?? ''),
    invocationId: (r.invocation_id as string) ?? null,
    arguments: r.arguments ?? null,
    result: r.result ?? null,
    status: String(r.status ?? 'success'),
    latencyMs: r.latency_ms == null ? null : Number(r.latency_ms),
    errorMessage: (r.error_message as string) ?? null,
    modelId: (r.model_id as string) ?? null,
    traceId: (r.trace_id as string) ?? null,
    traceRef: null, // enriched below
    invokedAt: String(r.invoked_at ?? r.created_at),
  }
}

export async function fetchToolCalls(): Promise<ToolCallRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('tool_call_logs')
    .select('*')
    .order('invoked_at', { ascending: false })
  if (error) { console.warn('[toolCallService] fetch:', error.message); throw new Error(error.message) }
  const rows = (data ?? []).map(mapRow)

  // Resolve linked trace refs (enrichment — a failure degrades to "—").
  const traceIds = [...new Set(rows.map(r => r.traceId).filter((t): t is string => !!t))]
  if (traceIds.length > 0) {
    const { data: traces, error: tErr } = await supabase
      .from('live_traces')
      .select('id, trace_ref')
      .in('id', traceIds)
    if (tErr) {
      console.warn('[toolCallService] trace ref resolution failed:', tErr.message)
    } else {
      const refById = new Map((traces ?? []).map(t => [String(t.id), (t.trace_ref as string) ?? null]))
      for (const row of rows) {
        if (row.traceId && refById.has(row.traceId)) row.traceRef = refById.get(row.traceId) ?? null
      }
    }
  }
  return rows
}
