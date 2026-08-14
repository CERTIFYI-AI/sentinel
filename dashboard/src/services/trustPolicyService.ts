// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Runtime Trust policy service — direct Supabase access to the org-scoped
// `trust_policies` table (RLS + org default; the client never sends org_id),
// plus a light aggregate over `live_traces` for the Runtime Trust KPIs.
// Platform contract: writes THROW on failure so the UI can never report a
// false success; reads throw so callers render real error states.
// Rows are keyed by the DB uuid; `policy_ref` (e.g. TP-014) is a DISPLAY
// reference only and is never used as a key.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type TrustPolicyAction = 'block' | 'warn' | 'redact' | 'route_hitl' | 'log'
export type TrustPolicySeverity = 'critical' | 'high' | 'medium' | 'low'

export interface TrustPolicy {
  /** DB uuid — the only key. */
  id: string
  /** Human-facing reference (POL-… seeds, TP-… for UI-created policies). */
  policyRef: string
  name: string
  type: string
  action: TrustPolicyAction
  severity: TrustPolicySeverity
  conditionJson: Record<string, unknown> | null
  threshold: number | null
  isActive: boolean
  /** Canonical ai_models.id uuids. Resolve names at render time. */
  linkedModels: string[]
  frameworkRef: string | null
  triggers7d: number
  blockRate: number
  avgLatencyMs: number | null
  createdAt?: string
  updatedAt?: string
}

interface PolicyRow {
  id: string
  policy_ref: string
  name: string
  type: string
  action: string
  severity: string
  condition_json: Record<string, unknown> | null
  threshold: number | string | null
  is_active: boolean
  linked_models: string[] | null
  framework_ref: string | null
  triggers_7d: number | null
  block_rate: number | string | null
  avg_latency_ms: number | string | null
  created_at?: string
  updated_at?: string
}

function fromRow(r: PolicyRow): TrustPolicy {
  return {
    id: r.id,
    policyRef: r.policy_ref,
    name: r.name,
    type: r.type,
    action: r.action as TrustPolicyAction,
    severity: r.severity as TrustPolicySeverity,
    conditionJson: r.condition_json ?? null,
    threshold: r.threshold === null || r.threshold === undefined ? null : Number(r.threshold),
    isActive: r.is_active,
    linkedModels: r.linked_models ?? [],
    frameworkRef: r.framework_ref ?? null,
    triggers7d: r.triggers_7d ?? 0,
    blockRate: r.block_rate === null || r.block_rate === undefined ? 0 : Number(r.block_rate),
    avgLatencyMs: r.avg_latency_ms === null || r.avg_latency_ms === undefined ? null : Number(r.avg_latency_ms),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(p: Partial<TrustPolicy>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.policyRef !== undefined) row.policy_ref = p.policyRef
  if (p.name !== undefined) row.name = p.name
  if (p.type !== undefined) row.type = p.type
  if (p.action !== undefined) row.action = p.action
  if (p.severity !== undefined) row.severity = p.severity
  if (p.conditionJson !== undefined) row.condition_json = p.conditionJson
  if (p.threshold !== undefined) row.threshold = p.threshold
  if (p.isActive !== undefined) row.is_active = p.isActive
  if (p.linkedModels !== undefined) row.linked_models = p.linkedModels
  if (p.frameworkRef !== undefined) row.framework_ref = p.frameworkRef
  return row
}

/** Next display ref for UI-created policies: TP-### derived from the max existing TP ref. */
export function nextPolicyRef(existing: Array<Pick<TrustPolicy, 'policyRef'>>): string {
  let max = 0
  for (const p of existing) {
    const m = /^TP-(\d+)$/.exec(p.policyRef ?? '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `TP-${String(max + 1).padStart(3, '0')}`
}

export async function fetchTrustPolicies(): Promise<TrustPolicy[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('trust_policies')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.warn('[trustPolicyService] list:', error.message); throw new Error(error.message) }
  return ((data ?? []) as PolicyRow[]).map(fromRow)
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success.
export async function upsertTrustPolicy(rec: Partial<TrustPolicy>): Promise<TrustPolicy> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save policy.')
  const row = toRow(rec)
  const q = rec.id
    ? supabase.from('trust_policies').update({ ...row, updated_at: new Date().toISOString() }).eq('id', rec.id)
    : supabase.from('trust_policies').insert(row)
  const { data, error } = await q.select().single()
  if (error) { console.warn('[trustPolicyService] upsert:', error.message); throw new Error(error.message) }
  const saved = fromRow(data as PolicyRow)
  void logAction({
    module: 'trust-engine', entityType: 'trust_policies', entityId: saved.id,
    entityName: saved.policyRef, action: rec.id ? 'update' : 'create',
  })
  return saved
}

export async function deleteTrustPolicy(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete policy.')
  const { error } = await supabase.from('trust_policies').delete().eq('id', id)
  if (error) {
    console.warn('[trustPolicyService] delete:', error.message)
    // live_traces / guardrail_events reference policies; surface a usable message.
    if (/foreign key|violates/i.test(error.message)) {
      throw new Error('This policy is referenced by recorded traces or guardrail events and cannot be deleted. Deactivate it instead.')
    }
    throw new Error(error.message)
  }
  void logAction({ module: 'trust-engine', entityType: 'trust_policies', entityId: id, action: 'delete' })
}

// ── Trace analytics (light aggregate over live_traces) ──────────────────────
// Queried here (not via sibling trace-page services) so the Runtime Trust
// dashboard has no cross-page dependencies. Only 4 narrow columns over a
// 14-day window are selected.

export interface TraceDayStat {
  /** ISO date (yyyy-mm-dd). */
  date: string
  success: number
  blocked: number
  error: number
  total: number
}

export interface TraceIncident {
  id: string
  traceRef: string | null
  status: 'blocked' | 'error'
  modelId: string | null
  policyId: string | null
  createdAt: string
}

export interface TraceAnalytics {
  /** Oldest → newest, one entry per day for the last 14 days (zero-filled). */
  days: TraceDayStat[]
  total14d: number
  blocked14d: number
  error14d: number
  blocked7d: number
  /** 100 × (1 − (blocked+error)/total) over 14 days; null when there are no traces. */
  trustIndex: number | null
  /** Most recent blocked/error traces, newest first. */
  recentIncidents: TraceIncident[]
}

const EMPTY_ANALYTICS: TraceAnalytics = {
  days: [], total14d: 0, blocked14d: 0, error14d: 0, blocked7d: 0,
  trustIndex: null, recentIncidents: [],
}

export async function fetchTraceAnalytics(modelId?: string): Promise<TraceAnalytics> {
  if (!isSupabaseConfigured() || !supabase) return EMPTY_ANALYTICS
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  let q = supabase
    .from('live_traces')
    .select('id, trace_ref, status, model_id, policy_id, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
  if (modelId) q = q.eq('model_id', modelId)
  const { data, error } = await q
  if (error) { console.warn('[trustPolicyService] traces:', error.message); throw new Error(error.message) }

  const rows = (data ?? []) as Array<{
    id: string; trace_ref: string | null; status: string
    model_id: string | null; policy_id: string | null; created_at: string
  }>

  // Zero-filled day buckets, oldest → newest.
  const byDay = new Map<string, TraceDayStat>()
  for (let d = 13; d >= 0; d--) {
    const date = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    byDay.set(date, { date, success: 0, blocked: 0, error: 0, total: 0 })
  }

  let blocked14d = 0
  let error14d = 0
  let blocked7d = 0
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  for (const r of rows) {
    const day = byDay.get(r.created_at.slice(0, 10))
    if (day) {
      day.total += 1
      if (r.status === 'blocked') day.blocked += 1
      else if (r.status === 'error') day.error += 1
      else day.success += 1
    }
    if (r.status === 'blocked') {
      blocked14d += 1
      if (new Date(r.created_at).getTime() >= sevenDaysAgo) blocked7d += 1
    } else if (r.status === 'error') {
      error14d += 1
    }
  }

  const total14d = rows.length
  const trustIndex = total14d === 0
    ? null
    : Math.round((100 * (1 - (blocked14d + error14d) / total14d)) * 10) / 10

  const recentIncidents: TraceIncident[] = rows
    .filter(r => r.status === 'blocked' || r.status === 'error')
    .slice(0, 8)
    .map(r => ({
      id: r.id,
      traceRef: r.trace_ref,
      status: r.status as 'blocked' | 'error',
      modelId: r.model_id,
      policyId: r.policy_id,
      createdAt: r.created_at,
    }))

  return { days: [...byDay.values()], total14d, blocked14d, error14d, blocked7d, trustIndex, recentIncidents }
}
