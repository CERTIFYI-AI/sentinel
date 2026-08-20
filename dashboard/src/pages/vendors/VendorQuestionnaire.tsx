// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorQuestionnaire — /vendors/:id/questionnaire, keyed on vendors.id (uuid).
//
// Two things were wrong here, and both were about a decision that did not
// exist:
//   * `handleSubmit` called `setSubmitted(true)` and nothing else. Every
//     answer was discarded; the `vendor_questionnaires` table, which had
//     existed since core_grc_tables, was never written to.
//   * The result screen rendered "Low Risk — Approved" or "High Risk —
//     Escalate to CISO" — an approval decision with no record, no actor, no
//     audit entry and no write-back to the vendor.
//
// Now: the response is persisted against the vendor's uuid with a named
// respondent, and the band the score falls into is presented as exactly that —
// a suggested band. A DECISION is a separate, explicit act that requires a
// named reviewer and is written to the audit log.
//
// The template version and max score are stored WITH the response, so editing
// the template later cannot silently rescore historical submissions.

import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, Warning, ClipboardText, Shield, Lock, Certificate,
  FileText, Robot, Database, Student, Buildings, ArrowsClockwise,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useVendor } from '@/hooks/useVendorsData'
import { useVendorQuestionnaires } from '@/hooks/useVendorQuestionnaires'
import { useAssessmentTemplates } from '@/hooks/queries/useAssessmentTemplates'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchInvites, sendInviteEmail, buildFillUrl } from '@/services/vendorInviteService'
import type { QuestionnaireDecision } from '@/services/vendorQuestionnaireService'
import { Pill, LinkPill, Fact, tone, fmtDate } from './vendorUi'

const TEMPLATE = 'Sentinel VSQ'
/** Bump when a question or its scoring changes. Stored with every response. */
const TEMPLATE_VERSION = 'v1.0'

interface QuestionOption { value: string; label: string; points: number }
interface Question { id: string; text: string; icon?: React.ElementType; category: string; options: QuestionOption[] }

const QUESTIONS: Question[] = [
  {
    id: 'Q1', text: 'Data encryption at rest', icon: Lock, category: 'Data Security',
    options: [
      { value: 'yes', label: 'Yes — AES-256 or equivalent', points: 10 },
      { value: 'partial', label: 'Partial — some systems encrypted', points: 5 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q2', text: 'SOC 2 Type II certification', icon: Certificate, category: 'Certification',
    options: [
      { value: 'yes', label: 'Yes — current certificate', points: 10 },
      { value: 'in_progress', label: 'In progress', points: 5 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q3', text: 'GDPR data processing agreement signed', icon: FileText, category: 'Compliance',
    options: [
      { value: 'yes', label: 'Yes — signed and current', points: 10 },
      { value: 'pending', label: 'Pending signature', points: 3 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q4', text: 'Documented incident response plan', icon: Warning, category: 'Incident Response',
    options: [
      { value: 'yes', label: 'Yes — tested in the last 12 months', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q5', text: 'Annual penetration testing', icon: Shield, category: 'Security Testing',
    options: [
      { value: 'yes', label: 'Yes — third-party pentest', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q6', text: 'Data residency controls for EU/US data', icon: Database, category: 'Data Governance',
    options: [
      { value: 'yes', label: 'Yes — full geographic controls', points: 10 },
      { value: 'partial', label: 'Partial — limited controls', points: 4 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q7', text: 'AI model access logging and audit trails', icon: Robot, category: 'AI Governance',
    options: [
      { value: 'yes', label: 'Yes — full audit logging', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q8', text: 'Employee security awareness training', icon: Student, category: 'People Security',
    options: [
      { value: 'quarterly', label: 'Quarterly or more frequent', points: 10 },
      { value: 'yes', label: 'Annual training', points: 6 },
      { value: 'no', label: 'No formal training', points: 0 },
    ],
  },
  {
    id: 'Q9', text: 'Business continuity and disaster recovery plan', icon: Buildings, category: 'Resilience',
    options: [
      { value: 'yes', label: 'Yes — tested BCP/DRP in place', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q10', text: 'Sub-processor disclosures provided', icon: ArrowsClockwise, category: 'Third-Party Risk',
    options: [
      { value: 'yes', label: 'Yes — full list disclosed', points: 10 },
      { value: 'partial', label: 'Partial — key sub-processors only', points: 4 },
      { value: 'no', label: 'No disclosure', points: 0 },
    ],
  },
]

const MAX_SCORE = QUESTIONS.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.points)), 0)

/** The band is a scoring aid, never an approval. */
function band(pct: number): { label: string; toneName: 'ok' | 'warn' | 'err' } {
  if (pct >= 80) return { label: 'Low risk band', toneName: 'ok' }
  if (pct >= 60) return { label: 'Medium risk band', toneName: 'warn' }
  return { label: 'High risk band', toneName: 'err' }
}

type Answers = Record<string, { value: string; notes: string }>

export default function VendorQuestionnaire() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const openParam = params.get('open')

  const { vendor, isLoading, isError, error, refetch } = useVendor(id)
  const { questionnaires, isLoading: qLoading, isError: qError, error: qErr, submit, review } =
    useVendorQuestionnaires(id)

  const [answers, setAnswers] = useState<Answers>({})
  const [respondent, setRespondent] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')

  // Questionnaire packs from vendor_assessment_templates. ?template=<slug>
  // preselects a pack (deep link from the pack library); the hardcoded VSQ
  // stays as the fallback so the page still works if templates fail to load.
  const templatesQuery = useAssessmentTemplates()
  const [templateSlug, setTemplateSlug] = useState<string>(params.get('template') || 'vsq-core')
  const activeTemplate = (templatesQuery.data ?? []).find((t) => t.slug === templateSlug) ?? null
  const activeQuestions: Question[] = activeTemplate
    ? activeTemplate.questions.map((q) => ({ id: q.id, text: q.text, category: q.category, options: q.options }))
    : QUESTIONS
  const activeName = activeTemplate?.name ?? TEMPLATE
  const activeVersion = activeTemplate?.version ?? TEMPLATE_VERSION
  const activeMaxScore = activeQuestions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.points)), 0)
  const switchTemplate = (slug: string) => { setTemplateSlug(slug); setAnswers({}) }
  const [reviewFor, setReviewFor] = useState<string | null>(null)
  const [reviewer, setReviewer] = useState('')
  const [decision, setDecision] = useState<QuestionnaireDecision>('approved')

  const viewing = openParam ? questionnaires.find((q) => q.id === openParam) ?? null : null

  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.value).length
  const score = useMemo(() => activeQuestions.reduce((sum, q) => {
    const a = answers[q.id]?.value
    return sum + (q.options.find((o) => o.value === a)?.points ?? 0)
  }, 0), [answers, activeQuestions])
  const pct = activeMaxScore > 0 ? Math.round((score / activeMaxScore) * 100) : 0

  if (isLoading) return <PageSkeleton title="Vendor questionnaire" rows={6} />

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
          <ArrowLeft size={14} /> Back to registry
        </Button>
        <ErrorState title="Could not load this vendor" error={error} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
          <ArrowLeft size={14} /> Back to registry
        </Button>
        <EmptyState
          icon={<Buildings size={32} weight="duotone" />}
          title="Vendor not found"
          description="A questionnaire belongs to a vendor record. No vendor with this id exists in your organisation."
          action={<Button size="sm" onClick={() => navigate('/vendors')}>Open the vendor registry</Button>}
        />
      </div>
    )
  }

  function submitResponse() {
    if (!vendor) return
    submit.mutate({
      vendorId: vendor.id,
      template: activeName,
      templateVersion: activeVersion,
      questions: activeQuestions.map((q) => ({ id: q.id, text: q.text, category: q.category, options: q.options })),
      answers: Object.fromEntries(
        Object.entries(answers)
          .filter(([, a]) => !!a.value)
          .map(([qid, a]) => {
            const q = activeQuestions.find((x) => x.id === qid)
            const opt = q?.options.find((o) => o.value === a.value)
            return [qid, { value: a.value, label: opt?.label, points: opt?.points, notes: a.notes || undefined }]
          }),
      ),
      score,
      maxScore: activeMaxScore,
      respondent,
      respondentEmail: respondentEmail || undefined,
    }, {
      onSuccess: (saved) => {
        setAnswers({})
        setRespondent('')
        setRespondentEmail('')
        const next = new URLSearchParams(params)
        next.set('open', saved.id)
        setParams(next, { replace: true })
      },
    })
  }

  function submitDecision() {
    if (!reviewFor) return
    review.mutate({ id: reviewFor, decision, reviewer }, {
      onSuccess: () => { setReviewFor(null); setReviewer('') },
    })
  }

  const b = band(pct)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor security questionnaire"
        subtitle={`${activeName} ${activeVersion} · ${vendor.name || 'Unnamed vendor'}`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors', href: '/vendors' },
          { label: vendor.name || 'Vendor', href: `/vendors/${vendor.id}` },
          { label: 'Questionnaire' },
        ]}
        onBack={() => navigate(`/vendors/${vendor.id}`)}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(`/vendors/${vendor.id}`)}>
            Vendor record
          </Button>
        }
      />

      {/* ── Outstanding invitations (tokenized no-login links, 24h window) ── */}
      <InvitesCard vendorId={vendor.id} />

      {/* ── Existing submissions ─────────────────────────────────────────── */}
      <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Submitted responses</h2>
          {qError ? (
            <ErrorState title="Could not load submissions" error={qErr} />
          ) : qLoading ? (
            <div role="status" aria-label="Loading submissions" className="h-16" />
          ) : questionnaires.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              Nothing has been submitted for this vendor yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {questionnaires.map((q) => {
                const p = q.score != null && q.maxScore ? Math.round((q.score / q.maxScore) * 100) : null
                const qb = p === null ? null : band(p)
                return (
                  <div
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3"
                    style={{
                      border: `1px solid ${viewing?.id === q.id ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                          {p === null ? '—' : `${p}%`}
                        </span>
                        {qb && <Pill tone={tone(qb.toneName)}>{qb.label}</Pill>}
                        {q.reviewDecision
                          ? <Pill tone={tone(q.reviewDecision === 'approved' ? 'ok' : q.reviewDecision === 'rejected' ? 'err' : 'warn')}>
                              {q.reviewDecision.replace(/_/g, ' ')}
                            </Pill>
                          : <Pill tone={tone('neutral')}>awaiting review</Pill>}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {q.template} {q.templateVersion} · respondent {q.respondent || '—'} ·
                        submitted {fmtDate(q.responseDate ?? q.createdAt)} ·
                        reviewer {q.reviewer || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkPill to={`/vendors/${vendor.id}/questionnaire?open=${q.id}`}>View answers</LinkPill>
                      {!q.reviewDecision && (
                        <Button size="sm" variant="outline" onClick={() => { setReviewer(''); setReviewFor(q.id) }}>
                          Record decision
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── A stored response, read-only ─────────────────────────────────── */}
      {viewing && (
        <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Stored response · {viewing.template} {viewing.templateVersion}
              </h2>
              <Button
                variant="ghost" size="sm"
                onClick={() => {
                  const next = new URLSearchParams(params); next.delete('open'); setParams(next, { replace: true })
                }}
              >
                Close
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Fact label="Score" value={viewing.score !== null && viewing.maxScore ? `${viewing.score} / ${viewing.maxScore}` : null} />
              <Fact label="Respondent" value={viewing.respondent} />
              <Fact label="Reviewer" value={viewing.reviewer} />
              <Fact label="Decision" value={viewing.reviewDecision?.replace(/_/g, ' ')} hint={viewing.reviewedAt ? fmtDate(viewing.reviewedAt) : undefined} />
            </div>
            <div className="mt-4 space-y-1">
              {Object.entries(viewing.answers).map(([qid, a]) => (
                <div key={qid} className="flex items-center justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                    {qid} · {a.label ?? a.value}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                    {a.points ?? '—'} pts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── New response ─────────────────────────────────────────────────── */}
      <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>New response</h2>
              {/* Questionnaire pack picker — switching packs clears the draft */}
              <Select value={templateSlug} onValueChange={switchTemplate}>
                <SelectTrigger className="h-8 w-80 text-xs">
                  <SelectValue placeholder={templatesQuery.isLoading ? 'Loading packs…' : 'Questionnaire pack'} />
                </SelectTrigger>
                <SelectContent>
                  {(templatesQuery.data ?? []).map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name} · {t.version} ({t.questions.length} questions)
                    </SelectItem>
                  ))}
                  {(templatesQuery.data ?? []).length === 0 && (
                    <SelectItem value="vsq-core">{TEMPLATE} {TEMPLATE_VERSION}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {answeredCount} of {activeQuestions.length} answered
              </span>
              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                {answeredCount === 0 ? '—' : `${pct}%`}
              </span>
              {answeredCount > 0 && <Pill tone={tone(b.toneName)}>{b.label}</Pill>}
            </div>
          </div>
          <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            The band is derived from the score and is an input to a decision, not a decision. Approval is recorded
            separately against a named reviewer.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Respondent" required hint="Who at the vendor completed this.">
              <Input value={respondent} onChange={(e) => setRespondent(e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Respondent email">
              <Input value={respondentEmail} onChange={(e) => setRespondentEmail(e.target.value)} placeholder="security@vendor.com" />
            </Field>
          </div>

          {activeTemplate?.description && (
            <p className="mt-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{activeTemplate.description}</p>
          )}

          <div className="mt-5 space-y-4">
            {activeQuestions.map((q) => {
              const Icon = q.icon ?? ClipboardText
              const a = answers[q.id]
              return (
                <div key={q.id} className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-start gap-2">
                    <Icon size={16} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 2 }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                        {q.id}. {q.text}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
                        {q.category}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {q.options.map((o) => {
                          const active = a?.value === o.value
                          return (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() => setAnswers((prev) => ({
                                ...prev, [q.id]: { value: o.value, notes: prev[q.id]?.notes ?? '' },
                              }))}
                              className="px-2.5 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                              style={{
                                background: active ? 'hsl(var(--s-in-bg))' : 'hsl(var(--bg-surface))',
                                color: active ? 'hsl(var(--s-in-tx))' : 'hsl(var(--text-2))',
                                border: `1px solid ${active ? 'hsl(var(--s-in-br))' : 'hsl(var(--border))'}`,
                                outlineColor: 'hsl(var(--brand))',
                              }}
                              aria-pressed={active}
                            >
                              {o.label} · {o.points} pts
                            </button>
                          )
                        })}
                      </div>
                      <Input
                        className="mt-2"
                        value={a?.notes ?? ''}
                        onChange={(e) => setAnswers((prev) => ({
                          ...prev, [q.id]: { value: prev[q.id]?.value ?? '', notes: e.target.value },
                        }))}
                        placeholder="Evidence reference or note (optional)"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button
              size="sm"
              onClick={submitResponse}
              disabled={answeredCount === 0 || !respondent.trim() || submit.isPending}
              loading={submit.isPending}
            >
              <ClipboardText size={14} /> Submit response
            </Button>
            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Stored against this vendor with the template version and max score, so the percentage stays
              reproducible if the template changes.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Reviewer decision ────────────────────────────────────────────── */}
      <FormDialog
        open={!!reviewFor}
        onOpenChange={(o) => { if (!o) setReviewFor(null) }}
        title="Record questionnaire decision"
        description="The reviewer is stored on the response and written to the audit log. A verdict that is only displayed is not a decision."
        submitLabel="Record decision"
        busy={review.isPending}
        disabled={!reviewer.trim()}
        onSubmit={submitDecision}
      >
        <Field label="Decision" required>
          <Select value={decision} onValueChange={(v) => setDecision(v as QuestionnaireDecision)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Approve</SelectItem>
              <SelectItem value="approved_with_conditions">Approve with conditions</SelectItem>
              <SelectItem value="escalate">Escalate</SelectItem>
              <SelectItem value="rejected">Reject</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reviewer" required hint="The person accountable for this decision.">
          <Input value={reviewer} onChange={(e) => setReviewer(e.target.value)} placeholder="Full name" autoFocus />
        </Field>
      </FormDialog>

      <p className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
        <CheckCircle size={13} />
        Answers to Q2 (SOC 2), Q3 (DPA) and Q10 (sub-processors) overlap with governed fields on the vendor record.
        They are stored as the vendor's own attestation and do not overwrite the vendor record — update the vendor
        record deliberately when you accept the attestation.
      </p>
    </div>
  )
}

/**
 * InvitesCard — the vendor's questionnaire invitations: what was sent to
 * whom, its 24-hour window, and whether it came back. Completed invites link
 * to nothing extra here because the submission appears in "Submitted
 * responses" above. Resend re-issues the email for a pending invite; when
 * email is not configured the link is copyable instead — never a fake sent.
 */
function InvitesCard({ vendorId }: { vendorId: string }) {
  const invites = useQuery({
    queryKey: ['vendor-invites', vendorId],
    queryFn: () => fetchInvites(vendorId),
    staleTime: 30_000,
  })

  if (invites.isLoading || (invites.data ?? []).length === 0) return null

  const toneFor = (s: string) =>
    s === 'completed' ? tone('ok') : s === 'pending' ? tone('warn') : tone('err')

  return (
    <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Invitations</h2>
        <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
          Tokenized links sent to the vendor contact — filled without login, valid for 24 hours.
        </p>
        <div className="mt-3 space-y-1.5">
          {(invites.data ?? []).map((inv) => (
            <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              style={{ border: '1px solid hsl(var(--border))' }}>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                  {inv.templateName} <span style={{ color: 'hsl(var(--text-4))' }}>{inv.templateVersion}</span>
                </p>
                <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                  to {inv.sentTo} · {inv.status === 'pending'
                    ? `expires ${fmtDate(inv.expiresAt)}`
                    : inv.status === 'completed'
                      ? `completed ${fmtDate(inv.completedAt)}`
                      : inv.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Pill tone={toneFor(inv.status)}>{inv.status}</Pill>
                {inv.status === 'pending' && (
                  <>
                    <Button size="sm" variant="ghost"
                      onClick={() => { void navigator.clipboard.writeText(buildFillUrl(inv.token)); toast.success('Link copied') }}>
                      Copy link
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() =>
                        sendInviteEmail(inv.token)
                          .then((r) => r.sent
                            ? toast.success('Invitation email re-sent')
                            : toast.warning(r.reason === 'email-not-configured'
                                ? 'Email is not configured — use Copy link instead'
                                : `Not sent: ${r.reason}`))
                          .catch((e: Error) => toast.error(e.message))}>
                      Resend
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
