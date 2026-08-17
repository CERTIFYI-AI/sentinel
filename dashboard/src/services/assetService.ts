// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Asset Registry (`assets`) — what the organisation runs, and which registry
// record each asset represents.
//
// The page previously read `assetmanagement_table`, a generic (id, doc jsonb)
// demo table, while this real org-scoped table sat beside it holding the same
// ten assets. The demo table cannot carry a foreign key, so no asset could
// reach the model or dataset it stood for, and `risks.linked_asset_ids` had
// nothing resolvable to point at.
//
// entity_id / entity_type are the interlink that makes the register useful: an
// asset typed 'ai_model' resolves to a row in ai_models, one typed 'dataset' to
// datasets. Infrastructure assets represent no registry record and carry a null
// link, which is the honest state rather than an omission.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

export const ASSET_TYPES = [
  'ai_model', 'dataset', 'infrastructure', 'application', 'api', 'device',
] as const
export type AssetType = (typeof ASSET_TYPES)[number]

export const ASSET_TYPE_LABEL: Record<string, string> = {
  ai_model: 'AI model', dataset: 'Dataset', infrastructure: 'Infrastructure',
  application: 'Application', api: 'API', device: 'Device',
}

export const CRITICALITIES = ['critical', 'high', 'medium', 'low'] as const
export const DATA_CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted'] as const
export const LIFECYCLE_STAGES = ['active', 'maintenance', 'decommissioning', 'retired'] as const

/** Entity types an asset can represent. Anything else carries no link. */
export const LINKABLE_ENTITY_TYPES = ['ai_model', 'dataset'] as const
export type LinkableEntityType = (typeof LINKABLE_ENTITY_TYPES)[number]

export interface AssetRecord {
  id: string
  /** Citable reference (AST-NNN). The uuid is never shown. */
  assetRef?: string
  name: string
  type: string
  criticality?: string
  /**
   * Kept in step with criticality by the database. The two used to disagree —
   * criticality was uniformly 'medium' while risk_level said High — which is
   * how a register loses the reader's trust.
   */
  riskLevel?: string
  dataClassification?: string
  lifecycleStage?: string
  department?: string
  location?: string
  hostname?: string
  version?: string
  tags: string[]
  /** The registry record this asset represents, if any. */
  entityId?: string | null
  entityType?: string | null
  /** Recovery objectives, sourced from the BIA rather than re-entered here. */
  biaRtoHours?: number | null
  biaRpoHours?: number | null
  autoDiscovered: boolean
  lastScannedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): AssetRecord {
  return {
    id: r.id,
    assetRef: r.asset_ref ?? undefined,
    name: r.name ?? '',
    type: r.type ?? 'infrastructure',
    criticality: r.criticality ?? undefined,
    riskLevel: r.risk_level ?? undefined,
    dataClassification: r.data_classification ?? undefined,
    lifecycleStage: r.lifecycle_stage ?? undefined,
    department: r.department ?? undefined,
    location: r.location ?? undefined,
    hostname: r.hostname ?? undefined,
    version: r.version ?? undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    entityId: r.entity_id ?? null,
    entityType: r.entity_type ?? null,
    biaRtoHours: r.bia_rto_hours ?? null,
    biaRpoHours: r.bia_rpo_hours ?? null,
    autoDiscovered: !!r.auto_discovered,
    lastScannedAt: r.last_scanned_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** org_id/tenant_id are omitted — the DB default fills them. */
function toRow(a: Partial<AssetRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (a.id !== undefined) row.id = a.id
  if (a.assetRef !== undefined) row.asset_ref = a.assetRef || null
  if (a.name !== undefined) row.name = a.name
  if (a.type !== undefined) row.type = a.type
  if (a.riskLevel !== undefined) {
    row.risk_level = a.riskLevel || null
    // criticality is derived, never entered separately, so the two columns
    // cannot drift apart again.
    row.criticality = (a.riskLevel ?? '').toLowerCase() || null
  }
  if (a.dataClassification !== undefined) row.data_classification = a.dataClassification || null
  if (a.lifecycleStage !== undefined) row.lifecycle_stage = a.lifecycleStage || null
  if (a.department !== undefined) row.department = a.department || null
  if (a.location !== undefined) row.location = a.location || null
  if (a.hostname !== undefined) row.hostname = a.hostname || null
  if (a.version !== undefined) row.version = a.version || null
  if (a.tags !== undefined) row.tags = a.tags
  if (a.entityId !== undefined) row.entity_id = a.entityId || null
  if (a.entityType !== undefined) row.entity_type = a.entityType || null
  if (a.biaRtoHours !== undefined) row.bia_rto_hours = a.biaRtoHours ?? null
  if (a.biaRpoHours !== undefined) row.bia_rpo_hours = a.biaRpoHours ?? null
  return row
}

export async function fetchAssets(filters: Record<string, any> = {}): Promise<AssetRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('assets').select('*').order('asset_ref', { ascending: true })
  if (filters.entityId) q = q.eq('entity_id', filters.entityId)
  if (filters.type) q = q.eq('type', filters.type)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function upsertAsset(record: Partial<AssetRecord>): Promise<AssetRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const creating = !record.id
  const { data, error } = await supabase
    .from('assets')
    .upsert({ ...toRow(record), updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw new Error(error.message)
  void logAction({
    module: 'asset-registry', entityType: 'assets',
    entityId: String(data.id), entityName: data.asset_ref ?? data.name,
    action: creating ? 'create' : 'update',
  })
  return fromRow(data)
}

export async function deleteAsset(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'asset-registry', entityType: 'assets', entityId: id, action: 'delete' })
  return true
}
