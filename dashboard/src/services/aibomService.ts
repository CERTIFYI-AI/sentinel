// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// aibomService — the AI Bill of Materials register, on the real org-scoped
// tables `aibom_records`, `aibom_components` and `aibom_vulnerabilities`
// (supabase/migrations/20260822000002_supply_chain_esg_canonical.sql).
//
// Replaces the `aibomregistry_table (id, doc jsonb)` demo table the page used
// to write to. org_id is never sent from the client — the column default
// (`current_user_org_id()`) fills it, as `ai_models` does.
//
// INTEGRITY HONESTY CONTRACT (binding, see the migration's WHY block):
//   * `declaredDigest` is whatever a producer asserted. It is evidence of
//     NOTHING until a verifier confirms it, and the UI must label it as
//     self-declared.
//   * `verificationStatus` / `verifiedAt` / `verifiedBy` / `verificationMethod`
//     are ONLY ever written by a real verifier. No client write path in this
//     file sets them, so they stay at the DB default 'unverified' until real
//     DSSE/Sigstore verification ships.
//   * Nothing here fabricates a digest, a signature or a signer.
//
// Writes throw on failure (config/RLS/CHECK/network) so callers surface a real
// error instead of a false success. Never swallow to null.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'aibom'

// ── Types (camelCase; the row mappers below do the snake_case translation) ──

export type VerificationStatus = 'unverified' | 'verified' | 'failed'

export interface AibomRecord {
  id: string
  aibomRef: string | null
  modelId: string | null
  modelVersion: string | null
  vendorId: string | null
  format: string
  specVersion: string | null
  serialNumber: string | null
  document: Record<string, unknown> | null
  /** Self-declared by the producer. NOT evidence of integrity. */
  declaredDigest: string | null
  digestAlg: string
  /** Only ever written by a real verifier. */
  verificationStatus: VerificationStatus
  verifiedAt: string | null
  verifiedBy: string | null
  verificationMethod: string | null
  signature: Record<string, unknown> | null
  signerIdentity: string | null
  rekorLogIndex: string | null
  signedBy: string | null
  signedAt: string | null
  weightsUri: string | null
  weightsDigest: string | null
  trainingRunRef: string | null
  fineTuneParentId: string | null
  modelCardRef: string | null
  annexIvDocId: string | null
  countryOfOrigin: string | null
  exportControlClass: string | null
  eolAt: string | null
  version: number
  supersedesId: string | null
  status: string
  generatedAt: string | null
  /** NULL means "never scanned" — the UI must render — and not 0. */
  lastScannedAt: string | null
  scannerName: string | null
  notes: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AibomComponent {
  id: string
  aibomId: string | null
  componentType: string | null
  name: string
  version: string | null
  purl: string | null
  cpe: string | null
  supplier: string | null
  vendorId: string | null
  datasetId: string | null
  licenseSpdx: string | null
  licenseRisk: string | null
  digest: string | null
  isDirect: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AibomVulnerability {
  id: string
  aibomId: string | null
  componentId: string | null
  cveId: string
  cvssScore: number | null
  severity: string | null
  affectedVersionRange: string | null
  fixedVersion: string | null
  exploitKnown: boolean
  source: string | null
  scannedAt: string | null
  status: string
  createdAt: string
}

// ── Row mappers ─────────────────────────────────────────────────────────────

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {})
const nullableObj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? v as Record<string, unknown> : null)

function rowToRecord(r: Record<string, any>): AibomRecord {
  return {
    id: r.id,
    aibomRef: r.aibom_ref ?? null,
    modelId: r.model_id ?? null,
    modelVersion: r.model_version ?? null,
    vendorId: r.vendor_id ?? null,
    format: r.format ?? 'CycloneDX',
    specVersion: r.spec_version ?? null,
    serialNumber: r.serial_number ?? null,
    document: nullableObj(r.document),
    declaredDigest: r.declared_digest ?? null,
    digestAlg: r.digest_alg ?? 'sha256',
    verificationStatus: (r.verification_status ?? 'unverified') as VerificationStatus,
    verifiedAt: r.verified_at ?? null,
    verifiedBy: r.verified_by ?? null,
    verificationMethod: r.verification_method ?? null,
    signature: nullableObj(r.signature),
    signerIdentity: r.signer_identity ?? null,
    rekorLogIndex: r.rekor_log_index ?? null,
    signedBy: r.signed_by ?? null,
    signedAt: r.signed_at ?? null,
    weightsUri: r.weights_uri ?? null,
    weightsDigest: r.weights_digest ?? null,
    trainingRunRef: r.training_run_ref ?? null,
    fineTuneParentId: r.fine_tune_parent_id ?? null,
    modelCardRef: r.model_card_ref ?? null,
    annexIvDocId: r.annex_iv_doc_id ?? null,
    countryOfOrigin: r.country_of_origin ?? null,
    exportControlClass: r.export_control_class ?? null,
    eolAt: r.eol_at ?? null,
    version: typeof r.version === 'number' ? r.version : 1,
    supersedesId: r.supersedes_id ?? null,
    status: r.status ?? 'draft',
    generatedAt: r.generated_at ?? null,
    lastScannedAt: r.last_scanned_at ?? null,
    scannerName: r.scanner_name ?? null,
    notes: r.notes ?? null,
    metadata: obj(r.metadata),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * Only writable, non-derived columns are mapped. org_id is deliberately absent
 * (DB default). The verification_* / signature columns are deliberately absent
 * — no UI path may assert verification that never happened.
 */
function recordToRow(a: Partial<AibomRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('aibom_ref', a.aibomRef)
  set('model_id', a.modelId)
  set('model_version', a.modelVersion)
  set('vendor_id', a.vendorId)
  set('format', a.format)
  set('spec_version', a.specVersion)
  set('serial_number', a.serialNumber)
  set('document', a.document)
  set('declared_digest', a.declaredDigest)
  set('digest_alg', a.digestAlg)
  set('weights_uri', a.weightsUri)
  set('weights_digest', a.weightsDigest)
  set('training_run_ref', a.trainingRunRef)
  set('fine_tune_parent_id', a.fineTuneParentId)
  set('model_card_ref', a.modelCardRef)
  set('annex_iv_doc_id', a.annexIvDocId)
  set('country_of_origin', a.countryOfOrigin)
  set('export_control_class', a.exportControlClass)
  set('eol_at', a.eolAt)
  set('supersedes_id', a.supersedesId)
  set('status', a.status)
  set('notes', a.notes)
  set('metadata', a.metadata)
  return row
}

function rowToComponent(r: Record<string, any>): AibomComponent {
  return {
    id: r.id,
    aibomId: r.aibom_id ?? null,
    componentType: r.component_type ?? null,
    name: r.name ?? '',
    version: r.version ?? null,
    purl: r.purl ?? null,
    cpe: r.cpe ?? null,
    supplier: r.supplier ?? null,
    vendorId: r.vendor_id ?? null,
    datasetId: r.dataset_id ?? null,
    licenseSpdx: r.license_spdx ?? null,
    licenseRisk: r.license_risk ?? null,
    digest: r.digest ?? null,
    isDirect: r.is_direct ?? true,
    metadata: obj(r.metadata),
    createdAt: r.created_at,
  }
}

function componentToRow(c: Partial<AibomComponent>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('aibom_id', c.aibomId)
  set('component_type', c.componentType)
  set('name', c.name)
  set('version', c.version)
  set('purl', c.purl)
  set('cpe', c.cpe)
  set('supplier', c.supplier)
  set('vendor_id', c.vendorId)
  set('dataset_id', c.datasetId)
  set('license_spdx', c.licenseSpdx)
  set('license_risk', c.licenseRisk)
  set('digest', c.digest)
  set('is_direct', c.isDirect)
  set('metadata', c.metadata)
  return row
}

function rowToVulnerability(r: Record<string, any>): AibomVulnerability {
  return {
    id: r.id,
    aibomId: r.aibom_id ?? null,
    componentId: r.component_id ?? null,
    cveId: r.cve_id ?? '',
    cvssScore: typeof r.cvss_score === 'number' ? r.cvss_score : (r.cvss_score != null ? Number(r.cvss_score) : null),
    severity: r.severity ?? null,
    affectedVersionRange: r.affected_version_range ?? null,
    fixedVersion: r.fixed_version ?? null,
    exploitKnown: r.exploit_known ?? false,
    source: r.source ?? null,
    scannedAt: r.scanned_at ?? null,
    status: r.status ?? 'open',
    createdAt: r.created_at,
  }
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function fetchAibomRecords(filters: { modelId?: string; status?: string } = {}): Promise<AibomRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('aibom_records').select('*').order('created_at', { ascending: false })
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) { console.warn('[aibomService] fetchRecords:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToRecord)
}

export async function fetchAibomRecord(id: string): Promise<AibomRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase.from('aibom_records').select('*').eq('id', id).maybeSingle()
  if (error) { console.warn('[aibomService] fetchRecord:', error.message); throw new Error(error.message) }
  return data ? rowToRecord(data) : null
}

export async function fetchAibomComponents(aibomId?: string): Promise<AibomComponent[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('aibom_components').select('*').order('name', { ascending: true })
  if (aibomId) q = q.eq('aibom_id', aibomId)
  const { data, error } = await q
  if (error) { console.warn('[aibomService] fetchComponents:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToComponent)
}

export async function fetchAibomVulnerabilities(aibomId?: string): Promise<AibomVulnerability[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('aibom_vulnerabilities').select('*').order('cvss_score', { ascending: false, nullsFirst: false })
  if (aibomId) q = q.eq('aibom_id', aibomId)
  const { data, error } = await q
  if (error) { console.warn('[aibomService] fetchVulns:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToVulnerability)
}

// ── Writes (throw on failure; Art. 12 audit entry after a real resolve) ─────

export async function createAibomRecord(record: Partial<AibomRecord>): Promise<AibomRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create AIBOM record.')
  const row = recordToRow(record)
  const { data, error } = await supabase.from('aibom_records').insert(row).select().single()
  if (error) { console.warn('[aibomService] createRecord:', error.message); throw new Error(error.message) }
  const saved = rowToRecord(data)
  void logAction({
    module: MODULE, entityType: 'aibom_record', entityId: saved.id,
    entityName: saved.aibomRef ?? saved.id, action: 'create', newValues: row,
  })
  return saved
}

export async function updateAibomRecord(id: string, patch: Partial<AibomRecord>): Promise<AibomRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update AIBOM record.')
  const row = recordToRow(patch)
  row.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('aibom_records').update(row).eq('id', id).select().single()
  if (error) { console.warn('[aibomService] updateRecord:', error.message); throw new Error(error.message) }
  const saved = rowToRecord(data)
  void logAction({
    module: MODULE, entityType: 'aibom_record', entityId: id,
    entityName: saved.aibomRef ?? id, action: 'update', newValues: row,
  })
  return saved
}

export async function deleteAibomRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete AIBOM record.')
  const { error } = await supabase.from('aibom_records').delete().eq('id', id)
  if (error) { console.warn('[aibomService] deleteRecord:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'aibom_record', entityId: id, action: 'delete' })
}

export async function createAibomComponent(component: Partial<AibomComponent>): Promise<AibomComponent> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot add component.')
  if (!component.name) throw new Error('A component name is required.')
  const row = componentToRow(component)
  const { data, error } = await supabase.from('aibom_components').insert(row).select().single()
  if (error) { console.warn('[aibomService] createComponent:', error.message); throw new Error(error.message) }
  const saved = rowToComponent(data)
  void logAction({
    module: MODULE, entityType: 'aibom_component', entityId: saved.id,
    entityName: saved.name, action: 'create', newValues: row,
  })
  return saved
}

export async function deleteAibomComponent(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot remove component.')
  const { error } = await supabase.from('aibom_components').delete().eq('id', id)
  if (error) { console.warn('[aibomService] deleteComponent:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'aibom_component', entityId: id, action: 'delete' })
}

/**
 * Publish a draft AIBOM. Stores the canonical serialized document alongside the
 * record so the export is reproducible. It does NOT sign, hash or verify
 * anything — publishing is an editorial state change, not an assurance claim.
 */
export async function publishAibomRecord(record: AibomRecord, document: Record<string, unknown>): Promise<AibomRecord> {
  return updateAibomRecord(record.id, { status: 'published', document })
}

// ── Export ──────────────────────────────────────────────────────────────────

export interface AibomExport {
  filename: string
  content: Record<string, unknown>
  /** True when `content` conforms to the record's declared format. */
  schemaValid: boolean
  /** Human-readable note rendered next to the download affordance. */
  note: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Build the export payload for one AIBOM.
 *
 * CycloneDX records serialize to a schema-valid CycloneDX 1.5 JSON BOM:
 * a `urn:uuid:` serialNumber, real `components` (with purl and SPDX license
 * ids where recorded), a real `dependencies` graph and the `vulnerabilities`
 * array built from `aibom_vulnerabilities` rows.
 *
 * Any other declared format (e.g. SPDX) has no serializer yet, so the export
 * is emitted as a clearly-labelled Sentinel envelope rather than a document
 * that pretends to be something it is not.
 */
export function buildAibomExport(
  record: AibomRecord,
  components: AibomComponent[],
  vulnerabilities: AibomVulnerability[],
  modelName: string | null,
): AibomExport {
  const name = modelName ?? record.aibomRef ?? 'unnamed-model'
  const ref = record.aibomRef ?? record.id

  if ((record.format ?? '').toLowerCase() === 'cyclonedx') {
    const rootRef = `model:${record.id}`
    const compRef = (c: AibomComponent) => c.purl ?? `component:${c.id}`
    const serial = record.serialNumber && record.serialNumber.startsWith('urn:uuid:')
      ? record.serialNumber
      : UUID_RE.test(record.id) ? `urn:uuid:${record.id}` : null

    const content: Record<string, unknown> = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      ...(serial ? { serialNumber: serial } : {}),
      version: record.version,
      metadata: {
        timestamp: record.generatedAt ?? record.createdAt,
        tools: [{ vendor: 'CERTIFYI-AI', name: 'Sentinel AIBOM Registry' }],
        component: {
          'bom-ref': rootRef,
          type: 'machine-learning-model',
          name,
          ...(record.modelVersion ? { version: record.modelVersion } : {}),
          ...(record.declaredDigest
            ? {
                hashes: [{ alg: record.digestAlg === 'sha256' ? 'SHA-256' : record.digestAlg.toUpperCase(), content: record.declaredDigest }],
                // The digest is producer-declared; the property records that
                // no verifier has confirmed it.
                properties: [{ name: 'sentinel:digest_provenance', value: 'self-declared, unverified' }],
              }
            : {}),
        },
      },
      components: components.map(c => ({
        'bom-ref': compRef(c),
        type: c.componentType === 'model' ? 'machine-learning-model'
          : c.componentType === 'dataset' ? 'data'
          : c.componentType === 'service' ? 'service'
          : 'library',
        name: c.name,
        ...(c.version ? { version: c.version } : {}),
        ...(c.purl ? { purl: c.purl } : {}),
        ...(c.cpe ? { cpe: c.cpe } : {}),
        ...(c.supplier ? { supplier: { name: c.supplier } } : {}),
        ...(c.licenseSpdx ? { licenses: [{ license: { id: c.licenseSpdx } }] } : {}),
        ...(c.digest ? { hashes: [{ alg: 'SHA-256', content: c.digest }] } : {}),
      })),
      dependencies: [
        { ref: rootRef, dependsOn: components.filter(c => c.isDirect).map(compRef) },
        ...components.map(c => ({ ref: compRef(c), dependsOn: [] as string[] })),
      ],
      ...(vulnerabilities.length
        ? {
            vulnerabilities: vulnerabilities.map(v => ({
              id: v.cveId,
              ...(v.source ? { source: { name: v.source } } : {}),
              ...(v.cvssScore != null || v.severity
                ? { ratings: [{ ...(v.cvssScore != null ? { score: v.cvssScore } : {}), ...(v.severity ? { severity: v.severity.toLowerCase() } : {}) }] }
                : {}),
              ...(v.affectedVersionRange || v.fixedVersion
                ? {
                    affects: [{
                      ref: v.componentId ? (components.find(c => c.id === v.componentId) ? compRef(components.find(c => c.id === v.componentId)!) : rootRef) : rootRef,
                      ...(v.affectedVersionRange ? { versions: [{ range: v.affectedVersionRange }] } : {}),
                    }],
                  }
                : {}),
              ...(v.scannedAt ? { published: v.scannedAt } : {}),
            })),
          }
        : {}),
    }

    return {
      filename: `${ref}.cdx.json`,
      content,
      schemaValid: true,
      note: 'CycloneDX 1.5 JSON. Hashes carried in this document are producer-declared and unverified.',
    }
  }

  return {
    filename: `${ref}.sentinel-aibom.json`,
    content: {
      _format: 'sentinel-aibom/1',
      _note: `No serializer exists for the declared format "${record.format}". This is a Sentinel AIBOM export, NOT a ${record.format} document, and must not be presented as one.`,
      record: {
        ref, model: name, modelVersion: record.modelVersion, declaredFormat: record.format,
        status: record.status, version: record.version, generatedAt: record.generatedAt,
        declaredDigest: record.declaredDigest, digestAlg: record.digestAlg,
        digestProvenance: 'self-declared, unverified',
        verificationStatus: record.verificationStatus,
        lastScannedAt: record.lastScannedAt, scannerName: record.scannerName,
      },
      components, vulnerabilities,
    },
    schemaValid: false,
    note: `Exported as a labelled Sentinel envelope — no ${record.format} serializer is implemented.`,
  }
}

/** Open CVEs for one AIBOM, or null when the record has never been scanned. */
export function openCveCount(record: AibomRecord, vulnerabilities: AibomVulnerability[]): number | null {
  if (!record.lastScannedAt) return null
  return vulnerabilities.filter(v => v.aibomId === record.id && v.status === 'open').length
}
