// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Carbon Ledger — per-model GHG accounting for AI workloads.
//
// THE RULE FOR THIS PAGE. A carbon number is impossible for a reader to
// second-guess, so every figure here is either (a) genuinely stored on the
// record, or (b) plain arithmetic over stored figures (total = training +
// inference, net = total − offsets) shown beside the recorder's declared
// measurement method and, when that method is `calculated` or `estimated`,
// the citable emission factor it rests on. Nothing else is rendered.
//
// What was deleted, and why:
//  * every `?? 0` on a nullable metric — the seeded records have no emissions
//    columns filled, so the page headlined "Net Emissions 0.0 tCO₂e / Budget
//    Utilization 0%", which reads as carbon neutral. NULL now renders as —;
//  * the efficiency formula `renewable*0.5 + (1 − total/200)*50` with a bare
//    fallback of 50, which was persisted and displayed as "{n}/100" with the
//    verdict "✓ Efficient — no action required";
//  * the hardcoded RECOMMENDATIONS ("Switch Fraud Engine to EU West region,
//    –14 tCO₂e/mo") naming models that were never resolved against the
//    registry, with invented savings;
//  * the "Projected Monthly" KPI, whose *0.5 damping factor was undisclosed
//    and whose ▲/▼ compared two arbitrary unsorted quarters.
//
// Periods are now sorted chronologically, the model is `model_id` on the one
// id-space (resolved to a name at render; "Unavailable" when it cannot be),
// and the carbon budget is explicitly labelled session-only because there is
// nowhere to persist it.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, CartesianGrid,
} from 'recharts'
import { Leaf, Export, Plus, X, Info } from '@phosphor-icons/react'

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

import { useCarbonRecordsData } from '@/hooks/useCarbonRecordsData'
import { useEmissionFactors } from '@/hooks/useEmissionFactors'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useChartTheme } from '@/hooks/useChartTheme'
import { citeFactor, type EmissionFactor } from '@/services/emissionFactorService'
import { periodSortKey } from '@/services/reportingPeriod'
import type { CarbonRecord, GhgScope, MeasurementMethod } from '@/services/carbonRecordsService'
import { safeExternalUrl } from '@/lib/url';

// ── formatting: null renders an em-dash, never 0 ────────────────────────────
const DASH = '—'
const dec = (v: number | null | undefined, digits = 1, unit = '') =>
  v == null ? DASH : `${v.toFixed(digits)}${unit ? ` ${unit}` : ''}`
const int = (v: number | null | undefined, unit = '') =>
  v == null ? DASH : `${Math.round(v).toLocaleString()}${unit ? ` ${unit}` : ''}`
const pct = (v: number | null | undefined) => (v == null ? DASH : `${Math.round(v)}%`)
const numOrNull = (v: string): number | null => {
  const s = v.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Sum that stays NULL when nothing was reported (0 would read as neutral). */
function sumOrNull(values: (number | null)[]): { total: number | null; reported: number } {
  const present = values.filter((v): v is number => v != null)
  return { total: present.length ? present.reduce((a, b) => a + b, 0) : null, reported: present.length }
}

function avgOrNull(values: (number | null)[]): { avg: number | null; reported: number } {
  const present = values.filter((v): v is number => v != null)
  return { avg: present.length ? present.reduce((a, b) => a + b, 0) / present.length : null, reported: present.length }
}

const METHODS: { value: MeasurementMethod; label: string; hint: string }[] = [
  { value: 'measured', label: 'Measured', hint: 'Metered or billed by the compute provider' },
  { value: 'calculated', label: 'Calculated', hint: 'Activity data × a published emission factor' },
  { value: 'estimated', label: 'Estimated', hint: 'Modelled — cite the factor it rests on' },
]
const METHOD_TONE: Record<MeasurementMethod, { bg: string; tx: string }> = {
  measured: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' },
  calculated: { bg: 'hsl(var(--s-in-bg))', tx: 'hsl(var(--s-in-tx))' },
  estimated: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' },
}

const SCOPES: { value: GhgScope; label: string }[] = [
  { value: 'scope_1', label: 'Scope 1 — direct' },
  { value: 'scope_2_market', label: 'Scope 2 — market-based' },
  { value: 'scope_2_location', label: 'Scope 2 — location-based' },
  { value: 'scope_3', label: 'Scope 3 — value chain' },
]
const SCOPE_LABEL: Record<string, string> = Object.fromEntries(SCOPES.map(s => [s.value, s.label]))

const PROVIDERS = ['AWS', 'Microsoft Azure', 'Google Cloud', 'OpenAI API', 'Anthropic API', 'On-premise', 'Other']

const BLANK = {
  modelId: '', period: '', periodStart: '', periodEnd: '',
  measurementMethod: 'measured' as MeasurementMethod, emissionFactorId: '', ghgScope: 'scope_2_market' as GhgScope,
  trainingEmissions: '', inferenceEmissions: '', energyKwh: '', renewablePercent: '',
  gpuHours: '', tokensProcessed: '', acceleratorType: '', pue: '', waterUsageM3: '',
  computeProvider: '', region: '',
  offsetTco2e: '', offsetRegistry: '', offsetSerial: '', offsetVintageYear: '', offsetRetiredAt: '',
  assuranceBody: '', assuranceDate: '', methodology: '', notes: '',
}

/** Provenance badge — an estimate must never look like a measurement. */
function MethodBadge({ method, cite }: { method: MeasurementMethod | null; cite: string | null }) {
  if (!method) return <span className="text-xs text-[hsl(var(--text-4))]">{DASH}</span>
  const tone = METHOD_TONE[method] ?? METHOD_TONE.estimated
  const label = METHODS.find(m => m.value === method)?.label ?? method
  return (
    <span
      title={cite ?? undefined}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: tone.bg, color: tone.tx }}
    >
      {label}
      {method !== 'measured' && cite && <Info size={10} />}
    </span>
  )
}

export default function CarbonLedger() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const {
    items, isLoading, isError, error, refetch,
    saveCarbonRecord, removeCarbonRecord, isSaving,
  } = useCarbonRecordsData()
  const { models } = useModelOptions()
  const { factors, byId: factorsById } = useEmissionFactors()
  const chart = useChartTheme()

  const [periodFilter, setPeriodFilter] = useState<string>('__all')
  const [selected, setSelected] = useState<CarbonRecord | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [toDelete, setToDelete] = useState<CarbonRecord | null>(null)
  // Session-only: there is no carbon_budgets table, so this is never saved and
  // is labelled as such rather than toasting "budget saved".
  const [budget, setBudget] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState('')
  const [openMissing, setOpenMissing] = useState(false)

  // Deep link ?open=<id> — applied once on data arrival, so a refetch does not
  // reopen a drawer the user has closed (pattern shared with AibomRegistry).
  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (!openParam || isLoading || isError || appliedOpen.current === openParam) return
    appliedOpen.current = openParam
    const match = items.find(r => r.id === openParam)
    if (match) setSelected(match)
    else setOpenMissing(true)
  }, [openParam, isLoading, isError, items])

  const modelName = (id: string | null): string | null =>
    id ? (models.find(m => m.id === id)?.name ?? 'Unavailable') : null

  const factorFor = (id: string | null): EmissionFactor | null => (id ? factorsById[id] ?? null : null)

  /** The citation that makes a derived figure honest, or an explicit gap. */
  const basisOf = (r: CarbonRecord): string | null => {
    if (!r.measurementMethod || r.measurementMethod === 'measured') return null
    const cite = citeFactor(factorFor(r.emissionFactorId))
    return cite ?? 'No emission factor cited'
  }

  const filtered = useMemo(() => {
    return items.filter(r => {
      if (modelParam && r.modelId !== modelParam) return false
      if (periodFilter !== '__all' && (r.period ?? DASH) !== periodFilter) return false
      return true
    })
  }, [items, modelParam, periodFilter])

  const periods = useMemo(() => {
    const seen = new Map<string, number>()
    for (const r of items) {
      const label = r.period ?? DASH
      if (!seen.has(label)) seen.set(label, periodSortKey(r.period, r.periodStart))
    }
    return [...seen.entries()]
      .sort((a, b) => {
        if (Number.isNaN(a[1])) return 1
        if (Number.isNaN(b[1])) return -1
        return a[1] - b[1]
      })
      .map(([label]) => label)
  }, [items])

  // ── aggregates. Every one stays NULL when nothing was reported. ───────────
  const totals = useMemo(() => {
    const total = sumOrNull(filtered.map(r => r.totalEmissions))
    const net = sumOrNull(filtered.map(r => r.netEmissions))
    const offsets = sumOrNull(filtered.map(r => r.offsetTco2e))
    const renewable = avgOrNull(filtered.map(r => r.renewablePercent))
    const energy = sumOrNull(filtered.map(r => r.energyKwh))
    return { total, net, offsets, renewable, energy }
  }, [filtered])

  const methodMix = useMemo(() => {
    const mix: Record<string, number> = { measured: 0, calculated: 0, estimated: 0, undeclared: 0 }
    for (const r of filtered) mix[r.measurementMethod ?? 'undeclared'] += 1
    return mix
  }, [filtered])

  const budgetPct = budget && budget > 0 && totals.net.total != null
    ? Math.round((totals.net.total / budget) * 100)
    : null

  /** Trend: chronologically sorted; unplaceable periods are excluded. */
  const trend = useMemo(() => {
    const buckets = new Map<string, { key: number; total: number | null }>()
    for (const r of filtered) {
      const label = r.period ?? DASH
      const key = periodSortKey(r.period, r.periodStart)
      const prev = buckets.get(label) ?? { key, total: null }
      if (r.totalEmissions != null) prev.total = (prev.total ?? 0) + r.totalEmissions
      buckets.set(label, prev)
    }
    const rows = [...buckets.entries()]
      .filter(([, v]) => !Number.isNaN(v.key) && v.total != null)
      .sort((a, b) => a[1].key - b[1].key)
      .map(([period, v]) => ({ period, emissions: Number((v.total as number).toFixed(2)) }))
    const excluded = [...buckets.values()].filter(v => Number.isNaN(v.key) && v.total != null).length
    return { rows, excluded }
  }, [filtered])

  const byModel = useMemo(() => {
    const map = new Map<string, { total: number | null; records: number; efficiency: (number | null)[] }>()
    for (const r of filtered) {
      const key = r.modelId ?? '__unassigned'
      const cur = map.get(key) ?? { total: null, records: 0, efficiency: [] }
      if (r.totalEmissions != null) cur.total = (cur.total ?? 0) + r.totalEmissions
      cur.records += 1
      cur.efficiency.push(r.efficiencyScore)
      map.set(key, cur)
    }
    return [...map.entries()].map(([id, v]) => ({
      id,
      name: id === '__unassigned' ? 'No model linked' : (modelName(id) ?? 'Unavailable'),
      emissions: v.total,
      records: v.records,
      efficiency: avgOrNull(v.efficiency),
    })).sort((a, b) => (b.emissions ?? -1) - (a.emissions ?? -1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, models])

  // ── rows for the table (flat display fields for search/sort) ──────────────
  const rows = useMemo(() => filtered.map(r => ({
    ...r,
    modelLabel: modelName(r.modelId) ?? 'No model linked',
    basis: basisOf(r),
  })), [filtered, models, factorsById]) // eslint-disable-line react-hooks/exhaustive-deps

  type Row = (typeof rows)[number]

  function exportCsv() {
    if (!rows.length) { toast.error('Nothing to export'); return }
    const header = [
      'model', 'period', 'period_start', 'period_end', 'ghg_scope', 'measurement_method',
      'emission_factor', 'training_tco2e', 'inference_tco2e', 'total_tco2e', 'offset_tco2e',
      'net_tco2e', 'energy_kwh', 'renewable_percent', 'gpu_hours', 'accelerator', 'pue',
      'water_m3', 'compute_provider', 'region', 'offset_registry', 'offset_serial',
      'offset_vintage_year', 'assurance_body', 'assurance_date', 'methodology',
    ]
    const cell = (v: unknown) => JSON.stringify(v == null ? '' : v)
    const body = rows.map(r => [
      r.modelLabel, r.period, r.periodStart, r.periodEnd, r.ghgScope, r.measurementMethod,
      citeFactor(factorFor(r.emissionFactorId)), r.trainingEmissions, r.inferenceEmissions,
      r.totalEmissions, r.offsetTco2e, r.netEmissions, r.energyKwh, r.renewablePercent,
      r.gpuHours, r.acceleratorType, r.pue, r.waterUsageM3, r.computeProvider, r.region,
      r.offsetRegistry, r.offsetSerial, r.offsetVintageYear, r.assuranceBody, r.assuranceDate,
      r.methodology,
    ].map(cell).join(','))
    const csv = [header.join(','), ...body].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `carbon-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const needsFactor = form.measurementMethod !== 'measured'
  const formValid = !!form.modelId && !!form.period.trim() && (!needsFactor || !!form.emissionFactorId)

  async function submit() {
    const training = numOrNull(form.trainingEmissions)
    const inference = numOrNull(form.inferenceEmissions)
    // Arithmetic over what was actually provided — no zero-filling.
    const total = training == null && inference == null ? null : (training ?? 0) + (inference ?? 0)
    const offset = numOrNull(form.offsetTco2e)
    const net = total == null ? null : total - (offset ?? 0)
    const assuranceBody = form.assuranceBody.trim() || null
    const assuranceDate = form.assuranceDate || null

    try {
      await saveCarbonRecord({
        modelId: form.modelId,
        period: form.period.trim(),
        periodStart: form.periodStart || null,
        periodEnd: form.periodEnd || null,
        measurementMethod: form.measurementMethod,
        emissionFactorId: needsFactor ? form.emissionFactorId : null,
        ghgScope: form.ghgScope,
        trainingEmissions: training,
        inferenceEmissions: inference,
        totalEmissions: total,
        netEmissions: net,
        offsetTco2e: offset,
        energyKwh: numOrNull(form.energyKwh),
        renewablePercent: numOrNull(form.renewablePercent),
        gpuHours: numOrNull(form.gpuHours),
        tokensProcessed: numOrNull(form.tokensProcessed),
        acceleratorType: form.acceleratorType.trim() || null,
        pue: numOrNull(form.pue),
        waterUsageM3: numOrNull(form.waterUsageM3),
        computeProvider: form.computeProvider || null,
        region: form.region.trim() || null,
        offsetRegistry: form.offsetRegistry.trim() || null,
        offsetSerial: form.offsetSerial.trim() || null,
        offsetVintageYear: numOrNull(form.offsetVintageYear),
        offsetRetiredAt: form.offsetRetiredAt || null,
        assuranceBody,
        assuranceDate,
        // `verified` means third-party assured — it is derived from the
        // assurance record, never asserted on its own.
        verified: !!(assuranceBody && assuranceDate),
        methodology: form.methodology.trim() || null,
        notes: form.notes.trim() || null,
      })
      toast.success(`Carbon record saved — ${modelName(form.modelId) ?? 'model'} · ${form.period.trim()}`)
      setFormOpen(false)
      setForm(BLANK)
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save carbon record')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return false
    try {
      await removeCarbonRecord(toDelete.id)
      toast.success('Carbon record deleted')
      if (selected?.id === toDelete.id) setSelected(null)
      setToDelete(null)
      return true
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete carbon record')
      return false
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'modelLabel', header: 'Model', sortable: true,
      render: r => (r.modelId && r.modelLabel !== 'Unavailable'
        ? <InterlinkChip label={r.modelLabel} to={`/models/inventory/${r.modelId}`} />
        : <span className="text-xs text-[hsl(var(--text-4))]">{r.modelId ? 'Unavailable' : DASH}</span>),
    },
    { key: 'period', header: 'Period', sortable: true, render: r => <span className="text-xs">{r.period ?? DASH}</span> },
    {
      key: 'measurementMethod', header: 'Basis', sortable: true,
      render: r => (
        <div className="flex flex-col gap-0.5">
          <MethodBadge method={r.measurementMethod} cite={r.basis} />
          {r.basis && <span className="text-[10px] text-[hsl(var(--text-4))] max-w-[190px] truncate">{r.basis}</span>}
        </div>
      ),
    },
    { key: 'ghgScope', header: 'Scope', render: r => <span className="text-xs text-[hsl(var(--text-3))]">{r.ghgScope ? (SCOPE_LABEL[r.ghgScope] ?? r.ghgScope) : DASH}</span> },
    { key: 'totalEmissions', header: 'Total tCO₂e', sortable: true, render: r => <span className="font-mono text-xs font-semibold text-[hsl(var(--text-1))]">{dec(r.totalEmissions)}</span> },
    { key: 'offsetTco2e', header: 'Offsets', sortable: true, render: r => <span className="font-mono text-xs">{dec(r.offsetTco2e)}</span> },
    { key: 'netEmissions', header: 'Net tCO₂e', sortable: true, render: r => <span className="font-mono text-xs font-semibold">{dec(r.netEmissions)}</span> },
    { key: 'energyKwh', header: 'Energy kWh', sortable: true, render: r => <span className="font-mono text-xs">{int(r.energyKwh)}</span> },
    { key: 'renewablePercent', header: 'Renewable', sortable: true, render: r => <span className="font-mono text-xs">{pct(r.renewablePercent)}</span> },
    {
      key: 'verified', header: 'Assurance',
      render: r => (r.verified
        ? <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>
            Assured{r.assuranceBody ? ` · ${r.assuranceBody}` : ''}
          </span>
        : <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>Not assured</span>),
    },
  ]

  if (isLoading) return <PageSkeleton />

  const periodScopeLabel = periodFilter === '__all' ? 'all periods' : periodFilter

  return (
    <div className="space-y-5">
      <PageHeader
        title="Carbon Ledger"
        subtitle="Per-model GHG accounting — training, inference, energy, offsets and assurance"
        icon={Leaf}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={() => { setForm(BLANK); setFormOpen(true) }}>Log record</Button>
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
          {modelParam && (
            <InterlinkChip label="Energy readings for this model" to={`/energy-efficiency?model=${modelParam}`} />
          )}
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
        <ErrorState
          title="Carbon records could not be loaded"
          error={error}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* Period scope — the KPI strip used to silently fall back between a
              hardcoded quarter and "everything", so the reader could not tell
              which population a number described. */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[hsl(var(--text-4))]">Reporting period</span>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="h-8 w-[180px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="__all">All periods</SelectItem>
                  {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-4))]">
              <span>Basis mix:</span>
              <span style={{ color: 'hsl(var(--s-ok-tx))' }}>{methodMix.measured} measured</span>
              <span style={{ color: 'hsl(var(--s-in-tx))' }}>{methodMix.calculated} calculated</span>
              <span style={{ color: 'hsl(var(--s-wn-tx))' }}>{methodMix.estimated} estimated</span>
              {methodMix.undeclared > 0 && <span>{methodMix.undeclared} undeclared</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Gross emissions',
                value: dec(totals.total.total, 1, 'tCO₂e'),
                sub: `${totals.total.reported} of ${filtered.length} records report a total · ${periodScopeLabel}`,
              },
              {
                label: 'Net emissions',
                value: dec(totals.net.total, 1, 'tCO₂e'),
                sub: `After offsets · ${totals.net.reported} of ${filtered.length} records · ${periodScopeLabel}`,
              },
              {
                label: 'Offsets retired',
                value: dec(totals.offsets.total, 1, 'tCO₂e'),
                sub: `${totals.offsets.reported} of ${filtered.length} records report offsets`,
              },
              {
                label: 'Avg renewable share',
                value: pct(totals.renewable.avg),
                sub: `Mean of ${totals.renewable.reported} reporting records`,
              },
            ].map(s => (
              <div key={s.label} className="border border-[hsl(var(--border))] bg-surface p-4">
                <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-xl font-bold text-[hsl(var(--text-1))]">{s.value}</p>
                <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Session-only budget. Nothing here is persisted, and it says so. */}
          <div className="border border-[hsl(var(--border))] bg-surface p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-[hsl(var(--text-2))]">Carbon budget</span>
            <Input
              type="number"
              min={0}
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              onBlur={() => setBudget(numOrNull(budgetInput))}
              placeholder="tCO₂e"
              className="h-8 w-28"
              aria-label="Carbon budget threshold in tCO2e"
            />
            <span className="text-[11px] text-[hsl(var(--text-4))]">
              Session only — this threshold is not saved and is visible to no one else.
            </span>
            {budget != null && budgetPct != null && (
              <span className="text-xs font-semibold ml-auto" style={{
                color: budgetPct >= 100 ? 'hsl(var(--s-er-tx))' : budgetPct >= 80 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
              }}>
                {dec(totals.net.total)} / {budget} tCO₂e ({budgetPct}%)
              </span>
            )}
            {budget != null && budgetPct == null && (
              <span className="text-xs text-[hsl(var(--text-4))] ml-auto">
                No net emissions reported for {periodScopeLabel} — utilisation cannot be computed.
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Leaf size={28} />}
              title={items.length === 0 ? 'No carbon records yet' : 'No records match this filter'}
              description={items.length === 0
                ? 'Log a record with its measurement basis — measured, calculated or estimated — so every figure can be traced to how it was obtained.'
                : 'Clear the model or period filter to see the rest of the ledger.'}
              action={items.length === 0
                ? <Button size="sm" icon={<Plus />} onClick={() => { setForm(BLANK); setFormOpen(true) }}>Log record</Button>
                : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Gross emissions by period (tCO₂e)</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">
                    Chronological. Only periods that report a total are plotted
                    {trend.excluded > 0 ? ` — ${trend.excluded} period(s) could not be placed in time and are omitted.` : '.'}
                  </p>
                  {trend.rows.length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))] py-10 text-center">No period totals reported yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trend.rows}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: chart.axis }} />
                        <YAxis tick={{ fontSize: 10, fill: chart.axis }} />
                        <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 12 }} />
                        {budget != null && (
                          <ReferenceLine y={budget} stroke="hsl(var(--s-er-tx))" strokeDasharray="4 2"
                            label={{ value: `Session budget ${budget}`, fill: 'hsl(var(--s-er-tx))', fontSize: 10 }} />
                        )}
                        <Area type="monotone" dataKey="emissions" stroke="hsl(var(--s-ok-tx))" fill="hsl(var(--s-ok-bg))" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="border border-[hsl(var(--border))] bg-surface p-4">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Emissions by model (tCO₂e)</h3>
                  <p className="text-[11px] text-[hsl(var(--text-4))] mb-3">Models with no reported total are not plotted.</p>
                  {byModel.filter(m => m.emissions != null).length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))] py-10 text-center">No model totals reported yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={byModel.filter(m => m.emissions != null)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: chart.axis }} />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: chart.axis }} />
                        <Tooltip contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText, fontSize: 12 }} />
                        <Bar dataKey="emissions" fill={chart.brand} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="border border-[hsl(var(--border))] bg-surface p-4">
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Records</h3>
                <DataTable
                  data={rows}
                  columns={columns}
                  searchKey="modelLabel"
                  searchPlaceholder="Search by model…"
                  onView={r => setSelected(r)}
                  onDelete={r => setToDelete(r)}
                  emptyMessage="No carbon records match this search."
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
            <div className="flex items-start justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">
                  {modelName(selected.modelId) ?? 'No model linked'} — {selected.period ?? DASH}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <MethodBadge method={selected.measurementMethod} cite={basisOf(selected)} />
                  {selected.ghgScope && (
                    <span className="text-[10px] text-[hsl(var(--text-4))]">{SCOPE_LABEL[selected.ghgScope] ?? selected.ghgScope}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close"><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>

            <div className="p-4 space-y-4">
              {basisOf(selected) && (
                <div className="p-3 text-xs" style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                  <strong>Not a measurement.</strong> These figures are {selected.measurementMethod} from:{' '}
                  {basisOf(selected)}
                  {factorFor(selected.emissionFactorId)?.sourceUrl && (
                    <>
                      {' · '}
                      <a href={safeExternalUrl(factorFor(selected.emissionFactorId)?.sourceUrl ?? '') ?? undefined} target="_blank" rel="noreferrer" className="underline">
                        source
                      </a>
                    </>
                  )}
                </div>
              )}

              {selected.modelId && (
                <div className="flex flex-wrap gap-2">
                  <InterlinkChip label="Open model" to={`/models/inventory/${selected.modelId}`} />
                  <InterlinkChip label="Energy readings" to={`/energy-efficiency?model=${selected.modelId}`} />
                  <Link to={`/carbon-ledger?model=${selected.modelId}`}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 font-medium border"
                    style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-2))', borderColor: 'hsl(var(--border))' }}>
                    All records for this model
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Training emissions', dec(selected.trainingEmissions, 1, 'tCO₂e')],
                  ['Inference emissions', dec(selected.inferenceEmissions, 1, 'tCO₂e')],
                  ['Total emissions', dec(selected.totalEmissions, 1, 'tCO₂e')],
                  ['Offsets retired', dec(selected.offsetTco2e, 1, 'tCO₂e')],
                  ['Net emissions', dec(selected.netEmissions, 1, 'tCO₂e')],
                  ['Energy', int(selected.energyKwh, 'kWh')],
                  ['Renewable share', pct(selected.renewablePercent)],
                  ['Efficiency score', selected.efficiencyScore == null ? DASH : `${Math.round(selected.efficiencyScore)}/100`],
                  ['GPU hours', int(selected.gpuHours)],
                  ['Accelerator', selected.acceleratorType ?? DASH],
                  ['Tokens processed', int(selected.tokensProcessed)],
                  ['PUE', selected.pue == null ? DASH : selected.pue.toFixed(2)],
                  ['Water use', dec(selected.waterUsageM3, 2, 'm³')],
                  ['Compute provider', selected.computeProvider ?? DASH],
                  ['Region', selected.region ?? DASH],
                  ['Period start', selected.periodStart ?? DASH],
                  ['Period end', selected.periodEnd ?? DASH],
                  ['Offset registry', selected.offsetRegistry ?? DASH],
                  ['Offset serial', selected.offsetSerial ?? DASH],
                  ['Offset vintage', selected.offsetVintageYear == null ? DASH : String(selected.offsetVintageYear)],
                  ['Offset retired', selected.offsetRetiredAt ?? DASH],
                  ['Assurance body', selected.assuranceBody ?? DASH],
                  ['Assurance date', selected.assuranceDate ?? DASH],
                ].map(([label, value]) => (
                  <div key={label as string} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {selected.methodology && (
                <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                  <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Methodology</p>
                  <p className="text-xs text-[hsl(var(--text-2))]">{selected.methodology}</p>
                </div>
              )}
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
        title="Log carbon record"
        description="Total is the sum of the training and inference figures you provide; net subtracts retired offsets. Leave a field blank when it was not measured — blanks render as “—”, never as zero."
        submitLabel="Save record"
        busy={isSaving}
        disabled={!formValid}
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model" required hint="Stored as the registry id — the name is resolved at render time.">
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
          <Field label="Period start"><Input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} /></Field>
          <Field label="Period end"><Input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} /></Field>

          <Field label="Measurement basis" required hint={METHODS.find(m => m.value === form.measurementMethod)?.hint}>
            <Select value={form.measurementMethod} onValueChange={v => setForm(f => ({ ...f, measurementMethod: v as MeasurementMethod }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Emission factor"
            required={needsFactor}
            hint={needsFactor
              ? 'Required for calculated/estimated figures — the number is shown with this citation.'
              : 'Not applicable to metered figures.'}
          >
            <Select
              value={form.emissionFactorId || undefined}
              onValueChange={v => setForm(f => ({ ...f, emissionFactorId: v }))}
            >
              <SelectTrigger style={{ borderRadius: 0 }} disabled={!needsFactor}>
                <SelectValue placeholder={factors.length ? 'Select factor…' : 'No factors in catalog'} />
              </SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {factors.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name} — {citeFactor(f)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="GHG scope">
            <Select value={form.ghgScope} onValueChange={v => setForm(f => ({ ...f, ghgScope: v as GhgScope }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {SCOPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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

          <Field label="Training emissions (tCO₂e)"><Input type="number" step="0.01" value={form.trainingEmissions} onChange={e => setForm(f => ({ ...f, trainingEmissions: e.target.value }))} /></Field>
          <Field label="Inference emissions (tCO₂e)"><Input type="number" step="0.01" value={form.inferenceEmissions} onChange={e => setForm(f => ({ ...f, inferenceEmissions: e.target.value }))} /></Field>
          <Field label="Energy (kWh)"><Input type="number" step="1" value={form.energyKwh} onChange={e => setForm(f => ({ ...f, energyKwh: e.target.value }))} /></Field>
          <Field label="Renewable share (%)"><Input type="number" min={0} max={100} value={form.renewablePercent} onChange={e => setForm(f => ({ ...f, renewablePercent: e.target.value }))} /></Field>
          <Field label="GPU hours"><Input type="number" step="1" value={form.gpuHours} onChange={e => setForm(f => ({ ...f, gpuHours: e.target.value }))} /></Field>
          <Field label="Accelerator type"><Input value={form.acceleratorType} onChange={e => setForm(f => ({ ...f, acceleratorType: e.target.value }))} placeholder="e.g. NVIDIA H100" /></Field>
          <Field label="Tokens processed"><Input type="number" step="1" value={form.tokensProcessed} onChange={e => setForm(f => ({ ...f, tokensProcessed: e.target.value }))} /></Field>
          <Field label="PUE"><Input type="number" step="0.01" value={form.pue} onChange={e => setForm(f => ({ ...f, pue: e.target.value }))} /></Field>
          <Field label="Water use (m³)"><Input type="number" step="0.01" value={form.waterUsageM3} onChange={e => setForm(f => ({ ...f, waterUsageM3: e.target.value }))} /></Field>
          <Field label="Region"><Input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="e.g. eu-west-1" /></Field>

          <Field label="Offsets retired (tCO₂e)"><Input type="number" step="0.01" value={form.offsetTco2e} onChange={e => setForm(f => ({ ...f, offsetTco2e: e.target.value }))} /></Field>
          <Field label="Offset registry"><Input value={form.offsetRegistry} onChange={e => setForm(f => ({ ...f, offsetRegistry: e.target.value }))} placeholder="e.g. Verra" /></Field>
          <Field label="Offset serial"><Input value={form.offsetSerial} onChange={e => setForm(f => ({ ...f, offsetSerial: e.target.value }))} /></Field>
          <Field label="Offset vintage year"><Input type="number" step="1" value={form.offsetVintageYear} onChange={e => setForm(f => ({ ...f, offsetVintageYear: e.target.value }))} /></Field>
          <Field label="Offset retired on"><Input type="date" value={form.offsetRetiredAt} onChange={e => setForm(f => ({ ...f, offsetRetiredAt: e.target.value }))} /></Field>

          <Field label="Assurance body" hint="Recording both a body and a date marks the record assured."><Input value={form.assuranceBody} onChange={e => setForm(f => ({ ...f, assuranceBody: e.target.value }))} /></Field>
          <Field label="Assurance date"><Input type="date" value={form.assuranceDate} onChange={e => setForm(f => ({ ...f, assuranceDate: e.target.value }))} /></Field>
        </div>
        <Field label="Methodology"><Textarea rows={2} value={form.methodology} onChange={e => setForm(f => ({ ...f, methodology: e.target.value }))} placeholder="How the figures were derived" /></Field>
        <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete carbon record?"
        description={`Remove the ${toDelete?.period ?? 'selected'} record for ${toDelete ? (modelName(toDelete.modelId) ?? 'this model') : ''}. This cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
