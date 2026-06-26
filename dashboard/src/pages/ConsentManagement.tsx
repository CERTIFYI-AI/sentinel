import { useState } from 'react'
import { CheckSquare, MagnifyingGlass, Plus, Eye, X, Export, Users, Warning, Pencil, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useConsentRecordsData } from '@/hooks/useConsentRecordsData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}


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
  const { items: records, isLoading, saveConsentRecords, removeConsentRecords } = useConsentRecordsData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<ConsentRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'purposes' | 'ai-systems' | 'audit'>('overview')
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState<Omit<ConsentRecord, 'id'>>(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  if (isLoading) return <PageSkeleton />

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

  const handleCreate = async () => {
    if (!form.subject || !form.email) { toast.error('Subject name and email are required'); return }
    await saveConsentRecords({ ...form })
    setShowCreate(false)
    setForm(BLANK)
  }

  const handleEdit = async () => {
    if (!selected) return
    await saveConsentRecords({ ...selected, ...form })
    setSelected(prev => prev ? { ...prev, ...form } : null)
    setEditMode(false)
    toast.success('Consent record updated')
  }

  const handleDelete = async (id: string) => {
    await removeConsentRecords(id)
    setDeleteTarget(null)
    if (selected?.id === id) setSelected(null)
  }

  const handleWithdraw = async (id: string) => {
    await saveConsentRecords({ id, status: 'Withdrawn', withdrawalDate: new Date().toISOString().slice(0,10) })
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
          <button onClick={() => exportCsv(records as any[], 'consent-records.csv')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export CSV</button>
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
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium" style={STATUS_STYLE[r.status as ConsentStatus]}>{r.status}</span></td>
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
          <div className="w-[500px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.subject}</h2>
              </div>
              <div className="flex gap-1">
                {!editMode && <button onClick={() => { setForm({ ...selected }); setEditMode(true) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>}
                <button onClick={() => { setSelected(null); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))]"><X size={15} /></button>
              </div>
            </div>

            {!editMode && (
              <div className="flex border-b border-[hsl(var(--border))]">
                {([['overview', 'Overview'], ['purposes', 'Purposes'], ['ai-systems', 'AI Systems'], ['audit', 'Audit']] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => setDrawerTab(tab)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors" style={drawerTab === tab ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!editMode ? (
                <>
                  {drawerTab === 'overview' && (
                    <>
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-xs font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">{selected.legalBasis}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">v{selected.version}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Email', value: selected.email },
                          { label: 'Channel', value: selected.channel },
                          { label: 'Consent Date', value: selected.consentDate },
                          { label: 'Expiry Date', value: selected.expiryDate },
                          { label: 'IP Address', value: selected.ipAddress },
                          { label: 'Consent Version', value: `v${selected.version}` },
                        ].map(f => (
                          <div key={f.label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                            <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{f.label}</p>
                            <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{f.value}</p>
                          </div>
                        ))}
                      </div>
                      {selected.withdrawalDate && (
                        <div className="p-3 bg-[hsl(0_72%_51%/0.08)] border border-[hsl(var(--destructive)/0.2)]">
                          <p className="text-xs font-semibold text-[hsl(var(--destructive))]">Consent Withdrawn — {selected.withdrawalDate}</p>
                          {selected.withdrawalReason && <p className="text-xs text-[hsl(var(--text-3))] mt-1">{selected.withdrawalReason}</p>}
                        </div>
                      )}
                    </>
                  )}

                  {drawerTab === 'purposes' && (
                    <>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">Consented Purposes ({selected.purposes.length})</p>
                      <div className="space-y-2">
                        {selected.purposes.map(p => (
                          <div key={p} className="flex items-center gap-2 p-2.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                            <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand))]" />
                            <p className="text-xs text-[hsl(var(--text-2))]">{p}</p>
                          </div>
                        ))}
                        {selected.purposes.length === 0 && <p className="text-xs text-[hsl(var(--text-4))]">No purposes recorded</p>}
                      </div>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mt-4">Data Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.dataCategories.map(c => <span key={c} className="px-2 py-0.5 text-xs bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{c}</span>)}
                      </div>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mt-4">Legal Basis</p>
                      <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-xs font-medium text-[hsl(var(--text-1))]">{selected.legalBasis}</p>
                        <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">Per GDPR Article 6 / CCPA 1798.100</p>
                      </div>
                    </>
                  )}

                  {drawerTab === 'ai-systems' && (
                    <>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">AI Systems Using This Consent ({selected.aiSystems.length})</p>
                      <div className="space-y-2">
                        {selected.aiSystems.map(s => (
                          <div key={s} className="flex items-center gap-2 p-2.5 bg-[hsl(var(--brand)/0.06)] border border-[hsl(var(--brand)/0.2)]">
                            <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand))]" />
                            <p className="text-xs font-medium text-[hsl(var(--brand))]">{s}</p>
                          </div>
                        ))}
                        {selected.aiSystems.length === 0 && <p className="text-xs text-[hsl(var(--text-4))]">No AI systems linked</p>}
                      </div>
                      {selected.status === 'Withdrawn' && (
                        <div className="p-3 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)] mt-2">
                          <p className="text-xs font-semibold text-[hsl(var(--destructive))] mb-1">Processing Must Cease</p>
                          <p className="text-xs text-[hsl(var(--text-2))]">All {selected.aiSystems.length} AI system(s) above must immediately stop processing data for this subject per GDPR Art. 7(3).</p>
                        </div>
                      )}
                    </>
                  )}

                  {drawerTab === 'audit' && (
                    <>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">Audit Trail</p>
                      <div className="space-y-2">
                        {[
                          { date: selected.consentDate, event: `Consent recorded via ${selected.channel}`, type: 'ok' },
                          ...(selected.withdrawalDate ? [{ date: selected.withdrawalDate, event: `Consent withdrawn — ${selected.withdrawalReason ?? 'No reason provided'}`, type: 'err' }] : []),
                        ].map((e, i) => (
                          <div key={i} className="flex gap-3 p-2.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                            <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: e.type === 'ok' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }} />
                            <div>
                              <p className="text-xs text-[hsl(var(--text-2))]">{e.event}</p>
                              <p className="text-[10px] text-[hsl(var(--text-4))] mt-0.5">{e.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] mt-2">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Technical Metadata</p>
                        <p className="text-xs text-[hsl(var(--text-2))]">IP: {selected.ipAddress}</p>
                        <p className="text-xs text-[hsl(var(--text-2))]">Version: v{selected.version}</p>
                        <p className="text-xs text-[hsl(var(--text-2))]">Channel: {selected.channel}</p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    {selected.status === 'Active' && (
                      <button onClick={() => handleWithdraw(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(0_72%_51%/0.05)]">
                        <Warning size={13} /> Withdraw
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))]">
                      <Trash size={13} /> Delete
                    </button>
                  </div>
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
