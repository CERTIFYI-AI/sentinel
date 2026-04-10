import { useState } from 'react'
import { CheckSquare, MagnifyingGlass, Plus, Eye, X, Export, Users, Warning } from '@phosphor-icons/react'
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
}

const SEED: ConsentRecord[] = [
  { id: 'CST-001', subject: 'Emma Wilson', email: 'e.wilson@acmefinancial.com', consentDate: '2026-01-15', expiryDate: '2027-01-15', status: 'Active', purposes: ['AI Credit Scoring', 'Fraud Detection', 'Marketing Personalization'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2'], dataCategories: ['Financial History', 'Transaction Data', 'Behavioral Data'], version: '2.3', ipAddress: '192.168.1.100', channel: 'Web Portal' },
  { id: 'CST-002', subject: 'Marcus Lee', email: 'm.lee@customer.com', consentDate: '2025-06-20', expiryDate: '2026-06-20', status: 'Active', purposes: ['AI Loan Assessment', 'Churn Prediction'], legalBasis: 'Consent', aiSystems: ['Loan Approval Model v3.0', 'Customer Churn Predictor v2.3'], dataCategories: ['Income Data', 'Credit History', 'Employment Data'], version: '2.1', ipAddress: '10.0.0.55', channel: 'Mobile App' },
  { id: 'CST-003', subject: 'Grace Park', email: 'g.park@customer.com', consentDate: '2024-11-30', expiryDate: '2025-11-30', status: 'Expired', purposes: ['AI Credit Scoring'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1'], dataCategories: ['Financial History'], version: '1.8', ipAddress: '172.16.0.22', channel: 'Branch' },
  { id: 'CST-004', subject: 'Raj Patel', email: 'r.patel@customer.com', consentDate: '2026-03-01', expiryDate: '2027-03-01', status: 'Withdrawn', purposes: ['AI Credit Scoring', 'Fraud Detection', 'Marketing Personalization', 'Churn Prediction'], legalBasis: 'Consent', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2', 'Customer Churn Predictor v2.3'], dataCategories: ['Financial History', 'Transaction Data', 'Behavioral Data', 'Communication Preferences'], version: '2.3', ipAddress: '192.168.2.88', channel: 'Web Portal' },
  { id: 'CST-005', subject: 'Fatima Al-Hassan', email: 'f.alhassan@customer.com', consentDate: '2026-04-01', expiryDate: '2027-04-01', status: 'Pending', purposes: ['AI Loan Assessment'], legalBasis: 'Consent', aiSystems: ['Loan Approval Model v3.0'], dataCategories: ['Income Data', 'Employment Data'], version: '2.3', ipAddress: '10.10.5.201', channel: 'Mobile App' },
  { id: 'CST-006', subject: 'Thomas Mueller', email: 't.mueller@acmefinancial.com', consentDate: '2025-09-12', expiryDate: '2027-09-12', status: 'Active', purposes: ['Fraud Detection', 'Risk Assessment'], legalBasis: 'Legitimate Interest', aiSystems: ['Fraud Detection Engine v4.2'], dataCategories: ['Transaction Data', 'Device Fingerprint'], version: '2.2', ipAddress: '172.31.0.15', channel: 'API' },
  { id: 'CST-007', subject: 'Aisha Ogundimu', email: 'a.ogundimu@customer.com', consentDate: '2026-02-14', expiryDate: '2027-02-14', status: 'Active', purposes: ['AI Credit Scoring', 'Fraud Detection'], legalBasis: 'Contract', aiSystems: ['Credit Scoring Model v2.1', 'Fraud Detection Engine v4.2'], dataCategories: ['Financial History', 'Transaction Data', 'Credit History'], version: '2.3', ipAddress: '10.20.1.45', channel: 'Web Portal' },
]

const STATUS_STYLE: Record<ConsentStatus, { bg: string; color: string }> = {
  Active: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Withdrawn: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Expired: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
  Pending: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
}

export default function ConsentManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<ConsentRecord | null>(null)
  const [records, setRecords] = useState(SEED)

  const filtered = records.filter(r => {
    const ms = r.subject.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'All' || r.status === statusFilter)
  })

  const stats = {
    active: records.filter(r => r.status === 'Active').length,
    withdrawn: records.filter(r => r.status === 'Withdrawn').length,
    expired: records.filter(r => r.status === 'Expired').length,
    total: records.length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <CheckSquare size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Consent Management
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">GDPR-compliant consent records for AI system data processing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Export initiated')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => toast.info('Consent form builder — coming soon')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> New Consent Form
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active Consents', value: stats.active, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Withdrawn', value: stats.withdrawn, color: 'hsl(var(--destructive))' },
          { label: 'Expired', value: stats.expired, color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or ID…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Active', 'Withdrawn', 'Expired', 'Pending'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Subject', 'Purposes', 'Legal Basis', 'Consented', 'Expires', 'Channel', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const ss = STATUS_STYLE[r.status]
              return (
                <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.id}</td>
                  <td className="px-4 py-3"><p className="font-medium text-[hsl(var(--text-1))]">{r.subject}</p><p className="text-[11px] text-[hsl(var(--text-4))]">{r.email}</p></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.purposes.slice(0, 2).join(', ')}{r.purposes.length > 2 ? ` +${r.purposes.length - 2}` : ''}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.legalBasis}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.consentDate}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.expiryDate}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.channel}</td>
                  <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={ss}>{r.status}</span></td>
                  <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No consent records found</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.subject}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.legalBasis}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Consent Date', value: selected.consentDate },
                  { label: 'Expiry Date', value: selected.expiryDate },
                  { label: 'Form Version', value: selected.version },
                  { label: 'Channel', value: selected.channel },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-sm text-[hsl(var(--text-1))] font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Processing Purposes</p>
                <div className="space-y-1">{selected.purposes.map(p => (<div key={p} className="flex items-center gap-2 text-sm text-[hsl(var(--text-2))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]"><span className="w-1.5 h-1.5 bg-[hsl(var(--s-ok-tx))] rounded-full" />{p}</div>))}</div>
              </div>
              <div><p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">AI Systems</p>
                <div className="space-y-1">{selected.aiSystems.map(s => (<div key={s} className="text-xs text-[hsl(var(--text-2))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{s}</div>))}</div>
              </div>
              <div><p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Data Categories</p>
                <div className="flex flex-wrap gap-1">{selected.dataCategories.map(c => (<span key={c} className="text-[10px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{c}</span>))}</div>
              </div>
            </div>
            {selected.status === 'Active' && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button onClick={() => { setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'Withdrawn' as ConsentStatus } : r)); setSelected(null); toast.success('Consent withdrawn and AI systems notified') }} className="flex-1 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm font-medium hover:bg-[hsl(0_72%_51%/0.05)]">
                  Withdraw Consent
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
