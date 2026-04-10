import { useState } from 'react'
import { Lightning, Export } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

const EFFICIENCY_DATA = [
  { month: 'Oct 25', tokensPerKwh: 782000, pue: 1.38, gpuUtil: 71 },
  { month: 'Nov 25', tokensPerKwh: 801000, pue: 1.35, gpuUtil: 74 },
  { month: 'Dec 25', tokensPerKwh: 824000, pue: 1.33, gpuUtil: 76 },
  { month: 'Jan 26', tokensPerKwh: 835000, pue: 1.32, gpuUtil: 78 },
  { month: 'Feb 26', tokensPerKwh: 841000, pue: 1.31, gpuUtil: 79 },
  { month: 'Mar 26', tokensPerKwh: 847000, pue: 1.30, gpuUtil: 81 },
]

const MODEL_EFFICIENCY = [
  { model: 'Credit Scoring', tokensPerKwh: 2100000, carbonIntensity: 2.6 },
  { model: 'Churn Predictor', tokensPerKwh: 1850000, carbonIntensity: 2.9 },
  { model: 'Loan Approval', tokensPerKwh: 1420000, carbonIntensity: 3.8 },
  { model: 'Fraud Detection', tokensPerKwh: 980000, carbonIntensity: 5.1 },
]

const REGIONS = [
  { region: 'GCP us-central1', pue: 1.08, renewable: 97, score: 96 },
  { region: 'AWS us-east-1 (Nova)', pue: 1.15, renewable: 92, score: 89 },
  { region: 'Azure East US', pue: 1.22, renewable: 72, score: 74 },
  { region: 'OpenAI API (US West)', pue: 1.35, renewable: 85, score: 78 },
]

export default function EnergyEfficiency() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Lightning size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Energy Efficiency
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">AI compute energy efficiency metrics — tokens per kWh, PUE, GPU utilization, and regional carbon intensity</p>
        </div>
        <button onClick={() => toast.success('Report exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tokens / kWh (Mar 2026)', value: '847K', sub: '↑ 8% vs Oct 2025', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Avg PUE', value: '1.30', sub: 'Target: < 1.35 ✓', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Avg GPU Utilization', value: '81%', sub: '↑ 10pp vs Oct 2025', color: 'hsl(var(--brand))' },
          { label: 'Renewable Energy', value: '84%', sub: 'Target: 90% by EOY', color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Tokens per kWh Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={EFFICIENCY_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: any) => [`${(v / 1000).toFixed(0)}K tokens/kWh`]} contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Line type="monotone" dataKey="tokensPerKwh" stroke="hsl(var(--brand))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--brand))' }} name="Tokens/kWh" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">GPU Utilization & PUE Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={EFFICIENCY_DATA}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Line type="monotone" dataKey="gpuUtil" stroke="hsl(var(--s-ok-tx))" strokeWidth={2} name="GPU Util %" />
              <Line type="monotone" dataKey="pue" stroke="hsl(var(--s-wn-tx))" strokeWidth={2} name="PUE" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Model Efficiency Comparison</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MODEL_EFFICIENCY} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
              <YAxis dataKey="model" type="category" width={100} tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip formatter={(v: any) => [`${(v / 1000000).toFixed(2)}M tokens/kWh`]} contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Bar dataKey="tokensPerKwh" fill="hsl(var(--brand) / 0.7)" name="Tokens/kWh" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Compute Region Efficiency Scorecard</h3>
          <div className="space-y-2">
            {REGIONS.map(r => (
              <div key={r.region} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.region}</span>
                  <span className="text-sm font-bold" style={{ color: r.score >= 85 ? 'hsl(var(--s-ok-tx))' : r.score >= 70 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }}>{r.score}/100</span>
                </div>
                <div className="flex gap-4 text-[10px] text-[hsl(var(--text-4))]">
                  <span>PUE: {r.pue}</span>
                  <span>Renewable: {r.renewable}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
