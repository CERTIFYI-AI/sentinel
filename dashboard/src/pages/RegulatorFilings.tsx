// Regulator Filings — backed by the org-scoped regulator_filings table via
// useFilings (writes throw; success toasts fire only from the mutation's
// onSuccess). The vocabulary comes from the FILING_* constants that mirror the
// DB CHECK constraints, linked incidents resolve through incidents.id →
// 'INC-code — title' chips, and every KPI is derived from the loaded rows.
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Plus, MagnifyingGlass, PencilSimple, Trash, Export, X, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { exportCsv } from '@/lib/exportUtils'
import { useFilings } from '@/hooks/useComplianceGroup'
import { useIncidents } from '@/hooks/useRiskIncidents'
import { FILING_REGULATIONS, FILING_TYPES, FILING_STATUSES, type FilingRecord } from '@/services/regulatoryOpsService'

/** 'breach_notification' → 'Breach notification', 'in_review' → 'In review'. */
const prettify = (s?: string | null) =>
  s ? s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) : '—'

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  draft:        { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  in_review:    { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  submitted:    { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  acknowledged: { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  closed:       { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' },
}
const statusStyle = (s?: string): React.CSSProperties =>
  STATUS_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

/** Pre-submission statuses: the filing is still on us. */
const isOpenStatus = (s?: string) => ['draft', 'in_review'].includes((s ?? '').toLowerCase())

/** Days until the deadline, computed at render time. Negative = overdue. */
function deadlineDays(deadline?: string | null): number | null {
  if (!deadline) return null
  const t = new Date(deadline).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}

interface FilingForm {
  title: string; regulation: string; type: string; status: string
  deadline: string; linkedIncidentId: string; regulatorName: string
  regulatorContact: string; referenceNumber: string
}
const EMPTY_FORM: FilingForm = {
  title: '', regulation: 'Other', type: 'adhoc', status: 'draft',
  deadline: '', linkedIncidentId: '', regulatorName: '', regulatorContact: '', referenceNumber: '',
}

export default function RegulatorFilings() {
  const { items, isLoading, error, save, remove, isSaving } = useFilings()
  const { items: incidents } = useIncidents()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [regulationFilter, setRegulationFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FilingRecord | null>(null)
  const [form, setForm] = useState<FilingForm>({ ...EMPTY_FORM })
  const [viewItem, setViewItem] = useState<FilingRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FilingRecord | null>(null)
  const [marking, setMarking] = useState(false)

  // Incident resolution: chip label 'INC-code — title', link to the incident.
  const incidentLabel = (id?: string | null) => {
    if (!id) return null
    const inc = incidents.find(i => i.id === id)
    if (!inc) return 'Unavailable'
    return `${inc.incidentId ?? 'Incident'} — ${inc.title}`.slice(0, 60)
  }
  const openIncidents = useMemo(
    () => incidents.filter(i => !['resolved', 'closed'].includes((i.status ?? '').toLowerCase())),
    [incidents],
  )

  // ?open=<id> deep link → open that filing's detail sheet once loaded.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || items.length === 0) return
    const record = items.find(f => f.id === openId)
    if (record) setViewItem(record)
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next }, { replace: true })
  }, [items, searchParams, setSearchParams])

  const filtered = useMemo(() => items.filter(f => {
    const q = search.toLowerCase()
    const ms = !q || f.title.toLowerCase().includes(q) || (f.filingRef ?? '').toLowerCase().includes(q) || (f.regulatorName ?? '').toLowerCase().includes(q)
    const ss = statusFilter === 'all' || f.status === statusFilter
    const rs = regulationFilter === 'all' || f.regulation === regulationFilter
    return ms && ss && rs
  }), [items, search, statusFilter, regulationFilter])

  // KPIs — derived from the loaded rows only.
  const open = items.filter(f => isOpenStatus(f.status))
  const dueSoon = open.filter(f => { const d = deadlineDays(f.deadline); return d != null && d >= 0 && d < 7 })
  const overdue = open.filter(f => { const d = deadlineDays(f.deadline); return d != null && d < 0 })
  const submitted = items.filter(f => !isOpenStatus(f.status))

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true) }
  const openEdit = (f: FilingRecord) => {
    setEditing(f)
    setForm({
      title: f.title, regulation: f.regulation, type: f.type ?? 'adhoc', status: f.status,
      deadline: f.deadline ? f.deadline.slice(0, 10) : '', linkedIncidentId: f.linkedIncidentId ?? '',
      regulatorName: f.regulatorName ?? '', regulatorContact: f.regulatorContact ?? '',
      referenceNumber: f.referenceNumber ?? '',
    })
    setViewItem(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Filing title is required'); return }
    try {
      await save({
        ...(editing ?? {}),
        title: form.title.trim(),
        regulation: form.regulation,
        type: form.type,
        status: form.status,
        deadline: form.deadline || null,
        linkedIncidentId: form.linkedIncidentId || null,
        regulatorName: form.regulatorName.trim() || null,
        regulatorContact: form.regulatorContact.trim() || null,
        referenceNumber: form.referenceNumber.trim() || null,
      })
      // Success toast fires from the mutation only after the write resolved.
      setDialogOpen(false)
      setEditing(null)
      setForm({ ...EMPTY_FORM })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  // Mark as Filed — awaited write; the sheet closes only on success.
  const markAsFiled = async (f: FilingRecord) => {
    setMarking(true)
    try {
      await save({ ...f, status: 'submitted', submittedAt: new Date().toISOString() })
      setViewItem(null)
    } catch {
      // Error toast fires from the mutation; the sheet stays open.
    } finally {
      setMarking(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) { setDeleteTarget(null); return }
    try { await remove(deleteTarget.id); setViewItem(null) } catch { /* error toast from the mutation */ }
    setDeleteTarget(null)
  }

  const handleExport = () => {
    if (items.length === 0) { toast.error('There are no filings to export yet.'); return }
    exportCsv(
      items.map(f => ({
        ref: f.filingRef ?? '',
        title: f.title,
        regulation: f.regulation,
        type: prettify(f.type),
        status: prettify(f.status),
        deadline: f.deadline ?? '',
        submitted_at: f.submittedAt ?? '',
        regulator: f.regulatorName ?? '',
        regulator_contact: f.regulatorContact ?? '',
        reference_number: f.referenceNumber ?? '',
        linked_incident: incidentLabel(f.linkedIncidentId) ?? '',
      })),
      `regulator-filings-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    // The download genuinely happened at this point — the toast is honest.
    toast.success(`Exported ${items.length} ${items.length === 1 ? 'filing' : 'filings'} as CSV`)
  }

  if (isLoading) return <PageSkeleton title="Regulator Filings" showStats rows={6} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regulator Filings"
        subtitle="Mandatory regulatory notifications — GDPR Art. 33/34, EU AI Act Art. 73, NIS2, DORA — linked to the incidents that triggered them"
        icon={FileText}
        actions={
          <>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={handleExport} disabled={items.length === 0}>
              <Export size={14} /> Export CSV
            </Button>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openCreate}>
              <Plus size={14} /> New Filing
            </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load regulator filings</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {overdue.length > 0 && (
        <div role="alert" className="flex items-start gap-3 border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.06)] px-4 py-3">
          <Warning size={18} className="text-[hsl(var(--destructive))] mt-0.5 shrink-0" weight="fill" />
          <div className="text-sm text-[hsl(var(--destructive))]">
            {overdue.map(f => (
              <div key={f.id}>
                <button className="underline font-semibold" onClick={() => setViewItem(f)}>{f.title}</button>
                {' '}— deadline passed {Math.abs(deadlineDays(f.deadline) ?? 0)}d ago and the filing is not submitted.
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs — derived from loaded rows */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Filings', value: String(items.length), sub: 'In the register', color: 'hsl(var(--text-1))' },
          { label: 'Open', value: String(open.length), sub: 'Draft or in review', color: 'hsl(var(--s-wn-tx))' },
          { label: 'Due Within 7 Days', value: String(dueSoon.length), sub: 'Deadline near, not yet submitted', color: dueSoon.length > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' },
          { label: 'Submitted / Closed', value: String(submitted.length), sub: 'Filed with the regulator', color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search filings…" className="pl-9" style={{ borderRadius: 0 }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All statuses</SelectItem>
            {FILING_STATUSES.map(s => <SelectItem key={s} value={s}>{prettify(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={regulationFilter} onValueChange={setRegulationFilter}>
          <SelectTrigger className="w-[160px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All regulations</SelectItem>
            {FILING_REGULATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || regulationFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setRegulationFilter('all') }} className="gap-1 text-[hsl(var(--text-3))]">
            <X size={14} /> Clear all
          </Button>
        )}
      </div>

      {/* Table */}
      {items.length === 0 && !error ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="No regulator filings yet"
          description="Track a mandatory notification or annual report; filings created from incident escalations also land here."
          action={<Button onClick={openCreate} style={{ borderRadius: 0 }}><Plus size={14} /> New Filing</Button>}
        />
      ) : filtered.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-10 text-center">
          <p className="text-sm text-[hsl(var(--text-4))]">No filings match the current filters.</p>
        </div>
      ) : (
        <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-raised))' }}>
                {['Ref', 'Title', 'Regulation', 'Type', 'Deadline', 'Status', 'Linked Incident', 'Regulator', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const d = deadlineDays(f.deadline)
                const dueWarn = isOpenStatus(f.status) && d != null && d < 7
                const label = incidentLabel(f.linkedIncidentId)
                return (
                  <tr key={f.id} onClick={() => setViewItem(f)} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--brand))]">{f.filingRef ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-[hsl(var(--text-1))] max-w-[240px] truncate">{f.title}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{f.regulation}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{prettify(f.type)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="text-[hsl(var(--text-3))]">{f.deadline ? f.deadline.slice(0, 10) : '—'}</span>
                      {dueWarn && (
                        <span className="block text-[10px] font-semibold" style={{ color: 'hsl(var(--destructive))' }}>
                          {d! < 0 ? `${Math.abs(d!)}d overdue` : `${d}d remaining`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(f.status)}>{prettify(f.status)}</span>
                    </td>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {f.linkedIncidentId ? (
                        label === 'Unavailable'
                          ? <span className="text-xs text-[hsl(var(--text-4))]">Unavailable</span>
                          : <InterlinkChip label={label!} to={`/risk/incidents?open=${f.linkedIncidentId}`} />
                      ) : (
                        <span className="text-xs text-[hsl(var(--text-4))]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{f.regulatorName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Edit ${f.title}`} onClick={() => openEdit(f)}><PencilSimple size={14} /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${f.title}`} className="text-[hsl(var(--destructive))]" onClick={() => setDeleteTarget(f)}><Trash size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => { if (!o) setViewItem(null) }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {viewItem.filingRef && <span className="font-mono text-xs text-[hsl(var(--brand))]">{viewItem.filingRef}</span>}
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(viewItem.status)}>{prettify(viewItem.status)}</span>
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>{viewItem.title}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Regulation', value: viewItem.regulation },
                    { label: 'Filing Type', value: prettify(viewItem.type) },
                    { label: 'Deadline', value: viewItem.deadline ? viewItem.deadline.slice(0, 10) : '—' },
                    { label: 'Submitted At', value: viewItem.submittedAt ? new Date(viewItem.submittedAt).toLocaleString() : 'Not submitted' },
                    { label: 'Regulator', value: viewItem.regulatorName ?? '—' },
                    { label: 'Regulator Contact', value: viewItem.regulatorContact ?? '—' },
                    { label: 'Reference Number', value: viewItem.referenceNumber ?? '—' },
                    { label: 'Created', value: viewItem.createdAt ? viewItem.createdAt.slice(0, 10) : '—' },
                  ].map(fld => (
                    <div key={fld.label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{fld.label}</p>
                      <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{fld.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Linked Incident</p>
                  {viewItem.linkedIncidentId ? (
                    incidentLabel(viewItem.linkedIncidentId) === 'Unavailable'
                      ? <p className="text-xs text-[hsl(var(--text-4))]">Unavailable</p>
                      : <InterlinkChip label={incidentLabel(viewItem.linkedIncidentId)!} to={`/risk/incidents?open=${viewItem.linkedIncidentId}`} />
                  ) : (
                    <p className="text-xs italic text-[hsl(var(--text-4))]">This filing is not linked to an incident.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => openEdit(viewItem)}>
                    <PencilSimple size={14} /> Edit
                  </Button>
                  {isOpenStatus(viewItem.status) && (
                    <Button
                      size="sm"
                      style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                      disabled={marking}
                      onClick={() => markAsFiled(viewItem)}
                    >
                      {marking ? 'Filing…' : 'Mark as Filed'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-[hsl(var(--destructive))]" style={{ borderRadius: 0 }} onClick={() => setDeleteTarget(viewItem)}>
                    <Trash size={14} /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editing ? 'Edit Filing' : 'New Regulator Filing'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Data breach notification — logging misconfiguration" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Regulation</Label>
                <Select value={form.regulation} onValueChange={v => setForm(f => ({ ...f, regulation: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FILING_REGULATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Filing Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FILING_TYPES.map(t => <SelectItem key={t} value={t}>{prettify(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {FILING_STATUSES.map(s => <SelectItem key={s} value={s}>{prettify(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Linked Incident</Label>
              <Select value={form.linkedIncidentId || 'none'} onValueChange={v => setForm(f => ({ ...f, linkedIncidentId: v === 'none' ? '' : v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No linked incident" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="none">No linked incident</SelectItem>
                  {openIncidents.map(i => (
                    <SelectItem key={i.id} value={i.id!}>{`${i.incidentId ?? 'Incident'} — ${i.title}`.slice(0, 70)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-[hsl(var(--text-4))]">Only open incidents are offered; the filing stores the incident uuid.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Regulator Name</Label>
                <Input value={form.regulatorName} onChange={e => setForm(f => ({ ...f, regulatorName: e.target.value }))} placeholder="e.g. ICO (UK)" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Regulator Contact</Label>
                <Input value={form.regulatorContact} onChange={e => setForm(f => ({ ...f, regulatorContact: e.target.value }))} placeholder="e.g. breach-desk@regulator.example" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Reference Number</Label>
              <Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="Case reference assigned by the regulator, if any" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create Filing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Filing</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: 'hsl(var(--destructive))', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
