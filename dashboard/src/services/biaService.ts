// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// biaService — Business Impact Analysis on the real, org-scoped `bia_records`
// table (supabase/migrations/040_v1_missing_modules.sql).
//
// Replaces the `bia_table (id, doc jsonb)` demo table the page used to write
// to. The old page computed "Avg RTO", "Mission Critical" and "Assessments
// Due" over a hardcoded in-file SEED array, keyed processes by a business code
// (`BIA-001`), and stored AI-system dependencies as free text that reached no
// model. It also stored a fabricated `financialImpact24h` on every seeded row.
//
// Contract (CLAUDE.md): org_id filled by the DB default; writes THROW; reads
// throw; every mutation writes an Art. 12 audit entry.
//
// Interlinks (one id-space): `linked_asset_ids` (uuid[] → assets.id) is the
// dependency graph — a process depends on the assets that implement it, and an
// asset is reachable back through it. `dependencies` (text[]) stays for the
// free-text upstream/downstream notes the schema already carries.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'business-impact-analysis'

export type BiaCriticality = 'critical' | 'high' | 'medium' | 'low'

export interface BiaRecord {
  id: string
  biaRef: string | null
  processName: string
  department: string | null
  ownerId: string | null
  criticality: BiaCriticality
  /** Recovery objectives in hours; null renders "—", never 0. */
  rtoHours: number | null
  rpoHours: number | null
  mtdHours: number | null
  /** Only a real, entered figure; null means not quantified, rendered "—". */
  financialImpactPerHour: number | null
  reputationalImpact: string | null
  regulatoryImpact: string | null
  /** Free-text upstream/downstream dependency notes. */
  dependencies: string[]
  /** The assets this process depends on — assets.id (the real interlink). */
  linkedAssetIds: string[]
  linkedBcpId: string | null
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}

const num = (v: unknown): number | null =>
  typeof v === 'number' ? v : (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null)
const arr = (v: unknown): string[] => (Array.isArray(v) ? v as string[] : [])

function rowToBia(r: Record<string, any>): BiaRecord {
  return {
    id: r.id,
    biaRef: r.bia_ref ?? null,
    processName: r.process_name ?? '',
    department: r.department ?? null,
    ownerId: r.owner_id ?? null,
    criticality: (r.criticality ?? 'medium') as BiaCriticality,
    rtoHours: num(r.rto_hours),
    rpoHours: num(r.rpo_hours),
    mtdHours: num(r.mtd_hours),
    financialImpactPerHour: num(r.financial_impact_per_hour),
    reputationalImpact: r.reputational_impact ?? null,
    regulatoryImpact: r.regulatory_impact ?? null,
    dependencies: arr(r.dependencies),
    linkedAssetIds: arr(r.linked_asset_ids),
    linkedBcpId: r.linked_bcp_id ?? null,
    lastReviewedAt: r.last_reviewed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function biaToRow(b: Partial<BiaRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('bia_ref', b.biaRef)
  set('process_name', b.processName)
  set('department', b.department)
  set('owner_id', b.ownerId)
  set('criticality', b.criticality)
  set('rto_hours', b.rtoHours)
  set('rpo_hours', b.rpoHours)
  set('mtd_hours', b.mtdHours)
  set('financial_impact_per_hour', b.financialImpactPerHour)
  set('reputational_impact', b.reputationalImpact)
  set('regulatory_impact', b.regulatoryImpact)
  set('dependencies', b.dependencies)
  set('linked_asset_ids', b.linkedAssetIds)
  set('linked_bcp_id', b.linkedBcpId)
  set('last_reviewed_at', b.lastReviewedAt)
  return row
}

export async function fetchBiaRecords(filters: { assetId?: string } = {}): Promise<BiaRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('bia_records').select('*').order('created_at', { ascending: false })
  if (filters.assetId) q = q.contains('linked_asset_ids', [filters.assetId])
  const { data, error } = await q
  if (error) { console.warn('[biaService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToBia)
}

export async function createBiaRecord(record: Partial<BiaRecord>): Promise<BiaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create BIA record.')
  const row = biaToRow(record)
  const { data, error } = await supabase.from('bia_records').insert(row).select().single()
  if (error) { console.warn('[biaService] create:', error.message); throw new Error(error.message) }
  const saved = rowToBia(data)
  void logAction({
    module: MODULE, entityType: 'bia_record', entityId: saved.id,
    entityName: saved.processName, action: 'create', newValues: row,
  })
  return saved
}

export async function updateBiaRecord(id: string, patch: Partial<BiaRecord>): Promise<BiaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update BIA record.')
  const row = biaToRow(patch)
  row.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('bia_records').update(row).eq('id', id).select().single()
  if (error) { console.warn('[biaService] update:', error.message); throw new Error(error.message) }
  const saved = rowToBia(data)
  void logAction({
    module: MODULE, entityType: 'bia_record', entityId: id,
    entityName: saved.processName, action: 'update', newValues: row,
  })
  return saved
}

export async function deleteBiaRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete BIA record.')
  const { error } = await supabase.from('bia_records').delete().eq('id', id)
  if (error) { console.warn('[biaService] delete:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'bia_record', entityId: id, action: 'delete' })
}
