// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Compliance controls (`controls`) — the org's control library, mapped to
// framework clauses, with test currency and evidence counts.
//
// Replaces the generic `compliancecontrols_table (id, doc jsonb)` demo table the
// page previously read. The real table already held 385 control records that the
// UI was ignoring in favour of a hardcoded seed array.
//
// Org-scoped via RLS; writes throw so the UI can never report a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

// Values are fixed by the controls_status_check constraint on the table.
export const CONTROL_STATUSES = ['implemented', 'partially_implemented', 'not_implemented', 'not_applicable'] as const
export type ControlStatus = (typeof CONTROL_STATUSES)[number]

export const CONTROL_AUTOMATION = ['automated', 'semi_automated', 'manual'] as const
export type ControlAutomation = (typeof CONTROL_AUTOMATION)[number]

export interface ControlRecord {
  id: string
  controlRef: string
  name: string
  description?: string
  frameworkId?: string | null
  clauseRef?: string
  category?: string
  status: ControlStatus
  severity?: string
  /** 0–100 effectiveness. Null means never scored — never render as 0. */
  score: number | null
  ownerId?: string | null
  lastTestedAt?: string | null
  nextTestAt?: string | null
  /** Null means never counted; 0 means counted and genuinely none. */
  evidenceCount: number | null
  automationStatus?: ControlAutomation
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): ControlRecord {
  return {
    id: r.id,
    controlRef: r.control_ref ?? '',
    name: r.name ?? '',
    description: r.description ?? undefined,
    frameworkId: r.framework_id ?? null,
    clauseRef: r.clause_ref ?? undefined,
    category: r.category ?? undefined,
    status: (r.status ?? 'not_implemented') as ControlStatus,
    severity: r.severity ?? undefined,
    score: r.score == null ? null : Number(r.score),
    ownerId: r.owner_id ?? null,
    lastTestedAt: r.last_tested_at ?? null,
    nextTestAt: r.next_test_at ?? null,
    evidenceCount: r.evidence_count == null ? null : Number(r.evidence_count),
    automationStatus: (r.automation_status ?? undefined) as ControlAutomation | undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(c: Partial<ControlRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (c.controlRef !== undefined) row.control_ref = c.controlRef
  if (c.name !== undefined) row.name = c.name
  if (c.description !== undefined) row.description = c.description ?? null
  if (c.frameworkId !== undefined) row.framework_id = c.frameworkId || null
  if (c.clauseRef !== undefined) row.clause_ref = c.clauseRef ?? null
  if (c.category !== undefined) row.category = c.category ?? null
  if (c.status !== undefined) row.status = c.status
  if (c.severity !== undefined) row.severity = c.severity ?? null
  if (c.score !== undefined) row.score = c.score
  if (c.ownerId !== undefined) row.owner_id = c.ownerId || null
  if (c.lastTestedAt !== undefined) row.last_tested_at = c.lastTestedAt || null
  if (c.nextTestAt !== undefined) row.next_test_at = c.nextTestAt || null
  if (c.automationStatus !== undefined) row.automation_status = c.automationStatus ?? null
  return row
}

export async function fetchControls(): Promise<ControlRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('controls').select('*').order('control_ref')
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function createControl(c: Partial<ControlRecord>): Promise<ControlRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('controls').insert(toRow(c)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'compliance', entityType: 'controls', entityId: data.id, action: 'create' })
  return fromRow(data)
}

export async function updateControl(id: string, patch: Partial<ControlRecord>): Promise<ControlRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('controls')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'compliance', entityType: 'controls', entityId: id, action: 'update' })
  return fromRow(data)
}

export async function deleteControl(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('controls').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'compliance', entityType: 'controls', entityId: id, action: 'delete' })
}
