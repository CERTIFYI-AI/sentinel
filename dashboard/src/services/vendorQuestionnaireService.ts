// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// vendorQuestionnaireService — `public.vendor_questionnaires`.
//
// The table has existed since core_grc_tables (20260418000002:840) and was
// never written to: the questionnaire page computed a risk verdict
// ("Low Risk — Approved" / "High Risk — Escalate to CISO") and then discarded
// every answer on submit. Nothing was persisted, no actor was recorded, and
// nothing flowed back to the vendor record.
//
// Two schema facts this file handles explicitly:
//   * the legacy `vendor_id` column is TEXT NOT NULL, so it is filled with the
//     uuid string while `vendor_uuid` (added 20260822000001) carries the real
//     FK into vendors.id — the one id-space;
//   * `max_score` is stored WITH the response, so editing the template later
//     never silently rescores historical submissions.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type QuestionnaireStatus = 'draft' | 'sent' | 'submitted' | 'reviewed' | 'expired'
export type QuestionnaireDecision = 'approved' | 'approved_with_conditions' | 'escalate' | 'rejected'

export interface QuestionnaireAnswer {
  value: string
  label?: string
  points?: number
}

export interface VendorQuestionnaireRecord {
  id: string
  questionnaireRef?: string | null
  /** vendors.id — the canonical link. */
  vendorUuid?: string | null
  template?: string | null
  templateVersion?: string | null
  questions: unknown[]
  answers: Record<string, QuestionnaireAnswer>
  status: string
  score?: number | null
  /** Denominator captured at submit time — never recomputed from the template. */
  maxScore?: number | null
  respondent?: string | null
  respondentEmail?: string | null
  reviewer?: string | null
  reviewedAt?: string | null
  reviewDecision?: string | null
  sentDate?: string | null
  responseDate?: string | null
  expiresAt?: string | null
  assessmentId?: string | null
  evidenceIds: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function fromRow(r: Record<string, any>): VendorQuestionnaireRecord {
  return {
    id: r.id,
    questionnaireRef: r.questionnaire_ref ?? null,
    vendorUuid: r.vendor_uuid ?? null,
    template: r.template ?? null,
    templateVersion: r.template_version ?? null,
    questions: Array.isArray(r.questions) ? r.questions : [],
    answers: (r.answers && typeof r.answers === 'object') ? r.answers : {},
    status: r.status ?? 'draft',
    score: numOrNull(r.score),
    maxScore: numOrNull(r.max_score),
    respondent: r.respondent ?? null,
    respondentEmail: r.respondent_email ?? null,
    reviewer: r.reviewer ?? null,
    reviewedAt: r.reviewed_at ?? null,
    reviewDecision: r.review_decision ?? null,
    sentDate: r.sent_date ?? null,
    responseDate: r.response_date ?? null,
    expiresAt: r.expires_at ?? null,
    assessmentId: r.assessment_id ?? null,
    evidenceIds: Array.isArray(r.evidence_ids) ? r.evidence_ids : [],
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function fetchVendorQuestionnaires(vendorId?: string): Promise<VendorQuestionnaireRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('vendor_questionnaires').select('*').order('created_at', { ascending: false })
  if (vendorId) q = q.eq('vendor_uuid', vendorId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function fetchVendorQuestionnaireById(id: string): Promise<VendorQuestionnaireRecord | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  const { data, error } = await supabase.from('vendor_questionnaires').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

/**
 * Persist a completed questionnaire.
 *
 * The respondent is required: an unattributed security questionnaire cannot
 * support a vendor decision. `maxScore` is stored alongside `score` so the
 * percentage is reproducible from the record alone.
 */
export async function submitVendorQuestionnaire(params: {
  vendorId: string
  template: string
  templateVersion: string
  questions: unknown[]
  answers: Record<string, QuestionnaireAnswer>
  score: number
  maxScore: number
  respondent: string
  respondentEmail?: string
  expiresAt?: string
}): Promise<VendorQuestionnaireRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot submit questionnaire.')
  if (!params.vendorId) throw new Error('A questionnaire must reference a vendor.')
  if (!params.respondent?.trim()) throw new Error('Name the respondent before submitting.')

  const now = new Date().toISOString()
  const row = {
    // Legacy TEXT NOT NULL column; vendor_uuid is the real FK.
    vendor_id: params.vendorId,
    vendor_uuid: params.vendorId,
    template: params.template,
    template_version: params.templateVersion,
    questions: params.questions,
    answers: params.answers,
    status: 'submitted',
    score: params.score,
    max_score: params.maxScore,
    respondent: params.respondent.trim(),
    respondent_email: params.respondentEmail ?? null,
    response_date: now,
    expires_at: params.expiresAt ?? null,
    updated_at: now,
  }
  const { data, error } = await supabase.from('vendor_questionnaires').insert(row).select().single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_questionnaires', entityId: saved.id,
    entityName: `${params.template} ${params.templateVersion}`, action: 'submit',
    newValues: { vendorId: params.vendorId, score: params.score, maxScore: params.maxScore, respondent: row.respondent },
  })
  return saved
}

/**
 * Record the reviewer's verdict. The previous page RENDERED a verdict
 * ("High Risk — Escalate to CISO") with no record, no actor and no audit
 * entry. A decision only exists once it is stored against a named reviewer.
 */
export async function reviewVendorQuestionnaire(params: {
  id: string
  decision: QuestionnaireDecision
  reviewer: string
  assessmentId?: string
}): Promise<VendorQuestionnaireRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot record decision.')
  const reviewer = params.reviewer?.trim()
  if (!reviewer) throw new Error('A reviewer must be named before a decision can be recorded.')

  const before = await fetchVendorQuestionnaireById(params.id)
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('vendor_questionnaires')
    .update({
      review_decision: params.decision,
      reviewer,
      reviewed_at: now,
      status: 'reviewed',
      ...(params.assessmentId ? { assessment_id: params.assessmentId } : {}),
      updated_at: now,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_questionnaires', entityId: saved.id,
    entityName: saved.questionnaireRef ?? saved.template ?? undefined,
    action: `decision.${params.decision}`,
    oldValues: before ?? undefined,
    newValues: { decision: params.decision, reviewer },
  })
  return saved
}

export async function deleteVendorQuestionnaire(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete questionnaire.')
  const before = await fetchVendorQuestionnaireById(id)
  const { error } = await supabase.from('vendor_questionnaires').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({
    module: 'vendors', entityType: 'vendor_questionnaires', entityId: id,
    entityName: before?.template ?? undefined, action: 'delete', oldValues: before ?? undefined,
  })
}
