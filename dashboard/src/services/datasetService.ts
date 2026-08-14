// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// datasetService — canonical `datasets` table plus `data_quality_assessments`.
// Org scoping is left to the DB default (current_user_org_id()); writes throw
// so the UI surfaces real errors instead of a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type SchemaField = {
  column: string
  type: string
  pii: boolean
  nullable: boolean
  description?: string
}

export type DatasetRecord = {
  id: string
  name: string
  version?: string
  description?: string
  type?: string
  classification?: string
  status?: string
  owner?: string
  source?: string
  license?: string
  format?: string
  containsPii: boolean
  demographicData: boolean
  knownBiases?: string
  biasMitigation?: string
  collectionMethod?: string
  preprocessingSteps?: string
  usedInModels: string[]      // ai_models.id uuids
  usedInUseCases: string[]    // use_cases.id
  recordCount?: number
  encryption?: string
  retentionPolicy?: string
  lastAuditDate?: string
  piiTypes: string[]
  upstreamSources: string[]
  ingestionMethod?: string
  sla?: string
  schemaDefinition: SchemaField[]
  createdAt: string
  updatedAt: string
}

export type QualityDeficiency = {
  issue: string
  dimension: string
  severity: string
  remediation: string
}

export type Art10Status = 'met' | 'partial' | 'not_met'

export type QualityAssessment = {
  id: string
  datasetId: string
  modelId?: string            // ai_models.id uuid
  completeness?: number
  accuracy?: number
  consistency?: number
  representativeness?: number
  biasScore?: number
  relevance?: number
  timeliness?: number
  overallScore?: number
  art10Status?: Art10Status
  assessmentMethod: 'automated' | 'manual' | 'hybrid'
  assessor?: string
  deficiencies: QualityDeficiency[]
  assessedAt: string
  createdAt: string
}

// ── Row mapping ─────────────────────────────────────────────────────────────

function rowToDataset(r: any): DatasetRecord {
  return {
    id: r.id,
    name: r.name,
    version: r.version ?? undefined,
    description: r.description ?? undefined,
    type: r.type ?? undefined,
    classification: r.classification ?? undefined,
    status: r.status ?? undefined,
    owner: r.owner ?? undefined,
    source: r.source ?? undefined,
    license: r.license ?? undefined,
    format: r.format ?? undefined,
    containsPii: !!r.contains_pii,
    demographicData: !!r.demographic_data,
    knownBiases: r.known_biases ?? undefined,
    biasMitigation: r.bias_mitigation ?? undefined,
    collectionMethod: r.collection_method ?? undefined,
    preprocessingSteps: r.preprocessing_steps ?? undefined,
    usedInModels: r.used_in_models ?? [],
    usedInUseCases: r.used_in_use_cases ?? [],
    recordCount: r.record_count ?? undefined,
    encryption: r.encryption ?? undefined,
    retentionPolicy: r.retention_policy ?? undefined,
    lastAuditDate: r.last_audit_date ?? undefined,
    piiTypes: r.pii_types ?? [],
    upstreamSources: r.upstream_sources ?? [],
    ingestionMethod: r.ingestion_method ?? undefined,
    sla: r.sla ?? undefined,
    schemaDefinition: Array.isArray(r.schema_definition) ? r.schema_definition : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function datasetToRow(d: Partial<DatasetRecord>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (d.name !== undefined) row.name = d.name
  if (d.version !== undefined) row.version = d.version
  if (d.description !== undefined) row.description = d.description
  if (d.type !== undefined) row.type = d.type
  if (d.classification !== undefined) row.classification = d.classification
  if (d.status !== undefined) row.status = d.status
  if (d.owner !== undefined) row.owner = d.owner
  if (d.source !== undefined) row.source = d.source
  if (d.license !== undefined) row.license = d.license
  if (d.format !== undefined) row.format = d.format
  if (d.containsPii !== undefined) row.contains_pii = d.containsPii
  if (d.demographicData !== undefined) row.demographic_data = d.demographicData
  if (d.knownBiases !== undefined) row.known_biases = d.knownBiases
  if (d.biasMitigation !== undefined) row.bias_mitigation = d.biasMitigation
  if (d.collectionMethod !== undefined) row.collection_method = d.collectionMethod
  if (d.preprocessingSteps !== undefined) row.preprocessing_steps = d.preprocessingSteps
  if (d.usedInModels !== undefined) row.used_in_models = d.usedInModels
  if (d.usedInUseCases !== undefined) row.used_in_use_cases = d.usedInUseCases
  if (d.recordCount !== undefined) row.record_count = d.recordCount
  if (d.encryption !== undefined) row.encryption = d.encryption
  if (d.retentionPolicy !== undefined) row.retention_policy = d.retentionPolicy
  if (d.lastAuditDate !== undefined) row.last_audit_date = d.lastAuditDate
  if (d.piiTypes !== undefined) row.pii_types = d.piiTypes
  if (d.upstreamSources !== undefined) row.upstream_sources = d.upstreamSources
  if (d.ingestionMethod !== undefined) row.ingestion_method = d.ingestionMethod
  if (d.sla !== undefined) row.sla = d.sla
  if (d.schemaDefinition !== undefined) row.schema_definition = d.schemaDefinition
  return row
}

function rowToAssessment(r: any): QualityAssessment {
  return {
    id: r.id,
    datasetId: r.dataset_id,
    modelId: r.model_id ?? undefined,
    completeness: r.completeness != null ? Number(r.completeness) : undefined,
    accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
    consistency: r.consistency != null ? Number(r.consistency) : undefined,
    representativeness: r.representativeness != null ? Number(r.representativeness) : undefined,
    biasScore: r.bias_score != null ? Number(r.bias_score) : undefined,
    relevance: r.relevance != null ? Number(r.relevance) : undefined,
    timeliness: r.timeliness != null ? Number(r.timeliness) : undefined,
    overallScore: r.overall_score != null ? Number(r.overall_score) : undefined,
    art10Status: r.art10_status ?? undefined,
    assessmentMethod: r.assessment_method ?? 'automated',
    assessor: r.assessor ?? undefined,
    deficiencies: Array.isArray(r.deficiencies) ? r.deficiencies : [],
    assessedAt: r.assessed_at,
    createdAt: r.created_at,
  }
}

function assessmentToRow(a: Partial<QualityAssessment>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (a.datasetId !== undefined) row.dataset_id = a.datasetId
  if (a.modelId !== undefined) row.model_id = a.modelId || null
  if (a.completeness !== undefined) row.completeness = a.completeness
  if (a.accuracy !== undefined) row.accuracy = a.accuracy
  if (a.consistency !== undefined) row.consistency = a.consistency
  if (a.representativeness !== undefined) row.representativeness = a.representativeness
  if (a.biasScore !== undefined) row.bias_score = a.biasScore
  if (a.relevance !== undefined) row.relevance = a.relevance
  if (a.timeliness !== undefined) row.timeliness = a.timeliness
  if (a.overallScore !== undefined) row.overall_score = a.overallScore
  if (a.art10Status !== undefined) row.art10_status = a.art10Status
  if (a.assessmentMethod !== undefined) row.assessment_method = a.assessmentMethod
  if (a.assessor !== undefined) row.assessor = a.assessor
  if (a.deficiencies !== undefined) row.deficiencies = a.deficiencies
  if (a.assessedAt !== undefined) row.assessed_at = a.assessedAt
  return row
}

// ── Datasets CRUD ───────────────────────────────────────────────────────────

export async function fetchDatasets(): Promise<DatasetRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[datasetService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToDataset)
}

export async function fetchDataset(id: string): Promise<DatasetRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) { console.warn('[datasetService] fetchOne:', error.message); throw new Error(error.message) }
  return data ? rowToDataset(data) : null
}

export async function createDataset(record: Partial<DatasetRecord>): Promise<DatasetRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save dataset.')
  const { data, error } = await supabase.from('datasets').insert(datasetToRow(record)).select().single()
  if (error) { console.warn('[datasetService] create:', error.message); throw new Error(error.message) }
  return rowToDataset(data)
}

export async function updateDataset(id: string, patch: Partial<DatasetRecord>): Promise<DatasetRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save dataset.')
  const { data, error } = await supabase.from('datasets').update(datasetToRow(patch)).eq('id', id).select().single()
  if (error) { console.warn('[datasetService] update:', error.message); throw new Error(error.message) }
  return rowToDataset(data)
}

export async function softDeleteDataset(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete dataset.')
  const { error } = await supabase.from('datasets').update({ is_deleted: true }).eq('id', id)
  if (error) { console.warn('[datasetService] delete:', error.message); throw new Error(error.message) }
}

// ── Quality assessments CRUD ────────────────────────────────────────────────

export async function fetchQualityAssessments(datasetId?: string): Promise<QualityAssessment[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('data_quality_assessments').select('*').order('assessed_at', { ascending: false })
  if (datasetId) q = q.eq('dataset_id', datasetId)
  const { data, error } = await q
  if (error) { console.warn('[datasetService] quality fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToAssessment)
}

export async function createQualityAssessment(record: Partial<QualityAssessment>): Promise<QualityAssessment> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save assessment.')
  const { data, error } = await supabase.from('data_quality_assessments').insert(assessmentToRow(record)).select().single()
  if (error) { console.warn('[datasetService] quality create:', error.message); throw new Error(error.message) }
  return rowToAssessment(data)
}

export async function deleteQualityAssessment(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete assessment.')
  const { error } = await supabase.from('data_quality_assessments').delete().eq('id', id)
  if (error) { console.warn('[datasetService] quality delete:', error.message); throw new Error(error.message) }
}
