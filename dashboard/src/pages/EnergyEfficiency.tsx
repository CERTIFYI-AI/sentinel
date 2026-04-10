import { useState, useMemo } from 'react'
import { Lightning, Export, Plus, X, Lightbulb, CheckCircle, ArrowDown, Leaf, Cpu, Trash, Eye, PencilSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ScatterChart, Scatter, CartesianGrid } from 'recharts'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { DataTable } from '../components/ui/DataTable'

const TREND_DATA = [
  { month: 'Oct 25', tokensPerKwh: 782000, pue: 1.38, gpuUtil: 71 },
  { month: 'Nov 25', tokensPerKwh: 801000, pue: 1.35, gpuUtil: 74 },
  { month: 'Dec 25', tokensPerKwh: 824000, pue: 1.33, gpuUtil: 76 },
  { month: 'Jan 26', tokensPerKwh: 835000, pue: 1.32, gpuUtil: 78 },
  { month: 'Feb 26', tokensPerKwh: 841000, pue: 1.31, gpuUtil: 79 },
  { month: 'Mar 26', tokensPerKwh: 847000, pue: 1.30, gpuUtil: 81 },
]

const REGIONS = [
  { region: 'GCP us-central1', pue: 1.08, renewable: 97, score: 96 },
  { region: 'AWS us-east-1', pue: 1.15, renewable: 92, score: 89 },
  { region: 'Azure East US', pue: 1.22, renewable: 72, score: 74 },
  { region: 'OpenAI API (US West)', pue: 1.35, renewable: 85, score: 78 },
]

interface EnergyReading {
  id: string
  model: string
  period: string
  gpuHours: number
  kwh: number
  tokensGenerated: number
  efficiencyScore: number
  renewablePercent: number
  computeProvider: string
  measurementSource: string
  notes: string
  date: string
}

const SEED_READINGS: EnergyReading[] = [
  { id: 'ENR-001', model: 'Credit Scoring Model v2.1', period: '2026-Q1', gpuHours: 320, kwh: 4800, tokensGenerated: 10080000, efficiencyScore: 91, renewablePercent: 92, computeProvider: 'AWS us-east-1', measurementSource: 'Cloud Console', notes: 'Batch inference optimized', date: '2026-04-01' },
  { id: 'ENR-002', model: 'Loan Approval Model v3.0', period: '2026-Q1', gpuHours: 1475, kwh: 22100, tokensGenerated: 31381000, efficiencyScore: 67, renewablePercent: 72, computeProvider: 'Azure East US', measurementSource: 'Azure Monitor', notes: 'Training + inference combined', date: '2026-04-01' },
  { id: 'ENR-003', model: 'Fraud Detection Engine v4.2', period: '2026-Q1', gpuHours: 2308, kwh: 34600, tokensGenerated: 33908000, efficiencyScore: 54, renewablePercent: 85, computeProvider: 'OpenAI API', measurementSource: 'API Usage Report', notes: 'High inference volume; quantization pending', date: '2026-04-01' },
  { id: 'ENR-004', model: 'Customer Churn Predictor v2.3', period: '2026-Q1', gpuHours: 433, kwh: 6500, tokensGenerated: 12025000, efficiencyScore: 82, renewablePercent: 88, computeProvider: 'GCP us-central1', measurementSource: 'GCP Billing', notes: 'Best-in-class region', date: '2026-04-01' },
]

const RECOMMENDATIONS = [
  { id: 1, model: 'Fraud Detection Engine v4.2', action: 'Apply 8-bit quantization', saving: '~20%', effort: 'Medium', effortColor: 'hsl(45 85% 40%)' },
  { id: 2, model: 'Loan Approval Model v3.0', action: 'Switch to GCP us-central1 region (97% renewable)', saving: '~14 tCO₂/mo', effort: 'Low', effortColor: 'hsl(var(--s-ok-tx))' },
  { id: 3, model: 'Fraud Detection Engine v4.2', action: 'Batch inference requests (reduce cold starts)', saving: '~18% energy', effort: 'High', effortColor: 'hsl(var(--destructive))' },
  { id: 4, model: 'Loan Approval Model v3.0', action: 'Enable inference caching for repeated patterns', saving: '~12%', effort: 'Medium', effortColor: 'hsl(45 85% 40%)' },
  { id: 5, model: 'Customer Churn Predictor v2.3', action: 'Prune model to reduce params by 30%', saving: '~8% energy', effort: 'High', effortColor: 'hsl(var(--destructive))' },
]

const BLANK = {
  model: '', period: '', gpuHours: '' as any, kwh: '' as any, tokensGenerated: '' as any,
  renewablePercent: '' as any, computeProvider: '', measurementSource: 'Cloud Console', notes: ''
}

function effColor(s: number) {
  return s >= 80 ? 'hsl(var(--s-ok-tx))' : s >= 60 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))'
}

export default function EnergyEfficiency() {
  const [readings, setReadings] = useState<EnergyReading[]>(SEED_READINGS)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [selected, setSelected] = useState<EnergyReading | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EnergyReading | null>(null)
  const [implementedRec, setImplementedRec] = useState<number[]>([])

  const stats = useMemo(() => ({
    totalKwh: readings.reduce((s, r) => s + r.kwh, 0),
    avgEfficiency: Math.round(readings.reduce((s, r) => s + r.efficiencyScore, 0) / readings.length),
    avgRenewable: Math.round(readings.reduce((s, r) => s + r.renewablePercent, 0) / readings.length),
    totalGpuHours: readings.reduce((s, r) => s + r.gpuHours, 0),
  }), [readings])

  const scatterData = readings.map(r => ({ name: r.model, x: r.kwh, y: r.efficiencyScore, id: r.id }))

  function handleCreate() {
    if (!form.model || !form.period || !form.gpuHours || !form.kwh || !form.computeProvider) {
      toast.error('Please fill in all required fields')
      return
    }
    const gpuH = Number(form.gpuHours)
    const kwh = Number(form.kwh)
    const tok = Number(form.tokensGenerated) || 0
    const eff = Math.min(100, Math.max(0, Math.round((tok / kwh / 15000) * 100)))
    const newR: EnergyReading = {
      id: `ENR-${String(readings.length + 1).padStart(3, '0')}`,
      model: form.model,
      period: form.period,
      gpuHours: gpuH,
      kwh,
      tokensGenerated: tok,
      efficiencyScore: eff,
      renewablePercent: Number(form.renewablePercent) || 0,
      computeProvider: form.computeProvider,
      measurementSource: form.measurementSource,
      notes: form.notes,
      date: new Date().toISOString().slice(0, 10),
    }
    setReadings(p => [newR, ...p])
    setShowCreate(false)
    setForm(BLANK)
    toast.success(`Energy reading logged for ${newR.model}`)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setReadings(p => p.filter(r => r.id !== deleteTarget.id))
    toast.success(`Energy reading ${deleteTarget.id} deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
  }

  function handleImplementRec(id: number) {
    setImplementedRec(p => [...p, id])
    toast.success('Task created and linked to model')
  }

  const columns = [
    { key: 'model', header: 'Model', sortable: true, render: (r: EnergyReading) => <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.model}</span> },
    { key: 'period', header: 'Period', sortable: true },
    { key: 'gpuHours', header: 'GPU Hours', sortable: true, render: (r: EnergyReading) => <span className="font-mono text-xs">{r.gpuHours.toLocaleString()}h</span> },
    { key: 'kwh', header: 'kWh', sortable: true, render: (r: EnergyReading) => <span className="font-mono text-xs">{r.kwh.toLocaleString()}</span> },
    { key: 'renewablePercent', header: 'Renewable', sortable: true, render: (r: EnergyReading) => <span className="font-mono text-xs" style={{ color: r.renewablePercent >= 85 ? 'hsl(var(--s-ok-tx))' : 'hsl(45 85% 40%)' }}>{r.renewablePercent}%</span> },
    { key: 'efficiencyScore', header: 'Efficiency', sortable: true, render: (r: EnergyReading) => <span className="font-bold text-sm" style={{ color: effColor(r.efficiencyScore) }}>{r.efficiencyScore}/100</span> },
    { key: 'computeProvider', header: 'Provider' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Lightning size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Energy Efficiency
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Per-model AI energy consumption, efficiency scoring, and sustainability recommendations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Report exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90"><Plus size={14} /> Log Energy Reading</button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total kWh (Q1 2026)', value: stats.totalKwh.toLocaleString(), sub: 'Across all models', color: 'hsl(var(--brand))' },
          { label: 'Avg Efficiency Score', value: `${stats.avgEfficiency}/100`, sub: stats.avgEfficiency >= 70 ? 'On track' : '⚠ Below target', color: effColor(stats.avgEfficiency) },
          { label: 'Avg Renewable Energy', value: `${stats.avgRenewable}%`, sub: 'Target: 90% by EOY', color: stats.avgRenewable >= 85 ? 'hsl(var(--s-ok-tx))' : 'hsl(45 85% 40%)' },
          { label: 'Total GPU Hours', value: stats.totalGpuHours.toLocaleString(), sub: 'Q1 2026 aggregate', color: 'hsl(var(--text-1))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Tokens per kWh Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={TREND_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => [`${(v / 1000).toFixed(0)}K tokens/kWh`]} contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Line type="monotone" dataKey="tokensPerKwh" stroke="hsl(var(--brand))" strokeWidth={2} dot={{ r: 3 }} name="Tokens/kWh" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">GPU Utilization & PUE</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={TREND_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Line type="monotone" dataKey="gpuUtil" stroke="hsl(var(--s-ok-tx))" strokeWidth={2} name="GPU Util %" />
              <Line type="monotone" dataKey="pue" stroke="hsl(var(--s-wn-tx))" strokeWidth={2} name="PUE" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Efficiency vs kWh Scatter + Region Scorecard */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Efficiency Score vs kWh Consumption</h3>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" name="kWh" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} label={{ value: 'kWh', position: 'insideBottom', offset: -5, fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis dataKey="y" name="Efficiency" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload
                    return (
                      <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] px-3 py-2 text-xs">
                        <p className="font-medium text-[hsl(var(--text-1))]">{d.name}</p>
                        <p className="text-[hsl(var(--text-4))]">kWh: {d.x.toLocaleString()}</p>
                        <p className="text-[hsl(var(--text-4))]">Efficiency: {d.y}/100</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter data={scatterData} fill="hsl(var(--brand))" opacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Compute Region Efficiency</h3>
          <div className="space-y-2">
            {REGIONS.map(r => (
              <div key={r.region} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.region}</span>
                  <span className="text-sm font-bold" style={{ color: r.score >= 85 ? 'hsl(var(--s-ok-tx))' : r.score >= 70 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }}>{r.score}/100</span>
                </div>
                <div className="flex gap-4 text-[10px] text-[hsl(var(--text-4))]">
                  <span>PUE: {r.pue}</span>
                  <span>Renewable: {r.renewable}%</span>
                </div>
                <div className="mt-2 h-1 bg-[hsl(var(--border))]">
                  <div className="h-1" style={{ width: `${r.score}%`, background: r.score >= 85 ? 'hsl(var(--s-ok-tx))' : r.score >= 70 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-model readings table */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Energy Readings by Model</h3>
        <DataTable
          data={readings}
          columns={columns}
          searchPlaceholder="Search models..."
          searchKey="model"
          onView={r => setSelected(r)}
          onDelete={r => setDeleteTarget(r)}
          emptyMessage="No energy readings logged yet."
        />
      </div>

      {/* Recommendations Panel */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
          <Lightbulb size={15} className="text-[hsl(var(--brand))]" weight="duotone" />
          Efficiency Recommendations
        </h3>
        <p className="text-xs text-[hsl(var(--text-4))] mb-3">AI-generated optimization opportunities based on current energy readings and benchmarks.</p>
        <div className="space-y-2">
          {RECOMMENDATIONS.map(rec => (
            <div key={rec.id} className={`flex items-center justify-between p-3 border border-[hsl(var(--border))] ${implementedRec.includes(rec.id) ? 'opacity-50' : 'hover:border-[hsl(var(--brand)/0.4)]'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-[hsl(var(--text-4))]">{rec.model}</span>
                  <span className="text-[10px] px-1.5 py-0.5 font-medium border" style={{ color: rec.effortColor, borderColor: rec.effortColor + '40' }}>{rec.effort} Effort</span>
                  {implementedRec.includes(rec.id) && <span className="text-[10px] text-[hsl(var(--s-ok-tx))]">✓ Task Created</span>}
                </div>
                <p className="text-xs font-medium text-[hsl(var(--text-1))]">{rec.action}</p>
                <p className="text-[10px] text-[hsl(var(--s-ok-tx))] mt-0.5">Est. saving: {rec.saving}</p>
              </div>
              {!implementedRec.includes(rec.id) && (
                <button
                  onClick={() => handleImplementRec(rec.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--brand))] text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] ml-4 flex-shrink-0"
                >
                  <CheckCircle size={12} /> Implement
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Log Energy Reading</h2>
              <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Model *</label>
                  <select value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select model...</option>
                    {['Credit Scoring Model v2.1', 'Loan Approval Model v3.0', 'Fraud Detection Engine v4.2', 'Customer Churn Predictor v2.3'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Period *</label>
                  <select value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select period...</option>
                    {['2026-Q1', '2026-Q2', '2025-Q4', '2025-Q3'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">GPU Hours *</label>
                  <input type="number" min={0} value={form.gpuHours} onChange={e => setForm(p => ({ ...p, gpuHours: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 320" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">kWh Consumed *</label>
                  <input type="number" min={0} value={form.kwh} onChange={e => setForm(p => ({ ...p, kwh: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 4800" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Tokens Generated</label>
                  <input type="number" min={0} value={form.tokensGenerated} onChange={e => setForm(p => ({ ...p, tokensGenerated: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 10080000" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Renewable % </label>
                  <input type="number" min={0} max={100} value={form.renewablePercent} onChange={e => setForm(p => ({ ...p, renewablePercent: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 85" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Compute Provider *</label>
                  <select value={form.computeProvider} onChange={e => setForm(p => ({ ...p, computeProvider: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select provider...</option>
                    {['AWS us-east-1', 'AWS us-west-2', 'Azure East US', 'GCP us-central1', 'OpenAI API', 'Anthropic API', 'On-premise'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Measurement Source</label>
                  <select value={form.measurementSource} onChange={e => setForm(p => ({ ...p, measurementSource: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    {['Cloud Console', 'API Usage Report', 'Smart Meter', 'Estimated', 'Third-party Audit'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" placeholder="Observations, optimizations applied..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">Log Reading</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.model}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]"><Trash size={14} /></button>
                <button onClick={() => setSelected(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Efficiency gauge */}
              <div className="p-4 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-center">
                <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wider mb-1">Efficiency Score</p>
                <p className="text-4xl font-bold" style={{ color: effColor(selected.efficiencyScore) }}>{selected.efficiencyScore}/100</p>
                <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{selected.efficiencyScore >= 80 ? 'High efficiency' : selected.efficiencyScore >= 60 ? 'Moderate — optimization recommended' : 'Low — immediate action needed'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Period', value: selected.period },
                  { label: 'GPU Hours', value: `${selected.gpuHours.toLocaleString()}h` },
                  { label: 'kWh Consumed', value: selected.kwh.toLocaleString() },
                  { label: 'Tokens Generated', value: selected.tokensGenerated.toLocaleString() },
                  { label: 'Renewable Energy', value: `${selected.renewablePercent}%` },
                  { label: 'Compute Provider', value: selected.computeProvider },
                  { label: 'Measurement Source', value: selected.measurementSource },
                  { label: 'Date Logged', value: selected.date },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                  <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Notes</p>
                  <p className="text-xs text-[hsl(var(--text-2))]">{selected.notes}</p>
                </div>
              )}
              <div className="p-3 border border-[hsl(var(--border))]">
                <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-2">Applicable Recommendations</p>
                {RECOMMENDATIONS.filter(r => r.model === selected.model).length === 0
                  ? <p className="text-xs text-[hsl(var(--text-4))]">No recommendations for this model.</p>
                  : RECOMMENDATIONS.filter(r => r.model === selected.model).map(rec => (
                    <div key={rec.id} className="flex items-center justify-between py-1.5 border-b border-[hsl(var(--border))] last:border-0">
                      <div>
                        <p className="text-xs text-[hsl(var(--text-1))]">{rec.action}</p>
                        <p className="text-[10px] text-[hsl(var(--s-ok-tx))]">Est. {rec.saving}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5" style={{ color: rec.effortColor, border: `1px solid ${rec.effortColor}40` }}>{rec.effort}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete energy reading?`}
        description={`Remove ${deleteTarget?.id} for ${deleteTarget?.model}. This action cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
