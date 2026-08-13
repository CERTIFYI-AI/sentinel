// SPDX-License-Identifier: Apache-2.0
// Model DNA & Lineage service — reads/writes the RLS-governed `model_dna` table.
// The cryptographic fingerprint maps to `fingerprint_hash`; the provenance
// timeline to `lineage` (jsonb); the audit chain + denormalized display fields
// live in `metadata` (jsonb). org_id is filled by the table's get_org_id()
// default on insert.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface ProvenanceStage { stage: string; dataset: string; hash: string; date: string; by: string }
export interface AuditBlock { id: string; event: string; actor: string; ts: string; hash: string; prev: string }

export interface DnaRecord {
  id: string            // business/display id → model_dna.model_id
  name: string
  type: string
  version: string
  riskTier: string
  owner: string
  framework: string
  department: string
  sha256: string
  trainingDataHash: string
  registeredAt: string
  registeredBy: string
  lastVerified: string
  tamperAlert: boolean
  baseModel?: string
  parentModelId?: string | null
  provenance: ProvenanceStage[]
  auditChain: AuditBlock[]
  _rowId?: string       // DB uuid (present for existing rows)
}

function rowToDna(r: any): DnaRecord {
  const m = r.metadata ?? {}
  return {
    _rowId: r.id,
    id: r.model_id,
    name: r.model_name ?? m.name ?? r.model_id,
    type: m.type ?? '—',
    version: m.version ?? '—',
    riskTier: m.riskTier ?? 'limited',
    owner: m.owner ?? '—',
    framework: m.framework ?? '—',
    department: m.department ?? '—',
    sha256: r.fingerprint_hash ?? '',
    trainingDataHash: m.trainingDataHash ?? '',
    registeredAt: m.registeredAt ?? r.created_at ?? '',
    registeredBy: m.registeredBy ?? '—',
    lastVerified: m.lastVerified ?? r.updated_at ?? '',
    tamperAlert: !!m.tamperAlert,
    baseModel: r.base_model ?? m.baseModel ?? undefined,
    parentModelId: r.parent_model_id ?? null,
    provenance: Array.isArray(r.lineage) ? r.lineage : [],
    auditChain: Array.isArray(m.auditChain) ? m.auditChain : [],
  }
}

function dnaToRow(x: DnaRecord): Record<string, any> {
  return {
    ...(x._rowId ? { id: x._rowId } : {}),
    model_id: x.id,
    model_name: x.name,
    fingerprint_hash: x.sha256 || null,
    base_model: x.baseModel ?? null,
    parent_model_id: x.parentModelId ?? null,
    lineage: x.provenance ?? [],
    metadata: {
      name: x.name, type: x.type, version: x.version, riskTier: x.riskTier, owner: x.owner,
      framework: x.framework, department: x.department,
      trainingDataHash: x.trainingDataHash, registeredAt: x.registeredAt, registeredBy: x.registeredBy,
      lastVerified: x.lastVerified, tamperAlert: x.tamperAlert, auditChain: x.auditChain,
    },
  }
}

export async function fetchModelDna(): Promise<DnaRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('model_dna').select('*').order('created_at', { ascending: false })
  if (error) { console.warn('[modelDnaService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToDna)
}

// Writes throw on failure so the UI reports a real error rather than a false
// "DNA record created" success. Never swallow to null.
export async function upsertModelDna(x: DnaRecord): Promise<DnaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save DNA record.')
  const { data, error } = await supabase.from('model_dna').upsert(dnaToRow(x)).select().single()
  if (error) { console.warn('[modelDnaService] upsert:', error.message); throw new Error(error.message) }
  return rowToDna(data)
}

export async function deleteModelDna(rowId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete DNA record.')
  const { error } = await supabase.from('model_dna').delete().eq('id', rowId)
  if (error) { console.warn('[modelDnaService] delete:', error.message); throw new Error(error.message) }
}
