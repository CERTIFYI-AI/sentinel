// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Model Efficiency — multi-dimensional benchmark runs persisted in the
// org-scoped model_efficiency table. Rows link to the registry via model_id
// (ai_models.id uuid); external models store model_id null + a name. Writes
// throw and the success toast fires only after the write resolves. Blank
// scores stay blank ("—") — never silently defaulted — and the composite is
// derived only from the scores actually recorded.

import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Speedometer, Export, Eye, X, Plus, Trash, Gauge, Cpu, ArrowSquareOut } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { UserSelect } from '@/components/evals/UserSelect'
import { useModelEfficiencyData } from '@/hooks/useModelEfficiencyData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { useChartTheme } from '@/hooks/useChartTheme'
import type { ModelEfficiencyRecord } from '@/services/modelEfficiencyService'

function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

function scoreColor(s: number) {
  return s >= 80 ? 'hsl(var(--s-ok-tx))' : s >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))'
}

const numOrNull = (v: unknown): number | null => (v == null || v === '' ? null : Number(v))
/** Accuracy on a 0–100 scale (rows may record a 0–1 fraction). */
const accPct = (v: number | null): number | null => (v == null ? null : v <= 1 ? v * 100 : v)

interface Bench {
  id: string
  modelId: string | null
  model: string
  version: string
  task: string
  latencyP50: number | null
  latencyP99: number | null
  throughput: number | null
  accuracy: number | null
  f1Score: number | null
  costPerInference: number | null
  memoryMb: number | null
  carbonPerInference: number | null
  complianceScore: number | null
  biasScore: number | null
  explainabilityScore: number | null
  overallScore: number | null
  benchmarkDate: string
  benchmarkedBy: string
}

// Composite score (derived): weighted mean over the scores actually recorded.
// Blank fields are excluded (weights renormalized) — never defaulted.
const COMPOSITE_WEIGHTS: { key: 'accuracy' | 'complianceScore' | 'biasScore' | 'explainabilityScore'; w: number }[] = [
  { key: 'accuracy', w: 0.3 }, { key: 'complianceScore', w: 0.2 },
  { key: 'biasScore', w: 0.25 }, { key: 'explainabilityScore', w: 0.25 },
]
function compositeScore(b: Pick<Bench, 'accuracy' | 'complianceScore' | 'biasScore' | 'explainabilityScore'>): number | null {
  let sum = 0; let wsum = 0
  for (const { key, w } of COMPOSITE_WEIGHTS) {
    const raw = key === 'accuracy' ? accPct(b.accuracy) : b[key]
    if (raw == null || Number.isNaN(raw)) continue
    sum += raw * w; wsum += w
  }
  return wsum > 0 ? Math.round(sum / wsum) : null
}

/** Radar over the recorded 0–100 scores only — blank dimensions are omitted, not invented. */
function radarData(b: Bench) {
  return [
    { metric: 'Accuracy', value: accPct(b.accuracy) },
    { metric: 'Compliance', value: b.complianceScore },
    { metric: 'Fairness', value: b.biasScore },
    { metric: 'Explainability', value: b.explainabilityScore },
  ].filter((d): d is { metric: string; value: number } => d.value != null)
}

const fmt = (v: number | null, suffix = '', digits?: number) =>
  v == null ? '—' : `${digits != null ? v.toFixed(digits) : v}${suffix}`

const BLANK = {
  modelKey: '', externalName: '', version: '', task: '',
  latencyP50: '', latencyP99: '', throughput: '',
  accuracy: '', f1Score: '', costPerInference: '',
  memoryMb: '', carbonPerInference: '',
  complianceScore: '', biasScore: '', explainabilityScore: '',
  benchmarkedBy: '',
}
const EXTERNAL = '__external'

export default function ModelEfficiency() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const { items, isLoading, error, save, remove, isSaving } = useModelEfficiencyData()
  const { models } = useModelOptions()
  const chartTheme = useChartTheme()

  const [selected, setSelected] = useState<Bench | null>(null)
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Bench | null>(null)

  const registryName = (id: string | null) => (id ? (models.find(m => m.id === id)?.name ?? 'Unavailable') : null)

  const allBenchmarks = useMemo<Bench[]>(() => (items as ModelEfficiencyRecord[]).map(r => ({
    id: r.id,
    modelId: r.model_id ?? null,
    model: r.model_name || r.metadata?.model || '',
    version: r.version || '',
    task: r.task || '',
    latencyP50: numOrNull(r.latency_p50),
    latencyP99: numOrNull(r.latency_p99),
    throughput: numOrNull(r.throughput),
    accuracy: numOrNull(r.accuracy),
    f1Score: numOrNull(r.f1_score),
    costPerInference: numOrNull(r.cost_per_inference),
    memoryMb: numOrNull(r.memory_mb),
    carbonPerInference: numOrNull(r.carbon_per_inference),
    complianceScore: numOrNull(r.compliance_score),
    biasScore: numOrNull(r.bias_score),
    explainabilityScore: numOrNull(r.explainability_score),
    overallScore: numOrNull(r.overall_score),
    benchmarkDate: (r.benchmarked_at ?? r.created_at)?.slice(0, 10) ?? '',
    benchmarkedBy: r.benchmarked_by || '',
  })), [items])

  const benchmarks = useMemo(
    () => (modelParam ? allBenchmarks.filter(b => b.modelId === modelParam) : allBenchmarks),
    [allBenchmarks, modelParam],
  )

  const cA = compareA || benchmarks[0]?.id || ''
  const cB = compareB || benchmarks[1]?.id || ''
  const mA = benchmarks.find(b => b.id === cA) ?? benchmarks[0]
  const mB = benchmarks.find(b => b.id === cB) ?? benchmarks[1]

  // Display composite: the stored overall score, else derived from recorded scores.
  const overall = (b: Bench) => b.overallScore ?? compositeScore(b)
  const withOverall = benchmarks.map(b => ({ b, o: overall(b) })).filter((x): x is { b: Bench; o: number } => x.o != null)
  const withBias = benchmarks.filter(b => b.biasScore != null)
  const withExpl = benchmarks.filter(b => b.explainabilityScore != null)
  const best = withOverall.length ? withOverall.reduce((a, x) => (x.o > a.o ? x : a)) : null
  const worstBias = withBias.length ? withBias.reduce((a, b) => ((b.biasScore ?? 0) < (a.biasScore ?? 0) ? b : a)) : null

  async function handleCreate() {
    const isExternal = form.modelKey === EXTERNAL
    const modelName = isExternal ? form.externalName.trim() : (registryName(form.modelKey) ?? '')
    if (!form.modelKey || !modelName || !form.version || !form.task || !form.benchmarkedBy) {
      toast.error('Please fill in all required fields')
      return
    }
    const scores = {
      accuracy: numOrNull(form.accuracy),
      complianceScore: numOrNull(form.complianceScore),
      biasScore: numOrNull(form.biasScore),
      explainabilityScore: numOrNull(form.explainabilityScore),
    }
    try {
      // No client id — the DB uuid default fills it; org_id via current_user_org_id().
      await save({
        model_id: isExternal ? null : form.modelKey,
        model_name: modelName,
        version: form.version,
        task: form.task,
        latency_p50: numOrNull(form.latencyP50),
        latency_p99: numOrNull(form.latencyP99),
        throughput: numOrNull(form.throughput),
        accuracy: scores.accuracy,
        f1_score: numOrNull(form.f1Score),
        cost_per_inference: numOrNull(form.costPerInference),
        memory_mb: numOrNull(form.memoryMb),
        carbon_per_inference: numOrNull(form.carbonPerInference),
        compliance_score: scores.complianceScore,
        bias_score: scores.biasScore,
        explainability_score: scores.explainabilityScore,
        overall_score: compositeScore(scores),
        benchmarked_by: form.benchmarkedBy,
      })
      // Reached only after the write resolved (the hook fires the success toast).
      setShowCreate(false)
      setForm(BLANK)
    } catch { /* error toast fired by the hook */ }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await remove(target.id)
      setDeleteTarget(null)
      if (selected?.id === target.id) setSelected(null)
    } catch { setDeleteTarget(null) }
  }

  if (isLoading) return <PageSkeleton title="Model Efficiency" />

  const modelPill = (b: Bench) => b.modelId ? (
    <button
      onClick={e => { e.stopPropagation(); navigate(`/models/inventory/${b.modelId}`) }}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded-none border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] cursor-pointer transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
    >
      {registryName(b.modelId) ?? 'Unavailable'} <ArrowSquareOut size={11} />
    </button>
  ) : (
    <span className="text-xs font-medium text-[hsl(var(--text-1))]">{b.model} <span className="text-[10px] text-[hsl(var(--text-4))]">(external)</span></span>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Model Efficiency"
        subtitle="Multi-dimensional model benchmarking — accuracy, latency, cost, carbon, fairness, and explainability"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Model Efficiency' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => navigate('/models/inventory')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"><Cpu size={14} /> Model Registry</button>
            <button onClick={() => navigate('/trust-engine')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"><Gauge size={14} /> Runtime Trust</button>
            <button onClick={() => exportCsv(benchmarks as unknown as Record<string, unknown>[], 'model-efficiency.csv')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"><Export size={14} /> Export CSV</button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90"><Plus size={14} /> Add Benchmark Run</button>
          </div>
        }
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load benchmarks</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{error.message}</p>
        </div>
      )}

      {/* Model-scoped filter chip (deep-link from a model's Governance card) */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{registryName(modelParam) ?? 'Unavailable'}</strong></span>
            <button
              aria-label="Clear model filter"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* KPI Strip — computed only over recorded values */}
      {benchmarks.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Benchmark Runs', value: String(benchmarks.length), sub: modelParam ? 'For filtered model' : 'Recorded runs', color: 'hsl(var(--brand))' },
            { label: 'Best Composite (derived)', value: best ? `${best.o}/100` : '—', sub: best ? `${best.b.model} ${best.b.version}` : 'No scores recorded', color: best ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' },
            { label: 'Lowest Fairness', value: worstBias ? `${worstBias.biasScore}/100` : '—', sub: worstBias ? worstBias.model : 'No fairness scores recorded', color: worstBias ? scoreColor(worstBias.biasScore!) : 'hsl(var(--text-4))' },
            { label: 'Avg Explainability', value: withExpl.length ? `${Math.round(withExpl.reduce((s, b) => s + (b.explainabilityScore ?? 0), 0) / withExpl.length)}/100` : '—', sub: withExpl.length ? `Across ${withExpl.length} run${withExpl.length !== 1 ? 's' : ''}` : 'No scores recorded', color: 'hsl(var(--text-1))' },
          ].map(s => (
            <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
              <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[hsl(var(--text-4))] mt-1 truncate">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Radar — recorded scores only */}
      {benchmarks.length >= 2 && mA && mB && (
        <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">Model Comparison Radar</h3>
          <p className="text-[11px] text-[hsl(var(--text-4))] mb-4">Recorded 0–100 scores only — dimensions without a recorded value are omitted</p>
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[hsl(var(--brand))]" />
              <Select value={cA} onValueChange={setCompareA}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {benchmarks.map(b => <SelectItem key={b.id} value={b.id}>{b.model} {b.version}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-[hsl(var(--text-4))]">vs</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[hsl(var(--destructive))]" />
              <Select value={cB} onValueChange={setCompareB}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {benchmarks.map(b => <SelectItem key={b.id} value={b.id}>{b.model} {b.version}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-6">
            {[{ m: mA, stroke: 'hsl(var(--brand))', fill: 'hsl(var(--brand) / 0.2)' }, { m: mB, stroke: 'hsl(var(--destructive))', fill: 'hsl(var(--destructive) / 0.2)' }].map(({ m, stroke, fill }, i) => {
              const data = radarData(m)
              return (
                <div key={i} className="flex-1">
                  <p className="text-xs text-center text-[hsl(var(--text-4))] mb-2">{m.model} {m.version}</p>
                  {data.length >= 3 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={data}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chartTheme.text }} />
                        <Radar dataKey="value" stroke={stroke} fill={fill} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-center text-[hsl(var(--text-4))] py-16">Not enough recorded scores to draw a radar (needs 3+)</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Benchmark Table / honest empty state with create CTA */}
      {benchmarks.length === 0 && !error ? (
        <div className="border border-[hsl(var(--border))] bg-surface p-12 text-center">
          <Speedometer size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-3))]">
            {modelParam ? 'No benchmark runs recorded for this model yet.' : 'No benchmark runs recorded for your organization yet.'}
          </p>
          <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90">
            <Plus size={14} /> Add Benchmark Run
          </button>
        </div>
      ) : benchmarks.length > 0 && (
        <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-raised">
                {['Model', 'Task', 'Accuracy', 'P50 Lat', 'P99 Lat', 'Throughput', '$/Inference', 'Carbon/Inf', 'Fairness', 'Explainability', 'Composite (derived)', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarks.map(b => {
                const o = overall(b)
                return (
                  <tr key={b.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => setSelected(b)}>
                    <td className="px-3 py-3">
                      {modelPill(b)}
                      <p className="text-[10px] text-[hsl(var(--text-4))] mt-0.5">{b.version}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[hsl(var(--text-3))]">{b.task || '—'}</td>
                    <td className="px-3 py-3 text-xs font-mono font-semibold text-[hsl(var(--text-1))]">{b.accuracy == null ? '—' : `${accPct(b.accuracy)!.toFixed(1)}%`}</td>
                    <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{fmt(b.latencyP50, 'ms')}</td>
                    <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{fmt(b.latencyP99, 'ms')}</td>
                    <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{fmt(b.throughput, '/s')}</td>
                    <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.costPerInference == null ? '—' : `$${b.costPerInference.toFixed(5)}`}</td>
                    <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{fmt(b.carbonPerInference, 'g')}</td>
                    <td className="px-3 py-3">
                      {b.biasScore == null ? <span className="text-xs text-[hsl(var(--text-4))]">—</span>
                        : <span className="text-xs font-bold" style={{ color: scoreColor(b.biasScore) }}>{b.biasScore}/100</span>}
                    </td>
                    <td className="px-3 py-3 text-xs font-bold" style={{ color: b.explainabilityScore == null ? 'hsl(var(--text-4))' : 'hsl(var(--s-ok-tx))' }}>{b.explainabilityScore == null ? '—' : `${b.explainabilityScore}/100`}</td>
                    <td className="px-3 py-3">
                      {o == null ? <span className="text-sm text-[hsl(var(--text-4))]">—</span>
                        : <span className="text-sm font-bold" style={{ color: scoreColor(o) }}>{o}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setSelected(b) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Eye size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); setDeleteTarget(b) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[440px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{String(selected.id).slice(0, 8).toUpperCase()}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.model} {selected.version}</h2>
                {selected.modelId && (
                  <button
                    onClick={() => navigate(`/models/inventory/${selected.modelId}`)}
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded-none border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] cursor-pointer transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
                  >
                    View in Model Registry <ArrowSquareOut size={11} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={14} /></button>
                <button onClick={() => setSelected(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {radarData(selected).length >= 3 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData(selected)}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chartTheme.text }} />
                    <Radar dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.2)" strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-center text-[hsl(var(--text-4))] py-6">Not enough recorded scores to draw a radar (needs 3+)</p>
              )}
              <div className="text-center p-4 bg-raised border border-[hsl(var(--border))]">
                <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wider">Composite Score (derived)</p>
                {overall(selected) == null ? (
                  <p className="text-2xl font-bold mt-1 text-[hsl(var(--text-4))]">—</p>
                ) : (
                  <p className="text-4xl font-bold mt-1" style={{ color: scoreColor(overall(selected)!) }}>{overall(selected)}/100</p>
                )}
                <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">
                  Weighted mean of recorded accuracy / compliance / fairness / explainability scores
                </p>
                <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{selected.task || '—'} · Benchmarked by {selected.benchmarkedBy || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Accuracy', value: selected.accuracy == null ? '—' : `${accPct(selected.accuracy)!.toFixed(1)}%` },
                  { label: 'F1 Score', value: fmt(selected.f1Score, '', 3) },
                  { label: 'P50 Latency', value: fmt(selected.latencyP50, 'ms') },
                  { label: 'P99 Latency', value: fmt(selected.latencyP99, 'ms') },
                  { label: 'Throughput', value: fmt(selected.throughput, ' req/s') },
                  { label: 'Cost / Inference', value: selected.costPerInference == null ? '—' : `$${selected.costPerInference.toFixed(5)}` },
                  { label: 'Memory', value: fmt(selected.memoryMb, ' MB') },
                  { label: 'Carbon / Inference', value: fmt(selected.carbonPerInference, 'g CO₂e') },
                  { label: 'Fairness Score', value: fmt(selected.biasScore, '/100') },
                  { label: 'Explainability', value: fmt(selected.explainabilityScore, '/100') },
                  { label: 'Compliance Score', value: fmt(selected.complianceScore, '/100') },
                  { label: 'Benchmark Date', value: selected.benchmarkDate || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Benchmark Run Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface border border-[hsl(var(--border))] w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Add Benchmark Run</h2>
              <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide mb-2">Model Identity</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Model *</label>
                      <Select value={form.modelKey || undefined} onValueChange={v => setForm(p => ({ ...p, modelKey: v }))}>
                        <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select registry model..." /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                          <SelectItem value={EXTERNAL}>External model (not in registry)…</SelectItem>
                        </SelectContent>
                      </Select>
                      {form.modelKey === EXTERNAL && (
                        <input value={form.externalName} onChange={e => setForm(p => ({ ...p, externalName: e.target.value }))} className="mt-2 w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="External model name *" />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Version *</label>
                      <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. v2.2" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Task *</label>
                      <Select value={form.task || undefined} onValueChange={v => setForm(p => ({ ...p, task: v }))}>
                        <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select task..." /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['Binary Classification', 'Multi-class Classification', 'Regression', 'Anomaly Detection', 'NLP / Text', 'Time Series Forecasting'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide mb-2">Performance Metrics</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { key: 'accuracy', label: 'Accuracy %', placeholder: '89.4' },
                      { key: 'f1Score', label: 'F1 Score', placeholder: '0.871' },
                      { key: 'latencyP50', label: 'P50 Latency (ms)', placeholder: '45' },
                      { key: 'latencyP99', label: 'P99 Latency (ms)', placeholder: '120' },
                      { key: 'throughput', label: 'Throughput (req/s)', placeholder: '2200' },
                      { key: 'costPerInference', label: 'Cost / Inference ($)', placeholder: '0.00012' },
                      { key: 'memoryMb', label: 'Memory (MB)', placeholder: '840' },
                      { key: 'carbonPerInference', label: 'Carbon / Inf (g CO₂)', placeholder: '0.0026' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">{label}</label>
                        <input type="number" step="any" value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder={placeholder} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide mb-2">Governance Scores (0–100, optional — blank fields are excluded from the composite)</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { key: 'complianceScore', label: 'Compliance', placeholder: '91' },
                      { key: 'biasScore', label: 'Fairness / Bias', placeholder: '88' },
                      { key: 'explainabilityScore', label: 'Explainability', placeholder: '94' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">{label}</label>
                        <input type="number" min={0} max={100} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder={placeholder} />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Benchmarked By *</label>
                      <UserSelect value={form.benchmarkedBy} onChange={v => setForm(p => ({ ...p, benchmarkedBy: v }))} by="name" rolesFilter={['ml', 'engineer', 'model']} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Cancel</button>
              <button onClick={handleCreate} disabled={isSaving} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] hover:opacity-90 disabled:opacity-50">
                {isSaving ? 'Saving…' : 'Save Benchmark Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete benchmark run?"
        description={`Remove the benchmark for ${deleteTarget?.model ?? ''} ${deleteTarget?.version ?? ''}. This action cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
