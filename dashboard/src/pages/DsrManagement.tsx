import { useState } from 'react'
import { UserList, MagnifyingGlass, Plus, Eye, Check, X, Clock, Export, Funnel } from '@phosphor-icons/react'
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
}

const SEED: DSRRequest[] = [
  { id: 'DSR-2026-001', type: 'Erasure', subject: 'James Carter', email: 'j.carter@email.com', submittedDate: '2026-04-01', dueDate: '2026-05-01', status: 'In Review', regulation: 'GDPR Art. 17', aiSystemsAffected: ['Credit Scoring Model v2.1', 'Customer Churn Predictor v2.3'], assignee: 'Maria Santos', notes: 'Subject requests deletion of all financial data used in AI profiling.' },
  { id: 'DSR-2026-002', type: 'Access', subject: 'Priya Sharma', email: 'p.sharma@email.com', submittedDate: '2026-03-28', dueDate: '2026-04-27', status: 'Overdue', regulation: 'GDPR Art. 15', aiSystemsAffected: ['Loan Approval Model v3.0'], assignee: 'Marcus Johnson', notes: 'Subject requests full report of data used for loan decision.' },
  { id: 'DSR-2026-003', type: 'Portability', subject: 'Ahmed Osman', email: 'a.osman@email.com', submittedDate: '2026-04-05', dueDate: '2026-05-05', status: 'Pending', regulation: 'GDPR Art. 20', aiSystemsAffected: ['Customer Churn Predictor v2.3'], assignee: 'Unassigned', notes: 'Data export request in machine-readable format.' },
  { id: 'DSR-2026-004', type: 'Rectification', subject: 'Sophie Laurent', email: 's.laurent@email.com', submittedDate: '2026-03-15', dueDate: '2026-04-14', status: 'Completed', regulation: 'GDPR Art. 16', aiSystemsAffected: ['Fraud Detection Engine v4.2'], assignee: 'Maria Santos', notes: 'Income data corrected from $45K to $92K. Model prediction updated.' },
  { id: 'DSR-2026-005', type: 'Objection', subject: 'Lars Eriksson', email: 'l.eriksson@email.com', submittedDate: '2026-04-08', dueDate: '2026-05-08', status: 'In Review', regulation: 'GDPR Art. 21', aiSystemsAffected: ['Credit Scoring Model v2.1'], assignee: 'Sarah Chen', notes: 'Subject objects to automated credit scoring decision.' },
  { id: 'DSR-2026-006', type: 'Restriction', subject: 'Chen Wei', email: 'c.wei@email.com', submittedDate: '2026-03-20', dueDate: '2026-04-19', status: 'Rejected', regulation: 'GDPR Art. 18', aiSystemsAffected: ['Loan Approval Model v3.0'], assignee: 'Marcus Johnson', notes: 'Request rejected — insufficient grounds under Art. 18(1).' },
  { id: 'DSR-2026-007', type: 'Access', subject: 'Isabel Fernandez', email: 'i.fernandez@email.com', submittedDate: '2026-04-09', dueDate: '2026-05-09', status: 'Pending', regulation: 'CCPA § 1798.110', aiSystemsAffected: ['Customer Churn Predictor v2.3', 'Fraud Detection Engine v4.2'], assignee: 'Unassigned', notes: 'CCPA access request for personal information categories.' },
  { id: 'DSR-2026-008', type: 'Erasure', subject: 'David Okafor', email: 'd.okafor@email.com', submittedDate: '2026-04-02', dueDate: '2026-05-02', status: 'Completed', regulation: 'GDPR Art. 17', aiSystemsAffected: ['Credit Scoring Model v2.1'], assignee: 'Maria Santos', notes: 'All training data points removed. Model retrained without subject data.' },
]

const STATUS_STYLE: Record<DSRStatus, { bg: string; color: string }> = {
  Pending: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  'In Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Completed: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Rejected: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Overdue: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
}

const TYPE_STYLE: Record<DSRType, string> = {
  Access: 'hsl(220 90% 56%)',
  Erasure: 'hsl(0 72% 51%)',
  Rectification: 'hsl(142 71% 45%)',
  Portability: 'hsl(280 67% 56%)',
  Objection: 'hsl(25 95% 53%)',
  Restriction: 'hsl(45 93% 47%)',
}

export default function DsrManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [selected, setSelected] = useState<DSRRequest | null>(null)
  const [requests, setRequests] = useState(SEED)
  const [showNew, setShowNew] = useState(false)

  const filtered = requests.filter(r => {
    const matchSearch = r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    const matchType = typeFilter === 'All' || r.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending').length,
    overdue: requests.filter(r => r.status === 'Overdue').length,
    avgDays: 18,
  }

  const handleComplete = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Completed' as DSRStatus } : r))
    setSelected(null)
    toast.success('DSR marked as completed')
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
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Data Subject Request tracking for GDPR, CCPA, and AI-driven automated decision systems</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Export initiated')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> New Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, sub: 'YTD 2026', color: 'hsl(var(--brand))' },
          { label: 'Pending Review', value: stats.pending, sub: 'Awaiting assignment', color: 'hsl(var(--s-in-tx))' },
          { label: 'Overdue', value: stats.overdue, sub: 'Past 30-day deadline', color: 'hsl(var(--destructive))' },
          { label: 'Avg Resolution', value: `${stats.avgDays}d`, sub: 'Target: <30 days', color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search requests…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none"
        >
          {['All', 'Pending', 'In Review', 'Completed', 'Rejected', 'Overdue'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none"
        >
          {['All', 'Access', 'Erasure', 'Rectification', 'Portability', 'Objection', 'Restriction'].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Type', 'Subject', 'Regulation', 'Submitted', 'Due Date', 'Assignee', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const ss = STATUS_STYLE[r.status]
              return (
                <tr key={r.id} className={`border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer ${i % 2 === 0 ? '' : 'bg-[hsl(var(--bg-raised)/0.4)]'}`} onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.id}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={{ background: `${TYPE_STYLE[r.type]}20`, color: TYPE_STYLE[r.type] }}>{r.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[hsl(var(--text-1))]">{r.subject}</p>
                    <p className="text-[11px] text-[hsl(var(--text-4))]">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.regulation}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.submittedDate}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.dueDate}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.assignee}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={ss}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]" onClick={e => { e.stopPropagation(); setSelected(r) }}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No requests match current filters</div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.type} Request — {selected.subject}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Regulation', value: selected.regulation },
                  { label: 'Status', value: selected.status },
                  { label: 'Submitted', value: selected.submittedDate },
                  { label: 'Due Date', value: selected.dueDate },
                  { label: 'Assignee', value: selected.assignee },
                  { label: 'Email', value: selected.email },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm text-[hsl(var(--text-1))] font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">AI Systems Affected</p>
                <div className="space-y-1">
                  {selected.aiSystemsAffected.map(s => (
                    <div key={s} className="flex items-center gap-2 text-sm text-[hsl(var(--text-2))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                      <span className="w-2 h-2 bg-[hsl(var(--brand))] flex-shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.notes}</p>
              </div>
            </div>
            {selected.status !== 'Completed' && selected.status !== 'Rejected' && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button onClick={() => handleComplete(selected.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">
                  <Check size={14} /> Mark Completed
                </button>
                <button onClick={() => { setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'Rejected' as DSRStatus } : r)); setSelected(null); toast.success('Request rejected') }} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
