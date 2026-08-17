// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// assetService — the Asset Registry on the real, org-scoped `assets` table
// (supabase/migrations/040_v1_missing_modules.sql, interlink columns added in
// 20260817000001_admin_group_asset_bia_interlinks.sql and
// 20260825000001_last_demo_table_retirement.sql).
//
// Replaces the `assetmanagement_table (id, doc jsonb)` demo table the page used
// to write to. That demo table had no org_id column and an `_authenticated_all`
// USING(true) policy — cross-tenant read/write — and every metric on the page
// (unclassified, high-value, no-owner) was computed over a hardcoded in-file
// SEED array, not the tenant's real inventory.
//
// Contract (CLAUDE.md): org_id is never sent from the client (DB default
// current_user_org_id() fills it); writes THROW on failure so the UI can never
// report a false success; reads throw so the page renders a real error state;
// every mutation writes an Art. 12 audit entry via logAction.
//
// Interlinks (one id-space, First principle #2):
//   * entity_id / entity_type → the registry record the asset *is*
//     (ai_models.id or datasets.id), resolved to a name at render time;
//   * vendor_id → vendors.id (the supplier);
//   * bia_records.linked_asset_ids and risks.linked_asset_ids reach back here.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'asset-management'

export type AssetType =
  | 'ai_model' | 'dataset' | 'agent' | 'api_endpoint' | 'code_repo'
  | 'saas_app' | 'infrastructure' | 'prompt' | 'llm_gateway' | 'container'
export type Criticality = 'critical' | 'high' | 'medium' | 'low'
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'pii'
export type LifecycleStage = 'planned' | 'active' | 'decommissioning' | 'decommissioned'
export type EntityType = 'ai_model' | 'dataset' | null

export interface AssetRecord {
  id: string
  assetRef: string | null
  name: string
  type: AssetType
  ownerId: string | null
  department: string | null
  criticality: Criticality
  dataClassification: DataClassification
  lifecycleStage: LifecycleStage
  /** The registry record this asset *is* — ai_models.id or datasets.id. */
  entityId: string | null
  entityType: EntityType
  /** Supplier — vendors.id, resolved to a name at render time. */
  vendorId: string | null
  /** Legacy display-only supplier label; vendorId is the source of truth. */
  vendorText: string | null
  /** RTO/RPO inherited from the BIA; null renders "—", never 0. */
  biaRtoHours: number | null
  biaRpoHours: number | null
  biaImpact: string | null
  hostname: string | null
  version: string | null
  tags: string[]
  autoDiscovered: boolean
  lastScannedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

const num = (v: unknown): number | null =>
  typeof v === 'number' ? v : (v != null && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null)
const arr = (v: unknown): string[] => (Array.isArray(v) ? v as string[] : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {})

function rowToAsset(r: Record<string, any>): AssetRecord {
  return {
    id: r.id,
    assetRef: r.asset_ref ?? null,
    name: r.name ?? '',
    type: (r.type ?? 'infrastructure') as AssetType,
    ownerId: r.owner_id ?? null,
    department: r.department ?? null,
    criticality: (r.criticality ?? 'medium') as Criticality,
    dataClassification: (r.data_classification ?? 'internal') as DataClassification,
    lifecycleStage: (r.lifecycle_stage ?? 'active') as LifecycleStage,
    entityId: r.entity_id ?? null,
    entityType: (r.entity_type ?? null) as EntityType,
    vendorId: r.vendor_id ?? null,
    vendorText: r.vendor ?? null,
    biaRtoHours: num(r.bia_rto_hours),
    biaRpoHours: num(r.bia_rpo_hours),
    biaImpact: r.bia_impact ?? null,
    hostname: r.hostname ?? null,
    version: r.version ?? null,
    tags: arr(r.tags),
    autoDiscovered: r.auto_discovered ?? false,
    lastScannedAt: r.last_scanned_at ?? null,
    metadata: obj(r.metadata),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** Only writable, non-derived columns. org_id is deliberately absent (DB default). */
function assetToRow(a: Partial<AssetRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('asset_ref', a.assetRef)
  set('name', a.name)
  set('type', a.type)
  set('owner_id', a.ownerId)
  set('department', a.department)
  set('criticality', a.criticality)
  set('data_classification', a.dataClassification)
  set('lifecycle_stage', a.lifecycleStage)
  set('entity_id', a.entityId)
  set('entity_type', a.entityType)
  set('vendor_id', a.vendorId)
  set('vendor', a.vendorText)
  set('bia_impact', a.biaImpact)
  set('hostname', a.hostname)
  set('version', a.version)
  set('tags', a.tags)
  set('metadata', a.metadata)
  return row
}

export async function fetchAssets(filters: { entityId?: string } = {}): Promise<AssetRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('assets').select('*').order('created_at', { ascending: false })
  if (filters.entityId) q = q.eq('entity_id', filters.entityId)
  const { data, error } = await q
  if (error) { console.warn('[assetService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToAsset)
}

export async function createAsset(record: Partial<AssetRecord>): Promise<AssetRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot register asset.')
  const row = assetToRow(record)
  const { data, error } = await supabase.from('assets').insert(row).select().single()
  if (error) { console.warn('[assetService] create:', error.message); throw new Error(error.message) }
  const saved = rowToAsset(data)
  void logAction({
    module: MODULE, entityType: 'asset', entityId: saved.id,
    entityName: saved.name, action: 'create', newValues: row,
  })
  return saved
}

export async function updateAsset(id: string, patch: Partial<AssetRecord>): Promise<AssetRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update asset.')
  const row = assetToRow(patch)
  row.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('assets').update(row).eq('id', id).select().single()
  if (error) { console.warn('[assetService] update:', error.message); throw new Error(error.message) }
  const saved = rowToAsset(data)
  void logAction({
    module: MODULE, entityType: 'asset', entityId: id,
    entityName: saved.name, action: 'update', newValues: row,
  })
  return saved
}

export async function deleteAsset(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete asset.')
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) { console.warn('[assetService] delete:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'asset', entityId: id, action: 'delete' })
}
