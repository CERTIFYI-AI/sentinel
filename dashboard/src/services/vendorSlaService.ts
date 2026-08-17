// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// vendorSlaService — the real, org-scoped `public.vendor_slas` table, READ
// through the `public.vendor_sla_status` view
// (supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql).
//
// The single most important rule in this file: **status is never authored**.
// The old `vendorsla_table` stored a literal 'healthy' next to a free-text
// "current performance" string, so a breaching SLA could — and did — render as
// healthy, and a brand-new SLA counted toward the Healthy KPI the moment it
// was created. Here, thresholds and the measured value are NUMERIC, and
// `derived_status` is computed by the view from target/breach/direction.
// A NULL current_value yields 'unmeasured' so the UI renders an em-dash
// instead of inventing a verdict.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type SlaDerivedStatus = 'healthy' | 'at_risk' | 'breached' | 'unmeasured'

export const SLA_METRICS = ['uptime', 'response_time', 'resolution_time', 'accuracy'] as const
export const SLA_UNITS = ['percent', 'hours', 'minutes', 'ms'] as const
export const SLA_WINDOWS = ['monthly', 'quarterly', 'rolling_30d'] as const

export interface VendorSlaRecord {
  id: string
  slaRef?: string | null
  vendorId?: string | null
  metric: string
  unit: string
  targetValue?: number | null
  warningValue?: number | null
  breachValue?: number | null
  /** Direction matters: uptime is higher-is-better, latency the opposite. */
  higherIsBetter: boolean
  /** NULL until actually measured — never defaulted to a plausible number. */
  currentValue?: number | null
  measurementWindow?: string | null
  lastMeasuredAt?: string | null
  lastBreachAt?: string | null
  consecutiveBreaches: number
  serviceCredits?: string | null
  creditClaimStatus?: string | null
  contractClauseRef?: string | null
  linkedIncidentIds: string[]
  escalationPath?: string | null
  owner?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  /** Computed by the view. Read-only — there is no setter for this. */
  derivedStatus: SlaDerivedStatus
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function fromRow(r: Record<string, any>): VendorSlaRecord {
  return {
    id: r.id,
    slaRef: r.sla_ref ?? null,
    vendorId: r.vendor_id ?? null,
    metric: r.metric ?? '',
    unit: r.unit ?? 'percent',
    targetValue: numOrNull(r.target_value),
    warningValue: numOrNull(r.warning_value),
    breachValue: numOrNull(r.breach_value),
    higherIsBetter: r.higher_is_better ?? true,
    currentValue: numOrNull(r.current_value),
    measurementWindow: r.measurement_window ?? null,
    lastMeasuredAt: r.last_measured_at ?? null,
    lastBreachAt: r.last_breach_at ?? null,
    consecutiveBreaches: Number(r.consecutive_breaches ?? 0),
    serviceCredits: r.service_credits ?? null,
    creditClaimStatus: r.credit_claim_status ?? null,
    contractClauseRef: r.contract_clause_ref ?? null,
    linkedIncidentIds: Array.isArray(r.linked_incident_ids) ? r.linked_incident_ids : [],
    escalationPath: r.escalation_path ?? null,
    owner: r.owner ?? null,
    notes: r.notes ?? null,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    // The view always supplies this. If a raw table row ever reaches here,
    // 'unmeasured' is the honest fallback — never 'healthy'.
    derivedStatus: (r.derived_status ?? 'unmeasured') as SlaDerivedStatus,
  }
}

/** Writable columns only. `derived_status` is a view expression, and org_id is
 *  filled by the DB default. */
function toRow(s: Partial<VendorSlaRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (col: string, val: unknown) => { if (val !== undefined) row[col] = val }
  set('sla_ref', s.slaRef)
  set('vendor_id', s.vendorId || null)
  set('metric', s.metric)
  set('unit', s.unit)
  set('target_value', s.targetValue)
  set('warning_value', s.warningValue)
  set('breach_value', s.breachValue)
  set('higher_is_better', s.higherIsBetter)
  set('current_value', s.currentValue)
  set('measurement_window', s.measurementWindow)
  set('last_measured_at', s.lastMeasuredAt || null)
  set('last_breach_at', s.lastBreachAt || null)
  set('consecutive_breaches', s.consecutiveBreaches)
  set('service_credits', s.serviceCredits)
  set('credit_claim_status', s.creditClaimStatus)
  set('contract_clause_ref', s.contractClauseRef)
  set('linked_incident_ids', s.linkedIncidentIds)
  set('escalation_path', s.escalationPath)
  set('owner', s.owner)
  set('notes', s.notes)
  set('metadata', s.metadata)
  row.updated_at = new Date().toISOString()
  return row
}

/** Reads go through the view so derived_status is always present. */
export async function fetchVendorSlas(vendorId?: string): Promise<VendorSlaRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('vendor_sla_status').select('*').order('created_at', { ascending: false })
  if (vendorId) q = q.eq('vendor_id', vendorId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function fetchVendorSlaById(id: string): Promise<VendorSlaRecord | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  const { data, error } = await supabase.from('vendor_sla_status').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

export async function createVendorSla(s: Partial<VendorSlaRecord>): Promise<VendorSlaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save SLA.')
  if (!s.vendorId) throw new Error('An SLA must reference a vendor.')
  if (!s.metric) throw new Error('An SLA needs a metric.')
  const row = toRow(s)
  // Writes target the base table; the view is read-only.
  const { data, error } = await supabase.from('vendor_slas').insert(row).select('id').single()
  if (error) throw new Error(error.message)
  const saved = await fetchVendorSlaById(data.id)
  if (!saved) throw new Error('SLA was written but could not be read back.')
  void logAction({
    module: 'vendors', entityType: 'vendor_slas', entityId: saved.id,
    entityName: saved.slaRef ?? saved.metric, action: 'create', newValues: row,
  })
  return saved
}

export async function updateVendorSla(id: string, patch: Partial<VendorSlaRecord>): Promise<VendorSlaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save SLA.')
  const before = await fetchVendorSlaById(id)
  const row = toRow(patch)
  const { error } = await supabase.from('vendor_slas').update(row).eq('id', id)
  if (error) throw new Error(error.message)
  const saved = await fetchVendorSlaById(id)
  if (!saved) throw new Error('SLA was updated but could not be read back.')
  void logAction({
    module: 'vendors', entityType: 'vendor_slas', entityId: id,
    entityName: saved.slaRef ?? saved.metric, action: 'update',
    oldValues: before ?? undefined, newValues: row,
  })
  return saved
}

/**
 * Record a measurement. This is the ONLY way an SLA acquires a status: the
 * view re-derives it from the number written here. Breach bookkeeping
 * (consecutive counter, last_breach_at) follows from the same comparison the
 * view uses, so the two can never disagree.
 */
export async function recordSlaMeasurement(
  id: string, value: number, measuredAt?: string,
): Promise<VendorSlaRecord> {
  if (!Number.isFinite(value)) throw new Error('A measurement must be a number.')
  const current = await fetchVendorSlaById(id)
  if (!current) throw new Error('SLA not found.')
  const limit = current.breachValue ?? current.targetValue
  const breached = limit != null && (current.higherIsBetter ? value < limit : value > limit)
  const at = measuredAt ?? new Date().toISOString()
  return updateVendorSla(id, {
    currentValue: value,
    lastMeasuredAt: at,
    consecutiveBreaches: breached ? current.consecutiveBreaches + 1 : 0,
    ...(breached ? { lastBreachAt: at } : {}),
  })
}

export async function deleteVendorSla(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete SLA.')
  const before = await fetchVendorSlaById(id)
  const { error } = await supabase.from('vendor_slas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({
    module: 'vendors', entityType: 'vendor_slas', entityId: id,
    entityName: before?.slaRef ?? before?.metric, action: 'delete', oldValues: before ?? undefined,
  })
}
