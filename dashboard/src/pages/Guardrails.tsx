import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  ShieldCheck, Plus, PencilSimple, Trash, MagnifyingGlass,
  ToggleLeft, ToggleRight, Warning, X, Clock,
  Lightning, Lock, BracketsAngle, Funnel,
} from '@phosphor-icons/react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

// ── Types ─────────────────────────────────────────────────────────────────────
type RuleAction = 'block' | 'warn' | 'flag' | 'allow'
type RuleType = 'Privacy' | 'Safety' | 'Security' | 'Accuracy' | 'Governance' | 'Rate Limiting'
type RuleStatus = 'active' | 'disabled' | 'testing'

interface GuardrailRule {
  id: string
  name: string
  type: RuleType
  action: RuleAction
  status: RuleStatus
  target: string
  pattern: string
  description: string
  evaluations: number
  triggered: number
  avgLatencyMs: number
  lastTriggered: string
  createdBy: string
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED: GuardrailRule[] = [
  {
    id: 'GR-001', name: 'PII Detection & Redaction', type: 'Privacy', action: 'block', status: 'active',
    target: 'All Agents', pattern: '/\\b\\d{3}-\\d{2}-\\d{4}\\b|\\b[A-Z]{2}\\d{6}\\b/',
    description: 'Detects and redacts PII including SSN, passport numbers, credit card numbers, and email addresses from all agent inputs and outputs.',
    evaluations: 124800, triggered: 342, avgLatencyMs: 12, lastTriggered: '2026-04-18T14:23:01Z', createdBy: 'Sarah Chen',
  },
  {
    id: 'GR-002', name: 'Prompt Injection Firewall', type: 'Security', action: 'block', status: 'active',
    target: 'LLM Agents', pattern: '/ignore previous instructions|act as|jailbreak|DAN|disregard/i',
    description: 'Blocks adversarial prompt injection attempts including jailbreak patterns, role-playing bypasses, and instruction override attacks.',
    evaluations: 89400, triggered: 87, avgLatencyMs: 8, lastTriggered: '2026-04-18T13:55:12Z', createdBy: 'David Kim',
  },
  {
    id: 'GR-003', name: 'Toxicity & Harm Filter', type: 'Safety', action: 'warn', status: 'active',
    target: 'Customer-facing', pattern: 'ML classifier: toxicity_v2 (threshold: 0.75)',
    description: 'Flags and moderates toxic, harmful, or inappropriate content using an ML-based classifier with configurable sensitivity thresholds.',
    evaluations: 67200, triggered: 218, avgLatencyMs: 22, lastTriggered: '2026-04-18T14:10:45Z', createdBy: 'Maria Santos',
  },
  {
    id: 'GR-004', name: 'Hallucination Confidence Guard', type: 'Accuracy', action: 'block', status: 'active',
    target: 'LLM Agents', pattern: 'confidence_score < 0.72 AND factual_claim == true',
    description: 'Intercepts low-confidence factual claims from LLMs, preventing hallucinated outputs from reaching end users.',
    evaluations: 32100, triggered: 156, avgLatencyMs: 31, lastTriggered: '2026-04-18T14:01:33Z', createdBy: 'James Patel',
  },
  {
    id: 'GR-005', name: 'Data Boundary Enforcement', type: 'Security', action: 'block', status: 'active',
    target: 'All Agents', pattern: 'data_classification IN [CONFIDENTIAL, RESTRICTED] AND recipient_verified == false',
    description: 'Enforces strict data boundary controls, preventing agents from exfiltrating or sharing classified data with unverified recipients.',
    evaluations: 452000, triggered: 12, avgLatencyMs: 5, lastTriggered: '2026-04-17T22:44:01Z', createdBy: 'Sarah Chen',
  },
  {
    id: 'GR-006', name: 'Demographic Bias Detector', type: 'Accuracy', action: 'flag', status: 'active',
    target: 'Fraud Detection, Loan Approval', pattern: 'fairness_disparity > 0.05 ON protected_attributes',
    description: 'Detects statistically significant demographic disparities in model decisions, flagging cases for human review when bias thresholds are exceeded.',
    evaluations: 18700, triggered: 44, avgLatencyMs: 18, lastTriggered: '2026-04-16T09:12:08Z', createdBy: 'Maria Santos',
  },
  {
    id: 'GR-007', name: 'API Rate & Cost Limiter', type: 'Rate Limiting', action: 'warn', status: 'active',
    target: 'External APIs', pattern: 'requests_per_min > 60 OR cost_per_hour > $5.00',
    description: 'Monitors API request rates and token costs, issuing warnings when approaching limits and blocking when hard caps are exceeded.',
    evaluations: 245000, triggered: 891, avgLatencyMs: 3, lastTriggered: '2026-04-18T14:22:50Z', createdBy: 'Raj Gupta',
  },
  {
    id: 'GR-008', name: 'Output Length Controller', type: 'Governance', action: 'flag', status: 'testing',
    target: 'All Agents', pattern: 'output_tokens > 2048 AND use_case != "summarization"',
    description: 'Flags overly verbose model outputs that may indicate prompt padding, context stuffing, or runaway generation patterns.',
    evaluations: 4200, triggered: 23, avgLatencyMs: 2, lastTriggered: '2026-04-15T16:30:12Z', createdBy: 'Emma Wilson',
  },
  {
    id: 'GR-009', name: 'IP & Copyright Shield', type: 'Privacy', action: 'block', status: 'disabled',
    target: 'LLM Agents', pattern: 'verbatim_copy_detected == true AND source_licensed == false',
    description: 'Prevents reproduction of copyrighted content by detecting verbatim copies of licensed material in model outputs.',
    evaluations: 0, triggered: 0, avgLatencyMs: 0, lastTriggered: '—', createdBy: 'James Patel',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
const ACTION_STYLE: Record<RuleAction, { bg: string; color: string; label: string }> = {
  block: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', label: 'BLOCK' },
  warn: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)', label: 'WARN' },
  flag: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))', label: 'FLAG' },
  allow: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))', label: 'ALLOW' },
}
const STATUS_STYLE: Record<RuleStatus, { bg: string; color: string }> = {
  active: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  disabled: { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' },
  testing: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
}
const TYPE_ICON: Record<RuleType, React.ReactNode> = {
  Privacy: <Lock size={12} />,
  Safety: <ShieldCheck size={12} />,
  Security: <Warning size={12} />,
  Accuracy: <BracketsAngle size={12} />,
  Governance: <Lightning size={12} />,
  'Rate Limiting': <Clock size={12} />,
}

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }
function fmtTime(iso: string) {
  if (iso === '—') return '—'
  try {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

const BLANK_FORM = { name: '', type: 'Privacy' as RuleType, action: 'block' as RuleAction, target: '', pattern: '', description: '' }

// ══════════════════════════════════════════════════════════════════════════════
export default function Guardrails() {
  const [rules, setRules] = useState<GuardrailRule[]>(SEED)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selected, setSelected] = useState<GuardrailRule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<GuardrailRule | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GuardrailRule | null>(null)
  const [form, setForm] = useState({ ...BLANK_FORM })

  const filtered = useMemo(() => rules.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.target.toLowerCase().includes(q)
    const matchType = filterType === 'all' || r.type === filterType
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchType && matchStatus
  }), [rules, search, filterType, filterStatus])

  function toggleStatus(r: GuardrailRule) {
    const next: RuleStatus = r.status === 'active' ? 'disabled' : 'active'
    setRules(p => p.map(x => x.id === r.id ? { ...x, status: next } : x))
    if (selected?.id === r.id) setSelected(s => s ? { ...s, status: next } : s)
    toast(r.status === 'active' ? `Rule "${r.name}" disabled` : `Rule "${r.name}" enabled`)
  }

  function openCreate() { setForm({ ...BLANK_FORM }); setEditTarget(null); setCreateOpen(true) }
  function openEdit(r: GuardrailRule) {
    setForm({ name: r.name, type: r.type, action: r.action, target: r.target, pattern: r.pattern, description: r.description })
    setEditTarget(r); setCreateOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Rule name is required'); return }
    if (editTarget) {
      setRules(p => p.map(x => x.id === editTarget.id ? { ...x, ...form } : x))
      if (selected?.id === editTarget.id) setSelected(s => s ? { ...s, ...form } : s)
      toast.success(`Rule "${form.name}" updated`)
    } else {
      const newR: GuardrailRule = {
        id: `GR-${String(rules.length + 1).padStart(3, '0')}`,
        ...form, status: 'active', evaluations: 0, triggered: 0, avgLatencyMs: 0,
        lastTriggered: '—', createdBy: 'Sarah Chen',
      }
      setRules(p => [newR, ...p])
      toast.success(`Rule "${newR.name}" created`)
    }
    setCreateOpen(false)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setRules(p => p.filter(x => x.id !== deleteTarget.id))
    if (selected?.id === deleteTarget.id) setSelected(null)
    toast.success(`Rule "${deleteTarget.name}" deleted`)
    setDeleteTarget(null)
  }

  const activeCount = rules.filter(r => r.status === 'active').length
  const totalBlocked = rules.reduce((s, r) => s + (r.action === 'block' ? r.triggered : 0), 0)
  const avgLatency = Math.round(
    rules.filter(r => r.avgLatencyMs > 0).reduce((s, r) => s + r.avgLatencyMs, 0) /
    (rules.filter(r => r.avgLatencyMs > 0).length || 1)
  )

  const inputCls = "w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
  const selectCls = "w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] focus:outline-none"

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <ShieldCheck size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Guardrails
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">
            Define, configure, and enforce AI safety guardrails and runtime constraints across all deployed agents
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
          <Plus size={14} /> New Guardrail
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: rules.length, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: activeCount, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Blocks (all time)', value: fmt(totalBlocked), color: 'hsl(var(--destructive))' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="border border-[hsl(var(--border))] bg-surface p-4" style={{ borderRadius: 0 }}>
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <div className="flex items-center gap-1 text-[hsl(var(--text-4))]"><Funnel size={13} /></div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] focus:outline-none">
          <option value="all">All Types</option>
          {(['Privacy', 'Safety', 'Security', 'Accuracy', 'Governance', 'Rate Limiting'] as RuleType[]).map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] focus:outline-none">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="testing">Testing</option>
          <option value="disabled">Disabled</option>
        </select>
        <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} of {rules.length} rules</span>
      </div>

      {/* Rules Table */}
      <div className="border border-[hsl(var(--border))] bg-surface overflow-hidden" style={{ borderRadius: 0 }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-raised">
              {['Rule', 'Type', 'Action', 'Target', 'Evaluations', 'Triggered', 'Avg Latency', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const as = ACTION_STYLE[r.action]
              const ss = STATUS_STYLE[r.status]
              return (
                <tr key={r.id}
                  className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer"
                  style={{ opacity: r.status === 'disabled' ? 0.6 : 1 }}
                  onClick={() => setSelected(r)}>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-[hsl(var(--text-1))]">{r.name}</p>
                    <p className="text-[10px] font-mono text-[hsl(var(--brand))]">{r.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-[hsl(var(--text-3))]">
                      {TYPE_ICON[r.type]} {r.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 font-bold" style={as}>{as.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] max-w-[120px] truncate">{r.target}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-2))]">{fmt(r.evaluations)}</td>
                  <td className="px-4 py-3 text-xs font-bold" style={{ color: r.triggered > 0 ? as.color : 'hsl(var(--s-ok-tx))' }}>{r.triggered}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.avgLatencyMs > 0 ? `${r.avgLatencyMs}ms` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 font-medium" style={ss}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleStatus(r)} title={r.status === 'active' ? 'Disable' : 'Enable'}
                        className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]">
                        {r.status === 'active'
                          ? <ToggleRight size={18} className="text-[hsl(var(--s-ok-tx))]" />
                          : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => openEdit(r)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]">
                        <PencilSimple size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]">
                        <Trash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-[hsl(var(--text-4))]">
                  No rules match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Side Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]">
                  <PencilSimple size={15} />
                </button>
                <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]">
                  <Trash size={15} />
                </button>
                <button onClick={() => setSelected(null)}>
                  <X size={18} className="text-[hsl(var(--text-4))]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                <span className="text-[11px] px-2 py-0.5 font-bold" style={ACTION_STYLE[selected.action]}>{ACTION_STYLE[selected.action].label}</span>
                <span className="text-[11px] px-2 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-3))] flex items-center gap-1">
                  {TYPE_ICON[selected.type]} {selected.type}
                </span>
              </div>

              <div className="p-3 border border-[hsl(var(--border))] bg-raised">
                <p className="text-xs text-[hsl(var(--text-3))]">{selected.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Evaluations', value: fmt(selected.evaluations) },
                  { label: 'Times Triggered', value: String(selected.triggered) },
                  { label: 'Avg Latency', value: selected.avgLatencyMs > 0 ? `${selected.avgLatencyMs}ms` : '—' },
                  { label: 'Last Triggered', value: fmtTime(selected.lastTriggered) },
                  { label: 'Target', value: selected.target },
                  { label: 'Created By', value: selected.createdBy },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5 border border-[hsl(var(--border))] bg-raised">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wide">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {selected.evaluations > 0 && (
                <div className="p-3 border border-[hsl(var(--border))] bg-raised">
                  <div className="flex justify-between mb-1.5">
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">Trigger Rate</p>
                    <p className="text-xs font-bold" style={{ color: ACTION_STYLE[selected.action].color }}>
                      {((selected.triggered / selected.evaluations) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="w-full h-2 bg-[hsl(var(--border))]">
                    <div className="h-full transition-all" style={{
                      width: `${Math.min((selected.triggered / selected.evaluations) * 100, 100)}%`,
                      background: ACTION_STYLE[selected.action].color,
                    }} />
                  </div>
                </div>
              )}

              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Detection Pattern</p>
                <div className="p-3 border border-[hsl(var(--border))] bg-raised">
                  <p className="text-[11px] font-mono text-[hsl(var(--brand))] break-all">{selected.pattern}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => toggleStatus(selected)}
                className="flex-1 py-2 text-sm font-medium border border-[hsl(var(--border))] hover:bg-raised"
                style={{ color: selected.status === 'active' ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))' }}>
                {selected.status === 'active' ? 'Disable Rule' : 'Enable Rule'}
              </button>
              <button onClick={() => openEdit(selected)} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">
                Edit Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[540px] max-h-[85vh] flex flex-col bg-surface border border-[hsl(var(--border))]" style={{ borderRadius: 0 }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">
                {editTarget ? 'Edit Guardrail Rule' : 'New Guardrail Rule'}
              </h2>
              <button onClick={() => setCreateOpen(false)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide block mb-1">Rule Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. PII Detection & Redaction" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide block mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as RuleType }))} className={selectCls}>
                    {(['Privacy', 'Safety', 'Security', 'Accuracy', 'Governance', 'Rate Limiting'] as RuleType[]).map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide block mb-1">Action on Trigger</label>
                  <select value={form.action} onChange={e => setForm(p => ({ ...p, action: e.target.value as RuleAction }))} className={selectCls}>
                    {(['block', 'warn', 'flag', 'allow'] as RuleAction[]).map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide block mb-1">Target Agents / Systems</label>
                <input value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                  placeholder="e.g. All Agents, LLM Agents, Customer-facing" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide block mb-1">Detection Pattern / Rule</label>
                <input value={form.pattern} onChange={e => setForm(p => ({ ...p, pattern: e.target.value }))}
                  placeholder="Regex, threshold expression, or classifier rule" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Describe what this guardrail does and when it triggers…"
                  className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setCreateOpen(false)}
                className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.name.trim()}
                className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40">
                {editTarget ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete guardrail rule?"
        description={`Permanently delete "${deleteTarget?.name}"? This rule will stop enforcing immediately.`}
        isDestructive
        confirmLabel="Delete Rule"
      />
    </div>
  )
}
