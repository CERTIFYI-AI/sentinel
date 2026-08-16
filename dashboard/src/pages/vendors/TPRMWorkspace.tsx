// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TPRMWorkspace — the operational view across the whole third-party estate.
//
// The previous version made ZERO backend calls: it imported VENDORS,
// VENDOR_ASSESSMENTS, VENDOR_SLAS, TPRM_ISSUES and VENDOR_DOCUMENTS straight
// from the seed file, so all six "executive KPIs" and all three red alert
// cards were counts over mock arrays, and every tile navigated to
// /vendors/<seed-code>, which is a dead end. Everything here now comes from
// the real hooks.
//
// Three smaller fixes worth naming:
//   * `activeSection` was set in three places and never read, leaving two KPI
//     tiles and an alert card inert. Every tile now navigates somewhere real.
//   * `--s-er-bg` (a BACKGROUND token) was used as a text colour in four
//     places, producing background-on-background text. Tones now come from the
//     shared `vendorUi` helpers, which pair bg/fg/border correctly.
//   * `criticality()` fell back to `map.moderate`, silently DOWNGRADING any
//     vendor whose tier was unknown. Unknown is now its own bucket.

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Buildings, Warning, CheckCircle, Clock, ArrowRight, ClipboardText,
  Gauge, FileArrowUp, ShieldWarning, Siren,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useVendorsData } from '@/hooks/useVendorsData'
import { useVendorAssessments } from '@/hooks/useVendorAssessments'
import { useVendorSlas } from '@/hooks/useVendorSlas'
import { useVendorDocuments } from '@/hooks/useVendorDocuments'
import { documentsExpiringWithin } from '@/services/vendorDocumentService'
import type { VendorRecord } from '@/services/vendorService'
import {
  Pill, LinkPill, SectionTitle, tierTone, tierLabel, dash, fmtDate, daysUntil, tone,
} from './vendorUi'

/** Tier buckets. 'unknown' is a real bucket — an untiered critical vendor must
 *  be visible, not folded into "moderate". */
const TIERS = ['critical', 'high', 'medium', 'low', 'unknown'] as const

function bucketOf(v: VendorRecord): (typeof TIERS)[number] {
  const t = v.riskTierLabel
  return t && (TIERS as readonly string[]).includes(t) ? (t as (typeof TIERS)[number]) : 'unknown'
}

export default function TPRMWorkspace() {
  const navigate = useNavigate()

  const vendorsQ = useVendorsData()
  const assessmentsQ = useVendorAssessments()
  const slasQ = useVendorSlas()
  const documentsQ = useVendorDocuments()

  const vendors = vendorsQ.vendors
  const assessments = assessmentsQ.assessments
  const slas = slasQ.slas
  const documents = documentsQ.documents

  const loading = vendorsQ.isLoading || assessmentsQ.isLoading || slasQ.isLoading || documentsQ.isLoading
  const failed = [vendorsQ, assessmentsQ, slasQ, documentsQ].find((q) => q.isError)

  const vendorName = useMemo(() => new Map(vendors.map((v) => [v.id, v.name])), [vendors])
  const resolve = (id?: string | null) => (id ? (vendorName.get(id) ?? 'Unavailable') : 'Unavailable')

  const byTier = useMemo(() => {
    const m = new Map<(typeof TIERS)[number], VendorRecord[]>()
    for (const t of TIERS) m.set(t, [])
    for (const v of vendors) m.get(bucketOf(v))!.push(v)
    return m
  }, [vendors])

  const breachedSlas = slas.filter((s) => s.derivedStatus === 'breached')
  const atRiskSlas = slas.filter((s) => s.derivedStatus === 'at_risk')
  const unmeasuredSlas = slas.filter((s) => s.derivedStatus === 'unmeasured')

  const openAssessments = assessments.filter((a) =>
    ['draft', 'in_progress', 'submitted', 'under_review'].includes(a.status))
  const assessmentsWithDue = assessments.filter((a) => !!a.dueAt)
  const overdueAssessments = assessmentsWithDue.filter((a) => {
    const d = daysUntil(a.dueAt)
    return d !== null && d < 0 && !['approved', 'rejected', 'expired'].includes(a.status)
  })

  // Only vendors that carry a reassessment date participate — the rest are
  // "no cadence set", which is a different problem from "overdue".
  const vendorsWithCadence = vendors.filter((v) => !!v.reassessmentDueAt)
  const reassessmentOverdue = vendorsWithCadence.filter((v) => (daysUntil(v.reassessmentDueAt) ?? 0) < 0)
  const reassessmentDue30 = vendorsWithCadence.filter((v) => {
    const d = daysUntil(v.reassessmentDueAt)
    return d !== null && d >= 0 && d <= 30
  })
  const noCadence = vendors.length - vendorsWithCadence.length

  const expiringDocs = documentsExpiringWithin(documents, 90)
  const expiredDocs = documents.filter((d) => {
    const days = daysUntil(d.expiresAt)
    return days !== null && days < 0
  })
  const dpaUnsigned = vendors.filter((v) => v.dpaStatus === 'not_signed')

  const kpis: StatCardRowItem[] = [
    {
      label: 'Vendors', value: vendors.length, icon: <Buildings size={18} />,
      href: '/vendors',
      description: `${vendors.length} vendors in the register`,
    },
    {
      label: 'Critical / high tier',
      value: vendors.length ? (byTier.get('critical')!.length + byTier.get('high')!.length) : '—',
      icon: <ShieldWarning size={18} />, href: '/vendors',
      isPositiveUp: false,
      description: `${byTier.get('unknown')!.length} vendors are untiered`,
    },
    {
      label: 'SLAs breached',
      value: slas.length ? breachedSlas.length : '—',
      icon: <Gauge size={18} />, href: '/vendors/sla?status=breached',
      isPositiveUp: false,
      description: `${unmeasuredSlas.length} of ${slas.length} SLAs have never been measured`,
    },
    {
      label: 'Assessments in flight',
      value: assessments.length ? openAssessments.length : '—',
      icon: <ClipboardText size={18} />, href: '/vendors/assessments',
      description: `${overdueAssessments.length} past their due date`,
    },
  ]

  const kpis2: StatCardRowItem[] = [
    {
      label: 'Reassessment overdue',
      value: vendorsWithCadence.length ? reassessmentOverdue.length : '—',
      icon: <Clock size={18} />, href: '/vendors',
      isPositiveUp: false,
      description: vendorsWithCadence.length
        ? `${reassessmentDue30.length} more fall due within 30 days`
        : 'No vendor has a reassessment date set',
    },
    {
      label: 'Documents expiring < 90d',
      value: documents.length ? expiringDocs.length : '—',
      icon: <FileArrowUp size={18} />, href: '/vendor-upload',
      isPositiveUp: false,
      description: `${expiredDocs.length} already expired`,
    },
    {
      label: 'DPA not signed',
      value: vendors.length ? dpaUnsigned.length : '—',
      icon: <Warning size={18} />, href: '/vendors',
      isPositiveUp: false,
      description: 'Vendors positively recorded as having no signed DPA',
    },
    {
      label: 'No reassessment cadence',
      value: vendors.length ? noCadence : '—',
      icon: <CheckCircle size={18} />, href: '/vendors',
      isPositiveUp: false,
      description: 'Vendors with no scheduled reassessment',
    },
  ]

  if (loading) return <PageSkeleton title="TPRM Workspace" rows={6} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="TPRM Workspace"
        subtitle="Third-party risk management — the whole estate in one view"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors', href: '/vendors' },
          { label: 'TPRM' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/vendors')}>
              <Buildings size={14} /> Registry
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/vendors/assessments')}>
              <ClipboardText size={14} /> Assessments
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/vendors/sla')}>
              <Gauge size={14} /> SLAs
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/vendor-upload')}>
              <FileArrowUp size={14} /> Documents
            </Button>
          </div>
        }
      />

      {failed ? (
        <ErrorState
          title="Could not load the third-party estate"
          error={failed.error}
          onRetry={() => { vendorsQ.refetch(); assessmentsQ.refetch(); slasQ.refetch(); documentsQ.refetch() }}
        />
      ) : vendors.length === 0 ? (
        <EmptyState
          icon={<Buildings size={32} weight="duotone" />}
          title="No vendors registered yet"
          description="The TPRM workspace aggregates vendors, their assessments, SLAs and evidence. Register your first vendor to populate it."
          action={<Button size="sm" onClick={() => navigate('/vendors')}>Open the vendor registry</Button>}
        />
      ) : (
        <>
          <StatCardRow cards={kpis} />
          <StatCardRow cards={kpis2} />

          {/* ── Alerts. Each one is a count over real rows, and each links to
                the filtered list that produced it. ─────────────────────────── */}
          {(breachedSlas.length > 0 || reassessmentOverdue.length > 0 || expiredDocs.length > 0) && (
            <div className="grid gap-3 md:grid-cols-3">
              {breachedSlas.length > 0 && (
                <AlertCard
                  icon={<Siren size={16} />}
                  title={`${breachedSlas.length} SLA${breachedSlas.length > 1 ? 's' : ''} in breach`}
                  body={breachedSlas.slice(0, 3).map((s) => `${resolve(s.vendorId)} · ${s.metric.replace(/_/g, ' ')}`)}
                  onOpen={() => navigate('/vendors/sla?status=breached')}
                />
              )}
              {reassessmentOverdue.length > 0 && (
                <AlertCard
                  icon={<Clock size={16} />}
                  title={`${reassessmentOverdue.length} reassessment${reassessmentOverdue.length > 1 ? 's' : ''} overdue`}
                  body={reassessmentOverdue.slice(0, 3).map((v) => `${v.name} · due ${fmtDate(v.reassessmentDueAt)}`)}
                  onOpen={() => navigate('/vendors')}
                />
              )}
              {expiredDocs.length > 0 && (
                <AlertCard
                  icon={<FileArrowUp size={16} />}
                  title={`${expiredDocs.length} document${expiredDocs.length > 1 ? 's' : ''} expired`}
                  body={expiredDocs.slice(0, 3).map((d) => `${resolve(d.vendorId)} · ${d.docType ?? 'Document'}`)}
                  onOpen={() => navigate('/vendor-upload')}
                />
              )}
            </div>
          )}

          {/* ── Portfolio by tier ────────────────────────────────────────── */}
          <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-5">
              <SectionTitle
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
                    Open registry <ArrowRight size={13} />
                  </Button>
                }
              >
                Portfolio by risk tier
              </SectionTitle>
              <div className="mt-4 space-y-4">
                {TIERS.map((t) => {
                  const group = byTier.get(t)!
                  if (group.length === 0) return null
                  return (
                    <div key={t}>
                      <div className="flex items-center gap-2">
                        <Pill tone={t === 'unknown' ? tone('neutral') : tierTone(t)}>
                          {t === 'unknown' ? 'Untiered' : tierLabel(t)}
                        </Pill>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          {group.length} vendor{group.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {group.map((v) => (
                          <LinkPill key={v.id} to={`/vendors/${v.id}`}>{v.name || 'Unnamed vendor'}</LinkPill>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {byTier.get('unknown')!.length > 0 && (
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    Untiered vendors are shown as their own group rather than assumed moderate — an untiered
                    critical supplier is a gap, not a mid-tier one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Reassessment calendar ─────────────────────────────────────── */}
          <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-5">
              <SectionTitle>Reassessment calendar</SectionTitle>
              {vendorsWithCadence.length === 0 ? (
                <p className="mt-3 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                  No vendor has a reassessment date recorded. Set a cadence on the vendor record and the schedule
                  appears here.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {[...vendorsWithCadence]
                    .sort((a, b) => (a.reassessmentDueAt ?? '').localeCompare(b.reassessmentDueAt ?? ''))
                    .slice(0, 12)
                    .map((v) => {
                      const d = daysUntil(v.reassessmentDueAt)
                      const overdue = d !== null && d < 0
                      return (
                        <div key={v.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                          <div className="flex min-w-0 items-center gap-3">
                            <Pill tone={tierTone(v.riskTierLabel)}>{tierLabel(v.riskTierLabel)}</Pill>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.name}</p>
                              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                                Manager {v.vendorManager || '—'} · cadence {dash(v.reassessmentCadenceMonths, ' months')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className="whitespace-nowrap text-xs"
                              style={{ color: overdue ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))' }}
                            >
                              {fmtDate(v.reassessmentDueAt)}
                              {d !== null && (overdue ? ` · ${Math.abs(d)}d overdue` : ` · in ${d}d`)}
                            </span>
                            <LinkPill to={`/vendors/${v.id}`}>Open</LinkPill>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Assessment & SLA queues ───────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <SectionTitle
                  action={
                    <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/assessments')}>
                      All <ArrowRight size={13} />
                    </Button>
                  }
                >
                  Assessments awaiting a decision
                </SectionTitle>
                {openAssessments.length === 0 ? (
                  <p className="mt-3 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                    Nothing is awaiting a decision.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {openAssessments.slice(0, 6).map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                        <div className="min-w-0">
                          <p className="truncate text-sm" style={{ color: 'hsl(var(--text-1))' }}>
                            {resolve(a.vendorId)}
                          </p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                            {a.status.replace(/_/g, ' ')} · owner {a.owner || '—'} · due {fmtDate(a.dueAt)}
                          </p>
                        </div>
                        <LinkPill to={`/vendors/assessments?open=${a.id}`}>Open</LinkPill>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <SectionTitle
                  action={
                    <Button variant="ghost" size="sm" onClick={() => navigate('/vendors/sla')}>
                      All <ArrowRight size={13} />
                    </Button>
                  }
                >
                  Service levels needing attention
                </SectionTitle>
                {breachedSlas.length + atRiskSlas.length === 0 ? (
                  <p className="mt-3 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                    {slas.length === 0
                      ? 'No SLAs are recorded.'
                      : unmeasuredSlas.length === slas.length
                        ? 'No SLA has been measured yet, so none can be evaluated.'
                        : 'Every measured SLA is within target.'}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {[...breachedSlas, ...atRiskSlas].slice(0, 6).map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                        <div className="min-w-0">
                          <p className="truncate text-sm" style={{ color: 'hsl(var(--text-1))' }}>{resolve(s.vendorId)}</p>
                          <p className="text-xs capitalize" style={{ color: 'hsl(var(--text-4))' }}>
                            {s.metric.replace(/_/g, ' ')} · {dash(s.currentValue)} {s.unit} vs target {dash(s.targetValue)}
                          </p>
                        </div>
                        <LinkPill to={`/vendors/sla?open=${s.id}`}>Open</LinkPill>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function AlertCard({ icon, title, body, onOpen }: {
  icon: React.ReactNode
  title: string
  body: string[]
  onOpen: () => void
}) {
  const t = tone('err')
  return (
    <button
      type="button"
      onClick={onOpen}
      className="p-4 text-left transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ background: t.bg, border: `1px solid ${t.br}`, outlineColor: t.fg }}
    >
      <div className="flex items-center gap-2" style={{ color: t.fg }}>
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {body.map((line, i) => (
          <li key={i} className="truncate text-xs" style={{ color: 'hsl(var(--text-2))' }}>{line}</li>
        ))}
      </ul>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium" style={{ color: t.fg }}>
        Open <ArrowRight size={12} />
      </span>
    </button>
  )
}
