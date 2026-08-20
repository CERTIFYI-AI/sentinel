// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// QuestionnaireRespond — the PUBLIC, no-login questionnaire fill page a
// vendor contact reaches from their invitation email
// (/questionnaire/respond?token=…). The token is the capability; it expires
// 24 hours after issue. Scoring happens server-side in the
// vendor-questionnaire-fill edge function — this page sends option values
// only and shows the result the server computed.

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, CheckCircle, Clock, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchPublicInvite, submitPublicInvite, type PublicInvite } from '@/services/vendorInviteService'

const S = {
  page: { minHeight: '100vh', background: 'hsl(var(--bg-base))', color: 'hsl(var(--text-1))' } as React.CSSProperties,
  card: { maxWidth: 760, margin: '0 auto', padding: '32px 20px 64px' } as React.CSSProperties,
  panel: { border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' } as React.CSSProperties,
}

export default function QuestionnaireRespond() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [invite, setInvite] = useState<PublicInvite | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [respondent, setRespondent] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ scorePct: number } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setLoadError('This link is missing its invitation token.'); setLoading(false); return }
    fetchPublicInvite(token)
      .then((inv) => setInvite(inv))
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  const answered = Object.keys(answers).length
  const total = invite?.questions.length ?? 0
  const hoursLeft = useMemo(() => {
    if (!invite) return null
    const ms = new Date(invite.expiresAt).getTime() - Date.now()
    return ms > 0 ? Math.max(1, Math.round(ms / 3_600_000)) : 0
  }, [invite])

  const submit = () => {
    if (!invite || !respondent.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    submitPublicInvite({ token, respondent: respondent.trim(), respondentEmail: respondentEmail || undefined, answers })
      .then((r) => setDone(r))
      .catch((e: Error) => setSubmitError(e.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
          <span className="text-sm font-bold tracking-wide">CertifyI · Vendor Assessment</span>
        </div>

        {loading ? (
          <div className="p-8 text-center" style={S.panel}>
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Loading your questionnaire…</p>
          </div>
        ) : loadError ? (
          <div className="p-8 text-center" style={S.panel}>
            <WarningCircle size={28} className="mx-auto mb-3" style={{ color: 'hsl(var(--s-er-tx))' }} />
            <p className="text-sm font-semibold">This invitation could not be opened</p>
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{loadError}</p>
          </div>
        ) : invite && invite.status !== 'pending' ? (
          <div className="p-8 text-center" style={S.panel}>
            {invite.status === 'completed' ? (
              <>
                <CheckCircle size={28} weight="fill" className="mx-auto mb-3" style={{ color: 'hsl(var(--s-ok-tx))' }} />
                <p className="text-sm font-semibold">Already submitted — thank you</p>
                <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                  This questionnaire has been completed and shared with {invite.vendorName}&apos;s reviewer.
                </p>
              </>
            ) : (
              <>
                <Clock size={28} className="mx-auto mb-3" style={{ color: 'hsl(var(--s-wn-tx))' }} />
                <p className="text-sm font-semibold">This invitation has expired</p>
                <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                  Invitation links are valid for 24 hours. Please ask your contact to send a new one.
                </p>
              </>
            )}
          </div>
        ) : done ? (
          <div className="p-8 text-center" style={S.panel}>
            <CheckCircle size={30} weight="fill" className="mx-auto mb-3" style={{ color: 'hsl(var(--s-ok-tx))' }} />
            <p className="text-base font-semibold">Thank you — your responses were submitted</p>
            <p className="mt-1 text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              Score: <strong>{done.scorePct}%</strong>. Your answers are now with the review team;
              they will contact you if anything needs clarification. You can close this page.
            </p>
          </div>
        ) : invite ? (
          <>
            <div className="p-5 mb-4" style={S.panel}>
              <h1 className="text-lg font-bold">{invite.templateName}</h1>
              <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {invite.templateVersion} · {total} questions · requested for <strong>{invite.vendorName}</strong>
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: hoursLeft && hoursLeft <= 4 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>
                <Clock size={13} />
                {hoursLeft != null && (hoursLeft > 0 ? `This link expires in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.` : 'This link is about to expire.')}
                <span style={{ color: 'hsl(var(--text-4))' }}>No account is needed.</span>
              </p>
            </div>

            <div className="p-5 mb-4 grid gap-3 sm:grid-cols-2" style={S.panel}>
              <div>
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Your name *</label>
                <Input className="mt-1" value={respondent} onChange={(e) => setRespondent(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>Your email</label>
                <Input className="mt-1" value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} placeholder={invite.sentTo} />
              </div>
            </div>

            <div className="space-y-3">
              {invite.questions.map((q, i) => (
                <div key={q.id} className="p-4" style={S.panel}>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>{q.category}</p>
                  <p className="mt-0.5 text-sm font-medium">{i + 1}. {q.text}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {q.options.map((o) => {
                      const active = answers[q.id] === o.value
                      return (
                        <button key={o.value} type="button" aria-pressed={active}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: o.value }))}
                          className="px-3 py-1.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2"
                          style={{
                            background: active ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-surface))',
                            color: active ? 'hsl(var(--brand))' : 'hsl(var(--text-2))',
                            border: `1px solid ${active ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                            outlineColor: 'hsl(var(--brand))',
                          }}>
                          {o.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {submitError && (
              <p className="mt-4 text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>{submitError}</p>
            )}

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={submit} disabled={answered === 0 || !respondent.trim() || submitting} loading={submitting}>
                Submit responses
              </Button>
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {answered} of {total} answered
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
