import { useState } from 'react'
import { HandCoins, MagnifyingGlass, Plus, Eye, X, Export, TrendUp, TrendDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface FinancialRiskItem {
  id: string
  riskName: string
  category: string
  aiSystem: string
  annualExpectedLoss: number
  annualExpectedLossWorstCase: number
  probability: number
  controlEffectiveness: number
  residualRisk: number
  framework: string
  status: 'Monitored' | 'Elevated' | 'Critical' | 'Mitigated'
  lastQuantified: string
  owner: string
  notes: string
}

const SEED: FinancialRiskItem[] = [
  { id: 'FRQ-001', riskName: 'Biased lending decisions — regulatory fine exposure', category: 'Regulatory', aiSystem: 'Loan Approval Model v3.0', annualExpectedLoss: 4200000, annualExpectedLossWorstCase: 12000000, probability: 0.35, controlEffectiveness: 0.55, residualRisk: 1890000, framework: 'FAIR', status: 'Critical', lastQuantified: '2026-04-01', owner: 'Sarah Chen', notes: 'Based on CFPB enforcement data: average fair lending fine $12M for institutions of similar size.' },
  { id: 'FRQ-002', riskName: 'Credit model performance degradation — loss increase', category: 'Operational', aiSystem: 'Credit Scoring Model v2.1', annualExpectedLoss: 1800000, annualExpectedLossWorstCase: 5500000, probability: 0.20, controlEffectiveness: 0.72, residualRisk: 504000, framework: 'FAIR', status: 'Monitored', lastQuantified: '2026-03-28', owner: 'James Liu', notes: 'Model drift could cause 200bps increase in default rate across $90M loan portfolio.' },
  { id: 'FRQ-003', riskName: 'OpenAI API outage — business interruption', category: 'Third-Party', aiSystem: 'Fraud Detection Engine v4.2', annualExpectedLoss: 890000, annualExpectedLossWorstCase: 3200000, probability: 0.15, controlEffectiveness: 0.40, residualRisk: 534000, framework: 'FAIR', status: 'Elevated', lastQuantified: '2026-04-05', owner: 'Marcus Johnson', notes: 'Based on 3 API outages in 2025, avg 4hr duration. Manual review costs $180K/hour at scale.' },
  { id: 'FRQ-004', riskName: 'AI fraud evasion — increased fraudulent transactions', category: 'Fraud', aiSystem: 'Fraud Detection Engine v4.2', annualExpectedLoss: 2300000, annualExpectedLossWorstCase: 8700000, probability: 0.25, controlEffectiveness: 0.65, residualRisk: 805000, framework: 'FAIR', status: 'Elevated', lastQuantified: '2026-03-15', owner: 'Sarah Chen', notes: 'Adversarial attack on fraud model could enable targeted fraud bypass. Monte Carlo simulation: $2.3M AEL.' },
  { id: 'FRQ-005', riskName: 'GDPR fine — PII in training data violation', category: 'Regulatory', aiSystem: 'Customer Churn Predictor v2.3', annualExpectedLoss: 760000, annualExpectedLossWorstCase: 22000000, probability: 0.08, controlEffectiveness: 0.60, residualRisk: 304000, framework: 'FAIR', status: 'Monitored', lastQuantified: '2026-03-20', owner: 'Maria Santos', notes: 'GDPR max fine: 4% global turnover (~$22M for Acme). Probability low post-PII scrubbing remediation.' },
  { id: 'FRQ-006', riskName: 'Model explanation litigation — ECOA adverse action', category: 'Legal', aiSystem: 'Credit Scoring Model v2.1', annualExpectedLoss: 980000, annualExpectedLossWorstCase: 4500000, probability: 0.18, controlEffectiveness: 0.45, residualRisk: 539000, framework: 'FAIR', status: 'Elevated', lastQuantified: '2026-04-02', owner: 'Sarah Chen', notes: 'Inability to provide ECOA-compliant adverse action notices exposes to class action risk.' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Elevated: { bg: 'hsl(25 95% 53% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  Monitored: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Mitigated: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n}`
}

export default function FinancialRisk() {
  const [selected, setSelected] = useState<FinancialRiskItem | null>(null)
  const [search, setSearch] = useState('')

  const filtered = SEED.filter(r =>
    r.riskName.toLowerCase().includes(search.toLowerCase()) ||
    r.aiSystem.toLowerCase().includes(search.toLowerCase())
  )

  const totalAEL = SEED.reduce((s, r) => s + r.annualExpectedLoss, 0)
  const totalResidual = SEED.reduce((s, r) => s + r.residualRisk, 0)
  const worstCase = SEED.reduce((s, r) => s + r.annualExpectedLossWorstCase, 0)

  const chartData = SEED.map(r => ({
    name: r.id,
    ael: r.annualExpectedLoss / 1000000,
    residual: r.residualRisk / 1000000,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <HandCoins size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Financial Risk Quantification
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">FAIR-based monetary quantification of AI governance risks — Annual Expected Loss modeling</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => toast.info('FAIR quantification wizard')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> Quantify Risk
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Annual Expected Loss', value: formatCurrency(totalAEL), sub: 'Probability-weighted AEL across all AI risks', color: 'hsl(var(--destructive))' },
          { label: 'Residual Risk (Post-Controls)', value: formatCurrency(totalResidual), sub: `${Math.round((totalResidual / totalAEL) * 100)}% of gross risk remains`, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Worst-Case Scenario', value: formatCurrency(worstCase), sub: '95th percentile annual loss estimate', color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">AEL vs Residual Risk by Risk ID ($ millions)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--text-4))' }} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--text-4))' }} tickFormatter={v => `$${v}M`} />
            <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}M`]} contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
            <Bar dataKey="ael" name="Gross AEL" fill="hsl(0 72% 51% / 0.7)" />
            <Bar dataKey="residual" name="Residual Risk" fill="hsl(var(--brand) / 0.7)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search risks…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Risk', 'AI System', 'Gross AEL', 'Worst Case', 'Probability', 'Control Eff.', 'Residual', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.id}</td>
                <td className="px-4 py-3 max-w-[180px]"><p className="text-xs font-medium text-[hsl(var(--text-1))] truncate">{r.riskName}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{r.category}</p></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] max-w-[140px] truncate">{r.aiSystem}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-[hsl(var(--destructive))]">{formatCurrency(r.annualExpectedLoss)}</td>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{formatCurrency(r.annualExpectedLossWorstCase)}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{(r.probability * 100).toFixed(0)}%</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{(r.controlEffectiveness * 100).toFixed(0)}%</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: r.residualRisk > 1000000 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>{formatCurrency(r.residualRisk)}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[r.status]}>{r.status}</span></td>
                <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))] max-w-sm">{selected.riskName}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.framework}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Gross AEL', value: formatCurrency(selected.annualExpectedLoss) },
                  { label: 'Worst Case (P95)', value: formatCurrency(selected.annualExpectedLossWorstCase) },
                  { label: 'Loss Probability', value: `${(selected.probability * 100).toFixed(0)}%` },
                  { label: 'Control Effectiveness', value: `${(selected.controlEffectiveness * 100).toFixed(0)}%` },
                  { label: 'Residual Risk', value: formatCurrency(selected.residualRisk) },
                  { label: 'Owner', value: selected.owner },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">AI System</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.aiSystem}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.notes}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
