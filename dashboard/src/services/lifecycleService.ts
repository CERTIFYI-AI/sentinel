// SPDX-License-Identifier: Apache-2.0
// Model Lifecycle service — reads/writes the RLS-governed `model_lifecycle_stages`
// table. The rich per-model gate/transition history lives in `metadata.approvals`
// (jsonb); the current stage + latest gate are mirrored to first-class columns
// (`current_stage`, `gate_*`) for queryability. `org_id` is filled by the table's
// get_org_id() default on insert, so no client-side org plumbing is needed.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface LifecycleGate {
  stage: string
  kind: string
  approver: string
  requestedBy?: string
  date: string
  status: string
  note?: string
}

export interface LifecycleModel {
  /** Business/display id (e.g. MDL-001) — stored as model_lifecycle_stages.model_id. */
  id: string
  name: string
  provider: string
  stage: string
  approvals: LifecycleGate[]
  lastTransition: string
  nextReview: string
  owner: string
  /** DB primary key (uuid). Present for existing rows; omitted on create. */
  _rowId?: string
}

function rowToLifecycle(r: any): LifecycleModel {
  const m = r.metadata ?? {}
  return {
    _rowId: r.id,
    id: r.model_id,
    name: r.model_name ?? m.name ?? r.model_id,
    provider: m.provider ?? '—',
    stage: r.current_stage ?? 'development',
    approvals: Array.isArray(m.approvals) ? m.approvals : [],
    lastTransition: m.lastTransition ?? (r.promoted_at ?? r.updated_at ?? '').slice(0, 10),
    nextReview: m.nextReview ?? '',
    owner: m.owner ?? '—',
  }
}

function lifecycleToRow(x: LifecycleModel): Record<string, any> {
  const latest = x.approvals[x.approvals.length - 1]
  return {
    ...(x._rowId ? { id: x._rowId } : {}),
    model_id: x.id,
    model_name: x.name,
    current_stage: x.stage,
    gate_status: latest?.status ?? 'pending',
    gate_reviewer: latest?.approver ?? null,
    gate_notes: latest?.note ?? null,
    metadata: {
      provider: x.provider, owner: x.owner, nextReview: x.nextReview,
      lastTransition: x.lastTransition, name: x.name, approvals: x.approvals,
    },
  }
}

export async function fetchLifecycleModels(): Promise<LifecycleModel[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('model_lifecycle_stages')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) { console.warn('[lifecycleService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToLifecycle)
}

// Writes throw on failure so a gate decision / transition never reports success
// while nothing persisted. Never swallow to null.
export async function upsertLifecycleModel(x: LifecycleModel): Promise<LifecycleModel> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save lifecycle change.')
  const { data, error } = await supabase
    .from('model_lifecycle_stages')
    .upsert(lifecycleToRow(x))
    .select()
    .single()
  if (error) { console.warn('[lifecycleService] upsert:', error.message); throw new Error(error.message) }
  return rowToLifecycle(data)
}

export async function deleteLifecycleModel(rowId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot remove model.')
  const { error } = await supabase.from('model_lifecycle_stages').delete().eq('id', rowId)
  if (error) { console.warn('[lifecycleService] delete:', error.message); throw new Error(error.message) }
}
