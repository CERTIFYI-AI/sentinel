// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Energy Efficiency — per-model electricity, accelerator and water draw.
//
// THE RULE FOR THIS PAGE. Only readings that exist are shown. A CO₂e figure is
// either stored on the reading or derived from stored kWh × a citable factor /
// grid intensity — and a derived figure is always labelled "Estimated" with
// its citation. No number is invented, and no NULL is coalesced to 0.
//
// What was deleted, and why:
//  * the REGIONS array — invented PUE / renewable / score values (GCP 1.08 /
//    97 / 96, …) rendered as a scored panel with progress bars, which a
//    recommendation then told the user to migrate workloads on the basis of.
//    The region panel now aggregates the REAL `region` and `pue` columns and
//    shows an honest empty state when the readings do not carry them;
//  * the literal `pue: 1.3` injected into the chart series while the real
//    `pue` column (values 1.18 / 1.43 / 1.29 / 1.22) sat unread;
//  * the efficiency formula `(tokens / kWh / 15000) * 100` — a magic constant
//    that scored every non-token workload 0/100, persisted it, painted it red
//    and dragged it into the "Avg Efficiency" KPI as if it were a real zero.
//    Efficiency is now shown only where a score is stored, and the average
//    EXCLUDES readings that have none rather than counting them as 0;
//  * the hardcoded recommendation list with invented savings ("~20%",
//    "~14 tCO₂/mo"), its "Implement" button that created nothing while
//    toasting "Task created and linked to model", and the invented
//    "Target: 90% by EOY".
//
// `measurement_source` now reaches the table, the KPI strip and the CSV, so a
// smart-metered reading is never silently averaged with a self-declared
// estimate.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar,
} from 'recharts'
import { Lightning, Export, Plus, X } from '@phosphor-icons/react'

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

import { useEnergyData } from '@/hooks/useEnergyData'
import { useEmissionFactors } from '@/hooks/useEmissionFactors'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useChartTheme } from '@/hooks/useChartTheme'
import { citeFactor, type EmissionFactor } from '@/services/emissionFactorService'
import { MEASUREMENT_SOURCES, ESTIMATED_SOURCES, type EnergyMetric } from '@/services/energyService'
import { periodSortKey } from '@/services/reportingPeriod'

const DASH = '—'
const int = (v: number | null | undefined, unit = '') =>
  v == null ? DASH : `${Math.round(v).toLocaleString()}${unit ? ` ${unit}` : ''}`
const dec = (v: number | null | undefined, digits = 2, unit = '') =>
  v == null ? DASH : `${v.toFixed(digits)}${unit ? ` ${unit}` : ''}`
const pct = (v: number | null | undefined) => (v == null ? DASH : `${Math.round(v)}%`)
const numOrNull = (v: string): number | null => {
  const s = v.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function sumOrNull(values: (number | null)[]) {
  const present = values.filter((v): v is number => v != null)
  return { total: present.length ? present.reduce((a, b) => a + b, 0) : null, reported: present.length }
}
/** Average over REPORTING readings only — a missing score is not a zero. */
function avgOrNull(values: (number | null)[]) {
  const present = values.filter((v): v is number => v != null)
  return { avg: present.length ? present.reduce((a, b) => a + b, 0) / present.length : null, reported: present.length }
}

const DEPLOYMENT_TYPES = ['cloud', 'on_prem', 'hybrid']
const PROVIDERS = ['AWS', 'Microsoft Azure', 'Google Cloud', 'OpenAI API', 'Anthropic API', 'On-premise', 'Other']

interface Co2eView { value: number | null; derived: boolean; cite: string | null }

/**
 * CO₂e for a reading. Stored value wins. Otherwise it is derived from stored
 * kWh and a citable factor / grid intensity, and marked as derived so the UI
 * can label it. With neither, it is NULL and simply is not shown.
 */
function co2eFor(r: EnergyMetric, factor: EmissionFactor | null): Co2eView {
  if (r.co2eKg != null) return { value: r.co2eKg, derived: false, cite: null }
  if (r.kwh == null) return { value: null, derived: false, cite: null }
  if (factor && /kwh/i.test(factor.factorUnit) && !/^g/i.test(factor.factorUnit)) {
    return { value: r.kwh * factor.factorValue, derived: true, cite: citeFactor(factor) }
  }
  const gi = r.gridIntensityGPerKwh ?? factor?.gridIntensityGPerKwh ?? null
  if (gi != null) {
    const cite = factor
      ? citeFactor(factor)
      : `${gi} gCO₂e/kWh grid intensity recorded on this reading${r.region ? ` · ${r.region}` : ''}`
    return { value: (r.kwh * gi) / 1000, derived: true, cite }
  }
  return { value: null, derived: false, cite: null }
}

const BLANK = {
  modelId: '', period: '', gpuHours: '', kwh: '', tokensGenerated: '', renewablePercent: '',
  computeProvider: '', measurementSource: 'Cloud Console', pue: '', acceleratorType: '',
  gpuUtilizationPercent: '', region: '', gridIntensityGPerKwh: '', co2eKg: '',
  emissionFactorId: '', instanceCount: '', deploymentType: '', waterUsageM3: '', notes: '',
}

export default function EnergyEfficiency() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { metrics, isLoading, isError, error, refetch, save, remove, isSaving } = useEnergyData()
  const { models } = useModelOptions()
  const { factors, byId: factorsById } = useEmissionFactors()
  const chart = useChartTheme()

  const [selected, setSelected] = useState<EnergyMetric | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [toDelete, setToDelete] = useState<EnergyMetric | null>(null)
  const [openMissing, setOpenMissing] = useState(false)

  // Deep link ?open=<id> — applied once on data arrival, so a refetch does not
  // reopen a drawer the user has closed (pattern shared with AibomRegistry).
  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (!openParam || isLoading || isError || appliedOpen.current === openParam) return
    appliedOpen.current = openParam
    const match = metrics.find(r => r.id === openParam)
    if (match) setSelected(match)
    else setOpenMissing(true)
  }, [openParam, isLoading, isError, metrics])

  const modelName = (id: string | null): string | null =>
    id ? (models.find(m => m.id === id)?.name ?? 'Unavailable') : null

  /** Registry name when linked; the legacy declared label otherwise. */
  const displayModel = (r: EnergyMetric): string =>
    modelName(r.modelId) ?? r.modelName ?? 'No model linked'

  const factorFor = (id: string | null): EmissionFactor | null => (id ? factorsById[id] ?? null : null)

  const filtered = useMemo(
    () => metrics.filter(r => !modelParam || r.modelId === modelParam),
    [metrics, modelParam],
  )

  const stats = useMemo(() => ({
    kwh: sumOrNull(filtered.map(r => r.kwh)),
    gpuHours: sumOrNull(filtered.map(r => r.gpuHours)),
    efficiency: avgOrNull(filtered.map(r => r.efficiencyScore)),
    renewable: avgOrNull(filtered.map(r => r.renewablePercent)),
  }), [filtered])

  /** Metered vs self-declared split — aggregates above mix both. */
  const sourceMix = useMemo(() => {
    const mix = new Map<string, number>()
    for (const r of filtered) {
      const key = r.measurementSource ?? 'Undeclared'
      mix.set(key, (mix.get(key) ?? 0) + 1)
    }
    const estimated = filtered.filter(r => r.measurementSource && ESTIMATED_SOURCES.includes(r.measurementSource)).length
    const undeclared = filtered.filter(r => !r.measurementSource).length
    return { entries: [...mix.entries()].sort((a, b) => b[1] - a[1]), estimated, undeclared }
  }, [filtered])

  const trend = useMemo(() => {
    const buckets = new Map<string, { key: number; kwh: number | null; tokens: number | null; pue: (number | null)[] }>()
    for (const r of filtered) {
      const label = r.period ?? DASH
      const key = periodSortKey(r.period, r.recordedAt)
      const cur = buckets.get(label) ?? { key, kwh: null, tokens: null, pue: [] }
      if (r.kwh != null) cur.kwh = (cur.kwh ?? 0) + r.kwh
      if (r.tokensGenerated != null) cur.tokens = (cur.tokens ?? 0) + r.tokensGenerated
      cur.pue.push(r.pue)
      buckets.set(label, cur)
    }
    return [...buckets.entries()]
      .filter(([, v]) => !Number.isNaN(v.key))
      .sort((a, b) => a[1].key - b[1].key)
      .map(([period, v]) => ({
        period,
        kwh: v.kwh,
        // Real intensity from stored values — null when either side is missing.
        tokensPerKwh: v.tokens != null && v.kwh ? Math.round(v.tokens / v.kwh) : null,
        // The REAL pue column, averaged over readings that report it.
        pue: avgOrNull(v.pue).avg,
      }))
  }, [filtered])

  const pueSeries = trend.filter(t => t.pue != null)
  const intensitySeries = trend.filter(t => t.tokensPerKwh != null)

  /** Region view built from real columns — never from a hardcoded table. */
  const regionRows = useMemo(() => {
    const map = new Map<string, { readings: number; kwh: (number | null)[]; pue: (number | null)[]; renewable: (number | null)[]; grid: (number | null)[] }>()
    for (const r of filtered) {
      if (!r.region) continue
      const cur = map.get(r.region) ?? { readings: 0, kwh: [], pue: [], renewable: [], grid: [] }
      cur.readings += 1
      cur.kwh.push(r.kwh); cur.pue.push(r.pue); cur.renewable.push(r.renewablePercent); cur.grid.push(r.gridIntensityGPerKwh)
      map.set(r.region, cur)
    }
    return [...map.entries()].map(([region, v]) => ({
      region,
      readings: v.readings,
      kwh: sumOrNull(v.kwh).total,
      pue: avgOrNull(v.pue),
      renewable: avgOrNull(v.renewable),
      grid: avgOrNull(v.grid),
    })).sort((a, b) => (b.kwh ?? -1) - (a.kwh ?? -1))
  }, [filtered])

  const rows = useMemo(() => filtered.map(r => {
    const co2 = co2eFor(r, factorFor(r.emissionFactorId))
    return { ...r, modelLabel: displayModel(r), co2 }
  }), [filtered, models, factorsById]) // eslint-disable-line react-hooks/exhaustive-deps

  type Row = (typeof rows)[number]

  function exportCsv() {
    if (!rows.length) { toast.error('Nothing to export'); return }
    const header = [
      'model', 'period', 'measurement_source', 'gpu_hours', 'kwh', 'tokens_generated',
      'tokens_per_kwh', 'efficiency_score', 'renewable_percent', 'pue', 'accelerator_type',
      'gpu_utilization_percent', 'region', 'grid_intensity_g_per_kwh', 'co2e_kg',
      'co2e_basis', 'co2e_citation', 'instance_count', 'deployment_type', 'water_m3',
      'compute_provider', 'recorded_at',
    ]
    const cell = (v: unknown) => JSON.stringify(v == null ? '' : v)
    const body = rows.map(r => [
      r.modelLabel, r.period, r.measurementSource, r.gpuHours, r.kwh, r.tokensGenerated,
      r.tokensGenerated != null && r.kwh ? Math.round(r.tokensGenerated / r.kwh) : null,
      r.efficiencyScore, r.renewablePercent, r.pue, r.acceleratorType, r.gpuUtilizationPercent,
      r.region, r.gridIntensityGPerKwh, r.co2.value == null ? null : Number(r.co2.value.toFixed(3)),
      r.co2.value == null ? null : (r.co2.derived ? 'estimated' : 'reported'), r.co2.cite,
      r.instanceCount, r.deploymentType, r.waterUsageM3, r.computeProvider, r.recordedAt,
    ].map(cell).join(','))
    const csv = [header.join(','), ...body].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `energy-efficiency-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const formValid = !!form.modelId && !!form.period.trim() && !!form.measurementSource

  async function submit() {
    try {
      await save({
        modelId: form.modelId,
        // model_name stays the declared label for legacy readers; the id is
        // the interlink. It is resolved, never typed in.
        modelName: modelName(form.modelId) ?? null,
        period: form.period.trim(),
        gpuHours: numOrNull(form.gpuHours),
        kwh: numOrNull(form.kwh),
        tokensGenerated: numOrNull(form.tokensGenerated),
        renewablePercent: numOrNull(form.renewablePercent),
        computeProvider: form.computeProvider || null,
        measurementSource: form.measurementSource,
        pue: numOrNull(form.pue),
        acceleratorType: form.acceleratorType.trim() || null,
        gpuUtilizationPercent: numOrNull(form.gpuUtilizationPercent),
        region: form.region.trim() || null,
        gridIntensityGPerKwh: numOrNull(form.gridIntensityGPerKwh),
        co2eKg: numOrNull(form.co2eKg),
        emissionFactorId: form.emissionFactorId || null,
        instanceCount: numOrNull(form.instanceCount),
        deploymentType: form.deploymentType || null,
        waterUsageM3: numOrNull(form.waterUsageM3),
        notes: form.notes.trim() || null,
        recordedAt: new Date().toISOString().slice(0, 10),
      })
      toast.success(`Energy reading saved — ${modelName(form.modelId) ?? 'model'} · ${form.period.trim()}`)
      setFormOpen(false)
      setForm(BLANK)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save energy reading')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return false
    try {
      await remove(toDelete.id)
      toast.success('Energy reading deleted')
      if (selected?.id === toDelete.id) setSelected(null)
      setToDelete(null)
      return true
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete energy reading')
      return false
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'modelLabel', header: 'Model', sortable: true,
      render: r => (r.modelId && modelName(r.modelId) !== 'Unavailable'
        ? <InterlinkChip label={r.modelLabel} to={`/models/inventory/${r.modelId}`} />
        : <span className="text-xs text-[hsl(var(--text-2))]">{r.modelId ? 'Unavailable' : (r.modelName ?? DASH)}</span>),
    },
    { key: 'period', header: 'Period', sortable: true, render: r => <span className="text-xs">{r.period ?? DASH}</span> },
    {
      key: 'measurementSource', header: 'Source', sortable: true,
      render: r => {
        if (!r.measurementSource) return <span className="text-xs text-[hsl(var(--text-4))]">{DASH}</span>
        const estimated = ESTIMATED_SOURCES.includes(r.measurementSource)
        return (
          <span className="text-[10px] px-1.5 py-0.5" style={estimated
            ? { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
            : { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>
            {r.measurementSource}
          </span>
        )
      },
    },
    { key: 'kwh', header: 'kWh', sortable: true, render: r => <span className="font-mono text-xs">{int(r.kwh)}</span> },
    { key: 'gpuHours', header: 'GPU h', sortable: true, render: r => <span className="font-mono text-xs">{int(r.gpuHours)}</span> },
    { key: 'pue', header: 'PUE', sortable: true, render: r => <span className="font-mono text-xs">{dec(r.pue, 2)}</span> },
    { key: 'renewablePercent', header: 'Renewable', sortable: true, render: r => <span className="font-mono text-xs">{pct(r.renewablePercent)}</span> },
    {
      key: 'efficiencyScore', header: 'Efficiency', sortable: true,
      render: r => (r.efficiencyScore == null
        ? <span className="text-xs text-[hsl(var(--text-4))]" title="No efficiency score reported for this reading">{DASH}</span>
        : <span className="font-mono text-xs">{Math.round(r.efficiencyScore)}/100</span>),
    },
    {
      key: 'co2', header: 'CO₂e (kg)', sortable: false,
      render: r => (r.co2.value == null
        ? <span className="text-xs text-[hsl(var(--text-4))]">{DASH}</span>
        : (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs">{int(r.co2.value)}</span>
            {r.co2.derived && (
              <span className="text-[10px] px-1 max-w-[190px] truncate" title={r.co2.cite ?? undefined}
                style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                Estimated · {r.co2.cite}
              </span>
            )}
          </div>
        )),
    },
    { key: 'region', header: 'Region', sortable: true, render: r => <span className="text-xs">{r.region ?? DASH}</span> },
  ]

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Energy Efficiency"
        subtitle="Per-model electricity, accelerator and water draw, with the provenance of every reading"
        icon={Lightning}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={() => { setForm(BLANK); setFormOpen(true) }}>Log reading</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-none"
            style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderColor: 'hsl(var(--border))' }}>
            <span>Filtered to <strong>{modelName(modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
          <InterlinkChip label="Carbon records for this model" to={`/carbon-ledger?model=${modelParam}`} />
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
        <ErrorState title="Energy readings could not be loaded" error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total electricity', value: int(stats.kwh.total, 'kWh'), sub: `${stats.kwh.reported} of ${filtered.length} readings report kWh` },
              { label: 'Total GPU hours', value: int(stats.gpuHours.total), sub: `${stats.gpuHours.reported} of ${filtered.length} readings report GPU hours` },
              {
                label: 'Avg efficiency score',
                value: stats.efficiency.avg == null ? DASH : `${Math.round(stats.efficiency.avg)}/100`,
                sub: `Mean of ${stats.efficiency.reported} readings that report a score — readings without one are excluded, not counted as 0`,
              },
              { label: 'Avg renewable share', value: pct(stats.renewable.avg), sub: `Mean of ${stats.renewable.reported} reporting readings` },
            ].map(s => (
              <div key={s.label} className="border border-[hsl(var(--border))] bg-surface p-4">
                <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-xl font-bold text-[hsl(var(--text-1))]">{s.value}</p>
                <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {filtered.length > 0 && (
            <div className="border border-[hsl(var(--border))] bg-surface px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-[hsl(var(--text-2))]">Measurement provenance</span>
              {sourceMix.entries.map(([source, n]) => (
                <span key={source} className="text-[11px] px-1.5 py-0.5" style={
                  ESTIMATED_SOURCES.includes(source) || source === 'Undeclared'
                    ? { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
                    : { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
                }>{source}: {n}</span>
              ))}
              {(sourceMix.estimated > 0 || sourceMix.undeclared > 0) && (
                <span className="text-[11px] text-[hsl(var(--text-4))]">
                  Aggregates above include {sourceMix.estimated} self-declared estimate(s)
                  {sourceMix.undeclared > 0 ? ` and ${sourceMix.undeclared} reading(s) with no declared source` : ''}.
                </span>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Lightning size={28} />}
              title={metrics.length === 0 ? 'No energy readings yet' : 'No readings match this filter'}
              description={metrics.length === 0
                ? 'Log a reading with its measurement source so metered data is never averaged with an estimate.'
                : 'Clear the model filter to see the rest of the readings.'}
              action={metrics.length === 0
                ? <Button size="sm" icon={<Plus />} onClick={() => { setForm(BLANK); setFormOpen(true) }}>Log reading</Button>
                : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Electricity by period (kWh)</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">Periods sorted chronologically; unplaceable periods are omitted.</p>
                  {trend.filter(t => t.kwh != null).length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))] py-10 text-center">No kWh reported yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={trend.filter(t => t.kwh != null)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: chart.axis }} />
                        <YAxis tick={{ fontSize: 10, fill: chart.axis }} />
                        <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 12 }} />
                        <Bar dataKey="kwh" name="kWh" fill={chart.brand} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Reported PUE by period</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">Mean of the PUE values stored on the readings — no default is assumed.</p>
                  {pueSeries.length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))] py-10 text-center">No PUE reported on any reading.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={190}>
                      <LineChart data={pueSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: chart.axis }} />
                        <YAxis tick={{ fontSize: 10, fill: chart.axis }} domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 12 }} />
                        <Line type="monotone" dataKey="pue" name="PUE" stroke={chart.brand} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {intensitySeries.length > 0 && (
                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Token intensity (tokens per kWh)</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">
                    Stored tokens ÷ stored kWh. Periods without both are omitted — they are not scored zero.
                  </p>
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart data={intensitySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: chart.axis }} />
                      <YAxis tick={{ fontSize: 10, fill: chart.axis }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} tokens/kWh`]}
                        contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 12 }} />
                      <Line type="monotone" dataKey="tokensPerKwh" name="Tokens/kWh" stroke="hsl(var(--s-ok-tx))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="border border-[hsl(var(--border))] bg-surface p-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Compute regions</h3>
                <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">
                  Aggregated from the region, PUE, renewable share and grid intensity stored on the readings.
                </p>
                {regionRows.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))] py-6 text-center">
                    No reading records a region yet — nothing to compare.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {regionRows.map(r => (
                      <div key={r.region} className="p-3 bg-raised border border-[hsl(var(--border))]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.region}</span>
                          <span className="text-xs font-mono text-[hsl(var(--text-2))]">{int(r.kwh, 'kWh')}</span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-[10px] text-[hsl(var(--text-4))]">
                          <span>Readings: {r.readings}</span>
                          <span>PUE: {dec(r.pue.avg, 2)}{r.pue.reported ? ` (${r.pue.reported} reporting)` : ''}</span>
                          <span>Renewable: {pct(r.renewable.avg)}{r.renewable.reported ? ` (${r.renewable.reported} reporting)` : ''}</span>
                          <span>Grid intensity: {r.grid.avg == null ? DASH : `${Math.round(r.grid.avg)} gCO₂e/kWh`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-[hsl(var(--border))] bg-surface p-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Readings</h3>
                <DataTable
                  data={rows}
                  columns={columns}
                  searchKey="modelLabel"
                  searchPlaceholder="Search by model…"
                  onView={r => setSelected(r)}
                  onDelete={r => setToDelete(r)}
                  emptyMessage="No readings match this search."
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[460px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-start justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{displayModel(selected)}</h2>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">
                  {selected.period ?? DASH} · Source: {selected.measurementSource ?? 'undeclared'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close"><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-4">
              {selected.modelId && (
                <div className="flex flex-wrap gap-2">
                  <InterlinkChip label="Open model" to={`/models/inventory/${selected.modelId}`} />
                  <InterlinkChip label="Carbon records" to={`/carbon-ledger?model=${selected.modelId}`} />
                  <Link to={`/energy-efficiency?model=${selected.modelId}`}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 font-medium border"
                    style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-2))', borderColor: 'hsl(var(--border))' }}>
                    All readings for this model
                  </Link>
                </div>
              )}

              {(() => {
                const co2 = co2eFor(selected, factorFor(selected.emissionFactorId))
                if (co2.value == null) {
                  return (
                    <div className="p-3 text-xs bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">
                      No CO₂e for this reading: neither a stored value nor a citable grid intensity / emission factor is present.
                    </div>
                  )
                }
                return (
                  <div className="p-3 text-xs" style={co2.derived
                    ? { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
                    : { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>
                    <strong>{int(co2.value)} kgCO₂e</strong>{' '}
                    {co2.derived
                      ? <>— <strong>estimated</strong> from stored kWh × {co2.cite}</>
                      : '— as reported on the reading'}
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Electricity', int(selected.kwh, 'kWh')],
                  ['GPU hours', int(selected.gpuHours)],
                  ['GPU utilisation', pct(selected.gpuUtilizationPercent)],
                  ['Accelerator', selected.acceleratorType ?? DASH],
                  ['Instances', int(selected.instanceCount)],
                  ['Deployment', selected.deploymentType ?? DASH],
                  ['Tokens generated', int(selected.tokensGenerated)],
                  ['Tokens per kWh', selected.tokensGenerated != null && selected.kwh ? int(selected.tokensGenerated / selected.kwh) : DASH],
                  ['PUE', dec(selected.pue, 2)],
                  ['Renewable share', pct(selected.renewablePercent)],
                  ['Efficiency score', selected.efficiencyScore == null ? DASH : `${Math.round(selected.efficiencyScore)}/100`],
                  ['Water use', dec(selected.waterUsageM3, 2, 'm³')],
                  ['Region', selected.region ?? DASH],
                  ['Grid intensity', selected.gridIntensityGPerKwh == null ? DASH : `${Math.round(selected.gridIntensityGPerKwh)} gCO₂e/kWh`],
                  ['Compute provider', selected.computeProvider ?? DASH],
                  ['Recorded', selected.recordedAt ?? DASH],
                ].map(([label, value]) => (
                  <div key={label as string} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {selected.notes && (
                <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                  <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Notes</p>
                  <p className="text-xs text-[hsl(var(--text-2))]">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={o => { if (!o) setFormOpen(false) }}
        title="Log energy reading"
        description="Leave a field blank when it was not measured — blanks render as “—”, never as zero. No efficiency score is computed for you; only stored scores are shown."
        submitLabel="Save reading"
        busy={isSaving}
        disabled={!formValid}
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model" required hint="Stored as the registry id; the display name is resolved at render time.">
            <Select value={form.modelId || undefined} onValueChange={v => setForm(f => ({ ...f, modelId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select model…" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Period" required hint="e.g. 2026-Q1 or 2026-03">
            <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2026-Q1" />
          </Field>
          <Field label="Measurement source" required hint="Metered/billed sources and self-declared estimates are labelled differently everywhere they are shown.">
            <Select value={form.measurementSource} onValueChange={v => setForm(f => ({ ...f, measurementSource: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {MEASUREMENT_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Compute provider">
            <Select value={form.computeProvider || undefined} onValueChange={v => setForm(f => ({ ...f, computeProvider: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select provider…" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Electricity (kWh)"><Input type="number" step="0.01" value={form.kwh} onChange={e => setForm(f => ({ ...f, kwh: e.target.value }))} /></Field>
          <Field label="GPU hours"><Input type="number" step="0.1" value={form.gpuHours} onChange={e => setForm(f => ({ ...f, gpuHours: e.target.value }))} /></Field>
          <Field label="Tokens generated"><Input type="number" step="1" value={form.tokensGenerated} onChange={e => setForm(f => ({ ...f, tokensGenerated: e.target.value }))} /></Field>
          <Field label="GPU utilisation (%)"><Input type="number" min={0} max={100} value={form.gpuUtilizationPercent} onChange={e => setForm(f => ({ ...f, gpuUtilizationPercent: e.target.value }))} /></Field>
          <Field label="Accelerator type"><Input value={form.acceleratorType} onChange={e => setForm(f => ({ ...f, acceleratorType: e.target.value }))} placeholder="e.g. NVIDIA A100" /></Field>
          <Field label="Instance count"><Input type="number" step="1" value={form.instanceCount} onChange={e => setForm(f => ({ ...f, instanceCount: e.target.value }))} /></Field>
          <Field label="PUE" hint="Data-centre power usage effectiveness as reported by the operator."><Input type="number" step="0.01" value={form.pue} onChange={e => setForm(f => ({ ...f, pue: e.target.value }))} /></Field>
          <Field label="Renewable share (%)"><Input type="number" min={0} max={100} value={form.renewablePercent} onChange={e => setForm(f => ({ ...f, renewablePercent: e.target.value }))} /></Field>
          <Field label="Region"><Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. westeurope" /></Field>
          <Field label="Deployment type">
            <Select value={form.deploymentType || undefined} onValueChange={v => setForm(f => ({ ...f, deploymentType: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {DEPLOYMENT_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Grid intensity (gCO₂e/kWh)" hint="Used to derive CO₂e when no CO₂e is reported — always shown as an estimate with this citation.">
            <Input type="number" step="0.1" value={form.gridIntensityGPerKwh} onChange={e => setForm(f => ({ ...f, gridIntensityGPerKwh: e.target.value }))} />
          </Field>
          <Field label="Emission factor" hint="Optional catalog factor backing the derivation.">
            <Select value={form.emissionFactorId || undefined} onValueChange={v => setForm(f => ({ ...f, emissionFactorId: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}>
                <SelectValue placeholder={factors.length ? 'Select factor…' : 'No factors in catalog'} />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {factors.map(f => <SelectItem key={f.id} value={f.id}>{f.name} — {citeFactor(f)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="CO₂e (kg)" hint="Only when the provider reports it — otherwise leave blank and it is derived and labelled.">
            <Input type="number" step="0.01" value={form.co2eKg} onChange={e => setForm(f => ({ ...f, co2eKg: e.target.value }))} />
          </Field>
          <Field label="Water use (m³)"><Input type="number" step="0.01" value={form.waterUsageM3} onChange={e => setForm(f => ({ ...f, waterUsageM3: e.target.value }))} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete energy reading?"
        description={`Remove the ${toDelete?.period ?? 'selected'} reading for ${toDelete ? displayModel(toDelete) : ''}. This cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
