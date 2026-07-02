import { useState, useMemo } from 'react'
import { Leaf, Export, Plus, Eye, X, Warning, Lightbulb, ArrowDown, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useCarbonRecordsData } from '@/hooks/useCarbonRecordsData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useChartTheme } from '@/hooks/useChartTheme'

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

function efficiencyColor(score: number) {
  if (score >= 80) return 'hsl(var(--s-ok-tx))'
  if (score >= 60) return 'hsl(var(--r-hi-tx))'
  return 'hsl(var(--s-er-tx))'
}

const BLANK_ENTRY = {
  model: '', period: '2026-Q1', trainingEmissions: '', inferenceEmissions: '',
  energyKwh: '', renewablePercent: '', computeProvider: '', region: '', offset: '',
}

const RECOMMENDATIONS = [
  { id: 1, label: 'Switch Fraud Engine to EU West region', impact: '–14 tCO₂e/mo', effort: 'Medium', icon: Leaf },
  { id: 2, label: 'Increase Loan Approval renewable energy to 90%', impact: '–8 tCO₂e/mo', effort: 'Low', icon: ArrowDown },
  { id: 3, label: 'Batch inference requests for Fraud Engine', impact: '–20% energy', effort: 'High', icon: Lightbulb },
  { id: 4, label: 'Add 25 tCO₂e offset credits for Q2', impact: 'Net –25 tCO₂e', effort: 'Low', icon: Plus },
]

export default function CarbonLedger() {
  const { items, isLoading, saveCarbonRecords: save, removeCarbonRecords: remove } = useCarbonRecordsData()
  const chartTheme = useChartTheme()
  if (isLoading) return <PageSkeleton />

  // Normalize items to a consistent shape
  const entries = items.map((r: any) => ({
    id: r.id,
    model: r.model || r.metadata?.model || r.name || '',
    period: r.period || r.metadata?.period || '',
    trainingEmissions: Number(r.training_emissions ?? r.trainingEmissions ?? r.metadata?.trainingEmissions ?? 0),
    inferenceEmissions: Number(r.inference_emissions ?? r.inferenceEmissions ?? r.metadata?.inferenceEmissions ?? 0),
    totalEmissions: Number(r.total_emissions ?? r.totalEmissions ?? r.metadata?.totalEmissions ?? 0),
    energyKwh: Number(r.energy_kwh ?? r.energyKwh ?? r.metadata?.energyKwh ?? 0),
    renewablePercent: Number(r.renewable_percent ?? r.renewablePercent ?? r.metadata?.renewablePercent ?? 0),
    computeProvider: r.compute_provider ?? r.computeProvider ?? r.metadata?.computeProvider ?? '',
    region: r.region ?? r.metadata?.region ?? '',
    offset: Number(r.offset ?? r.metadata?.offset ?? 0),
    netEmissions: Number(r.net_emissions ?? r.netEmissions ?? r.metadata?.netEmissions ?? 0),
    verified: r.verified ?? r.metadata?.verified ?? false,
    efficiencyScore: Number(r.efficiency_score ?? r.efficiencyScore ?? r.metadata?.efficiencyScore ?? 0),
  }))

  return <CarbonLedgerInner entries={entries} save={save} remove={remove} chartTheme={chartTheme} />
}

function CarbonLedgerInner({ entries: initialEntries, save, remove, chartTheme }: any) {
  const [selected, setSelected] = useState<any | null>(null)
  const [budgetThreshold, setBudgetThreshold] = useState(100)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('100')
  const [dismissedRecs, setDismissedRecs] = useState<Set<number>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(BLANK_ENTRY)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  // Local optimistic entries (for create/delete before hook refetch)
  const [localEntries, setLocalEntries] = useState<any[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const entries = useMemo(() => {
    const merged = [...localEntries, ...initialEntries.filter((e: any) => !localEntries.find((l: any) => l.id === e.id))]
    return merged.filter((e: any) => !deletedIds.has(e.id))
  }, [initialEntries, localEntries, deletedIds])

  // Group by period and sum emissions for trend chart
  const trendData = useMemo(() => {
    const periodMap: Record<string, number> = {}
    entries.forEach((r: any) => {
      const period = r.period || 'Unknown'
      periodMap[period] = (periodMap[period] || 0) + (r.totalEmissions || 0)
    })
    return Object.entries(periodMap).map(([period, emissions]) => ({ period, emissions }))
  }, [entries])

  // Model data from live entries
  const modelData = useMemo(() => {
    const modelMap: Record<string, { emissions: number; efficiency: number; count: number }> = {}
    entries.forEach((r: any) => {
      const model = r.model || 'Unknown'
      if (!modelMap[model]) modelMap[model] = { emissions: 0, efficiency: 0, count: 0 }
      modelMap[model].emissions += r.totalEmissions || 0
      modelMap[model].efficiency += r.efficiencyScore || 0
      modelMap[model].count += 1
    })
    return Object.entries(modelMap).map(([name, v]) => ({
      name: name.length > 20 ? name.slice(0, 20) + '…' : name,
      emissions: Math.round(v.emissions * 10) / 10,
      efficiency: v.count > 0 ? Math.round(v.efficiency / v.count) : 0,
    }))
  }, [entries])

  const q1Data = entries.filter((e: any) => e.period === '2026-Q1')
  const totalNet = (q1Data.length > 0 ? q1Data : entries).reduce((s: number, e: any) => s + (e.netEmissions || 0), 0)
  const totalOffset = (q1Data.length > 0 ? q1Data : entries).reduce((s: number, e: any) => s + (e.offset || 0), 0)
  const activeEntries = q1Data.length > 0 ? q1Data : entries
  const avgRenewable = activeEntries.length > 0
    ? Math.round(activeEntries.reduce((s: number, e: any) => s + (e.renewablePercent || 0), 0) / activeEntries.length)
    : 0

  const lastEmissions = trendData.length > 0 ? trendData[trendData.length - 1].emissions : 0
  const prevEmissions = trendData.length > 1 ? trendData[trendData.length - 2].emissions : lastEmissions
  const monthlyChange = lastEmissions - prevEmissions
  const projectedMonthly = Math.round(lastEmissions * (1 + (prevEmissions > 0 ? (monthlyChange / prevEmissions) * 0.5 : 0)))
  const budgetPct = budgetThreshold > 0 ? Math.round((totalNet / budgetThreshold) * 100) : 0

  const visibleRecs = RECOMMENDATIONS.filter(r => !dismissedRecs.has(r.id))

  async function handleCreate() {
    if (!form.model || !form.period || !form.computeProvider) {
      toast.error('Please fill in all required fields')
      return
    }
    const training = Number(form.trainingEmissions) || 0
    const inference = Number(form.inferenceEmissions) || 0
    const total = training + inference
    const offset = Number(form.offset) || 0
    const kwh = Number(form.energyKwh) || 0
    const renewable = Number(form.renewablePercent) || 0
    const eff = kwh > 0 ? Math.min(100, Math.max(0, Math.round(renewable * 0.5 + (1 - total / 200) * 50))) : 50
    const newE = {
      id: `CLG-${Date.now()}`,
      model: form.model, period: form.period,
      trainingEmissions: training, inferenceEmissions: inference,
      totalEmissions: total, energyKwh: kwh,
      renewablePercent: renewable, computeProvider: form.computeProvider,
      region: form.region || 'US', offset, netEmissions: total - offset,
      verified: false, efficiencyScore: eff,
    }
    setLocalEntries(p => [newE, ...p])
    setShowCreate(false)
    setForm(BLANK_ENTRY)
    toast.success(`Carbon entry logged for ${newE.model} — ${newE.totalEmissions.toFixed(1)} tCO₂e total`)
    // Persist to Supabase
    try {
      await save({
        model: newE.model, period: newE.period,
        training_emissions: training, inference_emissions: inference,
        total_emissions: total, energy_kwh: kwh,
        renewable_percent: renewable, compute_provider: form.computeProvider,
        region: newE.region, offset, net_emissions: newE.netEmissions,
        verified: false, efficiency_score: eff,
      })
    } catch {}
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletedIds(p => new Set([...p, deleteTarget.id]))
    toast.success(`Carbon entry ${deleteTarget.id} deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
    try { await remove(deleteTarget.id) } catch {}
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Leaf size={20} weight="fill" className="text-[hsl(var(--s-ok-tx))]" />
            Carbon Ledger
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">AI model carbon footprint tracking — training, inference, energy consumption, and offset accounting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCsv(entries, 'carbon-ledger.csv')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"><Export size={14} /> Export CSV</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm hover:opacity-90"><Plus size={14} /> Log Entry</button>
        </div>
      </div>

      {/* Budget threshold banner */}
      <div style={{
        padding: '12px 16px',
        background: budgetPct >= 100 ? 'hsl(0 72% 51% / 0.08)' : budgetPct >= 80 ? 'hsl(45 93% 47% / 0.08)' : 'hsl(142 71% 45% / 0.06)',
        border: `1px solid ${budgetPct >= 100 ? 'hsl(0 72% 51% / 0.4)' : budgetPct >= 80 ? 'hsl(45 93% 47% / 0.4)' : 'hsl(142 71% 45% / 0.3)'}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Warning size={16} style={{ color: budgetPct >= 100 ? 'hsl(var(--s-er-tx))' : budgetPct >= 80 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Carbon Budget — {totalNet.toFixed(1)} / {budgetThreshold} tCO₂e ({budgetPct}%)
            </span>
            {editingBudget ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={budgetInput}
                  onChange={e => setBudgetInput(e.target.value)}
                  className="w-20 text-xs px-2 py-1 border bg-transparent"
                  style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}
                />
                <button
                  onClick={() => { setBudgetThreshold(Number(budgetInput) || 100); setEditingBudget(false); toast.success(`Budget threshold set to ${budgetInput} tCO₂e`); }}
                  className="text-xs px-2 py-1"
                  style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                >Save</button>
                <button onClick={() => setEditingBudget(false)} className="text-xs px-2 py-1" style={{ background: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => { setEditingBudget(true); setBudgetInput(String(budgetThreshold)); }}
                className="text-xs underline" style={{ color: 'hsl(var(--text-4))', background: 'none', border: 'none', cursor: 'pointer' }}>
                Set Budget
              </button>
            )}
          </div>
          <div style={{ height: 6, background: 'hsl(var(--border))', position: 'relative' }}>
            <div style={{
              width: `${Math.min(budgetPct, 100)}%`,
              height: '100%',
              background: budgetPct >= 100 ? 'hsl(var(--s-er-tx))' : budgetPct >= 80 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Net Emissions', value: `${totalNet.toFixed(1)} tCO₂e`, sub: 'After offsets', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Total Offsets Applied', value: `${totalOffset} tCO₂e`, sub: 'Carbon credits', color: 'hsl(var(--brand))' },
          { label: 'Avg Renewable Energy', value: `${avgRenewable}%`, sub: 'Across all compute', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Budget Utilization', value: `${budgetPct}%`, sub: `${totalNet.toFixed(0)} / ${budgetThreshold} tCO₂e`, color: budgetPct >= 100 ? 'hsl(var(--s-er-tx))' : budgetPct >= 80 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' },
          {
            label: 'Projected Monthly', value: `~${projectedMonthly} tCO₂e`,
            sub: `At current rate ${monthlyChange < 0 ? '▼' : '▲'} ${Math.abs(Math.round(monthlyChange))} vs prior`,
            color: monthlyChange < 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
          },
        ].map(s => (
          <div key={s.label} className="border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recommendation chips */}
      {visibleRecs.length > 0 && (
        <div style={{ border: '1px solid hsl(142 71% 45% / 0.25)', background: 'hsl(142 71% 45% / 0.04)', padding: '12px 16px' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />
            <span className="text-xs font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>Carbon Reduction Recommendations</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleRecs.map(rec => (
              <div key={rec.id} className="flex items-center gap-2" style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(142 71% 45% / 0.25)',
                padding: '5px 10px',
              }}>
                <rec.icon size={12} style={{ color: 'hsl(var(--s-ok-tx))', flexShrink: 0 }} />
                <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{rec.label}</span>
                <span className="text-xs font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>{rec.impact}</span>
                <span className="text-xs px-1" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>{rec.effort}</span>
                <button
                  onClick={() => setDismissedRecs(prev => new Set([...prev, rec.id]))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-4))', padding: 0, marginLeft: 4 }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Emissions Trend by Period (tCO₂e)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
              <YAxis tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
              <Tooltip contentStyle={chartTheme.tooltipStyle} />
              <ReferenceLine y={budgetThreshold} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `Budget ${budgetThreshold}`, fill: 'hsl(var(--s-er-tx))', fontSize: 10 }} />
              <Area type="monotone" dataKey="emissions" stroke="hsl(var(--s-ok-tx))" fill="hsl(142 71% 45% / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Emissions by Model (tCO₂e)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={modelData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
              <Tooltip contentStyle={chartTheme.tooltipStyle} />
              <Bar dataKey="emissions" fill="hsl(var(--brand) / 0.7)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Energy Efficiency Scores */}
      {modelData.length > 0 && (
        <div className="border border-[hsl(var(--border))] bg-surface p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Energy Efficiency Scores by Model</h3>
          <div className="space-y-3">
            {[...modelData].sort((a, b) => b.efficiency - a.efficiency).map(m => {
              const color = efficiencyColor(m.efficiency)
              return (
                <div key={m.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{m.emissions} tCO₂e</span>
                      <span className="text-xs font-bold" style={{ color }}>{m.efficiency}/100</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'hsl(var(--border))' }}>
                    <div style={{ width: `${m.efficiency}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                    {m.efficiency >= 80 ? '✓ Efficient — no action required' : m.efficiency >= 60 ? '⚠ Moderate — consider optimization' : '✗ Inefficient — optimization recommended'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="border border-[hsl(var(--border))] bg-surface p-12 text-center">
          <Leaf size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-3))]">No carbon records yet. Log your first entry.</p>
        </div>
      ) : (
        <div className="border border-[hsl(var(--border))] bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-raised">
                {['ID', 'Model', 'Period', 'Training', 'Inference', 'Total', 'Energy (kWh)', 'Renewable', 'Efficiency', 'Offset', 'Net', 'Verified', 'View', 'Del'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h === 'View' || h === 'Del' ? '' : h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={e.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => setSelected(e)}>
                  <td className="px-3 py-3 font-mono text-xs text-[hsl(var(--brand))]">{String(e.id).slice(0, 12)}</td>
                  <td className="px-3 py-3 text-xs font-medium text-[hsl(var(--text-1))] max-w-[120px] truncate">{e.model}</td>
                  <td className="px-3 py-3 text-xs text-[hsl(var(--text-3))]">{e.period}</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{Number(e.trainingEmissions).toFixed(1)}</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{Number(e.inferenceEmissions).toFixed(1)}</td>
                  <td className="px-3 py-3 text-xs font-mono font-semibold text-[hsl(var(--text-1))]">{Number(e.totalEmissions).toFixed(1)}</td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{Number(e.energyKwh).toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <div className="w-10 h-1 bg-[hsl(var(--border))]"><div className="h-full bg-[hsl(var(--s-ok-tx))]" style={{ width: `${e.renewablePercent}%` }} /></div>
                      <span className="text-xs text-[hsl(var(--text-3))]">{e.renewablePercent}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-xs font-bold" style={{ color: efficiencyColor(e.efficiencyScore) }}>{e.efficiencyScore}</span>
                  </td>
                  <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--brand))]">{e.offset}</td>
                  <td className="px-3 py-3 text-xs font-mono font-bold" style={{ color: e.netEmissions < 50 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{Number(e.netEmissions).toFixed(1)}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] px-1.5 py-0.5" style={e.verified ? { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' } : { background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' }}>{e.verified ? 'Verified' : 'Pending'}</span>
                  </td>
                  <td className="px-3 py-3"><Eye size={14} className="text-[hsl(var(--text-4))]" /></td>
                  <td className="px-3 py-3">
                    <button onClick={ev => { ev.stopPropagation(); setDeleteTarget(e) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[420px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{String(selected.id).slice(0, 12)}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.model} — {selected.period}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Training Emissions', value: `${Number(selected.trainingEmissions).toFixed(1)} tCO₂e` },
                  { label: 'Inference Emissions', value: `${Number(selected.inferenceEmissions).toFixed(1)} tCO₂e` },
                  { label: 'Total Emissions', value: `${Number(selected.totalEmissions).toFixed(1)} tCO₂e` },
                  { label: 'Carbon Offset', value: `${selected.offset} tCO₂e` },
                  { label: 'Net Emissions', value: `${Number(selected.netEmissions).toFixed(1)} tCO₂e` },
                  { label: 'Energy Used', value: `${Number(selected.energyKwh).toLocaleString()} kWh` },
                  { label: 'Renewable Energy', value: `${selected.renewablePercent}%` },
                  { label: 'Efficiency Score', value: `${selected.efficiencyScore}/100` },
                  { label: 'Compute Provider', value: selected.computeProvider },
                  { label: 'Region', value: selected.region },
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

      {/* Log Entry Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface border border-[hsl(var(--border))] w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
                <Leaf size={15} className="text-[hsl(var(--s-ok-tx))]" />
                Log Carbon Entry
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Model *</label>
                  <input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="Model name" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Period *</label>
                  <select value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    {['2026-Q1', '2026-Q2', '2025-Q4', '2025-Q3'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Training Emissions (tCO₂e)</label>
                  <input type="number" step="0.1" min={0} value={form.trainingEmissions} onChange={e => setForm(p => ({ ...p, trainingEmissions: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 48.2" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Inference Emissions (tCO₂e)</label>
                  <input type="number" step="0.1" min={0} value={form.inferenceEmissions} onChange={e => setForm(p => ({ ...p, inferenceEmissions: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 8.9" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Energy (kWh)</label>
                  <input type="number" min={0} value={form.energyKwh} onChange={e => setForm(p => ({ ...p, energyKwh: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 22100" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Renewable Energy %</label>
                  <input type="number" min={0} max={100} value={form.renewablePercent} onChange={e => setForm(p => ({ ...p, renewablePercent: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 72" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Compute Provider *</label>
                  <select value={form.computeProvider} onChange={e => setForm(p => ({ ...p, computeProvider: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select provider...</option>
                    {['AWS us-east-1', 'AWS us-west-2', 'Azure East US', 'GCP us-central1', 'OpenAI API', 'On-premise'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Carbon Offset (tCO₂e)</label>
                  <input type="number" step="0.1" min={0} value={form.offset} onChange={e => setForm(p => ({ ...p, offset: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. 20" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] hover:opacity-90">Log Entry</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete carbon entry?"
        description={`Remove ${deleteTarget?.id} for ${deleteTarget?.model}. This cannot be undone.`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
