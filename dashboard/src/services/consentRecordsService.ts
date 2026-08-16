// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Consent records (`consent_records`) — the evidence that a data subject gave,
// and has not withdrawn, consent for a stated set of purposes (GDPR Art. 7).
//
// Three earlier defects, all silent:
//
//   * writes sent a client-chosen `tenant_id` and swallowed every error, so a
//     failed write returned the input record and the UI reported success —
//     fixed in the previous pass; tenant_id now comes from the DB default;
//   * `status` was unconstrained and the table stored 'active' while the page
//     counted 'granted', so "Active Consents" read 0 against six active
//     consents. The vocabulary is now CHECK-constrained to the four values
//     below and 'active' was migrated to 'granted';
//   * four records carried the literal tenant_id 'default', left by an old
//     column default. Every RLS policy reads tenant_id = current_user_org_id(),
//     so those rows were invisible: the register displayed 6 of its 10
//     records with nothing in the UI to reveal the gap.
//
// Under Art. 7(1) the controller must be able to *demonstrate* consent. A
// record that cannot be read is indistinguishable from consent never obtained,
// which is why both the write path and the read path matter here.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

/** Fixed by consent_records_status_check. */
export const CONSENT_STATUSES = ['granted', 'pending', 'withdrawn', 'expired'] as const
export type ConsentStatus = (typeof CONSENT_STATUSES)[number]

/** Fixed by consent_records_type_check. */
export const CONSENT_TYPES = ['explicit', 'implicit', 'opt_out'] as const
export type ConsentType = (typeof CONSENT_TYPES)[number]

/**
 * Fixed by consent_records_legal_basis_check — deliberately the same six
 * values as ropa_records.legal_basis, so a consent record can be reconciled
 * against the Art. 30 activity it makes lawful.
 */
export const CONSENT_LEGAL_BASES = [
  'consent', 'contract', 'legal_obligation', 'vital_interests',
  'public_task', 'legitimate_interests',
] as const

export const CONSENT_STATUS_LABEL: Record<ConsentStatus, string> = {
  granted: 'Granted', pending: 'Pending', withdrawn: 'Withdrawn', expired: 'Expired',
}

export const CONSENT_TYPE_LABEL: Record<ConsentType, string> = {
  explicit: 'Explicit', implicit: 'Implicit', opt_out: 'Opt-out',
}

export const LEGAL_BASIS_LABEL: Record<string, string> = {
  consent: 'Consent', contract: 'Contract', legal_obligation: 'Legal obligation',
  vital_interests: 'Vital interests', public_task: 'Public task',
  legitimate_interests: 'Legitimate interests',
}

/** Capture channels seen in practice; free text is still accepted. */
export const CONSENT_CHANNELS = [
  'Web Portal', 'Mobile App', 'Branch', 'API', 'Email', 'Phone',
] as const

export interface ConsentRecord {
  id: string
  /** Citable reference (CNS-YYYY-NNN). The uuid is never shown. */
  consentRef?: string
  /** Pseudonymous subject reference — never a raw identifier in the UI. */
  subjectRef?: string
  type: ConsentType
  legalBasis?: string
  purposes: string[]
  status: ConsentStatus
  consentDate?: string | null
  expiryDate?: string | null
  withdrawalDate?: string | null
  withdrawalReason?: string
  /** Display name and contact for the subject, where lawfully retained. */
  subjectName?: string
  subjectEmail?: string
  dataCategories: string[]
  /** Which AI systems this consent actually covers — the governance interlink. */
  linkedModelIds: string[]
  /** The Art. 30 processing activity this consent makes lawful. */
  linkedRopaId?: string | null
  version?: string
  ipAddress?: string
  channel?: string
  /** Derived, never stored: expiry has passed but the row still says granted. */
  isLapsed: boolean
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): ConsentRecord {
  const status = (r.status ?? 'pending') as ConsentStatus
  const expired = !!r.expiry_date && new Date(r.expiry_date).getTime() < Date.now()
  return {
    id: r.id,
    consentRef: r.consent_ref ?? undefined,
    subjectRef: r.subject_ref ?? undefined,
    type: (r.type ?? 'explicit') as ConsentType,
    legalBasis: r.legal_basis ?? undefined,
    purposes: Array.isArray(r.purposes) ? r.purposes : [],
    status,
    consentDate: r.consent_date ?? null,
    expiryDate: r.expiry_date ?? null,
    withdrawalDate: r.withdrawal_date ?? null,
    withdrawalReason: r.withdrawal_reason ?? undefined,
    subjectName: r.subject_name ?? undefined,
    subjectEmail: r.subject_email ?? undefined,
    dataCategories: Array.isArray(r.data_categories) ? r.data_categories : [],
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    linkedRopaId: r.linked_ropa_id ?? null,
    version: r.consent_version ?? undefined,
    ipAddress: r.source_ip ?? undefined,
    channel: r.channel ?? undefined,
    // Flagged rather than silently rewritten: only an operator (or the expiry
    // sweep) should change a stored consent state.
    isLapsed: status === 'granted' && expired,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** tenant_id is intentionally omitted — the DB default fills it. */
function toRow(c: Partial<ConsentRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (c.id !== undefined) row.id = c.id
  if (c.consentRef !== undefined) row.consent_ref = c.consentRef || null
  if (c.subjectRef !== undefined) row.subject_ref = c.subjectRef || null
  if (c.type !== undefined) row.type = c.type
  if (c.legalBasis !== undefined) row.legal_basis = c.legalBasis || null
  if (c.purposes !== undefined) row.purposes = c.purposes
  if (c.status !== undefined) row.status = c.status
  if (c.consentDate !== undefined) row.consent_date = c.consentDate || null
  if (c.expiryDate !== undefined) row.expiry_date = c.expiryDate || null
  if (c.withdrawalDate !== undefined) row.withdrawal_date = c.withdrawalDate || null
  if (c.withdrawalReason !== undefined) row.withdrawal_reason = c.withdrawalReason || null
  if (c.subjectName !== undefined) row.subject_name = c.subjectName || null
  if (c.subjectEmail !== undefined) row.subject_email = c.subjectEmail || null
  if (c.dataCategories !== undefined) row.data_categories = c.dataCategories
  if (c.linkedModelIds !== undefined) row.linked_model_ids = c.linkedModelIds
  if (c.linkedRopaId !== undefined) row.linked_ropa_id = c.linkedRopaId || null
  if (c.version !== undefined) row.consent_version = c.version || null
  if (c.ipAddress !== undefined) row.source_ip = c.ipAddress || null
  if (c.channel !== undefined) row.channel = c.channel || null
  return row
}

export async function fetchAllConsentRecords(filters: Record<string, any> = {}): Promise<ConsentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('consent_records').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.modelId) q = q.contains('linked_model_ids', [filters.modelId])
  if (filters.ropaId) q = q.eq('linked_ropa_id', filters.ropaId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function fetchConsentRecord(id: string): Promise<ConsentRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase.from('consent_records').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

export async function upsertConsentRecords(record: Partial<ConsentRecord>): Promise<ConsentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const creating = !record.id
  const { data, error } = await supabase
    .from('consent_records')
    .upsert({ ...toRow(record), updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw new Error(error.message)
  void logAction({
    module: 'privacy', entityType: 'consent_records',
    entityId: String(data.id), action: creating ? 'create' : 'update',
  })
  return fromRow(data)
}

/**
 * Withdrawal under Art. 7(3). The withdrawal date is stamped by this function
 * and returned from the database, so what the UI shows afterwards is what was
 * actually stored — the page previously wrote an unrelated hardcoded date into
 * local state and toasted that AI systems had been notified, which nothing did.
 *
 * Notifying the linked systems is the caller's job (see the ConsentWithdrawal
 * agent); this function only records the fact and throws if it cannot.
 */
export async function withdrawConsent(id: string, reason?: string): Promise<ConsentRecord> {
  return upsertConsentRecords({
    id,
    status: 'withdrawn',
    withdrawalDate: new Date().toISOString().slice(0, 10),
    withdrawalReason: reason,
  })
}

export async function deleteConsentRecords(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('consent_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'consent_records', entityId: id, action: 'delete' })
  return true
}
