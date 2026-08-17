// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ESG Reports — AI-specific sustainability disclosures with their evidence
// chain, assurance record and a governed approval transition.
//
// What was deleted, and why:
//  * the three fabricated **Published** disclosures the service served to any
//    tenant whose table was empty — named human authors, scores of 88/92/95
//    and factual claims about emission reductions that never happened. The
//    seed is gone from the service; this page's honest empty state, which
//    could previously never render, is now what a new tenant sees;
//  * "publish" and "submit for review" as local `setState` + success toast.
//    Both are now real writes that stamp the approver identity and time from
//    the signed-in user and land in the audit log; the drawer closes only
//    after the write resolves;
//  * "Download Report", which downloaded nothing while toasting "Report
//    downloaded". It now writes a real disclosure file built from the stored
//    record and its citations;
//  * the up=green / down=red trend arrows on AI metrics — inverted for carbon,
//    where a rise is bad — and the dead `aiSpecificMetrics` read that hid the
//    real `ai_metrics` payload behind a column name that does not exist.
//
// The overall score is the mean of three hand-entered dimension scores. It is
// labelled self-assessed everywhere it appears; it is not a framework score.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { Globe, Export, Plus, X, CheckCircle, DownloadSimple } from '@phosphor-icons/react'

import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useEsgData } from '@/hooks/useEsgData'
import { useCarbonRecordsData } from '@/hooks/useCarbonRecordsData'
import { useEnergyData } from '@/hooks/useEnergyData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useUserOptions } from '@/hooks/useUserOptions'
import { useChartTheme } from '@/hooks/useChartTheme'
import { comparePeriodsDesc } from '@/services/reportingPeriod'
import {
  ESG_STATUS_LABEL, ESG_STATUSES, ASSURANCE_STATUSES,
  type AssuranceStatus, type EsgReport, type EsgStatus,
} from '@/services/esgService'

const DASH = '—'
const score = (v: number | null | undefined) => (v == null ? DASH : `${Math.round(v)}/100`)
const dec = (v: number | null | undefined, unit = '') =>
  v == null ? DASH : `${v.toFixed(1)}${unit ? ` ${unit}` : ''}`
const numOrNull = (v: string): number | null => {
  const s = v.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const STATUS_TONE: Record<EsgStatus, { background: string; color: string }> = {
  draft: { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' },
  in_review: { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  approved: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  published: { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
}

const ASSURANCE_LABEL: Record<AssuranceStatus, string> = {
  none: 'No assurance',
  limited: 'Limited assurance',
  reasonable: 'Reasonable assurance',
}

const FRAMEWORKS = ['GRI', 'SASB', 'EU CSRD / ESRS', 'TCFD', 'ISSB (IFRS S1/S2)', 'CDP', 'GHG Protocol']

const BLANK = {
  title: '', period: '', periodStart: '', periodEnd: '',
  framework: '', frameworkVersion: '', authorId: '', status: 'draft' as EsgStatus,
  environmentalScore: '', socialScore: '', governanceScore: '',
  highlights: '', assuranceStatus: 'none' as AssuranceStatus, assuranceProvider: '', assuranceDate: '',
  reportingBoundary: '', consolidationBasis: '', isRestatement: false, restatementReason: '',
  materialityTopics: '', scope1: '', scope2: '', scope3: '', methodology: '',
  carbonRecordIds: [] as string[], energyMetricIds: [] as string[], modelIds: [] as string[],
}

function StatusBadge({ status }: { status: EsgStatus }) {
  return (
    <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_TONE[status]}>
      {ESG_STATUS_LABEL[status]}
    </span>
  )
}

export default function EsgReports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { reports, isLoading, isError, error, refetch, save, remove, transition, isSaving, isTransitioning } = useEsgData()
  const { items: carbonRecords } = useCarbonRecordsData()
  const { metrics: energyMetrics } = useEnergyData()
  const { models } = useModelOptions()
  const { options: users } = useUserOptions()
  const chart = useChartTheme()

  const [selected, setSelected] = useState<EsgReport | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [toDelete, setToDelete] = useState<EsgReport | null>(null)
  const [openMissing, setOpenMissing] = useState(false)

  // Deep link ?open=<id> — applied once on data arrival, so a refetch does not
  // reopen a drawer the user has closed (pattern shared with AibomRegistry).
  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (!openParam || isLoading || isError || appliedOpen.current === openParam) return
    appliedOpen.current = openParam
    const match = reports.find(r => r.id === openParam)
    if (match) setSelected(match)
    else setOpenMissing(true)
  }, [openParam, isLoading, isError, reports])

  const modelName = (id: string): string => models.find(m => m.id === id)?.name ?? 'Unavailable'
  const carbonLabel = (id: string) => {
    const r = carbonRecords.find(c => c.id === id)
    if (!r) return 'Unavailable'
    return `${r.period ?? 'Period —'} · ${r.modelId ? modelName(r.modelId) : 'no model'}`
  }
  const energyLabel = (id: string) => {
    const r = energyMetrics.find(e => e.id === id)
    if (!r) return 'Unavailable'
    return `${r.period ?? 'Period —'} · ${r.modelId ? modelName(r.modelId) : (r.modelName ?? 'no model')}`
  }

  /** Chronological by reporting period — never by insertion order. */
  const sorted = useMemo(() => [...reports].sort(comparePeriodsDesc), [reports])

  const filtered = useMemo(
    () => sorted.filter(r => !modelParam || r.modelIds.includes(modelParam)),
    [sorted, modelParam],
  )

  const publishedByPeriod = useMemo(() => filtered.filter(r => r.status === 'published'), [filtered])
  const latest = publishedByPeriod[0] ?? filtered[0] ?? null

  /** Latest vs prior — by reporting period, among reports carrying scores. */
  const radarData = useMemo(() => {
    const scored = filtered.filter(r =>
      r.environmentalScore != null || r.socialScore != null || r.governanceScore != null)
    if (scored.length < 2) return null
    const [a, b] = scored
    return {
      latestLabel: a.period || a.title,
      priorLabel: b.period || b.title,
      rows: [
        { subject: 'Environmental', latest: a.environmentalScore, prior: b.environmentalScore },
        { subject: 'Social', latest: a.socialScore, prior: b.socialScore },
        { subject: 'Governance', latest: a.governanceScore, prior: b.governanceScore },
      ],
    }
  }, [filtered])

  const scoreTrend = useMemo(() => (
    [...filtered]
      .reverse()
      .filter(r => r.environmentalScore != null || r.socialScore != null || r.governanceScore != null)
      .map(r => ({
        period: r.period || r.title,
        env: r.environmentalScore,
        social: r.socialScore,
        gov: r.governanceScore,
      }))
  ), [filtered])

  function exportCsv() {
    if (!filtered.length) { toast.error('Nothing to export'); return }
    const header = [
      'title', 'period', 'period_start', 'period_end', 'framework', 'framework_version', 'status',
      'author', 'approver', 'approved_at', 'published_at', 'assurance_status', 'assurance_provider',
      'assurance_date', 'reporting_boundary', 'consolidation_basis', 'is_restatement',
      'environmental_score_self_assessed', 'social_score_self_assessed', 'governance_score_self_assessed',
      'overall_score_self_assessed', 'scope1_tco2e', 'scope2_tco2e', 'scope3_tco2e',
      'cited_carbon_records', 'cited_energy_metrics', 'linked_models', 'methodology',
    ]
    const cell = (v: unknown) => JSON.stringify(v == null ? '' : v)
    const body = filtered.map(r => [
      r.title, r.period, r.periodStart, r.periodEnd, r.framework, r.frameworkVersion, r.status,
      r.author, r.approver, r.approvedAt, r.publishedAt, r.assuranceStatus, r.assuranceProvider,
      r.assuranceDate, r.reportingBoundary, r.consolidationBasis, r.isRestatement,
      r.environmentalScore, r.socialScore, r.governanceScore, r.overallScore,
      r.scope1Tco2e, r.scope2Tco2e, r.scope3Tco2e,
      r.carbonRecordIds.length, r.energyMetricIds.length,
      r.modelIds.map(modelName).join(' | '), r.methodology,
    ].map(cell).join(','))
    const csv = [header.join(','), ...body].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `esg-reports-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  /** A real file, built from the stored record and its resolved citations. */
  function downloadDisclosure(r: EsgReport) {
    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'Dimension scores are self-assessed by the report author; they are not framework-issued ratings.',
      report: {
        title: r.title,
        reportingPeriod: r.period,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        framework: r.framework,
        frameworkVersion: r.frameworkVersion,
        status: r.status,
        author: r.author,
        approver: r.approver,
        approvedAt: r.approvedAt,
        publishedAt: r.publishedAt,
        assurance: {
          status: r.assuranceStatus,
          provider: r.assuranceProvider,
          date: r.assuranceDate,
        },
        reportingBoundary: r.reportingBoundary,
        consolidationBasis: r.consolidationBasis,
        isRestatement: r.isRestatement,
        restatementReason: r.restatementReason,
        materialityTopics: r.materialityTopics,
        selfAssessedScores: {
          environmental: r.environmentalScore,
          social: r.socialScore,
          governance: r.governanceScore,
          overall: r.overallScore,
        },
        ghgInventoryTco2e: { scope1: r.scope1Tco2e, scope2: r.scope2Tco2e, scope3: r.scope3Tco2e },
        aiMetrics: r.aiMetrics,
        highlights: r.highlights,
        methodology: r.methodology,
      },
      evidence: {
        carbonRecords: r.carbonRecordIds.map(id => ({ id, label: carbonLabel(id) })),
        energyMetrics: r.energyMetricIds.map(id => ({ id, label: energyLabel(id) })),
        models: r.modelIds.map(id => ({ id, name: modelName(id) })),
      },
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    a.download = `${(r.period || r.title).replace(/[^\w.-]+/g, '-').toLowerCase()}-esg-disclosure.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success('Disclosure file downloaded')
  }

  const formValid = !!form.title.trim() && !!form.period.trim()

  async function submit() {
    const env = numOrNull(form.environmentalScore)
    const soc = numOrNull(form.socialScore)
    const gov = numOrNull(form.governanceScore)
    // Mean only when all three are present. A legitimate 0 counts; a MISSING
    // dimension makes the mean undefined, so it stays null and renders as —.
    const overall = env != null && soc != null && gov != null
      ? Math.round((env + soc + gov) / 3)
      : null
    const author = users.find(u => u.id === form.authorId)

    try {
      await save({
        title: form.title.trim(),
        period: form.period.trim(),
        periodStart: form.periodStart || null,
        periodEnd: form.periodEnd || null,
        framework: form.framework || null,
        frameworkVersion: form.frameworkVersion.trim() || null,
        status: form.status,
        author: author?.name ?? null,
        authorUserId: author?.id ?? null,
        environmentalScore: env,
        socialScore: soc,
        governanceScore: gov,
        overallScore: overall,
        highlights: form.highlights.split('\n').map(h => h.trim()).filter(Boolean),
        assuranceStatus: form.assuranceStatus,
        assuranceProvider: form.assuranceProvider.trim() || null,
        assuranceDate: form.assuranceDate || null,
        reportingBoundary: form.reportingBoundary.trim() || null,
        consolidationBasis: form.consolidationBasis.trim() || null,
        isRestatement: form.isRestatement,
        restatementReason: form.isRestatement ? (form.restatementReason.trim() || null) : null,
        materialityTopics: form.materialityTopics.split(',').map(t => t.trim()).filter(Boolean),
        scope1Tco2e: numOrNull(form.scope1),
        scope2Tco2e: numOrNull(form.scope2),
        scope3Tco2e: numOrNull(form.scope3),
        carbonRecordIds: form.carbonRecordIds,
        energyMetricIds: form.energyMetricIds,
        modelIds: form.modelIds,
        methodology: form.methodology.trim() || null,
      })
      toast.success(`ESG report saved — ${form.title.trim()}`)
      setFormOpen(false)
      setForm(BLANK)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save ESG report')
    }
  }

  /** Governed transition — the drawer only advances if the write lands. */
  async function changeStatus(r: EsgReport, to: EsgStatus) {
    try {
      const saved = await transition({ id: r.id, to, previous: r.status })
      toast.success(
        to === 'published'
          ? `"${saved.title}" published${saved.approver ? ` — approved by ${saved.approver}` : ''}`
          : to === 'in_review'
            ? `"${saved.title}" submitted for review`
            : `"${saved.title}" approved`,
      )
      setSelected(saved)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to change report status')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return false
    try {
      await remove(toDelete.id)
      toast.success(`"${toDelete.title}" deleted`)
      if (selected?.id === toDelete.id) setSelected(null)
      setToDelete(null)
      return true
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete report')
      return false
    }
  }

  const columns: Column<EsgReport>[] = [
    {
      key: 'title', header: 'Report', sortable: true,
      render: r => (
        <div>
          <div className="text-sm font-medium text-[hsl(var(--text-1))]">{r.title}</div>
          <div className="text-[11px] text-[hsl(var(--text-4))]">
            {r.framework ?? 'Framework —'}{r.frameworkVersion ? ` ${r.frameworkVersion}` : ''} · {r.author ?? 'Author —'}
          </div>
        </div>
      ),
    },
    { key: 'period', header: 'Period', sortable: true, render: r => <span className="text-xs">{r.period || DASH}</span> },
    { key: 'status', header: 'Status', sortable: true, render: r => <StatusBadge status={r.status} /> },
    {
      key: 'assuranceStatus', header: 'Assurance',
      render: r => (r.assuranceStatus
        ? <span className="text-xs text-[hsl(var(--text-2))]">
            {ASSURANCE_LABEL[r.assuranceStatus]}{r.assuranceProvider ? ` · ${r.assuranceProvider}` : ''}
          </span>
        : <span className="text-xs text-[hsl(var(--text-4))]">{DASH}</span>),
    },
    {
      key: 'overallScore', header: 'Overall (self-assessed)', sortable: true,
      render: r => <span className="font-mono text-xs">{score(r.overallScore)}</span>,
    },
    {
      key: 'publishedAt', header: 'Published',
      render: r => <span className="text-xs">{r.publishedAt ? r.publishedAt.slice(0, 10) : DASH}</span>,
    },
    {
      key: 'carbonRecordIds', header: 'Evidence',
      render: r => (
        <span className="text-[11px] text-[hsl(var(--text-3))]">
          {r.carbonRecordIds.length + r.energyMetricIds.length === 0
            ? 'No records cited'
            : `${r.carbonRecordIds.length} carbon · ${r.energyMetricIds.length} energy`}
        </span>
      ),
    },
  ]

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <PageHeader
        title="ESG Reports"
        subtitle="AI sustainability disclosures — evidence chain, assurance record and approval trail"
        icon={Globe}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={() => { setForm(BLANK); setFormOpen(true) }}>New report</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-none"
            style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderColor: 'hsl(var(--border))' }}>
            <span>Filtered to <strong>{models.find(m => m.id === modelParam)?.name ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
          <InterlinkChip label="Carbon records for this model" to={`/carbon-ledger?model=${modelParam}`} />
          <InterlinkChip label="Energy readings" to={`/energy-efficiency?model=${modelParam}`} />
        </div>
      )}

      {openMissing && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs border"
          style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', borderColor: 'hsl(var(--border))' }}>
          <span>Record not found or not visible to you.</span>
          <button aria-label="Dismiss notice" onClick={() => setOpenMissing(false)}
            className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
            <X size={12} />
          </button>
        </div>
      )}

      {isError ? (
        <ErrorState title="ESG reports could not be loaded" error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Globe size={28} />}
          title={reports.length === 0 ? 'No ESG reports yet' : 'No reports match this filter'}
          description={reports.length === 0
            ? 'Create a disclosure and cite the carbon records and energy readings it reports on, so every figure in it is traceable.'
            : 'Clear the model filter to see the rest of the reports.'}
          action={reports.length === 0
            ? <Button size="sm" icon={<Plus />} onClick={() => { setForm(BLANK); setFormOpen(true) }}>New report</Button>
            : undefined}
        />
      ) : (
        <>
          {latest && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  ['Environmental', latest.environmentalScore],
                  ['Social', latest.socialScore],
                  ['Governance', latest.governanceScore],
                  ['Overall', latest.overallScore],
                ].map(([label, value]) => (
                  <div key={label as string} className="border border-[hsl(var(--border))] bg-surface p-4">
                    <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{label} score</p>
                    <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{score(value as number | null)}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">
                      Self-assessed · {latest.period || latest.title} · {ESG_STATUS_LABEL[latest.status]}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[hsl(var(--text-4))] -mt-2">
                Dimension scores are entered by the report author and averaged for the overall figure. They are a
                self-assessment, not a rating issued under GRI, SASB, ESRS or TCFD.
              </p>
            </>
          )}

          {(radarData || scoreTrend.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {radarData && (
                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Self-assessed dimensions</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">
                    {radarData.latestLabel} vs {radarData.priorLabel} — ordered by reporting period.
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData.rows}>
                      <PolarGrid stroke={chart.grid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: chart.axis }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: chart.axis }} />
                      <Radar name={radarData.priorLabel} dataKey="prior" stroke={chart.axis} fill={chart.axis} fillOpacity={0.08} strokeDasharray="4 2" />
                      <Radar name={radarData.latestLabel} dataKey="latest" stroke={chart.brand} fill={chart.brand} fillOpacity={0.15} strokeWidth={2} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {scoreTrend.length > 0 && (
                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Self-assessed scores by period</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">Oldest to newest by reporting period; missing dimensions are gaps, not zeros.</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={scoreTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: chart.axis }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chart.axis }} />
                      <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="env" name="Environmental" fill={chart.colors[1]} />
                      <Bar dataKey="social" name="Social" fill={chart.brand} />
                      <Bar dataKey="gov" name="Governance" fill={chart.colors[5]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {latest?.aiMetrics && Object.keys(latest.aiMetrics).length > 0 && (
            <div className="border border-[hsl(var(--border))] bg-surface p-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">
                AI metrics — {latest.period || latest.title}
              </h3>
              <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">As recorded on the report. No direction of travel is asserted.</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(latest.aiMetrics).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-raised border border-[hsl(var(--border))]">
                    <span className="text-xs text-[hsl(var(--text-3))]">{key.replace(/_/g, ' ')}</span>
                    <span className="text-sm font-semibold text-[hsl(var(--text-1))]">
                      {value == null || value === '' ? DASH : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-[hsl(var(--border))] bg-surface p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Disclosures</h3>
            <DataTable
              data={filtered}
              columns={columns}
              searchKey="title"
              searchPlaceholder="Search reports…"
              onView={r => setSelected(r)}
              onDelete={r => setToDelete(r)}
              emptyMessage="No reports match this search."
            />
          </div>
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-start justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.title}</h2>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">
                  {selected.period || DASH} · {selected.framework ?? 'Framework —'}
                  {selected.frameworkVersion ? ` ${selected.frameworkVersion}` : ''}
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close"><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>

            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                {selected.isRestatement && (
                  <span className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                    Restatement
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Reporting period', selected.period || DASH],
                  ['Period start', selected.periodStart ?? DASH],
                  ['Period end', selected.periodEnd ?? DASH],
                  ['Lead author', selected.author ?? DASH],
                  ['Approver', selected.approver ?? DASH],
                  ['Approved at', selected.approvedAt ? selected.approvedAt.slice(0, 10) : DASH],
                  ['Published at', selected.publishedAt ? selected.publishedAt.slice(0, 10) : DASH],
                  ['Assurance', selected.assuranceStatus ? ASSURANCE_LABEL[selected.assuranceStatus] : DASH],
                  ['Assurance provider', selected.assuranceProvider ?? DASH],
                  ['Assurance date', selected.assuranceDate ?? DASH],
                  ['Reporting boundary', selected.reportingBoundary ?? DASH],
                  ['Consolidation basis', selected.consolidationBasis ?? DASH],
                  ['Scope 1', dec(selected.scope1Tco2e, 'tCO₂e')],
                  ['Scope 2', dec(selected.scope2Tco2e, 'tCO₂e')],
                  ['Scope 3', dec(selected.scope3Tco2e, 'tCO₂e')],
                  ['Overall (self-assessed)', score(selected.overallScore)],
                ].map(([label, value]) => (
                  <div key={label as string} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {selected.isRestatement && selected.restatementReason && (
                <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                  <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Restatement reason</p>
                  <p className="text-xs text-[hsl(var(--text-2))]">{selected.restatementReason}</p>
                </div>
              )}

              {selected.materialityTopics.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Material topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.materialityTopics.map(t => (
                      <span key={t} className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-2))' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* The evidence chain — a disclosure must cite what it reports on. */}
              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Evidence cited</p>
                {selected.carbonRecordIds.length + selected.energyMetricIds.length + selected.modelIds.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))]">
                    No carbon records, energy readings or models are cited by this report.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.modelIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.modelIds.map(id => (
                          <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                        ))}
                      </div>
                    )}
                    {selected.carbonRecordIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.carbonRecordIds.map(id => {
                          const rec = carbonRecords.find(c => c.id === id)
                          return rec?.modelId
                            ? <InterlinkChip key={id} label={`Carbon: ${carbonLabel(id)}`} to={`/carbon-ledger?model=${rec.modelId}`} />
                            : <span key={id} className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>Carbon: {carbonLabel(id)}</span>
                        })}
                      </div>
                    )}
                    {selected.energyMetricIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.energyMetricIds.map(id => {
                          const rec = energyMetrics.find(e => e.id === id)
                          return rec?.modelId
                            ? <InterlinkChip key={id} label={`Energy: ${energyLabel(id)}`} to={`/energy-efficiency?model=${rec.modelId}`} />
                            : <span key={id} className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>Energy: {energyLabel(id)}</span>
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selected.highlights.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Highlights</p>
                  <div className="space-y-1.5">
                    {selected.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-2))]">
                        <CheckCircle size={13} className="text-[hsl(var(--s-ok-tx))] flex-shrink-0 mt-0.5" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.methodology && (
                <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                  <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Methodology</p>
                  <p className="text-xs text-[hsl(var(--text-2))]">{selected.methodology}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[hsl(var(--border))] space-y-2">
              {selected.status === 'draft' && (
                <Button size="sm" variant="secondary" fullWidth loading={isTransitioning}
                  onClick={() => changeStatus(selected, 'in_review')}>
                  Submit for review
                </Button>
              )}
              {selected.status === 'in_review' && (
                <Button size="sm" fullWidth loading={isTransitioning}
                  onClick={() => changeStatus(selected, 'published')}>
                  Approve &amp; publish
                </Button>
              )}
              <Button size="sm" variant="secondary" fullWidth icon={<DownloadSimple />}
                onClick={() => downloadDisclosure(selected)}>
                Download disclosure (JSON)
              </Button>
            </div>
          </div>
        </div>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={o => { if (!o) setFormOpen(false) }}
        title="New ESG report"
        description="Cite the carbon records and energy readings this disclosure reports on. Dimension scores are self-assessed and are labelled as such wherever they appear."
        submitLabel="Save report"
        busy={isSaving}
        disabled={!formValid}
        onSubmit={submit}
      >
        <Field label="Title" required>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. AI ESG disclosure — 2026 Q2" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reporting period" required hint="e.g. 2026-Q2 or 2026 Annual">
            <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2026-Q2" />
          </Field>
          <Field label="Initial status">
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as EsgStatus }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {/* Publishing is an approval transition, not an initial state. */}
                {ESG_STATUSES.filter(s => s === 'draft' || s === 'in_review').map(s => (
                  <SelectItem key={s} value={s}>{ESG_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period start"><Input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} /></Field>
          <Field label="Period end"><Input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} /></Field>
          <Field label="Framework">
            <Select value={form.framework || undefined} onValueChange={v => setForm(f => ({ ...f, framework: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select framework…" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {FRAMEWORKS.map(fr => <SelectItem key={fr} value={fr}>{fr}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Framework version" hint="e.g. GRI 2021, ESRS E1">
            <Input value={form.frameworkVersion} onChange={e => setForm(f => ({ ...f, frameworkVersion: e.target.value }))} />
          </Field>
          <Field label="Lead author" hint="Chosen from the org directory; the user id is stored with the report.">
            <Select value={form.authorId || undefined} onValueChange={v => setForm(f => ({ ...f, authorId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select author…" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assurance">
            <Select value={form.assuranceStatus} onValueChange={v => setForm(f => ({ ...f, assuranceStatus: v as AssuranceStatus }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {ASSURANCE_STATUSES.map(a => <SelectItem key={a} value={a}>{ASSURANCE_LABEL[a]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assurance provider"><Input value={form.assuranceProvider} onChange={e => setForm(f => ({ ...f, assuranceProvider: e.target.value }))} /></Field>
          <Field label="Assurance date"><Input type="date" value={form.assuranceDate} onChange={e => setForm(f => ({ ...f, assuranceDate: e.target.value }))} /></Field>
          <Field label="Reporting boundary"><Input value={form.reportingBoundary} onChange={e => setForm(f => ({ ...f, reportingBoundary: e.target.value }))} placeholder="e.g. All AI systems in production" /></Field>
          <Field label="Consolidation basis"><Input value={form.consolidationBasis} onChange={e => setForm(f => ({ ...f, consolidationBasis: e.target.value }))} placeholder="e.g. Operational control" /></Field>
          <Field label="Scope 1 (tCO₂e)"><Input type="number" step="0.01" value={form.scope1} onChange={e => setForm(f => ({ ...f, scope1: e.target.value }))} /></Field>
          <Field label="Scope 2 (tCO₂e)"><Input type="number" step="0.01" value={form.scope2} onChange={e => setForm(f => ({ ...f, scope2: e.target.value }))} /></Field>
          <Field label="Scope 3 (tCO₂e)"><Input type="number" step="0.01" value={form.scope3} onChange={e => setForm(f => ({ ...f, scope3: e.target.value }))} /></Field>
          <Field label="Environmental score" hint="Self-assessed, 0–100. Leave blank if not assessed."><Input type="number" min={0} max={100} value={form.environmentalScore} onChange={e => setForm(f => ({ ...f, environmentalScore: e.target.value }))} /></Field>
          <Field label="Social score" hint="Self-assessed, 0–100."><Input type="number" min={0} max={100} value={form.socialScore} onChange={e => setForm(f => ({ ...f, socialScore: e.target.value }))} /></Field>
          <Field label="Governance score" hint="Self-assessed, 0–100."><Input type="number" min={0} max={100} value={form.governanceScore} onChange={e => setForm(f => ({ ...f, governanceScore: e.target.value }))} /></Field>
        </div>

        <Field label="Material topics" hint="Comma separated">
          <Input value={form.materialityTopics} onChange={e => setForm(f => ({ ...f, materialityTopics: e.target.value }))} placeholder="Climate change, Energy, Data privacy" />
        </Field>

        <div className="flex items-center gap-2">
          <input
            id="esg-restatement" type="checkbox" checked={form.isRestatement}
            onChange={e => setForm(f => ({ ...f, isRestatement: e.target.checked }))}
            className="h-4 w-4 accent-[hsl(var(--brand))]"
          />
          <label htmlFor="esg-restatement" className="text-[13px] text-[hsl(var(--text-2))]">
            This report restates a previously published disclosure
          </label>
        </div>
        {form.isRestatement && (
          <Field label="Restatement reason" required>
            <Textarea rows={2} value={form.restatementReason} onChange={e => setForm(f => ({ ...f, restatementReason: e.target.value }))} />
          </Field>
        )}

        <Field label="Models covered" hint="Stored as registry ids; names resolve at render time.">
          <CheckboxList
            options={models.map(m => ({ id: m.id, label: m.name }))}
            selected={form.modelIds}
            onToggle={id => setForm(f => ({
              ...f, modelIds: f.modelIds.includes(id) ? f.modelIds.filter(x => x !== id) : [...f.modelIds, id],
            }))}
            emptyLabel="No models in the registry yet."
          />
        </Field>
        <Field label="Carbon records cited" hint="The evidence this disclosure's emission figures rest on.">
          <CheckboxList
            options={carbonRecords.map(c => ({
              id: c.id,
              label: `${c.period ?? 'Period —'} · ${c.modelId ? modelName(c.modelId) : 'no model'} · ${c.totalEmissions == null ? DASH : `${c.totalEmissions.toFixed(1)} tCO₂e`}`,
            }))}
            selected={form.carbonRecordIds}
            onToggle={id => setForm(f => ({
              ...f, carbonRecordIds: f.carbonRecordIds.includes(id) ? f.carbonRecordIds.filter(x => x !== id) : [...f.carbonRecordIds, id],
            }))}
            emptyLabel="No carbon records to cite yet."
          />
        </Field>
        <Field label="Energy readings cited">
          <CheckboxList
            options={energyMetrics.map(e => ({
              id: e.id,
              label: `${e.period ?? 'Period —'} · ${e.modelId ? modelName(e.modelId) : (e.modelName ?? 'no model')} · ${e.kwh == null ? DASH : `${Math.round(e.kwh).toLocaleString()} kWh`}`,
            }))}
            selected={form.energyMetricIds}
            onToggle={id => setForm(f => ({
              ...f, energyMetricIds: f.energyMetricIds.includes(id) ? f.energyMetricIds.filter(x => x !== id) : [...f.energyMetricIds, id],
            }))}
            emptyLabel="No energy readings to cite yet."
          />
        </Field>

        <Field label="Highlights" hint="One per line">
          <Textarea rows={3} value={form.highlights} onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))} />
        </Field>
        <Field label="Methodology">
          <Textarea rows={2} value={form.methodology} onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete ESG report?"
        description={`Permanently remove "${toDelete?.title ?? ''}". This cannot be undone.`}
        isDestructive
        confirmLabel="Delete report"
      />
    </div>
  )
}

/** Bounded, scrollable multi-select for the evidence-chain fields. */
function CheckboxList({ options, selected, onToggle, emptyLabel }: {
  options: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string) => void
  emptyLabel: string
}) {
  if (options.length === 0) {
    return <p className="text-[11px] text-[hsl(var(--text-4))] border border-dashed border-[hsl(var(--border))] p-3">{emptyLabel}</p>
  }
  return (
    <div className="max-h-32 overflow-y-auto border border-[hsl(var(--border))] p-2 space-y-1">
      {options.map(o => (
        <label key={o.id} className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))] cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            onChange={() => onToggle(o.id)}
            className="h-3.5 w-3.5 accent-[hsl(var(--brand))]"
          />
          <span className="truncate">{o.label}</span>
        </label>
      ))}
    </div>
  )
}
