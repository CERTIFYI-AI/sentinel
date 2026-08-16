// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Consent records (`consent_records`) — the evidence that a data subject gave,
// and has not withdrawn, consent for a stated set of purposes (GDPR Art. 7).
//
// Previously this service sent a client-chosen `tenant_id` and swallowed every
// error: a failed write returned the input record and the UI reported success,
// while a failed read rendered as "no consent records". Under Art. 7(1) the
// controller must be able to *demonstrate* consent — a silently unsaved record
// is indistinguishable from consent that was never obtained.
//
// tenant_id is now filled by the database default (`current_user_org_id()`),
// and writes throw.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

export const CONSENT_STATUSES = ['granted', 'withdrawn', 'expired', 'pending'] as const
export type ConsentStatus = (typeof CONSENT_STATUSES)[number]

export interface ConsentRecord {
  id: string
  consentRef?: string
  /** Pseudonymous subject reference — never a raw identifier in the UI. */
  subjectRef?: string
  type?: string
  legalBasis?: string
  purposes: string[]
  status: string
  consentDate?: string | null
  expiryDate?: string | null
  withdrawalDate?: string | null
  withdrawalReason?: string
  /** Display name and contact for the subject, where lawfully retained. */
  subject?: string
  email?: string
  /** Which AI systems this consent actually covers — the governance interlink. */
  aiSystems: string[]
  dataCategories: string[]
  linkedModelIds: string[]
  version?: string
  ipAddress?: string
  channel?: string
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): ConsentRecord {
  return {
    id: r.id,
    consentRef: r.consent_ref ?? undefined,
    subjectRef: r.subject_ref ?? undefined,
    type: r.type ?? undefined,
    legalBasis: r.legal_basis ?? undefined,
    purposes: Array.isArray(r.purposes) ? r.purposes : [],
    status: r.status ?? 'pending',
    consentDate: r.consent_date ?? null,
    expiryDate: r.expiry_date ?? null,
    withdrawalDate: r.withdrawal_date ?? null,
    withdrawalReason: r.withdrawal_reason ?? undefined,
    subject: r.subject_name ?? undefined,
    email: r.subject_email ?? undefined,
    aiSystems: Array.isArray(r.ai_systems) ? r.ai_systems : [],
    dataCategories: Array.isArray(r.data_categories) ? r.data_categories : [],
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    version: r.consent_version ?? undefined,
    ipAddress: r.source_ip ?? undefined,
    channel: r.channel ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** tenant_id is intentionally omitted — the DB default fills it. */
function toRow(c: Partial<ConsentRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (c.id !== undefined) row.id = c.id
  if (c.consentRef !== undefined) row.consent_ref = c.consentRef ?? null
  if (c.subjectRef !== undefined) row.subject_ref = c.subjectRef ?? null
  if (c.type !== undefined) row.type = c.type ?? null
  if (c.legalBasis !== undefined) row.legal_basis = c.legalBasis ?? null
  if (c.purposes !== undefined) row.purposes = c.purposes
  if (c.status !== undefined) row.status = c.status
  if (c.consentDate !== undefined) row.consent_date = c.consentDate || null
  if (c.expiryDate !== undefined) row.expiry_date = c.expiryDate || null
  if (c.withdrawalDate !== undefined) row.withdrawal_date = c.withdrawalDate || null
  if (c.withdrawalReason !== undefined) row.withdrawal_reason = c.withdrawalReason ?? null
  if (c.subject !== undefined) row.subject_name = c.subject ?? null
  if (c.email !== undefined) row.subject_email = c.email ?? null
  if (c.aiSystems !== undefined) row.ai_systems = c.aiSystems
  if (c.dataCategories !== undefined) row.data_categories = c.dataCategories
  if (c.linkedModelIds !== undefined) row.linked_model_ids = c.linkedModelIds
  if (c.version !== undefined) row.consent_version = c.version ?? null
  if (c.ipAddress !== undefined) row.source_ip = c.ipAddress ?? null
  if (c.channel !== undefined) row.channel = c.channel ?? null
  return row
}

export async function fetchAllConsentRecords(filters: Record<string, any> = {}): Promise<ConsentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('consent_records').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
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
  const { data, error } = await supabase
    .from('consent_records')
    .upsert({ ...toRow(record), updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'consent_records', entityId: String(data.id), action: 'update' })
  return fromRow(data)
}

export async function deleteConsentRecords(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('consent_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'consent_records', entityId: id, action: 'delete' })
  return true
}
