// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// killSwitchService — org-scoped CRUD for public.kill_switch_events.
// Platform contract (see CLAUDE.md): the client never sends org_id (DB default
// fills it under RLS), writes THROW on failure so the UI can never report a
// false success, and reads throw so callers render real error states.
// agent_id references the canonical agent_gov_registry id.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface KillSwitchEvent {
  id: string
  agentId: string | null
  agentName: string | null
  triggeredBy: string | null
  triggerType: string | null
  reason: string | null
  severity: string | null
  status: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  resolutionNotes: string | null
  affectedSystems: string[]
  metadata: Record<string, unknown>
  triggeredAt: string | null
  createdAt: string
  updatedAt: string
}

/** Fields a caller may set when inserting or updating an event. */
export type KillSwitchEventInput = Partial<Omit<KillSwitchEvent, 'id' | 'createdAt' | 'updatedAt'>>

interface KillSwitchEventRow {
  id: string
  agent_id: string | null
  agent_name: string | null
  triggered_by: string | null
  trigger_type: string | null
  reason: string | null
  severity: string | null
  status: string | null
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  affected_systems: unknown
  metadata: unknown
  triggered_at: string | null
  created_at: string
  updated_at: string
}

function fromRow(r: KillSwitchEventRow): KillSwitchEvent {
  return {
    id: r.id,
    agentId: r.agent_id,
    agentName: r.agent_name,
    triggeredBy: r.triggered_by,
    triggerType: r.trigger_type,
    reason: r.reason,
    severity: r.severity,
    status: r.status,
    resolvedBy: r.resolved_by,
    resolvedAt: r.resolved_at,
    resolutionNotes: r.resolution_notes,
    affectedSystems: Array.isArray(r.affected_systems) ? (r.affected_systems as string[]) : [],
    metadata: (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>,
    triggeredAt: r.triggered_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** camelCase → snake_case, only for fields the caller actually set. */
function toRow(input: KillSwitchEventInput): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (input.agentId !== undefined) row.agent_id = input.agentId
  if (input.agentName !== undefined) row.agent_name = input.agentName
  if (input.triggeredBy !== undefined) row.triggered_by = input.triggeredBy
  if (input.triggerType !== undefined) row.trigger_type = input.triggerType
  if (input.reason !== undefined) row.reason = input.reason
  if (input.severity !== undefined) row.severity = input.severity
  if (input.status !== undefined) row.status = input.status
  if (input.resolvedBy !== undefined) row.resolved_by = input.resolvedBy
  if (input.resolvedAt !== undefined) row.resolved_at = input.resolvedAt
  if (input.resolutionNotes !== undefined) row.resolution_notes = input.resolutionNotes
  if (input.affectedSystems !== undefined) row.affected_systems = input.affectedSystems
  if (input.metadata !== undefined) row.metadata = input.metadata
  if (input.triggeredAt !== undefined) row.triggered_at = input.triggeredAt
  return row
}

export async function fetchKillSwitchEvents(): Promise<KillSwitchEvent[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('kill_switch_events')
    .select('*')
    .order('triggered_at', { ascending: false, nullsFirst: false })
  if (error) { console.warn('[killSwitchService] fetch:', error.message); throw new Error(error.message) }
  return ((data ?? []) as KillSwitchEventRow[]).map(fromRow)
}

// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error toast instead of a false success. org_id is filled by the DB default.
export async function insertKillSwitchEvent(input: KillSwitchEventInput): Promise<KillSwitchEvent> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record kill switch event.')
  const { data, error } = await supabase
    .from('kill_switch_events')
    .insert(toRow(input))
    .select()
    .single()
  if (error) { console.warn('[killSwitchService] insert:', error.message); throw new Error(error.message) }
  return fromRow(data as KillSwitchEventRow)
}

export async function updateKillSwitchEvent(id: string, patch: KillSwitchEventInput): Promise<KillSwitchEvent> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update kill switch event.')
  const { data, error } = await supabase
    .from('kill_switch_events')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.warn('[killSwitchService] update:', error.message); throw new Error(error.message) }
  return fromRow(data as KillSwitchEventRow)
}
