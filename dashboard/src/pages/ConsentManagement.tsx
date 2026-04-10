import { useState } from 'react'
import { CheckSquare, MagnifyingGlass, Plus, Eye, X, Export, Users, Warning, Pencil, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

type ConsentStatus = 'Active' | 'Withdrawn' | 'Expired' | 'Pending'
type LegalBasis = 'Consent' | 'Legitimate Interest' | 'Contract' | 'Legal Obligation' | 'Vital Interest' | 'Public Task'

interface ConsentRecord {
  id: string
  subject: string
  email: string
  consentDate: string
  expiryDate: string
  status: ConsentStatus
  purposes: string[]
  legalBasis: LegalBasis
  aiSystems: string[]
  dataCategories: string[]
  version: string
  ipAddress: string
  channel: string
  withdrawalDate?: string
  withdrawalReason?: string
}

const SEED: ConsentRecord[] = [
  { id: 'CST-001', subject: 'Emma Wilson', email: 'e.wilson@acmefinancial.com', consentDate: '2026-01-15', expiryDate: '2027-01-15', status: 'Active', purposes: ['AI Credit Scoring', 'Fraud Detection', 'Marketing Personalization'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2'], dataCategories: ['Financial History', 'Transaction Data', 'Behavioral Data'], version: '2.3', ipAddress: '192.168.1.100', channel: 'Web Portal' },
  { id: 'CST-002', subject: 'Marcus Lee', email: 'm.lee@customer.com', consentDate: '2025-06-20', expiryDate: '2026-06-20', status: 'Active', purposes: ['AI Loan Assessment', 'Churn Prediction'], legalBasis: 'Consent', aiSystems: ['Loan Approval Model v3.0', 'Customer Churn Predictor v2.3'], dataCategories: ['Income Data', 'Credit History', 'Employment Data'], version: '2.1', ipAddress: '10.0.0.55', channel: 'Mobile App' },
  { id: 'CST-003', subject: 'Grace Park', email: 'g.park@customer.com', consentDate: '2024-11-30', expiryDate: '2025-11-30', status: 'Expired', purposes: ['AI Credit Scoring'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1'], dataCategories: ['Financial History'], version: '1.8', ipAddress: '172.16.0.22', channel: 'Branch' },
  { id: 'CST-004', subject: 'Raj Patel', email: 'r.patel@customer.com', consentDate: '2026-03-01', expiryDate: '2027-03-01', status: 'Withdrawn', purposes: ['AI Credit Scoring', 'Fraud Detection', 'Marketing Personalization', 'Churn Prediction'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2', 'Customer Churn Predictor v2.3'], dataCategories: ['Financial History', 'Transaction Data', 'Behavioral Data', 'Communication Preferences'], version: '2.3', ipAddress: '192.168.2.88', channel: 'Web Portal', withdrawalDate: '2026-04-05', withdrawalReason: 'Subject objects to AI-based profiling for marketing purposes.' },
  { id: 'CST-005', subject: 'Fatima Al-Hassan', email: 'f.alhassan@customer.com', consentDate: '2026-04-01', expiryDate: '2027-04-01', status: 'Pending', purposes: ['AI Loan Assessment'], legalBasis: 'Consent', aiSystems: ['Loan Approval Model v3.0'], dataCategories: ['Income Data', 'Employment Data'], version: '2.3', ipAddress: '10.10.5.201', channel: 'Mobile App' },
  { id: 'CST-006', subject: 'Thomas Mueller', email: 't.mueller@acmefinancial.com', consentDate: '2025-09-12', expiryDate: '2027-09-12', status: 'Active', purposes: ['Fraud Detection', 'Risk Assessment'], legalBasis: 'Legitimate Interest', aiSystems: ['Fraud Detection Engine v4.2'], dataCategories: ['Transaction Data', 'Device Fingerprint'], version: '2.2', ipAddress: '172.31.0.15', channel: 'API' },
  { id: 'CST-007', subject: 'Aisha Ogundimu', email: 'a.ogundimu@customer.com', consentDate: '2026-02-14', expiryDate: '2027-02-14', status: 'Active', purposes: ['AI Credit Scoring', 'Fraud Detection'], legalBasis: 'Contract', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2'], dataCategories: ['Financial History', 'Transaction Data', 'Credit History'], version: '2.3', ipAddress: '10.20.1.45', channel: 'Web Portal' },
  { id: 'CST-008', subject: 'Hiroshi Tanaka', email: 'h.tanaka@customer.com', consentDate: '2025-12-01', expiryDate: '2026-12-01', status: 'Active', purposes: ['AI Credit Scoring', 'Churn Prediction', 'AI Loan Assessment'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1', 'Customer Churn Predictor v2.3', 'Loan Approval Model v3.0'], dataCategories: ['Financial History', 'Behavioral Data', 'Income Data'], version: '2.2', ipAddress: '10.15.0.88', channel: 'Web Portal' },
  { id: 'CST-009', subject: 'Sofia Rossi', email: 's.rossi@customer.com', consentDate: '2025-08-10', expiryDate: '2026-08-10', status: 'Expired', purposes: ['Fraud Detection', 'Marketing Personalization'], legalBasis: 'Consent', aiSystems: ['Fraud Detection Engine v4.2'], dataCategories: ['Transaction Data', 'Communication Preferences'], version: '2.0', ipAddress: '10.30.2.19', channel: 'Mobile App' },
  { id: 'CST-010', subject: 'Kwame Asante', email: 'k.asante@customer.com', consentDate: '2026-04-09', expiryDate: '2027-04-09', status: 'Active', purposes: ['AI Credit Scoring', 'Fraud Detection', 'Risk Assessment'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2'], dataCategories: ['Financial History', 'Transaction Data', 'Credit History'], version: '2.3', ipAddress: '192.168.5.120', channel: 'Branch' },
  { id: 'CST-011', subject: 'Ana Rodriguez', email: 'a.rodriguez@customer.com', consentDate: '2026-03-15', expiryDate: '2027-03-15', status: 'Active', purposes: ['AI Loan Assessment', 'AI Credit Scoring'], legalBasis: 'Consent', aiSystems: ['Loan Approval Model v3.0', 'Credit Scoring Model v2.1'], dataCategories: ['Income Data', 'Employment Data', 'Financial History'], version: '2.3', ipAddress: '10.0.3.77', channel: 'Web Portal' },
  { id: 'CST-012', subject: 'Erik Johansson', email: 'e.johansson@customer.com', consentDate: '2026-01-20', expiryDate: '2027-01-20', status: 'Withdrawn', purposes: ['Churn Prediction', 'Marketing Personalization'], legalBasis: 'Consent', aiSystems: ['Customer Churn Predictor v2.3'], dataCategories: ['Behavioral Data', 'Communication Preferences'], version: '2.2', ipAddress: '172.20.0.55', channel: 'Mobile App', withdrawalDate: '2026-03-28', withdrawalReason: 'GDPR Art. 7(3) — subject withdrew consent without stating reason.' },
]

const STATUS_STYLE: Record<ConsentStatus, { bg: string; color: string }> = {
  Active: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Withdrawn: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Expired: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
  Pending: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
}

const BLANK: Omit<ConsentRecord, 'id'> = {
  subject: '', email: '', consentDate: '', expiryDate: '', status: 'Pending',
  purposes: [], legalBasis: 'Consent', aiSystems: [], dataCategories: [],
  version: '2.3', ipAddress: '', channel: 'Web Portal',
}

export default function ConsentManagement() {
  const [records, setRecords] = useState<ConsentRecord[]>(SEED)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<ConsentRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Omit<ConsentRecord, 'id'>>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = records.filter(r => {
    const ms = r.subject.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'All' || r.status === statusFilter)
  })

  const stats = {
    active: records.filter(r => r.status === 'Active').length,
    withdrawn: records.filter(r => r.status === 'Withdrawn').length,
    expired: records.filter(r => r.status === 'Expired').length,
    pending: records.filter(r => r.status === 'Pending').length,
  }

  const handleCreate = () => {
    if (!form.subject || !form.email) { toast.error('Subject name and email are required'); return }
    const id = `CST-${String(records.length + 1).padStart(3, '0')}`
    setRecords(p => [{ ...form, id }, ...p])
    setShowCreate(false)
    setForm(BLANK)
    toast.success(`Consent record ${id} created`)
  }

  const handleEdit = () => {
    if (!selected) return
    setRecords(p => p.map(r => r.id === selected.id ? { ...r, ...form } : r))
    setSelected(prev => prev ? { ...prev, ...form } : null)
    setEditMode(false)
    toast.success('Consent record updated')
  }

  const handleDelete = (id: string) => {
    setRecords(p => p.filter(r => r.id !== id))
    setDeleteTarget(null)
    if (selected?.id === id) setSelected(null)
    toast.success('Consent record deleted')
  }

  const handleWithdraw = (id: string) => {
    setRecords(p => p.map(r => r.id === id ? { ...r, status: 'Withdrawn', withdrawalDate: '2026-04-10' } : r))
    setSelected(prev => prev?.id === id ? { ...prev, status: 'Withdrawn', withdrawalDate: '2026-04-10' } : prev)
    toast.success('Consent withdrawn and AI systems notified')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <CheckSquare size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Consent Management
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">GDPR-compliant consent lifecycle management — purpose tracking, AI system mapping, withdrawal, and audit trail</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Consent report exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
          <button onClick={() => { setForm(BLANK); setShowCreate(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"><Plus size={14} weight="bold" /> New Record</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Consents', value: stats.active, sub: 'Valid and processing', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Withdrawn', value: stats.withdrawn, sub: 'Processing must cease', color: 'hsl(var(--destructive))' },
          { label: 'Expired', value: stats.expired, sub: 'Require renewal', color: 'hsl(45 85% 40%)' },
          { label: 'Pending', value: stats.pending, sub: 'Awaiting confirmation', color: 'hsl(var(--s-in-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-xs text-[hsl(var(--text-4))]">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by subject, email, or ID…"
            className="w-full pl-8 pr-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
          {['All', 'Active', 'Withdrawn', 'Expired', 'Pending'].map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Subject', 'Legal Basis', 'Purposes', 'AI Systems', 'Status', 'Consent Date', 'Expiry', 'Channel', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]">
                <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--brand))] font-medium">{r.id}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-[hsl(var(--text-1))]">{r.subject}</p>
                  <p className="text-xs text-[hsl(var(--text-4))]">{r.email}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.legalBasis}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.purposes.length} purpose{r.purposes.length !== 1 ? 's' : ''}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.aiSystems.length} system{r.aiSystems.length !== 1 ? 's' : ''}</td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium" style={STATUS_STYLE[r.status]}>{r.status}</span></td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.consentDate}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.expiryDate}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.channel}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelected(r); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Eye size={13} /></button>
                    <button onClick={() => { setSelected(r); setForm({ ...r }); setEditMode(true) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(r.id)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">No consent records match the current filters</div>}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelected(null); setEditMode(false) }} />
          <div className="w-[500px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] h-full overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--bg-surface))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.subject}</h2>
              </div>
              <div className="flex gap-1">
                {!editMode && <button onClick={() => { setForm({ ...selected }); setEditMode(true) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>}
                <button onClick={() => { setSelected(null); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))]"><X size={15} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1">
              {!editMode ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">{selected.legalBasis}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">v{selected.version}</span>
                  </div>
                  {[
                    { label: 'Email', value: selected.email },
                    { label: 'Consent Date', value: selected.consentDate },
                    { label: 'Expiry Date', value: selected.expiryDate },
                    { label: 'Channel', value: selected.channel },
                    { label: 'IP Address', value: selected.ipAddress },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-[hsl(var(--text-4))]">{f.label}</p>
                      <p className="text-sm text-[hsl(var(--text-1))] mt-0.5">{f.value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Consented Purposes</p>
                    <div className="space-y-1">
                      {selected.purposes.map(p => <div key={p} className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-2))]"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))]" />{p}</div>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">AI Systems</p>
                    <div className="space-y-1">
                      {selected.aiSystems.map(s => <div key={s} className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-2))]"><span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand))]" />{s}</div>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Data Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.dataCategories.map(c => <span key={c} className="px-2 py-0.5 text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))] rounded">{c}</span>)}
                    </div>
                  </div>
                  {selected.withdrawalDate && (
                    <div className="p-3 rounded bg-[hsl(0_72%_51%/0.08)] border border-[hsl(var(--destructive)/0.2)]">
                      <p className="text-xs font-semibold text-[hsl(var(--destructive))]">Consent Withdrawn — {selected.withdrawalDate}</p>
                      {selected.withdrawalReason && <p className="text-xs text-[hsl(var(--text-3))] mt-1">{selected.withdrawalReason}</p>}
                    </div>
                  )}
                  {selected.status === 'Active' && (
                    <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                      <button onClick={() => handleWithdraw(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]">
                        <Warning size={13} /> Withdraw Consent
                      </button>
                      <button onClick={() => setDeleteTarget(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-3))]">
                        <Trash size={13} /> Delete
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Edit Consent Record</h3>
                  {[
                    { label: 'Subject Name', key: 'subject' },
                    { label: 'Email', key: 'email' },
                    { label: 'Expiry Date', key: 'expiryDate', type: 'date' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-[hsl(var(--text-4))]">{f.label}</label>
                      <input type={f.type || 'text'} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as ConsentStatus }))}
                      className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                      {['Active', 'Withdrawn', 'Expired', 'Pending'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm">Save</button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
                  </div>
                </div>
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
              <h2 className="font-semibold text-[hsl(var(--text-1))]">New Consent Record</h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Subject Name *</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Consent Date</label>
                  <input type="date" value={form.consentDate} onChange={e => setForm(p => ({ ...p, consentDate: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Legal Basis</label>
                  <select value={form.legalBasis} onChange={e => setForm(p => ({ ...p, legalBasis: e.target.value as LegalBasis }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Consent', 'Legitimate Interest', 'Contract', 'Legal Obligation', 'Vital Interest', 'Public Task'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Channel</label>
                  <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Web Portal', 'Mobile App', 'Branch', 'API', 'Email', 'Phone'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">IP Address</label>
                <input value={form.ipAddress} onChange={e => setForm(p => ({ ...p, ipAddress: e.target.value }))} placeholder="192.168.1.100"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium">Create Record</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded w-full max-w-sm p-6 text-center shadow-xl">
            <Warning size={32} className="mx-auto text-[hsl(var(--destructive))] mb-3" />
            <h3 className="font-semibold mb-1">Delete Consent Record?</h3>
            <p className="text-sm text-[hsl(var(--text-3))] mb-4">This permanently removes the consent record. Consider withdrawing instead.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 bg-[hsl(var(--destructive))] text-white text-sm">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
