// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DataQuality — EU AI Act Art. 10 data quality assessments, persisted in the
// org-scoped `data_quality_assessments` table and keyed to real datasets
// (datasets.id) and models (ai_models.id). Honors ?dataset=<id> deep links.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, CheckCircle, Plus, X } from '@phosphor-icons/react'
import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useChartTheme } from '@/hooks/useChartTheme'
import { useDatasets, useQualityAssessments } from '@/hooks/useDatasetData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { Art10Status, QualityAssessment } from '@/services/datasetService'

const DIMENSIONS = [
  { key: 'completeness', label: 'Completeness' },
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'consistency', label: 'Consistency' },
  { key: 'representativeness', label: 'Representativeness' },
  { key: 'relevance', label: 'Relevance' },
  { key: 'timeliness', label: 'Timeliness' },
] as const

function art10Style(s?: Art10Status) {
  switch (s) {
    case 'met': return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
    case 'partial': return { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
    case 'not_met': return { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }
    default: return { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' }
  }
}

function art10Label(s?: Art10Status) {
  return s ? { met: 'Met', partial: 'Partial', not_met: 'Not Met' }[s] : '—'
}

function scoreColor(n?: number) {
  if (n == null) return 'hsl(var(--text-4))'
  if (n >= 85) return 'hsl(var(--s-ok-tx))'
  if (n >= 70) return 'hsl(var(--s-wn-tx))'
  return 'hsl(var(--s-er-tx))'
}

function toRadar(a: QualityAssessment) {
  const dims = DIMENSIONS.map((d) => ({ subject: d.label, value: a[d.key] ?? 0 }))
  return [...dims, { subject: 'Bias-Free', value: a.biasScore != null ? Math.round(a.biasScore * 100) : 0 }]
}

// Derived, not measured: overall = mean of entered dimensions (bias on a 0-100
// scale); Art. 10 status from the weakest dimension. Shown as "derived" in UI.
function derive(dims: Record<string, number>, bias: number): { overall: number; status: Art10Status } {
  const values = [...DIMENSIONS.map((d) => dims[d.key] ?? 0), Math.round(bias * 100)]
  const overall = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
  const min = Math.min(...values)
  const status: Art10Status = min >= 80 ? 'met' : min >= 60 ? 'partial' : 'not_met'
  return { overall, status }
}

export default function DataQuality() {
  const ct = useChartTheme()
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const datasetParam = searchParams.get('dataset')

  const { data: assessments, isLoading, isError, error, refetch, create, remove } = useQualityAssessments()
  const { data: datasets } = useDatasets()
  const { models, loading: modelsLoading } = useModelOptions()

  const [selected, setSelected] = useState<QualityAssessment | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [toDelete, setToDelete] = useState<QualityAssessment | null>(null)

  const datasetName = (id?: string) => (id ? datasets.find((d) => d.id === id)?.name : undefined)
  const modelName = (id?: string) => (id ? models.find((m) => m.id === id)?.name : undefined)

  const rows = useMemo(
    () => assessments
      .filter((a) => !datasetParam || a.datasetId === datasetParam)
      .map((a) => ({ ...a, name: datasetName(a.datasetId) ?? a.datasetId })),
    [assessments, datasetParam, datasets],
  )

  const met = assessments.filter((a) => a.art10Status === 'met').length
  const partial = assessments.filter((a) => a.art10Status === 'partial').length
  const notMet = assessments.filter((a) => a.art10Status === 'not_met').length

  const columns: Column<QualityAssessment & { name: string }>[] = [
    { key: 'name', header: 'Dataset', sortable: true, render: (a) => {
      const name = datasetName(a.datasetId)
      if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">Unavailable</span>
      return (
        <button onClick={(e) => { e.stopPropagation(); nav(`/datasets/${a.datasetId}`) }}
          className="text-xs font-medium text-[hsl(var(--brand))] hover:underline">{name}</button>
      )
    } },
    { key: 'modelId', header: 'Model', render: (a) => {
      const name = modelName(a.modelId)
      if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">{!a.modelId ? '—' : modelsLoading ? '…' : 'Unavailable'}</span>
      return (
        <button
          onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${a.modelId}`) }}
          className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
        >
          {name} <ArrowSquareOut size={12} />
        </button>
      )
    } },
    { key: 'overallScore', header: 'Overall', sortable: true, render: (a) => (
      <span className="font-mono text-xs font-semibold" style={{ color: scoreColor(a.overallScore) }}>
        {a.overallScore != null ? a.overallScore : '—'}
      </span>
    ) },
    { key: 'art10Status', header: 'Art. 10', render: (a) => (
      <span className="px-2 py-0.5 text-[10px] font-medium" style={art10Style(a.art10Status)}>{art10Label(a.art10Status)}</span>
    ) },
    { key: 'assessmentMethod', header: 'Method', sortable: true, render: (a) => (
      <span className="text-xs capitalize text-[hsl(var(--text-3))]">{a.assessmentMethod}</span>
    ) },
    { key: 'deficiencies', header: 'Deficiencies', render: (a) => (
      a.deficiencies.length
        ? <span className="text-xs text-[hsl(var(--s-wn-tx))]">{a.deficiencies.length}</span>
        : <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))]" />
    ) },
    { key: 'assessedAt', header: 'Date', sortable: true, render: (a) => (
      <span className="text-xs text-[hsl(var(--text-4))]">{a.assessedAt}</span>
    ) },
  ]

  function clearDatasetFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('dataset')
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Data Quality"
        subtitle="EU AI Act Article 10 quality assessments per governed dataset"
        icon={CheckCircle}
        actions={can('create') ? (
          <Button size="sm" icon={<Plus />} onClick={() => setCreateOpen(true)}>New Assessment</Button>
        ) : undefined}
      />

      {datasetParam && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Filtered to <strong>{datasetName(datasetParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear dataset filter" onClick={clearDatasetFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Assessments', value: assessments.length, color: 'hsl(var(--text-1))' },
          { label: 'Art. 10 Met', value: met, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Partial', value: partial, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Not Met', value: notMet, color: 'hsl(var(--s-er-tx))' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="px-4 py-3">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{isLoading ? '—' : s.value}</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--text-4))]">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState message={error?.message} onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState
              title={datasetParam ? 'No assessments for this dataset' : 'No quality assessments yet'}
              message={datasetParam
                ? 'Clear the dataset filter, or run the first assessment for it.'
                : datasets.length === 0
                  ? 'Register a dataset first — assessments are recorded against governed datasets.'
                  : 'Run the first Article 10 assessment against a registered dataset.'}
              actionLabel={can('create') && datasets.length > 0 ? 'New Assessment' : datasets.length === 0 ? 'Open Dataset Registry' : undefined}
              onAction={datasets.length === 0 ? () => nav('/datasets') : can('create') ? () => setCreateOpen(true) : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="name" searchPlaceholder="Search by dataset…"
              onView={setSelected}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={setSelected}
            />
          )}
      </Card>

      {/* Detail sheet with radar */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[560px] max-w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{datasetName(selected?.datasetId) ?? 'Assessment'}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs" style={art10Style(selected.art10Status)}>Art. 10 {art10Label(selected.art10Status)}</span>
                <span className="text-xs text-[hsl(var(--text-4))]">
                  {selected.assessmentMethod}{selected.assessor ? ` · ${selected.assessor}` : ''} · {selected.assessedAt}
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={toRadar(selected)}>
                    <PolarGrid stroke={ct.grid} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: ct.text, fontSize: 10 }} />
                    <Radar dataKey="value" stroke={ct.brand} fill={ct.brand} fillOpacity={0.25} />
                    <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {DIMENSIONS.map((d) => (
                  <div key={d.key} className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2">
                    <span className="text-[hsl(var(--text-3))]">{d.label}</span>
                    <span className="font-mono font-semibold" style={{ color: scoreColor(selected[d.key]) }}>{selected[d.key] ?? '—'}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2">
                  <span className="text-[hsl(var(--text-3))]">Bias-Free</span>
                  <span className="font-mono font-semibold" style={{ color: scoreColor(selected.biasScore != null ? selected.biasScore * 100 : undefined) }}>
                    {selected.biasScore != null ? selected.biasScore.toFixed(2) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2">
                  <span className="text-[hsl(var(--text-3))]">Overall (derived)</span>
                  <span className="font-mono font-semibold" style={{ color: scoreColor(selected.overallScore) }}>{selected.overallScore ?? '—'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--text-4))]">Deficiencies</p>
                {selected.deficiencies.length === 0 ? (
                  <p className="mt-1 text-xs text-[hsl(var(--text-4))]">None recorded.</p>
                ) : (
                  <div className="mt-1 space-y-2">
                    {selected.deficiencies.map((d, i) => (
                      <div key={i} className="border border-[hsl(var(--border))] p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[hsl(var(--text-1))]">{d.issue}</span>
                          <span className="text-[hsl(var(--s-wn-tx))]">{d.severity}</span>
                        </div>
                        <p className="mt-1 text-[hsl(var(--text-4))]">{d.dimension} — {d.remediation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t border-[hsl(var(--border))] pt-3">
                <Button size="sm" variant="outline" onClick={() => nav(`/datasets/${selected.datasetId}`)}>Open Dataset</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AssessmentForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDatasetId={datasetParam ?? undefined}
        onSubmit={async (record) => {
          await create.mutateAsync(record)
          toast.success('Assessment recorded')
          setCreateOpen(false)
        }}
      />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title="Delete this assessment?"
        description="This permanently removes the quality assessment record."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id, {
            onSuccess: () => toast.success('Assessment deleted'),
            onError: (err: any) => toast.error(err?.message ?? 'Delete failed'),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}

// ── New assessment form ───────────────────────────────────────────────────────

function AssessmentForm({ open, onOpenChange, defaultDatasetId, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  defaultDatasetId?: string
  onSubmit: (record: Partial<QualityAssessment>) => Promise<void>
}) {
  const { data: datasets } = useDatasets()
  const { models } = useModelOptions()
  const [datasetId, setDatasetId] = useState('')
  const [modelId, setModelId] = useState('')
  const [method, setMethod] = useState<'automated' | 'manual' | 'hybrid'>('automated')
  const [assessor, setAssessor] = useState('')
  const [dims, setDims] = useState<Record<string, number>>(
    Object.fromEntries(DIMENSIONS.map((d) => [d.key, 80])),
  )
  const [bias, setBias] = useState(0.8)
  const [saving, setSaving] = useState(false)

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setDatasetId(defaultDatasetId ?? '')
      setModelId('')
      setMethod('automated')
      setAssessor('')
      setDims(Object.fromEntries(DIMENSIONS.map((d) => [d.key, 80])))
      setBias(0.8)
    }
  }

  const { overall, status } = derive(dims, bias)
  const canSubmit = !!datasetId && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onSubmit({
        datasetId,
        modelId: modelId || undefined,
        assessmentMethod: method,
        assessor: assessor.trim() || undefined,
        completeness: dims.completeness, accuracy: dims.accuracy, consistency: dims.consistency,
        representativeness: dims.representativeness, relevance: dims.relevance, timeliness: dims.timeliness,
        biasScore: bias,
        overallScore: overall,
        art10Status: status,
        deficiencies: [],
        assessedAt: new Date().toISOString().slice(0, 10),
      })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to record assessment')
    } finally {
      setSaving(false)
    }
  }

  const label = 'text-xs font-semibold text-[hsl(var(--text-4))]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Quality Assessment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div><label className={label}>Dataset *</label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select a governed dataset" /></SelectTrigger>
              <SelectContent>
                {datasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><label className={label}>Model (optional)</label>
            <Select value={modelId || 'none'} onValueChange={(v) => setModelId(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Method</label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['automated', 'manual', 'hybrid'] as const).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select></div>
            <div><label className={label}>Assessor</label>
              <Input value={assessor} onChange={(e) => setAssessor(e.target.value)} className="mt-1" placeholder="Name or team" /></div>
          </div>
          <div className="space-y-2">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="flex items-center gap-3">
                <span className="w-40 text-xs text-[hsl(var(--text-3))]">{d.label}</span>
                <input type="range" min={0} max={100} value={dims[d.key]}
                  onChange={(e) => setDims((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))}
                  className="flex-1" />
                <span className="w-8 text-right font-mono text-xs" style={{ color: scoreColor(dims[d.key]) }}>{dims[d.key]}</span>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="w-40 text-xs text-[hsl(var(--text-3))]">Bias-Free (0–1)</span>
              <input type="range" min={0} max={100} value={Math.round(bias * 100)}
                onChange={(e) => setBias(Number(e.target.value) / 100)} className="flex-1" />
              <span className="w-8 text-right font-mono text-xs">{bias.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2 text-xs">
            <span className="text-[hsl(var(--text-4))]">Derived: overall score & Art. 10 status</span>
            <span className="flex items-center gap-2">
              <span className="font-mono font-semibold" style={{ color: scoreColor(overall) }}>{overall}</span>
              <span className="px-2 py-0.5 text-[10px]" style={art10Style(status)}>{art10Label(status)}</span>
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!canSubmit} onClick={handleSubmit}>{saving ? 'Saving…' : 'Record Assessment'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
