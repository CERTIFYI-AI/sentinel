import { useState } from 'react'
import { exportCsv } from '@/lib/exportUtils';
import { FlowArrow, Plus, Eye, X, Trash, PencilSimple, Export, CheckCircle, Clock, Warning, MagnifyingGlass, ArrowRight, Pause, Play, User, ClipboardText } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'


type WFStatus = 'Active' | 'Paused' | 'Disabled'
type WFType = 'Model Release' | 'Policy Update' | 'Vendor' | 'Exception' | 'Access Control' | 'Incident' | 'Audit Finding' | 'Risk Acceptance'

interface ApprovalStep {
  order: number
  name: string
  approvers: string[]
  required: number
  sla: string
}

interface PendingApproval {
  id: string
  title: string
  requestedBy: string
  requestedAt: string
  dueAt: string
  currentStep: string
  urgent: boolean
}

interface Workflow {
  id: string
  name: string
  type: WFType
  status: WFStatus
  description: string
  pending: number
  approvers: string
  sla: string
  lastTriggered: string
  totalCompleted: number
  avgCycleTime: string
  steps: ApprovalStep[]
  pendingApprovals: PendingApproval[]
  createdAt: string
  createdBy: string
  requiresMFA: boolean
  escalationHours: number
  notifyOnEscalation: boolean
}

const SEED: Workflow[] = [
  {
    id: 'WF-001', name: 'Model Deployment Approval', type: 'Model Release', status: 'Active', pending: 3,
    approvers: 'Risk + Compliance + Engineering', sla: '48h', lastTriggered: '2026-04-07', totalCompleted: 47, avgCycleTime: '36h',
    description: 'Multi-stage approval for promoting AI models to production. Ensures risk, compliance, and engineering sign-off before any production deployment.',
    requiresMFA: true, escalationHours: 24, notifyOnEscalation: true, createdAt: '2025-09-01', createdBy: 'Sarah Chen',
    steps: [
      { order: 1, name: 'Risk Assessment Sign-off', approvers: ['Michael Torres (Risk)'], required: 1, sla: '24h' },
      { order: 2, name: 'Compliance Review', approvers: ['James Patel (Compliance)'], required: 1, sla: '16h' },
      { order: 3, name: 'Engineering Gate', approvers: ['Lead Engineer', 'CTO'], required: 1, sla: '8h' },
    ],
    pendingApprovals: [
      { id: 'PA-001', title: 'Loan Scoring Model v3.1 → Production', requestedBy: 'Priya Sharma', requestedAt: '2026-04-07 10:00', dueAt: '2026-04-09 10:00', currentStep: 'Step 2: Compliance Review', urgent: true },
      { id: 'PA-002', title: 'Fraud Detection v5.0 → Production', requestedBy: 'Marcus Chen', requestedAt: '2026-04-07 14:30', dueAt: '2026-04-09 14:30', currentStep: 'Step 1: Risk Assessment', urgent: false },
      { id: 'PA-003', title: 'Customer Churn Predictor v2.4 → Production', requestedBy: 'AI Team', requestedAt: '2026-04-08 09:00', dueAt: '2026-04-10 09:00', currentStep: 'Step 3: Engineering Gate', urgent: false },
    ],
  },
  {
    id: 'WF-002', name: 'Policy Change Approval', type: 'Policy Update', status: 'Active', pending: 1,
    approvers: 'Legal + CISO', sla: '72h', lastTriggered: '2026-04-06', totalCompleted: 23, avgCycleTime: '54h',
    description: 'Approval workflow for AI governance policy changes. All modifications to core AI policies require legal and CISO sign-off.',
    requiresMFA: false, escalationHours: 48, notifyOnEscalation: true, createdAt: '2025-09-15', createdBy: 'James Patel',
    steps: [
      { order: 1, name: 'Legal Review', approvers: ['Linda Park (General Counsel)'], required: 1, sla: '48h' },
      { order: 2, name: 'CISO Approval', approvers: ['Sarah Chen (CISO)'], required: 1, sla: '24h' },
    ],
    pendingApprovals: [
      { id: 'PA-004', title: 'AI Bias Testing Policy v2 — Amendment', requestedBy: 'Compliance Team', requestedAt: '2026-04-06 11:00', dueAt: '2026-04-09 11:00', currentStep: 'Step 1: Legal Review', urgent: false },
    ],
  },
  {
    id: 'WF-003', name: 'High-Risk Vendor Onboarding', type: 'Vendor', status: 'Active', pending: 2,
    approvers: 'Procurement + Security + Legal', sla: '5 days', lastTriggered: '2026-04-05', totalCompleted: 12, avgCycleTime: '4.2 days',
    description: 'Due diligence and approval process for onboarding AI vendors classified as high-risk. Includes security assessment, contractual review, and executive sign-off.',
    requiresMFA: false, escalationHours: 72, notifyOnEscalation: true, createdAt: '2025-10-01', createdBy: 'Procurement',
    steps: [
      { order: 1, name: 'Vendor Questionnaire Review', approvers: ['Procurement Team'], required: 1, sla: '48h' },
      { order: 2, name: 'Security Assessment', approvers: ['James Wilson (Security)'], required: 1, sla: '48h' },
      { order: 3, name: 'Legal Contract Review', approvers: ['Legal Counsel'], required: 1, sla: '24h' },
      { order: 4, name: 'Executive Sign-off', approvers: ['CFO', 'CISO'], required: 2, sla: '24h' },
    ],
    pendingApprovals: [
      { id: 'PA-005', title: 'DataBridge AI — High-Risk Vendor Onboarding', requestedBy: 'Procurement', requestedAt: '2026-04-05 09:00', dueAt: '2026-04-10 09:00', currentStep: 'Step 3: Legal Contract Review', urgent: true },
      { id: 'PA-006', title: 'NeuralOps Inc — Integration Partnership', requestedBy: 'Engineering', requestedAt: '2026-04-05 14:00', dueAt: '2026-04-10 14:00', currentStep: 'Step 2: Security Assessment', urgent: false },
    ],
  },
  {
    id: 'WF-004', name: 'Exception Request', type: 'Exception', status: 'Active', pending: 0,
    approvers: 'Risk Manager + CISO', sla: '24h', lastTriggered: '2026-04-03', totalCompleted: 34, avgCycleTime: '18h',
    description: 'Fast-track workflow for control exceptions. Allows teams to request temporary policy exceptions with time-bounded approval.',
    requiresMFA: false, escalationHours: 12, notifyOnEscalation: true, createdAt: '2025-11-01', createdBy: 'Michael Torres',
    steps: [
      { order: 1, name: 'Risk Manager Review', approvers: ['Michael Torres (Risk)'], required: 1, sla: '12h' },
      { order: 2, name: 'CISO Final Approval', approvers: ['Sarah Chen (CISO)'], required: 1, sla: '12h' },
    ],
    pendingApprovals: [],
  },
  {
    id: 'WF-005', name: 'Data Access Escalation', type: 'Access Control', status: 'Paused', pending: 0,
    approvers: 'Data Owner + Privacy Officer', sla: '24h', lastTriggered: '2026-03-28', totalCompleted: 8, avgCycleTime: '12h',
    description: 'Elevated access requests for sensitive training data and production AI pipelines. Paused for workflow redesign.',
    requiresMFA: true, escalationHours: 8, notifyOnEscalation: true, createdAt: '2025-12-01', createdBy: 'Data Team',
    steps: [
      { order: 1, name: 'Data Owner Approval', approvers: ['Data Owner'], required: 1, sla: '12h' },
      { order: 2, name: 'Privacy Officer Sign-off', approvers: ['Maria Santos (DPO)'], required: 1, sla: '12h' },
    ],
    pendingApprovals: [],
  },
  {
    id: 'WF-006', name: 'Incident Severity Upgrade', type: 'Incident', status: 'Active', pending: 1,
    approvers: 'Incident Commander + VP Eng', sla: '4h', lastTriggered: '2026-04-08', totalCompleted: 19, avgCycleTime: '2.8h',
    description: 'Emergency approval workflow for upgrading incident severity. Activates exec escalation chain and regulatory notification process.',
    requiresMFA: true, escalationHours: 2, notifyOnEscalation: true, createdAt: '2025-09-20', createdBy: 'CISO Office',
    steps: [
      { order: 1, name: 'Incident Commander Declaration', approvers: ['Incident Commander'], required: 1, sla: '1h' },
      { order: 2, name: 'VP Engineering Concurrence', approvers: ['VP Engineering'], required: 1, sla: '1h' },
      { order: 3, name: 'CISO Executive Notification', approvers: ['Sarah Chen (CISO)'], required: 1, sla: '2h' },
    ],
    pendingApprovals: [
      { id: 'PA-007', title: 'INC-2026-047 Severity Upgrade: P3 → P1', requestedBy: 'On-call Engineer', requestedAt: '2026-04-08 03:15', dueAt: '2026-04-08 07:15', currentStep: 'Step 1: Incident Commander', urgent: true },
    ],
  },
]

const BLANK: Omit<Workflow, 'id' | 'totalCompleted' | 'avgCycleTime' | 'steps' | 'pendingApprovals' | 'createdAt'> = {
  name: '', type: 'Model Release', status: 'Active', pending: 0,
  approvers: '', sla: '48h', lastTriggered: '', description: '',
  createdBy: 'Sarah Chen', requiresMFA: false, escalationHours: 24, notifyOnEscalation: true,
}

const STATUS_STYLE: Record<WFStatus, { bg: string; color: string }> = {
  Active: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Paused: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Disabled: { bg: 'hsl(0 0% 50% / 0.10)', color: 'hsl(var(--text-4))' },
}

const TYPE_COLOR: Record<WFType, string> = {
  'Model Release': 'hsl(var(--brand))',
  'Policy Update': '#a855f7',
  Vendor: 'hsl(var(--r-hi-tx))',
  Exception: 'hsl(var(--s-er-tx))',
  'Access Control': 'hsl(var(--s-in-tx))',
  Incident: 'hsl(var(--s-er-tx))',
  'Audit Finding': '#eab308',
  'Risk Acceptance': 'hsl(var(--r-hi-tx))',
}

export default function ApprovalWorkflows() {
  const [records, setRecords] = useState<Workflow[]>(SEED)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Workflow | null>(null)
  const [form, setForm] = useState<typeof BLANK>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null)
  const [approveTarget, setApproveTarget] = useState<{ wf: Workflow; pa: PendingApproval } | null>(null)

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const ms = r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    return ms && (statusFilter === 'All' || r.status === statusFilter)
  })

  const totalPending = records.reduce((s, r) => s + r.pending, 0)
  const stats = {
    total: records.length,
    active: records.filter(r => r.status === 'Active').length,
    pending: totalPending,
    avgCycle: '28h',
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setFormOpen(true)
  }

  function openEdit(r: Workflow, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditing(r)
    setForm({ name: r.name, type: r.type, status: r.status, pending: r.pending, approvers: r.approvers, sla: r.sla, lastTriggered: r.lastTriggered, description: r.description, createdBy: r.createdBy, requiresMFA: r.requiresMFA, escalationHours: r.escalationHours, notifyOnEscalation: r.notifyOnEscalation })
    setFormOpen(true)
    setSelected(null)
  }

  function saveForm() {
    if (!form.name.trim()) { toast.error('Workflow name is required.'); return }
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r))
      toast.success('Workflow updated')
    } else {
      const newW: Workflow = { ...form, id: `WF-${String(records.length + 1).padStart(3, '0')}`, totalCompleted: 0, avgCycleTime: '—', steps: [], pendingApprovals: [], createdAt: new Date().toISOString().slice(0, 10) }
      setRecords(prev => [newW, ...prev])
      toast.success('Workflow created')
    }
    setFormOpen(false)
  }

  function toggleStatus(r: Workflow, e: React.MouseEvent) {
    e.stopPropagation()
    const next: WFStatus = r.status === 'Active' ? 'Paused' : 'Active'
    setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: next } : x))
    toast.success(`Workflow ${next === 'Active' ? 'resumed' : 'paused'}`)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast.success(`Workflow ${deleteTarget.id} deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
  }

  function approvePA() {
    if (!approveTarget) return
    const { wf, pa } = approveTarget
    setRecords(prev => prev.map(r => r.id === wf.id ? {
      ...r,
      pending: Math.max(0, r.pending - 1),
      pendingApprovals: r.pendingApprovals.filter(p => p.id !== pa.id),
      totalCompleted: r.totalCompleted + 1,
    } : r))
    if (selected?.id === wf.id) {
      setSelected(prev => prev ? { ...prev, pending: Math.max(0, prev.pending - 1), pendingApprovals: prev.pendingApprovals.filter(p => p.id !== pa.id) } : prev)
    }
    toast.success(`Approved: ${pa.title}`)
    setApproveTarget(null)
  }

  const sf = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <FlowArrow size={20} className="text-[hsl(var(--brand))]" />
            Approval Workflows
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Manage multi-stage approval pipelines for governance actions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCsv(filtered as any, 'approval-workflows.csv')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
            <Export size={14} /> Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90">
            <Plus size={14} /> New Workflow
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: stats.active, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Pending Approvals', value: stats.pending, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Avg Cycle Time', value: stats.avgCycle, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Approvals Banner */}
      {totalPending > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border border-[hsl(var(--s-wn-bg))] bg-[hsl(var(--s-wn-bg))] rounded">
          <Clock size={16} className="text-[hsl(var(--s-wn-tx))] flex-shrink-0" />
          <p className="text-sm text-[hsl(var(--text-2))]">
            <span className="font-semibold text-[hsl(var(--s-wn-tx))]">{totalPending} approval(s) pending</span> — review and action items below each workflow.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 border border-[hsl(var(--border))] bg-surface px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Active', 'Paused', 'Disabled'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Workflow Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-[hsl(var(--text-4))]">No workflows found.</div>
        )}
        {filtered.map(r => {
          const ss = STATUS_STYLE[r.status] || { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }
          return (
            <div key={r.id} className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-raised" onClick={() => setSelected(r)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: TYPE_COLOR[r.type] }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-[hsl(var(--text-4))]">{r.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{r.type}</span>
                      <span className="text-[11px] px-2 py-0.5 font-medium" style={ss}>{r.status}</span>
                      {r.pending > 0 && <span className="text-[10px] px-1.5 py-0.5 font-semibold text-[hsl(var(--bg-surface))]" style={{ background: 'hsl(var(--s-wn-tx))' }}>{r.pending} pending</span>}
                    </div>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))] truncate">{r.name}</p>
                    <p className="text-xs text-[hsl(var(--text-4))]">Approvers: {r.approvers} · SLA: {r.sla} · Completed: {r.totalCompleted}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={e => toggleStatus(r, e)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">
                    {r.status === 'Active' ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Resume</>}
                  </button>
                  <button onClick={e => openEdit(r, e)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><PencilSimple size={14} /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(r) }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={14} /></button>
                  <ArrowRight size={14} className="text-[hsl(var(--text-4))]" />
                </div>
              </div>

              {/* Pending Approvals Inline */}
              {r.pendingApprovals.length > 0 && (
                <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--s-wn-bg))]">
                  {r.pendingApprovals.map(pa => (
                    <div key={pa.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))] last:border-b-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {pa.urgent && <Warning size={13} className="text-[hsl(var(--destructive))] flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[hsl(var(--text-2))] truncate">{pa.title}</p>
                          <p className="text-[10px] text-[hsl(var(--text-4))]">{pa.currentStep} · By: {pa.requestedBy} · Due: {pa.dueAt}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setApproveTarget({ wf: r, pa })}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90 flex-shrink-0 ml-3"
                      >
                        <CheckCircle size={11} /> Approve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-[600px] h-full bg-surface border-l border-[hsl(var(--border))] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status] || { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{selected.status}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{selected.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => openEdit(selected, e)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised"><PencilSimple size={12} /> Edit</button>
                <button onClick={() => setSelected(null)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              <p className="text-sm text-[hsl(var(--text-3))]">{selected.description}</p>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'SLA', value: selected.sla },
                  { label: 'Avg Cycle Time', value: selected.avgCycleTime },
                  { label: 'Completed', value: selected.totalCompleted },
                ].map(s => (
                  <div key={s.label} className="p-3 border border-[hsl(var(--border))] text-center">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">{s.label}</p>
                    <p className="text-lg font-bold text-[hsl(var(--text-1))]">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Config */}
              <div className="grid grid-cols-2 gap-3 p-4 border border-[hsl(var(--border))] rounded">
                <InfoRow label="MFA Required" value={selected.requiresMFA ? 'Yes' : 'No'} />
                <InfoRow label="Escalation After" value={`${selected.escalationHours}h`} />
                <InfoRow label="Created By" value={selected.createdBy} />
                <InfoRow label="Created At" value={selected.createdAt} />
                <InfoRow label="Last Triggered" value={selected.lastTriggered || '—'} />
              </div>

              {/* Steps */}
              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider mb-2">Approval Steps ({selected.steps.length})</p>
                {selected.steps.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))]">No steps configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.steps.map(step => (
                      <div key={step.order} className="flex items-center gap-3 p-3 border border-[hsl(var(--border))]">
                        <div className="w-6 h-6 rounded-full bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] flex items-center justify-center text-xs font-bold flex-shrink-0">{step.order}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--text-1))]">{step.name}</p>
                          <p className="text-xs text-[hsl(var(--text-4))]">{step.approvers.join(' · ')} — {step.required} of {step.approvers.length} required · SLA: {step.sla}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending */}
              <div>
                <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider mb-2">Pending Approvals ({selected.pendingApprovals.length})</p>
                {selected.pendingApprovals.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))]">No pending approvals.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.pendingApprovals.map(pa => (
                      <div key={pa.id} className="p-3 border border-[hsl(var(--border))] flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{pa.id}</span>
                            {pa.urgent && <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }}>Urgent</span>}
                          </div>
                          <p className="text-sm font-medium text-[hsl(var(--text-1))]">{pa.title}</p>
                          <p className="text-xs text-[hsl(var(--text-4))]">{pa.currentStep} · {pa.requestedBy} · Due: {pa.dueAt}</p>
                        </div>
                        <button onClick={() => setApproveTarget({ wf: selected, pa })} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90 flex-shrink-0">
                          <CheckCircle size={11} /> Approve
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFormOpen(false)} />
          <div className="relative w-[520px] max-h-[80vh] overflow-y-auto bg-surface border border-[hsl(var(--border))] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{editing ? 'Edit Workflow' : 'New Approval Workflow'}</h2>
              <button onClick={() => setFormOpen(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Workflow Name *" colSpan>
                  <input value={form.name} onChange={e => sf('name', e.target.value)} className={INPUT_CLS} placeholder="e.g. Model Deployment Approval" />
                </Field>
                <Field label="Type">
                  <select value={form.type} onChange={e => sf('type', e.target.value as WFType)} className={INPUT_CLS}>
                    {['Model Release', 'Policy Update', 'Vendor', 'Exception', 'Access Control', 'Incident', 'Audit Finding', 'Risk Acceptance'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => sf('status', e.target.value as WFStatus)} className={INPUT_CLS}>
                    {['Active', 'Paused', 'Disabled'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="SLA">
                  <input value={form.sla} onChange={e => sf('sla', e.target.value)} className={INPUT_CLS} placeholder="e.g. 48h" />
                </Field>
                <Field label="Approvers (summary)" colSpan>
                  <input value={form.approvers} onChange={e => sf('approvers', e.target.value)} className={INPUT_CLS} placeholder="e.g. Risk + Compliance + CISO" />
                </Field>
                <Field label="Escalation After (hours)">
                  <input type="number" value={form.escalationHours} onChange={e => sf('escalationHours', +e.target.value)} className={INPUT_CLS} min={1} />
                </Field>
                <Field label="Created By">
                  <input value={form.createdBy} onChange={e => sf('createdBy', e.target.value)} className={INPUT_CLS} placeholder="e.g. Sarah Chen" />
                </Field>
              </div>
              <Field label="Description" colSpan>
                <textarea value={form.description} onChange={e => sf('description', e.target.value)} rows={3} className={INPUT_CLS + ' resize-none'} placeholder="Describe the purpose of this approval workflow…" />
              </Field>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))]">
                  <input type="checkbox" checked={form.requiresMFA} onChange={e => sf('requiresMFA', e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
                  Require MFA for approvals
                </label>
                <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))]">
                  <input type="checkbox" checked={form.notifyOnEscalation} onChange={e => sf('notifyOnEscalation', e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
                  Notify on escalation
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] bg-[hsl(var(--brand))] hover:opacity-90">{editing ? 'Save Changes' : 'Create Workflow'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!approveTarget}
        title="Approve Request"
        description={`Approve "${approveTarget?.pa.title}"? This action will advance the item to the next stage.`}
        confirmLabel="Approve"
        
        onConfirm={approvePA}
        onClose={() => setApproveTarget(null)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Workflow"
        description={`Delete "${deleteTarget?.name}"? This will remove all configuration and pending approvals. This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

const INPUT_CLS = 'w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]'

function Field({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[hsl(var(--text-1))] font-medium mt-0.5">{value}</p>
    </div>
  )
}
