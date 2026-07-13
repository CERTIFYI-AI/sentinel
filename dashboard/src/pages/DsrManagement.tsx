import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { UserList, MagnifyingGlass, Plus, Eye, X, Export, Funnel, Pencil, Trash, Clock, CheckCircle, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useDsrRequestsData } from '@/hooks/useDsrRequestsData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow'
import { StatusPill } from '@/components/ui/StatusPill'
import { RiskBadge } from '@/components/ui/RiskBadge'

// Supabase-wired — no mock data

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

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


const BLANK: Omit<DSRRequest, 'id'> = {
  type: 'Access', subject: '', email: '', submittedDate: '', dueDate: '',
  status: 'Pending', regulation: 'GDPR Art. 15', aiSystemsAffected: [],
  assignee: 'Unassigned', notes: '', priority: 'Medium', daysRemaining: 30,
}

const STATUS_STYLE: Record<DSRStatus, { bg: string; color: string }> = {
  Pending: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  'In Review': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Completed: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Rejected: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  Overdue: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
}
const TYPE_TOKEN: Record<DSRType, { bg: string; tx: string; br: string }> = {
  Access:        { bg: 'hsl(var(--s-in-bg))', tx: 'hsl(var(--s-in-tx))', br: 'hsl(var(--s-in-br))' },
  Erasure:       { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', br: 'hsl(var(--s-er-br))' },
  Rectification: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', br: 'hsl(var(--s-ok-br))' },
  Portability:   { bg: 'hsl(var(--tag-purple-bg))', tx: 'hsl(var(--tag-purple))', br: 'hsl(var(--tag-purple-border))' },
  Objection:     { bg: 'hsl(var(--r-hi-bg))', tx: 'hsl(var(--r-hi-tx))', br: 'hsl(var(--r-hi-br))' },
  Restriction:   { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))', br: 'hsl(var(--s-wn-br))' },
}
const TYPE_FALLBACK = { bg: 'hsl(var(--bg-raised))', tx: 'hsl(var(--text-3))', br: 'hsl(var(--border))' }
const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  High: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
}

export default function DsrManagement() {
  const { items: records, isLoading, saveDsrRequests, removeDsrRequests } = useDsrRequestsData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [selected, setSelected] = useState<DSRRequest | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'ai-impact' | 'sla' | 'actions'>('overview')
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Omit<DSRRequest, 'id'>>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  if (isLoading) return <PageSkeleton />

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

  const handleCreate = async () => {
    if (!form.subject || !form.email || !form.type) { toast.error('Fill required fields'); return }
    await saveDsrRequests({ ...form })
    setShowCreate(false); setForm(BLANK)
  }

  const handleEdit = async () => {
    if (!selected) return
    await saveDsrRequests({ ...selected, ...form })
    setSelected(prev => prev ? { ...prev, ...form } : null)
    setEditMode(false)
    toast.success('DSR request updated')
  }

  const handleDelete = async (id: string) => {
    await removeDsrRequests(id)
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

  const statCards: StatCardRowItem[] = [
    { label: 'Total Requests', value: stats.total, description: 'All time', icon: <UserList size={14} weight="fill" /> },
    { label: 'Overdue', value: stats.overdue, description: 'SLA breach', variant: stats.overdue > 0 ? 'danger' : 'default', icon: <Warning size={14} weight="fill" /> },
    { label: 'Pending / In Review', value: stats.pending + records.filter(r => r.status === 'In Review').length, description: 'Require action', variant: 'warning', icon: <Clock size={14} weight="fill" /> },
    { label: 'Completed', value: stats.completed, description: 'This quarter', variant: 'success', icon: <CheckCircle size={14} weight="fill" /> },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <PageHeader
        title="DSR / Rights Management"
        subtitle="GDPR, CCPA, EU AI Act Art. 14 rights management with AI system impact mapping"
        icon={UserList}
        actions={
          <div className="flex gap-2">
            <button onClick={() => exportCsv(records, 'dsr-requests.csv')} className="flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--border))] text-xs text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
              <Export size={13} /> Export
            </button>
            <button onClick={() => { setForm(BLANK); setShowCreate(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-xs hover:bg-[hsl(var(--brand-hover))]">
              <Plus size={13} weight="bold" /> New DSR
            </button>
          </div>
        }
      />

      {/* Stats */}
      <StatCardRow cards={statCards} />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject, email, or ID…"
            className="w-full pl-7 pr-2 py-1.5 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-xs text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['All', 'Pending', 'In Review', 'Completed', 'Rejected', 'Overdue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['All', 'Access', 'Erasure', 'Rectification', 'Portability', 'Objection', 'Restriction'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-[10px] font-mono text-[hsl(var(--text-4))]">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['Request ID', 'Subject', 'Type', 'Regulation', 'AI Systems', 'Status', 'Priority', 'Due Date', 'Assignee', ''].map(h => (
                <th key={h} className="text-left px-2.5 py-2 text-[10px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const tt = TYPE_TOKEN[r.type as DSRType] || TYPE_FALLBACK
              return (
              <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] transition-colors">
                <td className="px-2.5 py-1.5">
                  <span className="font-mono text-[11px] text-[hsl(var(--brand))] font-medium">{r.id}</span>
                </td>
                <td className="px-2.5 py-1.5">
                  <p className="font-medium text-[hsl(var(--text-1))] text-xs">{r.subject}</p>
                  <p className="text-[10px] text-[hsl(var(--text-4))] font-mono">{r.email}</p>
                </td>
                <td className="px-2.5 py-1.5">
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold border" style={{ background: tt.bg, color: tt.tx, borderColor: tt.br }}>{r.type}</span>
                </td>
                <td className="px-2.5 py-1.5 text-[10px] text-[hsl(var(--text-3))] font-mono">{r.regulation}</td>
                <td className="px-2.5 py-1.5 text-[10px] text-[hsl(var(--text-3))] font-mono">{r.aiSystemsAffected.length}</td>
                <td className="px-2.5 py-1.5">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-2.5 py-1.5">
                  <RiskBadge level={r.priority === 'High' ? 'HIGH' : r.priority === 'Medium' ? 'MEDIUM' : 'LOW'} showIcon={false} />
                </td>
                <td className="px-2.5 py-1.5">
                  <p className={`text-[11px] font-mono font-medium ${r.daysRemaining < 0 ? 'text-[hsl(var(--destructive))]' : r.daysRemaining <= 7 ? 'text-[hsl(var(--s-wn-tx))]' : 'text-[hsl(var(--text-2))]'}`}>
                    {r.dueDate}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--text-4))]">{r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : r.daysRemaining === 0 ? 'Done' : `${r.daysRemaining}d`}</p>
                </td>
                <td className="px-2.5 py-1.5 text-[10px] text-[hsl(var(--text-3))]">{r.assignee}</td>
                <td className="px-2.5 py-1.5">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => { setSelected(r); setEditMode(false) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))]"><Eye size={12} /></button>
                    <button onClick={() => { setSelected(r); openEdit(r) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))]"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteTarget(r.id)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]"><Trash size={12} /></button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-xs text-[hsl(var(--text-4))]">No DSR requests match the current filters</div>
        )}
      </div>

      {/* Detail Slide-over */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelected(null); setEditMode(false) }} />
          <div className="w-[500px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-[10px] text-[hsl(var(--brand))] font-semibold tracking-wide">{selected.id}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.type} — {selected.subject}</h2>
              </div>
              <div className="flex items-center gap-2">
                {!editMode && <button onClick={() => openEdit(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>}
                <button onClick={() => { setSelected(null); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={15} /></button>
              </div>
            </div>

            {!editMode && (
              <div className="flex border-b border-[hsl(var(--border))] flex-shrink-0">
                {([['overview', 'Overview'], ['ai-impact', 'AI Impact'], ['sla', 'SLA'], ['actions', 'Actions']] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => setDrawerTab(tab)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors" style={drawerTab === tab ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!editMode ? (
                <>
                  {drawerTab === 'overview' && (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => { const tt = TYPE_TOKEN[selected.type] || TYPE_FALLBACK; return (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold border" style={{ background: tt.bg, color: tt.tx, borderColor: tt.br }}>{selected.type}</span>
                        ); })()}
                        <StatusPill status={selected.status} />
                        <RiskBadge level={selected.priority === 'High' ? 'HIGH' : selected.priority === 'Medium' ? 'MEDIUM' : 'LOW'} showIcon={false} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Subject', value: selected.subject, mono: false },
                          { label: 'Email', value: selected.email, mono: true },
                          { label: 'Regulation', value: selected.regulation, mono: true },
                          { label: 'Assignee', value: selected.assignee, mono: false },
                          { label: 'Submitted', value: selected.submittedDate, mono: true },
                          { label: 'Due Date', value: selected.dueDate, mono: true },
                        ].map(f => (
                          <div key={f.label} className="p-2.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                            <p className="text-[9px] text-[hsl(var(--text-4))] uppercase tracking-wider">{f.label}</p>
                            <p className={`text-[11px] font-medium text-[hsl(var(--text-1))] mt-0.5 truncate ${f.mono ? 'font-mono' : ''}`}>{f.value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Case Notes</p>
                        <p className="text-sm text-[hsl(var(--text-2))] bg-raised border border-[hsl(var(--border))] p-3 leading-relaxed">{selected.notes}</p>
                      </div>
                    </>
                  )}

                  {drawerTab === 'ai-impact' && (
                    <>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">AI Systems Affected ({selected.aiSystemsAffected.length})</p>
                      <div className="space-y-2">
                        {selected.aiSystemsAffected.map(s => (
                          <div key={s} className="flex items-center gap-2 p-3 bg-[hsl(var(--brand)/0.06)] border border-[hsl(var(--brand)/0.2)]">
                            <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand))]" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-[hsl(var(--brand))]">{s}</p>
                              <p className="text-[10px] text-[hsl(var(--text-4))] mt-0.5">Must comply with {selected.type} request per {selected.regulation}</p>
                            </div>
                          </div>
                        ))}
                        {selected.aiSystemsAffected.length === 0 && <p className="text-xs text-[hsl(var(--text-4))]">No AI systems identified yet</p>}
                      </div>
                      <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                        <p className="text-[10px] font-semibold text-[hsl(var(--text-3))] uppercase mb-2">Regulatory Obligation</p>
                        <p className="text-xs text-[hsl(var(--text-2))] leading-relaxed">
                          {selected.type === 'Erasure' && `All identified AI systems must purge personal data for ${selected.subject} within the SLA window. Training data derived from this subject may also need removal per ${selected.regulation}.`}
                          {selected.type === 'Access' && `Provide ${selected.subject} with a full export of all personal data held across all AI systems within the statutory period under ${selected.regulation}.`}
                          {selected.type === 'Portability' && `Export personal data in a machine-readable format (JSON/CSV) for ${selected.subject} from all ${selected.aiSystemsAffected.length} AI system(s).`}
                          {selected.type === 'Rectification' && `Correct inaccurate personal data for ${selected.subject} across all linked AI systems and retrain/update any models using the corrected data.`}
                          {selected.type === 'Objection' && `Cease automated processing of ${selected.subject}'s data for the objected purposes across all ${selected.aiSystemsAffected.length} linked AI system(s).`}
                          {selected.type === 'Restriction' && `Restrict (not delete) processing of ${selected.subject}'s data across all linked AI systems pending resolution.`}
                        </p>
                      </div>
                    </>
                  )}

                  {drawerTab === 'sla' && (
                    <>
                      <div className="p-3 border" style={
                        selected.daysRemaining < 0
                          ? { background: 'hsl(var(--s-er-bg))', borderColor: 'hsl(var(--s-er-br))' }
                          : selected.daysRemaining <= 7
                          ? { background: 'hsl(var(--s-wn-bg))', borderColor: 'hsl(var(--s-wn-br))' }
                          : { background: 'hsl(var(--s-ok-bg))', borderColor: 'hsl(var(--s-ok-br))' }
                      }>
                        <p className="text-xl font-bold font-mono" style={{ color: selected.daysRemaining < 0 ? 'hsl(var(--s-er-tx))' : selected.daysRemaining <= 7 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>
                          {selected.daysRemaining < 0 ? `${Math.abs(selected.daysRemaining)}d overdue` : selected.daysRemaining === 0 ? 'Due today' : `${selected.daysRemaining}d remaining`}
                        </p>
                        <p className="text-[10px] text-[hsl(var(--text-4))] mt-1 font-mono">SLA: {selected.dueDate} | {selected.regulation}</p>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { phase: 'Request Received', date: selected.submittedDate, done: true },
                          { phase: 'Identity Verified', date: selected.submittedDate, done: selected.status !== 'Pending' },
                          { phase: 'AI Systems Notified', date: selected.submittedDate, done: ['In Review', 'Completed'].includes(selected.status) },
                          { phase: 'Response Prepared', date: selected.dueDate, done: selected.status === 'Completed' },
                          { phase: 'Completed & Documented', date: selected.dueDate, done: selected.status === 'Completed' },
                        ].map(step => (
                          <div key={step.phase} className="flex items-center gap-2.5 p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                            <div className="w-2.5 h-2.5 flex-shrink-0 border-2" style={step.done ? { background: 'hsl(var(--s-ok-tx))', borderColor: 'hsl(var(--s-ok-tx))' } : { background: 'transparent', borderColor: 'hsl(var(--border-mid))' }} />
                            <p className="text-[11px] text-[hsl(var(--text-2))] flex-1">{step.phase}</p>
                            <span className="text-[10px] text-[hsl(var(--text-4))] font-mono">{step.date}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {drawerTab === 'actions' && (
                    <>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">Available Actions</p>
                      <div className="space-y-2">
                        {selected.status !== 'Completed' && (
                          <button onClick={async () => {
                            await saveDsrRequests({ ...selected, status: 'Completed' })
                            setSelected(prev => prev ? { ...prev, status: 'Completed' } : null)
                            toast.success('DSR marked as completed')
                          }} className="w-full flex items-center gap-2 p-3 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90">
                            <CheckCircle size={16} /> Mark as Completed
                          </button>
                        )}
                        {selected.status === 'Pending' && (
                          <button onClick={async () => {
                            await saveDsrRequests({ ...selected, status: 'In Review' })
                            setSelected(prev => prev ? { ...prev, status: 'In Review' } : null)
                            toast.success('DSR moved to In Review')
                          }} className="w-full flex items-center gap-2 p-3 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
                            Move to In Review
                          </button>
                        )}
                        <button onClick={() => { openEdit(selected) }} className="w-full flex items-center gap-2 p-3 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
                          <Pencil size={14} /> Edit Request Details
                        </button>
                        <button onClick={() => toast.success('DSR exported as PDF')} className="w-full flex items-center gap-2 p-3 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
                          Export Compliance Evidence
                        </button>
                        <button onClick={() => setDeleteTarget(selected.id)} className="w-full flex items-center gap-2 p-3 border border-[hsl(var(--destructive)/0.4)] text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]">
                          <Trash size={14} /> Delete Request
                        </button>
                      </div>
                    </>
                  )}
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
                          className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Status</label>
                      <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as DSRStatus }))}>
                        <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['Pending', 'In Review', 'Completed', 'Rejected', 'Overdue'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Notes</label>
                      <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={4}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm">Save Changes</button>
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
          <div className="relative bg-surface border border-[hsl(var(--border))] rounded w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="font-semibold text-[hsl(var(--text-1))]">New Data Subject Request</h2>
              <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Subject Name *</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Full name"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="subject@email.com"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Request Type</label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as DSRType }))}>
                    <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Access', 'Erasure', 'Rectification', 'Portability', 'Objection', 'Restriction'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Regulation</label>
                  <Select value={form.regulation} onValueChange={v => setForm(p => ({ ...p, regulation: v }))}>
                    <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['GDPR Art. 15', 'GDPR Art. 16', 'GDPR Art. 17', 'GDPR Art. 20', 'GDPR Art. 21', 'GDPR Art. 18', 'CCPA § 1798.110', 'CCPA § 1798.105', 'EU AI Act Art. 14'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Priority</label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as any }))}>
                    <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['High', 'Medium', 'Low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Assignee</label>
                <Select value={form.assignee} onValueChange={v => setForm(p => ({ ...p, assignee: v }))}>
                  <SelectTrigger className="w-full mt-0.5" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Unassigned', 'Maria Santos', 'Sarah Chen', 'Marcus Johnson', 'James Liu'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Describe the request and any relevant context…"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-surface text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium">Create DSR</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-surface border border-[hsl(var(--border))] rounded w-full max-w-sm p-6 text-center shadow-xl">
            <Warning size={32} className="mx-auto text-[hsl(var(--destructive))] mb-3" />
            <h3 className="font-semibold text-[hsl(var(--text-1))] mb-1">Delete DSR Request?</h3>
            <p className="text-sm text-[hsl(var(--text-3))] mb-4">This action cannot be undone. The request record will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 bg-[hsl(var(--destructive))] text-[hsl(var(--bg-surface))] text-sm">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
