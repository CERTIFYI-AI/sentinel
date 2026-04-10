import { useState } from 'react'
import { UserList, MagnifyingGlass, Plus, Eye, X, Export, Funnel, Pencil, Trash, Clock, CheckCircle, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

type DSRType = 'Access' | 'Erasure' | 'Rectification' | 'Portability' | 'Objection' | 'Restriction'
type DSRStatus = 'Pending' | 'In Review' | 'Completed' | 'Rejected' | 'Overdue'

interface DSRRequest {
  id: string
  type: DSRType
  subject: string
  email: string
  submittedDate: string
  dueDate: string
  status: DSRStatus
  regulation: string
  aiSystemsAffected: string[]
  assignee: string
  notes: string
  priority: 'High' | 'Medium' | 'Low'
  daysRemaining: number
}

const SEED: DSRRequest[] = [
  { id: 'DSR-2026-001', type: 'Erasure', subject: 'James Carter', email: 'j.carter@email.com', submittedDate: '2026-04-01', dueDate: '2026-05-01', status: 'In Review', regulation: 'GDPR Art. 17', aiSystemsAffected: ['Credit Scoring Model v2.1', 'Customer Churn Predictor v2.3'], assignee: 'Maria Santos', notes: 'Subject requests deletion of all financial data used in AI profiling. Legal hold check required.', priority: 'High', daysRemaining: 21 },
  { id: 'DSR-2026-002', type: 'Access', subject: 'Priya Sharma', email: 'p.sharma@email.com', submittedDate: '2026-03-28', dueDate: '2026-04-27', status: 'Overdue', regulation: 'GDPR Art. 15', aiSystemsAffected: ['Loan Approval Model v3.0'], assignee: 'Marcus Johnson', notes: 'Subject requests full report of data used for loan decision. 30-day deadline breached.', priority: 'High', daysRemaining: -3 },
  { id: 'DSR-2026-003', type: 'Portability', subject: 'Ahmed Osman', email: 'a.osman@email.com', submittedDate: '2026-04-05', dueDate: '2026-05-05', status: 'Pending', regulation: 'GDPR Art. 20', aiSystemsAffected: ['Customer Churn Predictor v2.3'], assignee: 'Unassigned', notes: 'Data export request in machine-readable format (JSON/CSV).', priority: 'Medium', daysRemaining: 25 },
  { id: 'DSR-2026-004', type: 'Rectification', subject: 'Sophie Laurent', email: 's.laurent@email.com', submittedDate: '2026-03-15', dueDate: '2026-04-14', status: 'Completed', regulation: 'GDPR Art. 16', aiSystemsAffected: ['Fraud Detection Engine v4.2'], assignee: 'Maria Santos', notes: 'Income data corrected from $45K to $92K. Model prediction updated accordingly.', priority: 'Medium', daysRemaining: 0 },
  { id: 'DSR-2026-005', type: 'Objection', subject: 'Lars Eriksson', email: 'l.eriksson@email.com', submittedDate: '2026-04-08', dueDate: '2026-05-08', status: 'In Review', regulation: 'GDPR Art. 21', aiSystemsAffected: ['Credit Scoring Model v2.1'], assignee: 'Sarah Chen', notes: 'Subject objects to automated credit scoring decision. DPIA review triggered.', priority: 'High', daysRemaining: 28 },
  { id: 'DSR-2026-006', type: 'Restriction', subject: 'Chen Wei', email: 'c.wei@email.com', submittedDate: '2026-03-20', dueDate: '2026-04-19', status: 'Rejected', regulation: 'GDPR Art. 18', aiSystemsAffected: ['Loan Approval Model v3.0'], assignee: 'Marcus Johnson', notes: 'Request rejected — insufficient grounds under Art. 18(1). Rejection notice sent with appeal rights.', priority: 'Low', daysRemaining: 0 },
  { id: 'DSR-2026-007', type: 'Access', subject: 'Isabel Fernandez', email: 'i.fernandez@email.com', submittedDate: '2026-04-09', dueDate: '2026-05-09', status: 'Pending', regulation: 'CCPA § 1798.110', aiSystemsAffected: ['Customer Churn Predictor v2.3', 'Fraud Detection Engine v4.2'], assignee: 'Unassigned', notes: 'CCPA access request for personal information categories and purposes.', priority: 'Medium', daysRemaining: 29 },
  { id: 'DSR-2026-008', type: 'Erasure', subject: 'David Okafor', email: 'd.okafor@email.com', submittedDate: '2026-04-02', dueDate: '2026-05-02', status: 'Completed', regulation: 'GDPR Art. 17', aiSystemsAffected: ['Credit Scoring Model v2.1'], assignee: 'Maria Santos', notes: 'All training data points removed. Model retrained without subject data. Verified by DPO.', priority: 'High', daysRemaining: 0 },
  { id: 'DSR-2026-009', type: 'Portability', subject: 'Mei Nakamura', email: 'm.nakamura@email.com', submittedDate: '2026-04-10', dueDate: '2026-05-10', status: 'Pending', regulation: 'GDPR Art. 20', aiSystemsAffected: ['Fraud Detection Engine v4.2', 'Loan Approval Model v3.0'], assignee: 'Unassigned', notes: 'Request to transfer data to competitor fintech. Format: FAPI-compliant JSON.', priority: 'Medium', daysRemaining: 30 },
  { id: 'DSR-2026-010', type: 'Access', subject: 'Olumide Adeyemi', email: 'o.adeyemi@email.com', submittedDate: '2026-03-25', dueDate: '2026-04-24', status: 'In Review', regulation: 'GDPR Art. 15', aiSystemsAffected: ['Credit Scoring Model v2.1', 'Loan Approval Model v3.0', 'Customer Churn Predictor v2.3'], assignee: 'Sarah Chen', notes: 'Subject received adverse AI decision on mortgage application. Requests full data profile and model explanation.', priority: 'High', daysRemaining: 14 },
  { id: 'DSR-2026-011', type: 'Objection', subject: 'Fatima Al-Rashid', email: 'f.alrashid@email.com', submittedDate: '2026-04-07', dueDate: '2026-05-07', status: 'Pending', regulation: 'EU AI Act Art. 14', aiSystemsAffected: ['Credit Scoring Model v2.1'], assignee: 'Unassigned', notes: 'Subject invokes right to human review of automated decision under EU AI Act. Escalated to underwriting team.', priority: 'High', daysRemaining: 27 },
  { id: 'DSR-2026-012', type: 'Erasure', subject: 'Carlos Mendez', email: 'c.mendez@email.com', submittedDate: '2026-03-10', dueDate: '2026-04-09', status: 'Overdue', regulation: 'CCPA § 1798.105', aiSystemsAffected: ['Fraud Detection Engine v4.2', 'Customer Churn Predictor v2.3'], assignee: 'Marcus Johnson', notes: 'California deletion request. Backup systems check pending. Legal counsel reviewing third-party data sharing agreements.', priority: 'High', daysRemaining: -1 },
]

const BLANK: Omit<DSRRequest, 'id'> = {
  type: 'Access', subject: '', email: '', submittedDate: '', dueDate: '',
  status: 'Pending', regulation: 'GDPR Art. 15', aiSystemsAffected: [],
  assignee: 'Unassigned', notes: '', priority: 'Medium', daysRemaining: 30,
}

const STATUS_STYLE: Record<DSRStatus, { bg: string; color: string }> = {
  Pending: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  'In Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Completed: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Rejected: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Overdue: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
}
const TYPE_COLOR: Record<DSRType, string> = {
  Access: '#3b82f6', Erasure: '#ef4444', Rectification: '#22c55e',
  Portability: '#a855f7', Objection: '#f97316', Restriction: '#eab308',
}
const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  High: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
  Medium: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(45 85% 40%)' },
  Low: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
}

export default function DsrManagement() {
  const [records, setRecords] = useState<DSRRequest[]>(SEED)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selected, setSelected] = useState<DSRRequest | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Omit<DSRRequest, 'id'>>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = records.filter(r => {
    const ms = r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    const ss = statusFilter === 'All' || r.status === statusFilter
    const ts = typeFilter === 'All' || r.type === typeFilter
    return ms && ss && ts
  })

  const stats = {
    total: records.length,
    overdue: records.filter(r => r.status === 'Overdue').length,
    pending: records.filter(r => r.status === 'Pending').length,
    completed: records.filter(r => r.status === 'Completed').length,
  }

  const nextId = () => `DSR-2026-${String(records.length + 1).padStart(3, '0')}`

  const handleCreate = () => {
    if (!form.subject || !form.email) { toast.error('Subject name and email are required'); return }
    const newRec = { ...form, id: nextId() }
    setRecords(p => [newRec, ...p])
    setShowCreate(false)
    setForm(BLANK)
    toast.success(`DSR ${newRec.id} created`, { description: `${form.type} request for ${form.subject}` })
  }

  const handleEdit = () => {
    if (!selected) return
    setRecords(p => p.map(r => r.id === selected.id ? { ...r, ...form } : r))
    setSelected(prev => prev ? { ...prev, ...form } : null)
    setEditMode(false)
    toast.success('DSR request updated')
  }

  const handleDelete = (id: string) => {
    setRecords(p => p.filter(r => r.id !== id))
    setDeleteTarget(null)
    if (selected?.id === id) setSelected(null)
    toast.success('DSR request deleted')
  }

  const openEdit = (r: DSRRequest) => {
    setForm({ type: r.type, subject: r.subject, email: r.email, submittedDate: r.submittedDate,
      dueDate: r.dueDate, status: r.status, regulation: r.regulation,
      aiSystemsAffected: r.aiSystemsAffected, assignee: r.assignee, notes: r.notes,
      priority: r.priority, daysRemaining: r.daysRemaining })
    setEditMode(true)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <UserList size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            DSR / Rights Management
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Data Subject Request tracking — GDPR, CCPA, EU AI Act Art. 14 rights management with AI system impact mapping</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('DSR report exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => { setForm(BLANK); setShowCreate(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} weight="bold" /> New DSR
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, sub: 'All time', color: 'hsl(var(--brand))' },
          { label: 'Overdue', value: stats.overdue, sub: 'Breach of SLA', color: 'hsl(var(--destructive))' },
          { label: 'Pending / In Review', value: stats.pending + records.filter(r => r.status === 'In Review').length, sub: 'Require action', color: 'hsl(45 85% 40%)' },
          { label: 'Completed', value: stats.completed, sub: 'This quarter', color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-xs text-[hsl(var(--text-4))]">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject, email, or ID…"
            className="w-full pl-8 pr-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm text-[hsl(var(--text-2))] outline-none">
          {['All', 'Pending', 'In Review', 'Completed', 'Rejected', 'Overdue'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm text-[hsl(var(--text-2))] outline-none">
          {['All', 'Access', 'Erasure', 'Rectification', 'Portability', 'Objection', 'Restriction'].map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} request{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['Request ID', 'Subject', 'Type', 'Regulation', 'AI Systems', 'Status', 'Due Date', 'Assignee', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-[hsl(var(--brand))] font-medium">{r.id}</span>
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-[hsl(var(--text-1))]">{r.subject}</p>
                  <p className="text-xs text-[hsl(var(--text-4))]">{r.email}</p>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: TYPE_COLOR[r.type] }}>{r.type}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.regulation}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.aiSystemsAffected.length} system{r.aiSystemsAffected.length !== 1 ? 's' : ''}</td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded text-xs font-medium" style={STATUS_STYLE[r.status]}>{r.status}</span>
                </td>
                <td className="px-3 py-2.5">
                  <p className={`text-xs font-medium ${r.daysRemaining < 0 ? 'text-[hsl(var(--destructive))]' : r.daysRemaining <= 7 ? 'text-[hsl(45_85%_40%)]' : 'text-[hsl(var(--text-2))]'}`}>
                    {r.dueDate}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--text-4))]">{r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : r.daysRemaining === 0 ? 'Completed' : `${r.daysRemaining}d left`}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.assignee}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelected(r); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))]"><Eye size={13} /></button>
                    <button onClick={() => { setSelected(r); openEdit(r) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))]"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(r.id)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(0_72%_51%/0.08)]"><Trash size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-[hsl(var(--text-4))]">No DSR requests match the current filters</div>
        )}
      </div>

      {/* Detail Slide-over */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelected(null); setEditMode(false) }} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] h-full overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--bg-surface))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.type} Request — {selected.subject}</h2>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && <button onClick={() => openEdit(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>}
                <button onClick={() => { setSelected(null); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={15} /></button>
              </div>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {!editMode ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: TYPE_COLOR[selected.type] }}>{selected.type}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={PRIORITY_STYLE[selected.priority]}>{selected.priority} Priority</span>
                  </div>

                  {[
                    { label: 'Subject', value: `${selected.subject} (${selected.email})` },
                    { label: 'Regulation', value: selected.regulation },
                    { label: 'Submitted', value: selected.submittedDate },
                    { label: 'Due Date', value: selected.dueDate },
                    { label: 'Assignee', value: selected.assignee },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{f.label}</p>
                      <p className="text-sm text-[hsl(var(--text-1))]">{f.value}</p>
                    </div>
                  ))}

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">AI Systems Affected</p>
                    <div className="space-y-1">
                      {selected.aiSystemsAffected.map(s => (
                        <div key={s} className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-2))]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))]" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Case Notes</p>
                    <p className="text-sm text-[hsl(var(--text-2))] bg-[hsl(var(--bg-raised))] p-3 rounded">{selected.notes}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <button onClick={() => {
                      setRecords(p => p.map(r => r.id === selected.id ? { ...r, status: 'Completed' } : r))
                      setSelected(prev => prev ? { ...prev, status: 'Completed' } : null)
                      toast.success('DSR marked as completed')
                    }} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm">
                      <CheckCircle size={13} /> Mark Complete
                    </button>
                    <button onClick={() => setDeleteTarget(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]">
                      <Trash size={13} /> Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">Edit DSR Request</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Subject Name', key: 'subject', type: 'text' },
                      { label: 'Email', key: 'email', type: 'email' },
                      { label: 'Due Date', key: 'dueDate', type: 'date' },
                      { label: 'Assignee', key: 'assignee', type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-[hsl(var(--text-4))]">{f.label}</label>
                        <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Status</label>
                      <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as DSRStatus }))}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                        {['Pending', 'In Review', 'Completed', 'Rejected', 'Overdue'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Notes</label>
                      <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={4}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm">Save Changes</button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="font-semibold text-[hsl(var(--text-1))]">New Data Subject Request</h2>
              <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Subject Name *</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Full name"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="subject@email.com"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Request Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as DSRType }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Access', 'Erasure', 'Rectification', 'Portability', 'Objection', 'Restriction'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Regulation</label>
                  <select value={form.regulation} onChange={e => setForm(p => ({ ...p, regulation: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['GDPR Art. 15', 'GDPR Art. 16', 'GDPR Art. 17', 'GDPR Art. 20', 'GDPR Art. 21', 'GDPR Art. 18', 'CCPA § 1798.110', 'CCPA § 1798.105', 'EU AI Act Art. 14'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as any }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Assignee</label>
                <select value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                  {['Unassigned', 'Maria Santos', 'Sarah Chen', 'Marcus Johnson', 'James Liu'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Describe the request and any relevant context…"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium">Create DSR</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded w-full max-w-sm p-6 text-center shadow-xl">
            <Warning size={32} className="mx-auto text-[hsl(var(--destructive))] mb-3" />
            <h3 className="font-semibold text-[hsl(var(--text-1))] mb-1">Delete DSR Request?</h3>
            <p className="text-sm text-[hsl(var(--text-3))] mb-4">This action cannot be undone. The request record will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 bg-[hsl(var(--destructive))] text-white text-sm">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
