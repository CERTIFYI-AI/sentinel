import { useState } from 'react'
import { Leaf, Export, Plus, Eye, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface CarbonEntry {
  id: string
  model: string
  period: string
  trainingEmissions: number
  inferenceEmissions: number
  totalEmissions: number
  energyKwh: number
  renewablePercent: number
  computeProvider: string
  region: string
  offset: number
  netEmissions: number
  verified: boolean
}

const SEED: CarbonEntry[] = [
  { id: 'CLG-001', model: 'Credit Scoring Model v2.1', period: '2026-Q1', trainingEmissions: 0, inferenceEmissions: 12.4, totalEmissions: 12.4, energyKwh: 4800, renewablePercent: 92, computeProvider: 'AWS us-east-1', region: 'US East', offset: 0, netEmissions: 12.4, verified: true },
  { id: 'CLG-002', model: 'Loan Approval Model v3.0', period: '2026-Q1', trainingEmissions: 48.2, inferenceEmissions: 8.9, totalEmissions: 57.1, energyKwh: 22100, renewablePercent: 72, computeProvider: 'Azure East US', region: 'US East', offset: 20, netEmissions: 37.1, verified: true },
  { id: 'CLG-003', model: 'Fraud Detection Engine v4.2', period: '2026-Q1', trainingEmissions: 0, inferenceEmissions: 89.4, totalEmissions: 89.4, energyKwh: 34600, renewablePercent: 85, computeProvider: 'OpenAI API', region: 'US West', offset: 45, netEmissions: 44.4, verified: false },
  { id: 'CLG-004', model: 'Customer Churn Predictor v2.3', period: '2026-Q1', trainingEmissions: 12.7, inferenceEmissions: 4.1, totalEmissions: 16.8, energyKwh: 6500, renewablePercent: 88, computeProvider: 'GCP us-central1', region: 'US Central', offset: 0, netEmissions: 16.8, verified: true },
  { id: 'CLG-005', model: 'Fraud Detection Engine v4.2', period: '2025-Q4', trainingEmissions: 95.3, inferenceEmissions: 82.1, totalEmissions: 177.4, energyKwh: 68700, renewablePercent: 71, computeProvider: 'OpenAI API', region: 'US West', offset: 80, netEmissions: 97.4, verified: true },
]

const TREND_DATA = [
  { month: 'Oct 25', emissions: 145 },
  { month: 'Nov 25', emissions: 162 },
  { month: 'Dec 25', emissions: 177 },
  { month: 'Jan 26', emissions: 148 },
  { month: 'Feb 26', emissions: 134 },
  { month: 'Mar 26', emissions: 119 },
]

const MODEL_DATA = [
  { name: 'Fraud Detection', emissions: 89.4 },
  { name: 'Loan Approval', emissions: 57.1 },
  { name: 'Churn Predictor', emissions: 16.8 },
  { name: 'Credit Scoring', emissions: 12.4 },
]

export default function CarbonLedger() {
  const [selected, setSelected] = useState<CarbonEntry | null>(null)

  const totalNet = SEED.filter(e => e.period === '2026-Q1').reduce((s, e) => s + e.netEmissions, 0)
  const totalOffset = SEED.filter(e => e.period === '2026-Q1').reduce((s, e) => s + e.offset, 0)
  const avgRenewable = Math.round(SEED.filter(e => e.period === '2026-Q1').reduce((s, e) => s + e.renewablePercent, 0) / SEED.filter(e => e.period === '2026-Q1').length)

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
          <button onClick={() => toast.success('Exported carbon report')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
          <button onClick={() => toast.info('Log carbon entry')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"><Plus size={14} /> Log Entry</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Net Emissions Q1 2026', value: `${totalNet.toFixed(1)} tCO₂e`, sub: 'After offsets', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Total Offsets Applied', value: `${totalOffset} tCO₂e`, sub: 'Carbon credits', color: 'hsl(var(--brand))' },
          { label: 'Avg Renewable Energy', value: `${avgRenewable}%`, sub: 'Across all compute', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Target (Q1)', value: '100 tCO₂e', sub: `${totalNet.toFixed(0)} / 100 — ${totalNet <= 100 ? 'ON TRACK ✓' : 'EXCEEDED'}`, color: totalNet <= 100 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Monthly Emissions Trend (tCO₂e)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={TREND_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Area type="monotone" dataKey="emissions" stroke="hsl(var(--s-ok-tx))" fill="hsl(142 71% 45% / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Emissions by Model — Q1 2026 (tCO₂e)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MODEL_DATA} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Bar dataKey="emissions" fill="hsl(var(--brand) / 0.7)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Model', 'Period', 'Training', 'Inference', 'Total', 'Energy (kWh)', 'Renewable', 'Offset', 'Net', 'Verified', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED.map(e => (
              <tr key={e.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(e)}>
                <td className="px-3 py-3 font-mono text-xs text-[hsl(var(--brand))]">{e.id}</td>
                <td className="px-3 py-3 text-xs font-medium text-[hsl(var(--text-1))] max-w-[120px] truncate">{e.model}</td>
                <td className="px-3 py-3 text-xs text-[hsl(var(--text-3))]">{e.period}</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{e.trainingEmissions.toFixed(1)}</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{e.inferenceEmissions.toFixed(1)}</td>
                <td className="px-3 py-3 text-xs font-mono font-semibold text-[hsl(var(--text-1))]">{e.totalEmissions.toFixed(1)}</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{e.energyKwh.toLocaleString()}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <div className="w-10 h-1 bg-[hsl(var(--border))] rounded-full"><div className="h-full rounded-full bg-[hsl(var(--s-ok-tx))]" style={{ width: `${e.renewablePercent}%` }} /></div>
                    <span className="text-xs text-[hsl(var(--text-3))]">{e.renewablePercent}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--brand))]">{e.offset}</td>
                <td className="px-3 py-3 text-xs font-mono font-bold" style={{ color: e.netEmissions < 50 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{e.netEmissions.toFixed(1)}</td>
                <td className="px-3 py-3">
                  <span className="text-[10px] px-1.5 py-0.5" style={e.verified ? { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' } : { background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' }}>{e.verified ? 'Verified' : 'Pending'}</span>
                </td>
                <td className="px-3 py-3"><Eye size={14} className="text-[hsl(var(--text-4))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[420px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.model} — {selected.period}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Training Emissions', value: `${selected.trainingEmissions.toFixed(1)} tCO₂e` },
                  { label: 'Inference Emissions', value: `${selected.inferenceEmissions.toFixed(1)} tCO₂e` },
                  { label: 'Total Emissions', value: `${selected.totalEmissions.toFixed(1)} tCO₂e` },
                  { label: 'Carbon Offset', value: `${selected.offset} tCO₂e` },
                  { label: 'Net Emissions', value: `${selected.netEmissions.toFixed(1)} tCO₂e` },
                  { label: 'Energy Used', value: `${selected.energyKwh.toLocaleString()} kWh` },
                  { label: 'Renewable Energy', value: `${selected.renewablePercent}%` },
                  { label: 'Compute Provider', value: selected.computeProvider },
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
    </div>
  )
}
