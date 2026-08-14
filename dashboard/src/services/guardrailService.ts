// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// guardrailService — real reads/writes for the runtime guardrail surface:
//   guardrail_events (org RLS via org_id = current_user_org_id())
//   guardrail_rules  (tenant RLS via tenant_id = current_user_org_id()::text,
//                     DB default fills tenant_id — never sent from the client)
//   incidents        (escalation target; tenant RLS, DB-filled tenant_id)
// Ids are canonical (uuids / text keys); display names resolve via FK joins at
// read time. Writes throw on failure so callers surface real error toasts.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// ── Events ──────────────────────────────────────────────────────────────────

export interface GuardrailEvent {
  id: string
  policyId: string | null
  policyRef: string | null
  policyName: string | null
  policyType: string | null
  /** Real trust_policies.condition_json for the evaluated policy */
  policyCondition: Record<string, any> | null
  agentId: string | null
  agentName: string | null
  modelId: string | null
  modelName: string | null
  /** 'block' | 'warn' | 'redact' | 'route_hitl' | 'log' (verified live values) */
  action: string | null
  severity: string | null
  latencyMs: number | null
  /** 'open' | 'acknowledged' | 'resolved' (verified live values) */
  status: string | null
  ackBy: string | null
  ackByName: string | null
  ackAt: string | null
  ackReason: string | null
  createdAt: string
}

export interface GuardrailEventFilters {
  modelId?: string
  policyId?: string
  limit?: number
}

const EVENT_SELECT = `
  id, policy_id, agent_id, model_id, action, severity, latency_ms, status,
  ack_by, ack_at, ack_reason, created_at,
  model:ai_models ( id, name ),
  policy:trust_policies ( id, policy_ref, name, type, condition_json ),
  agent:agents ( id, name ),
  acker:user_profiles!guardrail_events_ack_by_fkey ( id, full_name, email )
`

function mapEvent(r: Record<string, any>): GuardrailEvent {
  return {
    id: r.id,
    policyId: r.policy_id ?? null,
    policyRef: r.policy?.policy_ref ?? null,
    policyName: r.policy?.name ?? null,
    policyType: r.policy?.type ?? null,
    policyCondition: r.policy?.condition_json ?? null,
    agentId: r.agent_id ?? null,
    agentName: r.agent?.name ?? null,
    modelId: r.model_id ?? null,
    modelName: r.model?.name ?? null,
    action: r.action ?? null,
    severity: r.severity ?? null,
    latencyMs: r.latency_ms ?? null,
    status: r.status ?? null,
    ackBy: r.ack_by ?? null,
    ackByName: r.acker?.full_name ?? r.acker?.email ?? null,
    ackAt: r.ack_at ?? null,
    ackReason: r.ack_reason ?? null,
    createdAt: r.created_at,
  }
}

export async function fetchGuardrailEvents(filters: GuardrailEventFilters = {}): Promise<GuardrailEvent[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase
    .from('guardrail_events')
    .select(EVENT_SELECT)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200)
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  if (filters.policyId) q = q.eq('policy_id', filters.policyId)
  const { data, error } = await q
  if (error) { console.warn('[guardrailService] events:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapEvent)
}

/**
 * Acknowledge an event: persists ack_by (user_profiles uuid of the signed-in
 * user), ack_at and ack_reason, and moves status to 'acknowledged'.
 */
export async function acknowledgeGuardrailEvent(
  id: string,
  ack: { userId: string; reason: string },
): Promise<GuardrailEvent> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot acknowledge event.')
  const { data, error } = await supabase
    .from('guardrail_events')
    .update({
      status: 'acknowledged',
      ack_by: ack.userId,
      ack_at: new Date().toISOString(),
      ack_reason: ack.reason || null,
    })
    .eq('id', id)
    .select(EVENT_SELECT)
    .single()
  if (error) { console.warn('[guardrailService] ack:', error.message); throw new Error(error.message) }
  return mapEvent(data)
}

// ── Rules (Visual Rule Builder) ─────────────────────────────────────────────

export interface GuardrailRule {
  id: string
  name: string
  ruleType: string | null
  condition: Record<string, any>
  action: string | null
  enabled: boolean
  priority: number
  createdAt?: string
  updatedAt?: string
}

function mapRule(r: Record<string, any>): GuardrailRule {
  return {
    id: r.id,
    name: r.name,
    ruleType: r.rule_type ?? null,
    condition: r.condition ?? {},
    action: r.action ?? null,
    enabled: r.enabled ?? false,
    priority: r.priority ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function fetchGuardrailRules(): Promise<GuardrailRule[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('guardrail_rules')
    .select('*')
    .order('priority', { ascending: false })
    .order('name', { ascending: true })
  if (error) { console.warn('[guardrailService] rules:', error.message); throw new Error(error.message) }
  return (data ?? []).map(mapRule)
}

export async function createGuardrailRule(input: {
  name: string
  ruleType: string
  condition: Record<string, any>
  action: string
  priority: number
}): Promise<GuardrailRule> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create rule.')
  // Text id-space for guardrail_rules; tenant_id is filled by the DB default
  // (current_user_org_id()::text) — never sent from the client.
  const id = `GR-${crypto.randomUUID().slice(0, 8)}`
  const { data, error } = await supabase
    .from('guardrail_rules')
    .insert({
      id,
      name: input.name,
      rule_type: input.ruleType,
      condition: input.condition,
      action: input.action,
      priority: input.priority,
      enabled: true,
    })
    .select()
    .single()
  if (error) { console.warn('[guardrailService] create rule:', error.message); throw new Error(error.message) }
  return mapRule(data)
}

export async function updateGuardrailRule(
  id: string,
  patch: Partial<Pick<GuardrailRule, 'name' | 'ruleType' | 'condition' | 'action' | 'priority' | 'enabled'>>,
): Promise<GuardrailRule> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update rule.')
  const row: Record<string, any> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name
  if (patch.ruleType !== undefined) row.rule_type = patch.ruleType
  if (patch.condition !== undefined) row.condition = patch.condition
  if (patch.action !== undefined) row.action = patch.action
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.enabled !== undefined) row.enabled = patch.enabled
  const { data, error } = await supabase
    .from('guardrail_rules')
    .update(row)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.warn('[guardrailService] update rule:', error.message); throw new Error(error.message) }
  return mapRule(data)
}

export async function deleteGuardrailRule(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete rule.')
  const { error } = await supabase.from('guardrail_rules').delete().eq('id', id)
  if (error) { console.warn('[guardrailService] delete rule:', error.message); throw new Error(error.message) }
}

// ── Escalation → Incident Response module (real `incidents` table) ──────────

export interface EscalationInput {
  eventId: string
  severity: string | null
  action: string | null
  policyLabel: string | null
  modelName: string | null
  occurredAt: string
  reporter: string
}

/**
 * Creates a real incident from a guardrail event. The incidents table has no
 * metadata jsonb column, so the guardrail event linkage is carried as a
 * machine-readable marker in the description: [guardrail_event:<uuid>].
 * Returns the persisted incident id.
 */
export async function createIncidentFromEvent(input: EscalationInput): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create incident.')
  const id = `INC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const description =
    `Escalated from Trust Engine guardrail event. Policy "${input.policyLabel ?? 'Unavailable'}" ` +
    `took action "${input.action ?? 'unknown'}" (severity: ${input.severity ?? 'unknown'})` +
    `${input.modelName ? ` on model ${input.modelName}` : ''}. ` +
    `[guardrail_event:${input.eventId}]`
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      id,
      incident_type: 'guardrail_escalation',
      severity: input.severity ?? 'medium',
      status: 'open',
      occurred_date: input.occurredAt,
      detected_date: new Date().toISOString(),
      reporter: input.reporter,
      ai_use_case_or_framework: 'Trust Engine — Runtime Guardrails',
      model_system_version: input.modelName,
      description,
    })
    .select('id')
    .single()
  if (error) { console.warn('[guardrailService] escalate:', error.message); throw new Error(error.message) }
  return data.id as string
}
