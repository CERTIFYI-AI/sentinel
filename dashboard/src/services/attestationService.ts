// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// attestationService — the supply-chain attestation register: the evidence
// record behind bias audits, DPIAs, security reviews and AIBOM verification.
//
// Reads go through the view `supply_chain_attestation_status`, which adds
// `derived_validity` computed from `valid_until` and `revoked_at` in the
// database. Validity is therefore a function of today, never of an authored
// status literal — the page used to report "Within Validity Period: PASS"
// purely because somebody had left status = 'Valid'.
//
// Writes go to the REAL org-scoped table `supply_chain_attestations` (not the
// cross-tenant `supplychainattestations_table` demo table the page used to
// write to). org_id is filled by the DB default `current_user_org_id()`.
//
// INTEGRITY HONESTY CONTRACT: `declaredDigest` is producer-declared and is
// evidence of nothing. `verificationStatus` / `verifiedAt` / `verifiedBy` /
// `verificationMethod` / `signature` are verifier-owned and are never written
// from the UI, so they stay 'unverified' until real DSSE/Sigstore verification
// ships. Nothing in this module may be described as "cryptographically signed".
//
// Writes throw on failure; every state change writes an Art. 12 audit entry.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'supply-chain-attestations'
const TABLE = 'supply_chain_attestations'
const VIEW = 'supply_chain_attestation_status'

/** DB-derived; never authored. 'unknown' = no valid_until recorded. */
export type DerivedValidity = 'valid' | 'expiring_soon' | 'expired' | 'revoked' | 'unknown'

export type AttestationSubjectType = 'model' | 'dataset' | 'vendor' | 'pipeline'

export interface Attestation {
  id: string
  attestationRef: string | null
  attestationType: string | null
  /** Editorial workflow state (draft/pending/accepted/rejected) — NOT validity. */
  status: string
  subjectType: string | null
  subjectId: string | null
  modelId: string | null
  vendorId: string | null
  scope: string | null
  findings: string | null
  attestedBy: string | null
  attestorUserId: string | null
  attestorOrg: string | null
  attestorIsIndependent: boolean | null
  attestorAccreditation: string | null
  issuedAt: string | null
  validUntil: string | null
  declaredDigest: string | null
  verificationStatus: string
  verifiedAt: string | null
  verifiedBy: string | null
  verificationMethod: string | null
  signature: Record<string, unknown> | null
  signerIdentity: string | null
  rekorLogIndex: string | null
  revokedAt: string | null
  revocationReason: string | null
  supersededBy: string | null
  renewalTaskId: string | null
  frameworkControlIds: string[]
  evidenceIds: string[]
  reviewNotes: string | null
  /** Computed by the view. Read-only. */
  derivedValidity: DerivedValidity
  createdAt: string
  updatedAt: string
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])
const nullableObj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' ? v as Record<string, unknown> : null)

function rowToAttestation(r: Record<string, any>): Attestation {
  return {
    id: r.id,
    attestationRef: r.attestation_ref ?? null,
    attestationType: r.attestation_type ?? r.type ?? null,
    status: r.status ?? 'draft',
    subjectType: r.subject_type ?? null,
    subjectId: r.subject_id ?? null,
    modelId: r.model_id ?? null,
    vendorId: r.vendor_id ?? null,
    scope: r.scope ?? null,
    findings: r.findings ?? null,
    attestedBy: r.attested_by ?? null,
    attestorUserId: r.attestor_user_id ?? null,
    attestorOrg: r.attestor_org ?? null,
    attestorIsIndependent: r.attestor_is_independent ?? null,
    attestorAccreditation: r.attestor_accreditation ?? null,
    issuedAt: r.issued_at ?? null,
    validUntil: r.valid_until ?? null,
    declaredDigest: r.declared_digest ?? null,
    verificationStatus: r.verification_status ?? 'unverified',
    verifiedAt: r.verified_at ?? null,
    verifiedBy: r.verified_by ?? null,
    verificationMethod: r.verification_method ?? null,
    signature: nullableObj(r.signature),
    signerIdentity: r.signer_identity ?? null,
    rekorLogIndex: r.rekor_log_index ?? null,
    revokedAt: r.revoked_at ?? null,
    revocationReason: r.revocation_reason ?? null,
    supersededBy: r.superseded_by ?? null,
    renewalTaskId: r.renewal_task_id ?? null,
    frameworkControlIds: arr(r.framework_control_ids),
    evidenceIds: arr(r.evidence_ids),
    reviewNotes: r.review_notes ?? null,
    derivedValidity: (r.derived_validity ?? 'unknown') as DerivedValidity,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * Only writable columns. `derived_validity` is a view expression, and the
 * verification_* / signature columns are verifier-owned — both are deliberately
 * absent so no UI path can assert assurance that never happened.
 */
function attestationToRow(a: Partial<Attestation>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('attestation_ref', a.attestationRef)
  set('attestation_type', a.attestationType)
  // The generic shell column `type` mirrors attestation_type so legacy list
  // views and the search index keep working.
  set('type', a.attestationType)
  set('name', a.attestationRef)
  set('status', a.status)
  set('subject_type', a.subjectType)
  set('subject_id', a.subjectId)
  set('model_id', a.modelId)
  set('vendor_id', a.vendorId)
  set('scope', a.scope)
  set('findings', a.findings)
  set('attested_by', a.attestedBy)
  set('attestor_user_id', a.attestorUserId)
  set('attestor_org', a.attestorOrg)
  set('attestor_is_independent', a.attestorIsIndependent)
  set('attestor_accreditation', a.attestorAccreditation)
  set('issued_at', a.issuedAt)
  set('valid_until', a.validUntil)
  set('declared_digest', a.declaredDigest)
  set('revoked_at', a.revokedAt)
  set('revocation_reason', a.revocationReason)
  set('superseded_by', a.supersededBy)
  set('renewal_task_id', a.renewalTaskId)
  set('framework_control_ids', a.frameworkControlIds)
  set('evidence_ids', a.evidenceIds)
  set('review_notes', a.reviewNotes)
  return row
}

// ── Reads (through the view, for derived_validity) ──────────────────────────

export async function fetchAttestations(filters: { modelId?: string; vendorId?: string } = {}): Promise<Attestation[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from(VIEW).select('*').order('created_at', { ascending: false })
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  if (filters.vendorId) q = q.eq('vendor_id', filters.vendorId)
  const { data, error } = await q
  if (error) { console.warn('[attestationService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToAttestation)
}

export async function fetchAttestation(id: string): Promise<Attestation | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase.from(VIEW).select('*').eq('id', id).maybeSingle()
  if (error) { console.warn('[attestationService] fetchOne:', error.message); throw new Error(error.message) }
  return data ? rowToAttestation(data) : null
}

// ── Writes (to the real table) ─────────────────────────────────────────────

/** Re-read through the view so the caller gets the DB-derived validity back. */
async function readBack(id: string): Promise<Attestation> {
  const fresh = await fetchAttestation(id)
  if (!fresh) throw new Error('Attestation saved but could not be read back.')
  return fresh
}

export async function createAttestation(a: Partial<Attestation>): Promise<Attestation> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create attestation.')
  if (!a.attestationType) throw new Error('An attestation type is required.')
  if (!a.subjectType || !a.subjectId) throw new Error('An attestation must name the subject it describes.')
  const row = attestationToRow(a)
  const { data, error } = await supabase.from(TABLE).insert(row).select('id').single()
  if (error) { console.warn('[attestationService] create:', error.message); throw new Error(error.message) }
  const saved = await readBack(data.id)
  void logAction({
    module: MODULE, entityType: 'supply_chain_attestation', entityId: saved.id,
    entityName: saved.attestationRef ?? saved.attestationType ?? saved.id,
    action: 'create', newValues: row,
  })
  return saved
}

export async function updateAttestation(id: string, patch: Partial<Attestation>, previous?: Attestation): Promise<Attestation> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update attestation.')
  const row = attestationToRow(patch)
  row.updated_at = new Date().toISOString()
  const { error } = await supabase.from(TABLE).update(row).eq('id', id)
  if (error) { console.warn('[attestationService] update:', error.message); throw new Error(error.message) }
  const saved = await readBack(id)
  void logAction({
    module: MODULE, entityType: 'supply_chain_attestation', entityId: id,
    entityName: saved.attestationRef ?? saved.attestationType ?? id,
    action: 'update', oldValues: previous ?? null, newValues: row,
  })
  return saved
}

export async function deleteAttestation(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete attestation.')
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) { console.warn('[attestationService] delete:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'supply_chain_attestation', entityId: id, action: 'delete' })
}

/**
 * Revoke an attestation. Revocation is a real, dated state change — the view
 * reports derived_validity = 'revoked' from `revoked_at` immediately.
 */
export async function revokeAttestation(a: Attestation, reason: string): Promise<Attestation> {
  if (!reason.trim()) throw new Error('A revocation reason is required.')
  return updateAttestation(a.id, { revokedAt: new Date().toISOString(), revocationReason: reason.trim() }, a)
}

/**
 * Renew an attestation by creating a real successor record and pointing the
 * predecessor at it via `superseded_by`. The old "Renew" button fired a toast
 * and closed a drawer without writing anything.
 *
 * The successor starts at status 'pending' with NO findings copied: a renewal
 * has not been performed yet, and carrying the previous cycle's findings
 * forward would assert an assessment that never happened.
 */
export async function renewAttestation(previous: Attestation, validUntil: string): Promise<Attestation> {
  if (!validUntil) throw new Error('A new expiry date is required to renew an attestation.')
  const successor = await createAttestation({
    attestationRef: previous.attestationRef ? `${previous.attestationRef}-R${(previous.attestationRef.match(/-R(\d+)$/) ? Number(previous.attestationRef.match(/-R(\d+)$/)![1]) + 1 : 1)}` : null,
    attestationType: previous.attestationType,
    status: 'pending',
    subjectType: previous.subjectType,
    subjectId: previous.subjectId,
    modelId: previous.modelId,
    vendorId: previous.vendorId,
    scope: previous.scope,
    findings: null,
    attestedBy: null,
    attestorOrg: previous.attestorOrg,
    attestorIsIndependent: previous.attestorIsIndependent,
    attestorAccreditation: previous.attestorAccreditation,
    issuedAt: null,
    validUntil,
    frameworkControlIds: previous.frameworkControlIds,
    evidenceIds: [],
    reviewNotes: null,
  })
  await updateAttestation(previous.id, { supersededBy: successor.id }, previous)
  void logAction({
    module: MODULE, entityType: 'supply_chain_attestation', entityId: previous.id,
    entityName: previous.attestationRef ?? previous.id, action: 'renew',
    newValues: { superseded_by: successor.id, successor_valid_until: validUntil },
  })
  return successor
}

// ── Derived-validity presentation helpers (single source of truth) ──────────

export const VALIDITY_LABEL: Record<DerivedValidity, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  revoked: 'Revoked',
  unknown: 'No expiry recorded',
}

export const VALIDITY_TONE: Record<DerivedValidity, { bg: string; color: string }> = {
  valid: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  expiring_soon: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  expired: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  revoked: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  unknown: { bg: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' },
}
