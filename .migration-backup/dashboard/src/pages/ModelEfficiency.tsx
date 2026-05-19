// @ts-nocheck
import { useState, useMemo } from 'react'
import { Speedometer, Export, Eye, X, Plus, Trash, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useModelEfficiencyData } from '@/hooks/useModelEfficiencyData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useChartTheme } from '@/hooks/useChartTheme'

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

function scoreColor(s: number) {
  return s >= 80 ? 'hsl(var(--s-ok-tx))' : s >= 70 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))'
}

const RADAR_MODELS = (b: any) => [
  { metric: 'Accuracy', value: b.accuracy },
  { metric: 'Compliance', value: b.complianceScore },
  { metric: 'Fairness', value: b.biasScore },
  { metric: 'Explainability', value: b.explainabilityScore },
  { metric: 'Efficiency', value: Math.min(100, Math.round((2200 / (b.throughput || 1)) * 60)) },
  { metric: 'Latency', value: Math.max(0, 100 - (b.latencyP50 || 0)) },
]

const BLANK = {
  model: '', version: '', task: '',
  latencyP50: '', latencyP99: '', throughput: '',
  accuracy: '', f1Score: '', costPerInference: '',
  memoryMb: '', carbonPerInference: '',
  complianceScore: '', biasScore: '', explainabilityScore: '',
  benchmarkedBy: '',
}

export default function ModelEfficiency() {
  const { items, isLoading, save, remove } = useModelEfficiencyData()
  const chartTheme = useChartTheme()
  if (isLoading) return <PageSkeleton />

  // Normalize items
  const benchmarks = items.map((r: any) => ({
    id: r.id,
    model: r.model || r.metadata?.model || '',
    version: r.version || r.metadata?.version || '',
    task: r.task || r.metadata?.task || '',
    latencyP50: Number(r.latencyP50 ?? r.latency_p50 ?? r.metadata?.latencyP50 ?? 0),
    latencyP99: Number(r.latencyP99 ?? r.latency_p99 ?? r.metadata?.latencyP99 ?? 0),
    throughput: Number(r.throughput ?? r.metadata?.throughput ?? 0),
    accuracy: Number(r.accuracy ?? r.metadata?.accuracy ?? 0),
    f1Score: Number(r.f1Score ?? r.f1_score ?? r.metadata?.f1Score ?? 0),
    costPerInference: Number(r.costPerInference ?? r.cost_per_inference ?? r.metadata?.costPerInference ?? 0),
    memoryMb: Number(r.memoryMb ?? r.memory_mb ?? r.metadata?.memoryMb ?? 0),
    carbonPerInference: Number(r.carbonPerInference ?? r.carbon_per_inference ?? r.metadata?.carbonPerInference ?? 0),
    complianceScore: Number(r.complianceScore ?? r.compliance_score ?? r.metadata?.complianceScore ?? 0),
    biasScore: Number(r.biasScore ?? r.bias_score ?? r.metadata?.biasScore ?? 0),
    explainabilityScore: Number(r.explainabilityScore ?? r.explainability_score ?? r.metadata?.explainabilityScore ?? 0),
    overallScore: Number(r.overallScore ?? r.overall_score ?? r.metadata?.overallScore ?? 0),
    benchmarkDate: r.benchmarkDate ?? r.benchmark_date ?? r.created_at?.slice(0, 10) ?? '',
    benchmarkedBy: r.benchmarkedBy ?? r.benchmarked_by ?? r.metadata?.benchmarkedBy ?? '',
  }))

  return <ModelEfficiencyInner benchmarks={benchmarks} save={save} remove={remove} chartTheme={chartTheme} />
}

function ModelEfficiencyInner({ benchmarks: initialBenchmarks, save, remove, chartTheme }: any) {
  const [selected, setSelected] = useState<any | null>(null)
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [localBenchmarks, setLocalBenchmarks] = useState<any[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const benchmarks = useMemo(() => {
    const merged = [...localBenchmarks, ...initialBenchmarks.filter((b: any) => !localBenchmarks.find((l: any) => l.id === b.id))]
    return merged.filter((b: any) => !deletedIds.has(b.id))
  }, [initialBenchmarks, localBenchmarks, deletedIds])

  const cA = compareA || benchmarks[0]?.id || ''
  const cB = compareB || benchmarks[1]?.id || ''
  const mA = benchmarks.find((b: any) => b.id === cA) ?? benchmarks[0]
  const mB = benchmarks.find((b: any) => b.id === cB) ?? benchmarks[1]

  async function handleCreate() {
    if (!form.model || !form.version || !form.task || !form.accuracy || !form.benchmarkedBy) {
      toast.error('Please fill in all required fields')
      return
    }
    const acc = Number(form.accuracy)
    const comp = Number(form.complianceScore) || 80
    const bias = Number(form.biasScore) || 75
    const expl = Number(form.explainabilityScore) || 80
    const overall = Math.round((acc * 0.3 + comp * 0.2 + bias * 0.25 + expl * 0.25))
    const newB: any = {
      id: `BMK-${Date.now()}`,
      model: form.model, version: form.version, task: form.task,
      latencyP50: Number(form.latencyP50) || 0,
      latencyP99: Number(form.latencyP99) || 0,
      throughput: Number(form.throughput) || 0,
      accuracy: acc, f1Score: Number(form.f1Score) || 0,
      costPerInference: Number(form.costPerInference) || 0,
      memoryMb: Number(form.memoryMb) || 0,
      carbonPerInference: Number(form.carbonPerInference) || 0,
      complianceScore: comp, biasScore: bias, explainabilityScore: expl,
      overallScore: overall,
      benchmarkDate: new Date().toISOString().slice(0, 10),
      benchmarkedBy: form.benchmarkedBy,
    }
    setLocalBenchmarks(p => [newB, ...p])
    setShowCreate(false)
    setForm(BLANK)
    toast.success(`Benchmark run recorded for ${newB.model} ${newB.version} — overall score: ${newB.overallScore}`)
    try {
      await save({
        model: newB.model, version: newB.version, task: newB.task,
        latency_p50: newB.latencyP50, latency_p99: newB.latencyP99,
        throughput: newB.throughput, accuracy: newB.accuracy,
        f1_score: newB.f1Score, cost_per_inference: newB.costPerInference,
        memory_mb: newB.memoryMb, carbon_per_inference: newB.carbonPerInference,
        compliance_score: comp, bias_score: bias, explainability_score: expl,
        overall_score: overall, benchmarked_by: form.benchmarkedBy,
      })
    } catch {}
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletedIds(p => new Set([...p, deleteTarget.id]))
    toast.success(`Benchmark ${deleteTarget.id} deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
    try { await remove(deleteTarget.id) } catch {}
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Speedometer size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Model Efficiency Benchmarking
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Multi-dimensional model benchmarking — accuracy, latency, cost, carbon, fairness, and explainability</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCsv(benchmarks, 'model-efficiency.csv')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export CSV</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90"><Plus size={14} /> Add Benchmark Run</button>
        </div>
      </div>

      {/* KPI Strip */}
      {benchmarks.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Models Benchmarked', value: benchmarks.length, sub: 'Active benchmarks', color: 'hsl(var(--brand))' },
            { label: 'Best Overall Score', value: `${Math.max(...benchmarks.map((b: any) => b.overallScore))}/100`, sub: benchmarks.find((b: any) => b.overallScore === Math.max(...benchmarks.map((b: any) => b.overallScore)))?.model ?? '', color: 'hsl(var(--s-ok-tx))' },
            { label: 'Lowest Fairness', value: `${Math.min(...benchmarks.map((b: any) => b.biasScore))}/100`, sub: benchmarks.find((b: any) => b.biasScore === Math.min(...benchmarks.map((b: any) => b.biasScore)))?.model ?? '', color: scoreColor(Math.min(...benchmarks.map((b: any) => b.biasScore))) },
            { label: 'Avg Explainability', value: `${Math.round(benchmarks.reduce((s: number, b: any) => s + b.explainabilityScore, 0) / benchmarks.length)}/100`, sub: 'Across all models', color: 'hsl(var(--text-1))' },
          ].map(s => (
            <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
              <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[hsl(var(--text-4))] mt-1 truncate">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Radar */}
      {benchmarks.length >= 2 && mA && mB && (
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Model Comparison Radar</h3>
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[hsl(var(--brand))]" />
              <select value={cA} onChange={e => setCompareA(e.target.value)} className="text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] px-2 py-1 focus:outline-none">
                {benchmarks.map((b: any) => <option key={b.id} value={b.id}>{b.model} {b.version}</option>)}
              </select>
            </div>
            <span className="text-xs text-[hsl(var(--text-4))]">vs</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-[hsl(var(--destructive))]" />
              <select value={cB} onChange={e => setCompareB(e.target.value)} className="text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] px-2 py-1 focus:outline-none">
                {benchmarks.map((b: any) => <option key={b.id} value={b.id}>{b.model} {b.version}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex-1">
              <p className="text-xs text-center text-[hsl(var(--text-4))] mb-2">{mA.model} {mA.version}</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={RADAR_MODELS(mA)}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
                  <Radar dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.2)" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1">
              <p className="text-xs text-center text-[hsl(var(--text-4))] mb-2">{mB.model} {mB.version}</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={RADAR_MODELS(mB)}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
                  <Radar dataKey="value" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Table */}
      {benchmarks.length === 0 ? (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-12 text-center">
          <Speedometer size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-3))]">No benchmarks yet. Add your first benchmark run.</p>
        </div>
      ) : (
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
                {['Model', 'Task', 'Accuracy', 'P50 Lat', 'P99 Lat', 'Throughput', '$/Inference', 'Carbon/Inf', 'Fairness', 'Explainability', 'Overall', ''].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b: any) => (
                <tr key={b.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(b)}>
                  <td className="px-3 py-3">
                    <p className="text-xs font-medium text-[hsl(var(--text-1))]">{b.model}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))]">{b.version}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-[hsl(var(--text-3))]">{b.task}</td>
                  <td className="px-3 py-3 text-xs font-mono font-semibold text-[hsl(var(--text-1))]">{Number(b.accuracy).toFixed(1)}%</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.latencyP50}ms</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.latencyP99}ms</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.throughput}/s</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">${Number(b.costPerInference).toFixed(5)}</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.carbonPerInference}g</td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-bold" style={{ color: scoreColor(b.biasScore) }}>{b.biasScore}/100</span>
                  </td>
                  <td className="px-3 py-3 text-xs font-bold text-[hsl(var(--s-ok-tx))]">{b.explainabilityScore}/100</td>
                  <td className="px-3 py-3">
                    <span className="text-sm font-bold" style={{ color: scoreColor(b.overallScore) }}>{b.overallScore}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setSelected(b) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Eye size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(b) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[440px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{String(selected.id).slice(0, 12)}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.model} {selected.version}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={14} /></button>
                <button onClick={() => setSelected(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={RADAR_MODELS(selected)}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
                  <Radar dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.2)" strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="text-center p-4 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wider">Overall Score</p>
                <p className="text-4xl font-bold mt-1" style={{ color: scoreColor(selected.overallScore) }}>{selected.overallScore}/100</p>
                <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{selected.task} · Benchmarked by {selected.benchmarkedBy}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Accuracy', value: `${Number(selected.accuracy).toFixed(1)}%` },
                  { label: 'F1 Score', value: Number(selected.f1Score).toFixed(3) },
                  { label: 'P50 Latency', value: `${selected.latencyP50}ms` },
                  { label: 'P99 Latency', value: `${selected.latencyP99}ms` },
                  { label: 'Throughput', value: `${selected.throughput} req/s` },
                  { label: 'Cost / Inference', value: `$${Number(selected.costPerInference).toFixed(5)}` },
                  { label: 'Memory', value: `${selected.memoryMb} MB` },
                  { label: 'Carbon / Inference', value: `${selected.carbonPerInference}g CO₂e` },
                  { label: 'Fairness Score', value: `${selected.biasScore}/100` },
                  { label: 'Explainability', value: `${selected.explainabilityScore}/100` },
                  { label: 'Compliance Score', value: `${selected.complianceScore}/100` },
                  { label: 'Benchmark Date', value: selected.benchmarkDate },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
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
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col">
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
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Model Name *</label>
                      <input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Credit Scoring Model" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Version *</label>
                      <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. v2.2" />
                    </div>
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Task *</label>
                      <select value={form.task} onChange={e => setForm(p => ({ ...p, task: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                        <option value="">Select task...</option>
                        {['Binary Classification', 'Multi-class Classification', 'Regression', 'Anomaly Detection', 'NLP / Text', 'Time Series Forecasting'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide mb-2">Performance Metrics</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { key: 'accuracy', label: 'Accuracy % *', placeholder: '89.4' },
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
                        <input type="number" step="any" value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder={placeholder} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-3">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide mb-2">Governance Scores (0–100)</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { key: 'complianceScore', label: 'Compliance', placeholder: '91' },
                      { key: 'biasScore', label: 'Fairness / Bias', placeholder: '88' },
                      { key: 'explainabilityScore', label: 'Explainability', placeholder: '94' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">{label}</label>
                        <input type="number" min={0} max={100} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder={placeholder} />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">Benchmarked By *</label>
                      <input value={form.benchmarkedBy} onChange={e => setForm(p => ({ ...p, benchmarkedBy: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="Your name" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">Save Benchmark Run</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete benchmark run?"
        description={`Remove ${deleteTarget?.id} for ${deleteTarget?.model} ${deleteTarget?.version}. This action cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
