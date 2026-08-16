// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Statutory privacy records:
//   * `ropa_records`                — GDPR Art. 30 records of processing
//   * `transfer_impact_assessments` — Chapter V transfer impact assessments
//
// Both tables already existed and were org-scoped, but held zero rows because
// their pages read generic `ropa_table` / `tia_table` demo tables seeded from
// hardcoded arrays. These are named statutory artefacts: a fabricated row is the
// highest-consequence class of defect in the platform.
//
// Writes throw so the UI can never report a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

// ── RoPA (GDPR Art. 30) ─────────────────────────────────────────────────────

export const LEGAL_BASES = [
  'consent', 'contract', 'legal_obligation', 'vital_interests',
  'public_task', 'legitimate_interests',
] as const

export interface RopaRecord {
  id: string
  /** Citable reference (ROPA-NNN). The uuid is never shown. */
  reference?: string
  processingActivity: string
  purpose?: string
  legalBasis?: string
  dataSubjects?: string
  dataCategories?: string
  recipients?: string
  crossBorderTransfers: boolean
  retentionPeriod?: string
  dpiaRequired: boolean
  dpiaCompleted: boolean
  technicalMeasures?: string
  organizationalMeasures?: string
  controllerName?: string
  processorName?: string
  status?: string
  lastReviewedAt?: string | null
  nextReviewAt?: string | null
  /**
   * What this activity actually runs on. An Art. 30 record that names no
   * model, dataset or use case cannot answer the question a supervisory
   * authority asks first: which system does this?
   */
  linkedModelIds: string[]
  linkedDatasetIds: string[]
  linkedUseCaseId?: string | null
  /** The processor named in the record, resolved against the vendor register. */
  processorVendorId?: string | null
  createdAt?: string
  updatedAt?: string
}

function ropaFromRow(r: Record<string, any>): RopaRecord {
  return {
    id: r.id,
    processingActivity: r.processing_activity ?? '',
    purpose: r.purpose ?? undefined,
    legalBasis: r.legal_basis ?? undefined,
    dataSubjects: r.data_subjects ?? undefined,
    dataCategories: r.data_categories ?? undefined,
    recipients: r.recipients ?? undefined,
    crossBorderTransfers: !!r.cross_border_transfers,
    retentionPeriod: r.retention_period ?? undefined,
    dpiaRequired: !!r.dpia_required,
    dpiaCompleted: !!r.dpia_completed,
    technicalMeasures: r.technical_measures ?? undefined,
    organizationalMeasures: r.organizational_measures ?? undefined,
    controllerName: r.controller_name ?? undefined,
    processorName: r.processor_name ?? undefined,
    status: r.status ?? undefined,
    lastReviewedAt: r.last_reviewed_at ?? null,
    nextReviewAt: r.next_review_at ?? null,
    reference: r.reference ?? undefined,
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    linkedDatasetIds: Array.isArray(r.linked_dataset_ids) ? r.linked_dataset_ids : [],
    linkedUseCaseId: r.linked_use_case_id ?? null,
    processorVendorId: r.processor_vendor_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function ropaToRow(r: Partial<RopaRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (r.processingActivity !== undefined) row.processing_activity = r.processingActivity
  if (r.purpose !== undefined) row.purpose = r.purpose ?? null
  if (r.legalBasis !== undefined) row.legal_basis = r.legalBasis ?? null
  if (r.dataSubjects !== undefined) row.data_subjects = r.dataSubjects ?? null
  if (r.dataCategories !== undefined) row.data_categories = r.dataCategories ?? null
  if (r.recipients !== undefined) row.recipients = r.recipients ?? null
  if (r.crossBorderTransfers !== undefined) row.cross_border_transfers = r.crossBorderTransfers
  if (r.retentionPeriod !== undefined) row.retention_period = r.retentionPeriod ?? null
  if (r.dpiaRequired !== undefined) row.dpia_required = r.dpiaRequired
  if (r.dpiaCompleted !== undefined) row.dpia_completed = r.dpiaCompleted
  if (r.technicalMeasures !== undefined) row.technical_measures = r.technicalMeasures ?? null
  if (r.organizationalMeasures !== undefined) row.organizational_measures = r.organizationalMeasures ?? null
  if (r.controllerName !== undefined) row.controller_name = r.controllerName ?? null
  if (r.processorName !== undefined) row.processor_name = r.processorName ?? null
  if (r.status !== undefined) row.status = r.status ?? null
  if (r.lastReviewedAt !== undefined) row.last_reviewed_at = r.lastReviewedAt || null
  if (r.reference !== undefined) row.reference = r.reference || null
  if (r.nextReviewAt !== undefined) row.next_review_at = r.nextReviewAt || null
  if (r.linkedModelIds !== undefined) row.linked_model_ids = r.linkedModelIds
  if (r.linkedDatasetIds !== undefined) row.linked_dataset_ids = r.linkedDatasetIds
  if (r.linkedUseCaseId !== undefined) row.linked_use_case_id = r.linkedUseCaseId || null
  if (r.processorVendorId !== undefined) row.processor_vendor_id = r.processorVendorId || null
  return row
}

export async function fetchRopaRecords(): Promise<RopaRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('ropa_records').select('*').order('processing_activity')
  if (error) throw new Error(error.message)
  return (data ?? []).map(ropaFromRow)
}

export async function createRopaRecord(r: Partial<RopaRecord>): Promise<RopaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('ropa_records').insert(ropaToRow(r)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'ropa_records', entityId: data.id, action: 'create' })
  return ropaFromRow(data)
}

export async function updateRopaRecord(id: string, patch: Partial<RopaRecord>): Promise<RopaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('ropa_records')
    .update({ ...ropaToRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'ropa_records', entityId: id, action: 'update' })
  return ropaFromRow(data)
}

export async function deleteRopaRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('ropa_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'ropa_records', entityId: id, action: 'delete' })
}

// ── Transfer Impact Assessments (GDPR Chapter V) ────────────────────────────

export interface TiaRecord {
  id: string
  /** Citable reference (TIA-YYYY-NNN). The uuid is never shown. */
  reference?: string
  transferName: string
  sourceCountry?: string
  destinationCountry?: string
  transferMechanism?: string
  dataTypes?: string
  dataVolume?: string
  vendorId?: string | null
  riskLevel?: string
  supplementaryMeasures?: string
  status?: string
  assessorId?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  validUntil?: string | null
  /** The Art. 30 activity whose data crosses the border. */
  linkedRopaId?: string | null
  /** The systems that perform the transfer. */
  linkedModelIds: string[]
  createdAt?: string
  updatedAt?: string
}

function tiaFromRow(r: Record<string, any>): TiaRecord {
  return {
    id: r.id,
    transferName: r.transfer_name ?? '',
    sourceCountry: r.source_country ?? undefined,
    destinationCountry: r.destination_country ?? undefined,
    transferMechanism: r.transfer_mechanism ?? undefined,
    dataTypes: r.data_types ?? undefined,
    dataVolume: r.data_volume ?? undefined,
    vendorId: r.vendor_id ?? null,
    riskLevel: r.risk_level ?? undefined,
    supplementaryMeasures: r.supplementary_measures ?? undefined,
    status: r.status ?? undefined,
    assessorId: r.assessor_id ?? null,
    approvedBy: r.approved_by ?? null,
    approvedAt: r.approved_at ?? null,
    validUntil: r.valid_until ?? null,
    reference: r.reference ?? undefined,
    linkedRopaId: r.linked_ropa_id ?? null,
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function tiaToRow(t: Partial<TiaRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (t.transferName !== undefined) row.transfer_name = t.transferName
  if (t.sourceCountry !== undefined) row.source_country = t.sourceCountry ?? null
  if (t.destinationCountry !== undefined) row.destination_country = t.destinationCountry ?? null
  if (t.transferMechanism !== undefined) row.transfer_mechanism = t.transferMechanism ?? null
  if (t.dataTypes !== undefined) row.data_types = t.dataTypes ?? null
  if (t.dataVolume !== undefined) row.data_volume = t.dataVolume ?? null
  if (t.vendorId !== undefined) row.vendor_id = t.vendorId || null
  if (t.riskLevel !== undefined) row.risk_level = t.riskLevel ?? null
  if (t.supplementaryMeasures !== undefined) row.supplementary_measures = t.supplementaryMeasures ?? null
  if (t.status !== undefined) row.status = t.status ?? null
  if (t.validUntil !== undefined) row.valid_until = t.validUntil || null
  if (t.reference !== undefined) row.reference = t.reference || null
  if (t.linkedRopaId !== undefined) row.linked_ropa_id = t.linkedRopaId || null
  if (t.linkedModelIds !== undefined) row.linked_model_ids = t.linkedModelIds
  return row
}

export async function fetchTiaRecords(): Promise<TiaRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('transfer_impact_assessments').select('*').order('transfer_name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(tiaFromRow)
}

export async function createTiaRecord(t: Partial<TiaRecord>): Promise<TiaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('transfer_impact_assessments').insert(tiaToRow(t)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'transfer_impact_assessments', entityId: data.id, action: 'create' })
  return tiaFromRow(data)
}

export async function updateTiaRecord(id: string, patch: Partial<TiaRecord>): Promise<TiaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('transfer_impact_assessments')
    .update({ ...tiaToRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'transfer_impact_assessments', entityId: id, action: 'update' })
  return tiaFromRow(data)
}

export async function deleteTiaRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('transfer_impact_assessments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'transfer_impact_assessments', entityId: id, action: 'delete' })
}
