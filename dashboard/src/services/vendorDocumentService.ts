// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// vendorDocumentService — the real, org-scoped `public.vendor_documents` table
// plus Supabase Storage (supabase/migrations/20260822000001).
//
// Before this existed, the Vendor Upload portal's entire effect was a toast:
// no file left the browser. Now the object is uploaded to the `evidence`
// bucket under `vendor-documents/<vendorId>/…`, its sha-256 digest is stored
// so the artefact's integrity is verifiable, and the row references the vendor
// by uuid.
//
// Reviewer identity comes from `supabase.auth.getUser()` — never a hardcoded
// name. A review with no authenticated reviewer is rejected outright.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const BUCKET = 'evidence'
const PREFIX = 'vendor-documents'

export type VendorDocumentStatus = 'pending_review' | 'accepted' | 'rejected' | 'expired'

export const DOCUMENT_TYPES = [
  'SOC2', 'ISO Certificate', 'DPA', 'Pentest', 'Insurance',
  'AIBOM', 'Model Card', 'Security Questionnaire', 'Other',
] as const

export interface VendorDocumentRecord {
  id: string
  documentRef?: string | null
  vendorId?: string | null
  docType?: string | null
  title?: string | null
  fileName?: string | null
  storagePath?: string | null
  fileDigest?: string | null
  fileSizeBytes?: number | null
  confidentiality?: string | null
  virusScanStatus?: string | null
  version: number
  supersedesId?: string | null
  validFrom?: string | null
  expiresAt?: string | null
  renewalLeadDays?: number | null
  retentionUntil?: string | null
  status: VendorDocumentStatus
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
  satisfiesControlIds: string[]
  assessmentId?: string | null
  uploadedBy?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function fromRow(r: Record<string, any>): VendorDocumentRecord {
  return {
    id: r.id,
    documentRef: r.document_ref ?? null,
    vendorId: r.vendor_id ?? null,
    docType: r.doc_type ?? null,
    title: r.title ?? null,
    fileName: r.file_name ?? null,
    storagePath: r.storage_path ?? null,
    fileDigest: r.file_digest ?? null,
    fileSizeBytes: numOrNull(r.file_size_bytes),
    confidentiality: r.confidentiality ?? null,
    virusScanStatus: r.virus_scan_status ?? null,
    version: Number(r.version ?? 1),
    supersedesId: r.supersedes_id ?? null,
    validFrom: r.valid_from ?? null,
    expiresAt: r.expires_at ?? null,
    renewalLeadDays: numOrNull(r.renewal_lead_days),
    retentionUntil: r.retention_until ?? null,
    status: (r.status ?? 'pending_review') as VendorDocumentStatus,
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    reviewNotes: r.review_notes ?? null,
    satisfiesControlIds: Array.isArray(r.satisfies_control_ids) ? r.satisfies_control_ids : [],
    assessmentId: r.assessment_id ?? null,
    uploadedBy: r.uploaded_by ?? null,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(d: Partial<VendorDocumentRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (col: string, val: unknown) => { if (val !== undefined) row[col] = val }
  set('document_ref', d.documentRef)
  set('vendor_id', d.vendorId || null)
  set('doc_type', d.docType)
  set('title', d.title)
  set('file_name', d.fileName)
  set('storage_path', d.storagePath)
  set('file_digest', d.fileDigest)
  set('file_size_bytes', d.fileSizeBytes)
  set('confidentiality', d.confidentiality)
  set('virus_scan_status', d.virusScanStatus)
  set('version', d.version)
  set('supersedes_id', d.supersedesId || null)
  set('valid_from', d.validFrom || null)
  set('expires_at', d.expiresAt || null)
  set('renewal_lead_days', d.renewalLeadDays)
  set('retention_until', d.retentionUntil || null)
  set('status', d.status)
  set('review_notes', d.reviewNotes)
  set('satisfies_control_ids', d.satisfiesControlIds)
  set('assessment_id', d.assessmentId || null)
  set('metadata', d.metadata)
  row.updated_at = new Date().toISOString()
  return row
}

// ── reads ──────────────────────────────────────────────────────────────────

export async function fetchVendorDocuments(vendorId?: string): Promise<VendorDocumentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('vendor_documents').select('*').order('created_at', { ascending: false })
  if (vendorId) q = q.eq('vendor_id', vendorId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function fetchVendorDocumentById(id: string): Promise<VendorDocumentRecord | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  const { data, error } = await supabase.from('vendor_documents').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

/** Time-limited signed URL for the stored object. Returns null when the row
 *  carries no storage path (nothing was ever uploaded) so the UI can disable
 *  the download affordance instead of offering a link that 404s. */
export async function getVendorDocumentUrl(storagePath?: string | null): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase || !storagePath) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 300)
  if (error) throw new Error(error.message)
  return data?.signedUrl ?? null
}

// ── writes ─────────────────────────────────────────────────────────────────

async function sha256Hex(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Subtle crypto is unavailable on insecure origins. Store no digest rather
    // than a fabricated one — the field stays NULL and renders as "—".
    return null
  }
}

/**
 * Upload the file to Storage, then insert the row. If the row insert fails the
 * orphaned object is removed, so a failure never leaves a file with no record
 * (or a record with no file). Throws on any failure — the caller shows the
 * real error and the dialog stays open.
 */
export async function uploadVendorDocument(params: {
  file: File
  vendorId: string
  docType: string
  title?: string
  validFrom?: string
  expiresAt?: string
  confidentiality?: string
  supersedesId?: string
  assessmentId?: string
  renewalLeadDays?: number
  /** controls.id (uuid) — the framework controls this document evidences. */
  satisfiesControlIds?: string[]
}): Promise<VendorDocumentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot upload document.')
  if (!params.vendorId) throw new Error('Select a vendor before uploading.')
  if (!params.file) throw new Error('No file selected.')

  const safeName = params.file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${PREFIX}/${params.vendorId}/${Date.now()}_${safeName}`

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, params.file, { upsert: false })
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

  const digest = await sha256Hex(params.file)

  // A superseding upload bumps the version chain off the record it replaces.
  let version = 1
  if (params.supersedesId) {
    const prev = await fetchVendorDocumentById(params.supersedesId)
    if (prev) version = prev.version + 1
  }

  const row = toRow({
    vendorId: params.vendorId,
    docType: params.docType,
    title: params.title || params.file.name,
    fileName: params.file.name,
    storagePath: path,
    fileDigest: digest,
    fileSizeBytes: params.file.size,
    confidentiality: params.confidentiality,
    validFrom: params.validFrom,
    expiresAt: params.expiresAt,
    renewalLeadDays: params.renewalLeadDays,
    supersedesId: params.supersedesId,
    assessmentId: params.assessmentId,
    satisfiesControlIds: params.satisfiesControlIds,
    version,
    status: 'pending_review',
  })

  const { data, error } = await supabase.from('vendor_documents').insert(row).select().single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_documents', entityId: saved.id,
    entityName: saved.fileName ?? undefined, action: 'upload',
    newValues: { vendorId: saved.vendorId, docType: saved.docType, storagePath: path, fileDigest: digest },
  })
  return saved
}

/**
 * Accept or reject a submitted document. `reviewed_by` is the authenticated
 * user's uuid, resolved here — there is no parameter for it, so no caller can
 * pass a name in. Without a session the review is refused.
 */
export async function reviewVendorDocument(params: {
  id: string
  decision: 'accepted' | 'rejected'
  notes?: string
}): Promise<VendorDocumentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot review document.')
  const { data: auth } = await supabase.auth.getUser()
  const reviewerId = auth?.user?.id
  if (!reviewerId) throw new Error('You must be signed in to review a document.')

  const before = await fetchVendorDocumentById(params.id)
  const { data, error } = await supabase
    .from('vendor_documents')
    .update({
      status: params.decision,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: params.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_documents', entityId: saved.id,
    entityName: saved.fileName ?? undefined, action: `review.${params.decision}`,
    oldValues: before ?? undefined,
    newValues: { status: params.decision, reviewedBy: reviewerId, notes: params.notes ?? null },
  })
  return saved
}

export async function updateVendorDocument(
  id: string, patch: Partial<VendorDocumentRecord>,
): Promise<VendorDocumentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save document.')
  const before = await fetchVendorDocumentById(id)
  const row = toRow(patch)
  const { data, error } = await supabase.from('vendor_documents').update(row).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_documents', entityId: id,
    entityName: saved.fileName ?? undefined, action: 'update',
    oldValues: before ?? undefined, newValues: row,
  })
  return saved
}

export async function deleteVendorDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete document.')
  const before = await fetchVendorDocumentById(id)
  const { error } = await supabase.from('vendor_documents').delete().eq('id', id)
  if (error) throw new Error(error.message)
  if (before?.storagePath) {
    // Best effort: the row is the record of truth, and a failed object delete
    // must not resurrect a deleted record.
    await supabase.storage.from(BUCKET).remove([before.storagePath])
  }
  void logAction({
    module: 'vendors', entityType: 'vendor_documents', entityId: id,
    entityName: before?.fileName ?? undefined, action: 'delete', oldValues: before ?? undefined,
  })
}

/** Documents expiring within `days` — computed from the real expires_at
 *  column, not a literal. Rows with no expiry are excluded, not counted. */
export function documentsExpiringWithin(docs: VendorDocumentRecord[], days: number): VendorDocumentRecord[] {
  const now = Date.now()
  const horizon = now + days * 24 * 60 * 60 * 1000
  return docs.filter((d) => {
    if (!d.expiresAt) return false
    const t = new Date(d.expiresAt).getTime()
    return Number.isFinite(t) && t >= now && t <= horizon
  })
}
