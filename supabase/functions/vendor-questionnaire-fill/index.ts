/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * vendor-questionnaire-fill — Supabase Edge Function (Deno runtime)
 *
 * The no-login half of vendor questionnaire invitations. A vendor contact
 * receives a tokenized link (24-hour window); this function is the ONLY
 * thing that can resolve that token — the invites table is org-RLS'd, and
 * this function reads it with the service role. The public fill page calls
 * with the anon key; the token itself is the capability.
 *
 * Actions (POST JSON):
 *   { action: "get",    token }
 *     → { invite: { vendorName, templateName, templateVersion, questions,
 *                   sentTo, expiresAt, status } }
 *       Marks the invite 'expired' when past its window.
 *   { action: "submit", token, respondent, respondentEmail?, answers }
 *     → { ok: true, questionnaireId, scorePct }
 *       answers is { [questionId]: optionValue }. The score is computed
 *       SERVER-SIDE from the snapshot on the invite — the client never
 *       supplies points. Inserts into vendor_questionnaires (the same rows
 *       the vendor profile lists) and marks the invite completed.
 *   { action: "send",   token }   (called by the authed dashboard)
 *     → { sent: true } when RESEND_API_KEY is configured and the email went
 *       out, else { sent: false, reason: "email-not-configured" } so the UI
 *       can hand the admin a copyable link instead of faking success.
 *
 * Environment:
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — injected by Supabase
 *   RESEND_API_KEY  — optional; without it "send" reports not-configured
 *   INVITE_FROM     — optional From address (default onboarding@certifyi.ai)
 *   PUBLIC_APP_URL  — optional base URL for links (falls back to the
 *                     request Origin header)
 */

// @ts-expect-error Deno std resolved at runtime in the Supabase edge runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @ts-expect-error Supabase JS v2 resolved at runtime in the edge runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: { env: { get(k: string): string | undefined } }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

interface TemplateOption { value: string; label: string; points: number }
interface TemplateQuestion { id: string; text: string; category: string; options: TemplateOption[] }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json(400, { error: 'Invalid JSON body' }) }
  const action = String(body.action ?? '')
  const token = String(body.token ?? '')
  if (!token || !/^[0-9a-f]{16,}$/i.test(token)) return json(400, { error: 'Missing or malformed token' })

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: invite, error: invErr } = await db
    .from('vendor_questionnaire_invites').select('*').eq('token', token).maybeSingle()
  if (invErr) return json(500, { error: 'Invite lookup failed' })
  if (!invite) return json(404, { error: 'This invitation does not exist.' })

  // Lazy expiry: the 24-hour window is enforced on every touch.
  const expired = invite.status === 'pending' && new Date(invite.expires_at).getTime() < Date.now()
  if (expired) {
    await db.from('vendor_questionnaire_invites').update({ status: 'expired' }).eq('id', invite.id)
    invite.status = 'expired'
  }

  if (action === 'get') {
    const { data: vendor } = await db
      .from('vendors').select('name, vendor_name').eq('id', invite.vendor_id).maybeSingle()
    return json(200, {
      invite: {
        vendorName: vendor?.name ?? vendor?.vendor_name ?? 'your organisation',
        templateName: invite.template_name,
        templateVersion: invite.template_version,
        questions: invite.status === 'pending' ? invite.questions : [],
        sentTo: invite.sent_to,
        expiresAt: invite.expires_at,
        status: invite.status,
      },
    })
  }

  if (action === 'submit') {
    if (invite.status !== 'pending') {
      return json(410, { error: invite.status === 'completed'
        ? 'This questionnaire has already been submitted.'
        : 'This invitation has expired. Ask your contact to send a new one.' })
    }
    const respondent = String(body.respondent ?? '').trim()
    if (!respondent) return json(400, { error: 'Respondent name is required.' })
    const respondentEmail = body.respondentEmail ? String(body.respondentEmail) : invite.sent_to
    const rawAnswers = (body.answers ?? {}) as Record<string, string>

    // Score server-side from the snapshot — the client sends values only.
    const questions = (invite.questions ?? []) as TemplateQuestion[]
    let score = 0
    let maxScore = 0
    const answers: Record<string, { value: string; label?: string; points?: number }> = {}
    for (const q of questions) {
      maxScore += Math.max(...q.options.map((o) => o.points))
      const v = rawAnswers[q.id]
      if (!v) continue
      const opt = q.options.find((o) => o.value === v)
      if (!opt) continue
      score += opt.points
      answers[q.id] = { value: opt.value, label: opt.label, points: opt.points }
    }
    if (Object.keys(answers).length === 0) return json(400, { error: 'Answer at least one question.' })

    const now = new Date().toISOString()
    const { data: saved, error: qErr } = await db.from('vendor_questionnaires').insert({
      vendor_id: invite.vendor_id,
      vendor_uuid: invite.vendor_id,
      template: invite.template_name,
      template_version: invite.template_version,
      questions,
      answers,
      status: 'submitted',
      score,
      max_score: maxScore,
      respondent,
      respondent_email: respondentEmail,
      sent_date: invite.created_at,
      response_date: now,
      updated_at: now,
    }).select('id').single()
    if (qErr) return json(500, { error: `Submission failed: ${qErr.message}` })

    await db.from('vendor_questionnaire_invites')
      .update({ status: 'completed', completed_at: now, questionnaire_id: saved.id })
      .eq('id', invite.id)

    return json(200, { ok: true, questionnaireId: saved.id, scorePct: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0 })
  }

  if (action === 'send') {
    if (invite.status !== 'pending') return json(410, { error: 'Only pending invitations can be sent.' })
    const base = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || ''
    const url = `${base.replace(/\/$/, '')}/questionnaire/respond?token=${invite.token}`
    const key = Deno.env.get('RESEND_API_KEY')
    if (!key) return json(200, { sent: false, reason: 'email-not-configured', url })

    const from = Deno.env.get('INVITE_FROM') || 'onboarding@certifyi.ai'
    const expires = new Date(invite.expires_at).toUTCString()
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [invite.sent_to],
        subject: `Security questionnaire: ${invite.template_name}`,
        html: `<p>Hello,</p>
<p>As part of vendor onboarding you have been asked to complete
<strong>${invite.template_name} (${invite.template_version})</strong>.</p>
<p><a href="${url}">Complete the questionnaire</a> — no account is needed.</p>
<p>This link expires <strong>${expires}</strong> (24 hours from issue).</p>
<p>If you were not expecting this, you can ignore this email.</p>`,
      }),
    })
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      return json(200, { sent: false, reason: `email-provider-error: ${resp.status} ${detail.slice(0, 200)}`, url })
    }
    return json(200, { sent: true, url })
  }

  return json(400, { error: `Unknown action '${action}'` })
})
