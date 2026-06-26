import { useState, useMemo } from 'react'
import { HandCoins, MagnifyingGlass, Plus, Eye, X, Export, TrendUp, TrendDown, ChartLine, Calculator, Target, Sliders, PencilSimple, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, ReferenceLine, Legend, ScatterChart, Scatter, ZAxis } from 'recharts'


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

const CATEGORIES = ['Regulatory', 'Operational', 'Third-Party', 'Fraud', 'Legal', 'Reputational']
const OWNERS = ['Sarah Chen', 'James Liu', 'Marcus Johnson', 'Maria Santos']

export default function FinancialRisk() {
  const [items, setItems] = useState<FinancialRiskItem[]>(SEED)
  const [selected, setSelected] = useState<FinancialRiskItem | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deleteTarget, setDeleteTarget] = useState<FinancialRiskItem | null>(null)
  const [editTarget, setEditTarget] = useState<FinancialRiskItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ riskName: '', category: 'Regulatory', aiSystem: '', annualExpectedLoss: 0, annualExpectedLossWorstCase: 0, probability: 0.1, controlEffectiveness: 0.5, residualRisk: 0, framework: 'FAIR', status: 'Monitored' as FinancialRiskItem['status'], owner: 'Sarah Chen', notes: '' })

  const filtered = items.filter(r =>
    (statusFilter === 'All' || r.status === statusFilter) &&
    (!search || r.riskName.toLowerCase().includes(search.toLowerCase()) || r.aiSystem.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()))
  )

  const totalAEL = items.reduce((s, r) => s + r.annualExpectedLoss, 0)
  const totalResidual = items.reduce((s, r) => s + r.residualRisk, 0)
  const worstCase = items.reduce((s, r) => s + r.annualExpectedLossWorstCase, 0)

  const openCreate = () => {
    setEditTarget(null)
    setForm({ riskName: '', category: 'Regulatory', aiSystem: '', annualExpectedLoss: 0, annualExpectedLossWorstCase: 0, probability: 0.1, controlEffectiveness: 0.5, residualRisk: 0, framework: 'FAIR', status: 'Monitored', owner: 'Sarah Chen', notes: '' })
    setShowForm(true)
  }

  const openEdit = (r: FinancialRiskItem) => {
    setEditTarget(r)
    setForm({ riskName: r.riskName, category: r.category, aiSystem: r.aiSystem, annualExpectedLoss: r.annualExpectedLoss, annualExpectedLossWorstCase: r.annualExpectedLossWorstCase, probability: r.probability, controlEffectiveness: r.controlEffectiveness, residualRisk: r.residualRisk, framework: r.framework, status: r.status, owner: r.owner, notes: r.notes })
    setShowForm(true)
    setSelected(null)
  }

  const saveForm = () => {
    if (!form.riskName.trim() || !form.aiSystem.trim()) { toast.error('Risk name and AI system are required'); return }
    if (editTarget) {
      setItems(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...form, lastQuantified: new Date().toISOString().slice(0, 10) } : r))
      toast.success('Risk updated')
    } else {
      const newId = `FRQ-${String(items.length + 1).padStart(3, '0')}`
      setItems(prev => [...prev, { ...form, id: newId, lastQuantified: new Date().toISOString().slice(0, 10) }])
      toast.success('Risk quantification added')
    }
    setShowForm(false)
    setEditTarget(null)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    setItems(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast.success(`${deleteTarget.id} removed`)
    setDeleteTarget(null)
    setSelected(null)
  }

  const chartData = items.map(r => ({
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
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
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
        <div className="flex items-center gap-2 flex-1 max-w-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search risks…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Critical', 'Elevated', 'Monitored', 'Mitigated'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Risk', 'AI System', 'Gross AEL', 'Worst Case', 'Probability', 'Control Eff.', 'Residual', 'Status', 'Actions'].map(h => (
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
                <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))]"><PencilSimple size={13} /></button>
                    <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(0_72%_51%/0.05)]"><Trash size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-[hsl(var(--text-4))] text-sm">No risks match the current filters</div>}
      </div>

      {/* ── Monte Carlo Simulation Panel ─────────────────────────────────────── */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <ChartLine size={16} className="text-[hsl(var(--brand))]" weight="duotone" />
            Monte Carlo Loss Distribution Simulation (10,000 iterations)
          </h3>
          <button onClick={() => toast.info('Re-running simulation...')} className="text-xs px-3 py-1 bg-[hsl(var(--brand))] text-white hover:opacity-90">Run Simulation</button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'P50 (Median)', value: '$3.8M', color: '#10b981' },
            { label: 'P75', value: '$7.2M', color: '#f59e0b' },
            { label: 'P90', value: '$12.4M', color: '#f97316' },
            { label: 'P95 (Worst-Case)', value: formatCurrency(worstCase), color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="p-3 border border-[hsl(var(--border))] text-center">
              <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">{s.label}</p>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={[
            { loss: '<$1M', freq: 18 }, { loss: '$1-2M', freq: 24 }, { loss: '$2-4M', freq: 31 },
            { loss: '$4-6M', freq: 14 }, { loss: '$6-9M', freq: 8 }, { loss: '$9-12M', freq: 3 }, { loss: '>$12M', freq: 2 },
          ]} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="loss" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} unit="%" />
            <Tooltip formatter={(v: any) => [`${v}%`, 'Probability']} contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
            <ReferenceLine x="$4-6M" stroke="#f59e0b" strokeDasharray="3 2" label={{ value: 'AEL', fill: '#f59e0b', fontSize: 10 }} />
            <Bar dataKey="freq" fill="hsl(var(--brand) / 0.7)" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-[hsl(var(--text-4))] mt-2">Simulation parameters: 10,000 iterations · Log-normal loss distribution · Inputs: probability, magnitude, and control effectiveness ranges from all 6 risks</p>
      </div>

      {/* ── FAIR Model Tuning & Risk Appetite ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-4">
            <Sliders size={16} className="text-[hsl(var(--brand))]" weight="duotone" />
            FAIR Model Tuning
          </h3>
          {[
            { param: 'Threat Event Frequency (TEF)', min: 0.05, max: 0.5, current: 0.25 },
            { param: 'Vulnerability (VULN)', min: 0.1, max: 0.9, current: 0.45 },
            { param: 'Loss Magnitude (LM) — mean', min: 1, max: 25, current: 8.2, unit: 'M' },
            { param: 'Control Strength (CS)', min: 0.3, max: 0.95, current: 0.62 },
          ].map(p => (
            <div key={p.param} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-[hsl(var(--text-2))]">{p.param}</p>
                <span className="text-xs font-semibold text-[hsl(var(--text-1))]">{p.current}{p.unit || ''}</span>
              </div>
              <input type="range" min={p.min} max={p.max} step={p.max > 5 ? 0.1 : 0.01} defaultValue={p.current}
                className="w-full h-1.5 bg-[hsl(var(--border))] appearance-none cursor-pointer"
                onChange={() => toast.info('Recalculating FAIR model…')} />
              <div className="flex justify-between text-[10px] text-[hsl(var(--text-4))] mt-0.5">
                <span>{p.min}{p.unit || ''}</span><span>{p.max}{p.unit || ''}</span>
              </div>
            </div>
          ))}
          <button onClick={() => toast.success('FAIR model recalculated')} className="w-full text-xs py-1.5 bg-[hsl(var(--brand))] text-white hover:opacity-90">Recalculate AEL</button>
        </div>

        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-4">
            <Calculator size={16} className="text-[hsl(var(--brand))]" weight="duotone" />
            Controls ROI Calculator
          </h3>
          <div className="space-y-3">
            {[
              { control: 'Bias Monitoring (real-time)', investment: 120000, riskReduction: 1500000, roi: 1150 },
              { control: 'Explainability Platform', investment: 85000, riskReduction: 980000, roi: 1053 },
              { control: 'Model Validation Lab', investment: 200000, riskReduction: 3200000, roi: 1500 },
              { control: 'Data Quality Pipeline', investment: 65000, riskReduction: 420000, roi: 546 },
            ].map(c => (
              <div key={c.control} className="p-2 border border-[hsl(var(--border))]">
                <p className="text-xs font-medium text-[hsl(var(--text-1))]">{c.control}</p>
                <div className="grid grid-cols-3 gap-2 mt-1 text-[10px]">
                  <div><p className="text-[hsl(var(--text-4))]">Investment</p><p className="font-semibold text-[hsl(var(--text-2))]">{formatCurrency(c.investment)}</p></div>
                  <div><p className="text-[hsl(var(--text-4))]">Risk Reduction</p><p className="font-semibold text-[hsl(var(--s-ok-tx))]">{formatCurrency(c.riskReduction)}</p></div>
                  <div><p className="text-[hsl(var(--text-4))]">ROI</p><p className="font-semibold" style={{ color: '#10b981' }}>{c.roi}%</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 border border-[hsl(var(--s-ok-br))] bg-[hsl(var(--s-ok-bg))]">
            <p className="text-xs text-[hsl(var(--s-ok-tx))] font-medium">Total Portfolio ROI</p>
            <p className="text-xl font-bold text-[hsl(var(--s-ok-tx))]">948%</p>
            <p className="text-[10px] text-[hsl(var(--text-4))]">$470K investment → $6.1M risk reduction</p>
          </div>
        </div>
      </div>

      {/* ── Insurance Coverage Mapping ─────────────────────────────────────── */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-4">
          <span className="text-base">🛡</span>
          Insurance Coverage Mapping — AI Risk Transfer Analysis
        </h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Gross Risk Exposure', value: '$14.2M', color: 'hsl(var(--destructive))' },
            { label: 'Insured Coverage', value: '$8.5M', color: 'hsl(var(--s-ok-tx))' },
            { label: 'Uninsured Residual', value: '$5.7M', color: 'hsl(var(--s-wn-tx))' },
            { label: 'Coverage Ratio', value: '59.9%', color: 'hsl(var(--s-in-tx))' },
          ].map(s => (
            <div key={s.label} className="p-3 border border-[hsl(var(--border))] text-center">
              <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">{s.label}</p>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        <table className="w-full text-xs mb-4">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              {['Risk Category', 'Gross Exposure', 'Policy', 'Coverage Limit', 'Deductible', 'Net Gap', 'Coverage Status'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-[hsl(var(--text-4))]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { category: 'Bias/Discrimination Liability', gross: '$3.8M', policy: 'Tech E&O — AXA XL', limit: '$2.5M', deductible: '$250K', gap: '$1.3M', covered: true },
              { category: 'Model Performance Failure', gross: '$4.2M', policy: 'Cyber Liability — Chubb', limit: '$3.0M', deductible: '$100K', gap: '$1.2M', covered: true },
              { category: 'Regulatory Fines (EU AI Act)', gross: '$2.1M', policy: 'Regulatory Defense — Beazley', limit: '$1.5M', deductible: '$500K', gap: '$0.6M', covered: true },
              { category: 'Data Privacy Breach', gross: '$1.9M', policy: 'Cyber — AIG', limit: '$1.5M', deductible: '$50K', gap: '$0.4M', covered: true },
              { category: 'Autonomous Decision Error', gross: '$1.5M', policy: 'No applicable policy', limit: '—', deductible: '—', gap: '$1.5M', covered: false },
              { category: 'Reputational Damage', gross: '$0.7M', policy: 'No applicable policy', limit: '—', deductible: '—', gap: '$0.7M', covered: false },
            ].map(r => (
              <tr key={r.category} style={{ borderBottom: '1px solid hsl(var(--border))', background: !r.covered ? 'hsl(0 72% 51% / 0.04)' : 'transparent' }}>
                <td className="px-3 py-2 font-medium text-[hsl(var(--text-1))]">{r.category}</td>
                <td className="px-3 py-2 font-mono font-bold text-[hsl(var(--destructive))]">{r.gross}</td>
                <td className="px-3 py-2 text-[hsl(var(--text-3))]">{r.policy}</td>
                <td className="px-3 py-2 font-mono text-[hsl(var(--s-ok-tx))]">{r.limit}</td>
                <td className="px-3 py-2 font-mono text-[hsl(var(--text-3))]">{r.deductible}</td>
                <td className="px-3 py-2 font-mono font-bold" style={{ color: r.gap !== '$0M' && r.gap !== '—' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}>{r.gap}</td>
                <td className="px-3 py-2">
                  <span className="text-[9px] px-2 py-0.5 font-medium" style={{
                    background: r.covered ? 'hsl(142 71% 45% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                    color: r.covered ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                  }}>{r.covered ? 'Partially Covered' : 'UNINSURED GAP'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3 border border-[hsl(45_93%_47%/0.4)] bg-[hsl(45_93%_47%/0.06)]">
          <p className="text-xs font-semibold text-[hsl(var(--s-wn-tx))] mb-1">⚠ Coverage Gap Recommendations</p>
          <ul className="space-y-1 text-xs text-[hsl(var(--text-3))]">
            <li>→ Negotiate <strong>Autonomous AI Decision</strong> rider with existing E&O carrier — est. $45K/yr premium for $2M coverage</li>
            <li>→ Explore <strong>Reputational Harm</strong> endorsement with Munich Re AI insurance product line</li>
            <li>→ Implement additional controls (bias monitoring, kill switch) to reduce premium exposure by an estimated 18%</li>
          </ul>
        </div>
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
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => openEdit(selected)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><PencilSimple size={13} /> Edit</button>
              <button onClick={() => setDeleteTarget(selected)} className="px-4 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(0_72%_51%/0.05)]"><Trash size={13} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative w-[560px] max-h-[90vh] overflow-y-auto bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{editTarget ? 'Edit Risk Quantification' : 'Quantify New Risk'}</h2>
              <button onClick={() => setShowForm(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Risk Name *</label>
                  <input value={form.riskName} onChange={e => setForm(p => ({ ...p, riskName: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Biased lending decisions — regulatory fine exposure" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as FinancialRiskItem['status'] }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
                    {['Monitored', 'Elevated', 'Critical', 'Mitigated'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">AI System *</label>
                  <input value={form.aiSystem} onChange={e => setForm(p => ({ ...p, aiSystem: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Loan Approval Model v3.0" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Gross AEL ($)</label>
                  <input type="number" value={form.annualExpectedLoss} onChange={e => setForm(p => ({ ...p, annualExpectedLoss: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Worst Case AEL ($)</label>
                  <input type="number" value={form.annualExpectedLossWorstCase} onChange={e => setForm(p => ({ ...p, annualExpectedLossWorstCase: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Probability (0–1)</label>
                  <input type="number" min="0" max="1" step="0.01" value={form.probability} onChange={e => setForm(p => ({ ...p, probability: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Control Effectiveness (0–1)</label>
                  <input type="number" min="0" max="1" step="0.01" value={form.controlEffectiveness} onChange={e => setForm(p => ({ ...p, controlEffectiveness: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Residual Risk ($)</label>
                  <input type="number" value={form.residualRisk} onChange={e => setForm(p => ({ ...p, residualRisk: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Owner</label>
                  <select value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
                    {OWNERS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-[hsl(var(--text-2))] block mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" placeholder="FAIR model assumptions, data sources…" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 text-sm bg-[hsl(var(--brand))] text-white hover:opacity-90">{editTarget ? 'Save Changes' : 'Add Risk'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Risk Quantification"
        description={`Delete ${deleteTarget?.id} — "${deleteTarget?.riskName}"? This will remove the FAIR model data permanently.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
