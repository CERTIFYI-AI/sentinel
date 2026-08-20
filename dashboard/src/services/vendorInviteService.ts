// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Vendor questionnaire invitations — the onboarding flow that sends selected
// questionnaire packs to the vendor contact as tokenized no-login links
// (24-hour window). Invite rows are created here (org-RLS, DB-default
// org_id) with the pack SNAPSHOTTED onto the row; the anonymous fill and the
// email send go through the vendor-questionnaire-fill edge function. Email
// delivery is reported honestly: {sent:false, reason} plus the link when no
// provider is configured — never a fake "sent".

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'
import type { AssessmentTemplate } from './assessmentTemplateService'

const FUNCTION = 'vendor-questionnaire-fill'

export interface VendorInvite {
  id: string
  vendorId: string
  templateSlug: string
  templateName: string
  templateVersion: string
  sentTo: string
  token: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  expiresAt: string
  questionnaireId: string | null
  createdAt: string
  completedAt: string | null
}

const mapInvite = (r: any): VendorInvite => ({
  id: r.id, vendorId: r.vendor_id, templateSlug: r.template_slug,
  templateName: r.template_name, templateVersion: r.template_version,
  sentTo: r.sent_to, token: r.token, status: r.status,
  expiresAt: r.expires_at, questionnaireId: r.questionnaire_id ?? null,
  createdAt: r.created_at, completedAt: r.completed_at ?? null,
})

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — invitations are unavailable')
  }
  return supabase
}

export async function fetchInvites(vendorId: string): Promise<VendorInvite[]> {
  const { data, error } = await client()
    .from('vendor_questionnaire_invites').select('*')
    .eq('vendor_id', vendorId).order('created_at', { ascending: false })
  if (error) throw new Error(`Invitations failed to load: ${error.message}`)
  return (data ?? []).map(mapInvite)
}

/** One invite per selected pack, questions snapshotted at send time. */
export async function createInvites(p: {
  vendorId: string
  email: string
  templates: AssessmentTemplate[]
}): Promise<VendorInvite[]> {
  if (p.templates.length === 0) return []
  const rows = p.templates.map((t) => ({
    vendor_id: p.vendorId,
    template_slug: t.slug,
    template_name: t.name,
    template_version: t.version,
    questions: t.questions,
    sent_to: p.email,
  }))
  const { data, error } = await client()
    .from('vendor_questionnaire_invites').insert(rows).select()
  if (error) throw new Error(`Invitations did not persist: ${error.message}`)
  void logAction({
    module: 'vendors', entityType: 'vendor', entityId: p.vendorId,
    action: 'questionnaires_invited',
    newValues: { packs: p.templates.map((t) => t.slug), sentTo: p.email },
  })
  return (data ?? []).map(mapInvite)
}

export interface SendResult { sent: boolean; reason?: string; url?: string }

/** Ask the edge function to email the invite; honest result either way. */
export async function sendInviteEmail(token: string): Promise<SendResult> {
  const { data, error } = await client().functions.invoke(FUNCTION, {
    body: { action: 'send', token },
  })
  if (error) throw new Error(`Send failed: ${error.message}`)
  return data as SendResult
}

/** Local link builder for copy-to-clipboard fallback. */
export function buildFillUrl(token: string): string {
  return `${window.location.origin}/questionnaire/respond?token=${token}`
}

// ── Public fill page (anon key; the token is the capability) ─────────────

export interface PublicInvite {
  vendorName: string
  templateName: string
  templateVersion: string
  questions: { id: string; text: string; category: string; options: { value: string; label: string; points: number }[] }[]
  sentTo: string
  expiresAt: string
  status: VendorInvite['status']
}

export async function fetchPublicInvite(token: string): Promise<PublicInvite> {
  const { data, error } = await client().functions.invoke(FUNCTION, {
    body: { action: 'get', token },
  })
  if (error) throw new Error('This invitation could not be loaded. The link may be invalid.')
  if (data?.error) throw new Error(data.error)
  return data.invite as PublicInvite
}

export async function submitPublicInvite(p: {
  token: string
  respondent: string
  respondentEmail?: string
  answers: Record<string, string>
}): Promise<{ scorePct: number }> {
  const { data, error } = await client().functions.invoke(FUNCTION, {
    body: { action: 'submit', token: p.token, respondent: p.respondent, respondentEmail: p.respondentEmail, answers: p.answers },
  })
  if (error) throw new Error('Submission failed. Please try again.')
  if (data?.error) throw new Error(data.error)
  return { scorePct: data.scorePct as number }
}
