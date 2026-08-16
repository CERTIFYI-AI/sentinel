// Financial Risk Quantification — FAIR-based quantifications backed by the
// org-scoped financial_risks table (useFinancialRisks). ALE is computed from
// the typed LEF × loss magnitude via computeFair — never typed in directly —
// and every figure on the page derives from the loaded rows. Models resolve
// through ai_models.id → InterlinkChip; writes go through the hook (services
// throw; success toasts fire only from onSuccess).
import { useMemo, useState } from 'react'
import { HandCoins, MagnifyingGlass, Plus, Eye, Export, PencilSimple, Trash, ShieldCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { exportCsv } from '@/lib/exportUtils'
import { useFinancialRisks } from '@/hooks/useRiskIncidents'
import { useModelsData } from '@/hooks/useModelsData'
import { useRisksData } from '@/hooks/useRisksData'
import { computeFair, type FinancialRiskRecord } from '@/services/riskGroupService'

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  draft:      { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' },
  quantified: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  accepted:   { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  mitigating: { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}
const statusStyle = (s?: string): React.CSSProperties =>
  STATUS_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

const CATEGORIES = ['Regulatory', 'Operational', 'Third-Party', 'Fraud', 'Legal', 'Reputational']
const STATUSES = ['draft', 'quantified', 'accepted', 'mitigating']
const NONE = '__none__'

function formatMoney(n: number | null | undefined, currency: string): string {
  if (n == null) return '—'
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1,
    }).format(n)
  } catch {
    return `${currency} ${n.toLocaleString()}`
  }
}

const EMPTY_FORM = {
  title: '', finRef: '', scenario: '', category: 'Operational',
  modelId: NONE, linkedRiskId: NONE, lef: '', lm: '',
  currency: 'NPR', status: 'draft', owner: '',
}

export default function FinancialRisk() {
  const { items, isLoading, error, save, remove, isSaving } = useFinancialRisks()
  const { models } = useModelsData()
  const { risks } = useRisksData()
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable'
  const riskTitle = (id: string) => {
    const r = risks.find(x => x.id === id)
    return r ? (r.risk_id ? `${r.risk_id} — ${r.title}` : r.title) : 'Unavailable'
  }

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<FinancialRiskRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinancialRiskRecord | null>(null)
  const [editTarget, setEditTarget] = useState<FinancialRiskRecord | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const filtered = useMemo(() => items.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || r.title.toLowerCase().includes(q) || (r.finRef ?? '').toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q)
    const ss = statusFilter === 'All' || (r.status ?? '').toLowerCase() === statusFilter.toLowerCase()
    return ms && ss
  }), [items, search, statusFilter])

  // Stats — derived from the loaded rows only. ALE totals are grouped per
  // currency so mixed-currency portfolios are never summed into a fiction.
  const aleByCurrency = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of items) {
      if (r.annualizedLossExpectancy != null) {
        m.set(r.currency, (m.get(r.currency) ?? 0) + r.annualizedLossExpectancy)
      }
    }
    return m
  }, [items])
  const totalAleLabel = aleByCurrency.size === 0
    ? '—'
    : Array.from(aleByCurrency.entries()).map(([cur, sum]) => formatMoney(sum, cur)).join(' + ')
  const quantifiedCount = items.filter(r => r.annualizedLossExpectancy != null).length
  const mitigatingCount = items.filter(r => (r.status ?? '').toLowerCase() === 'mitigating').length

  // Live FAIR computation for the dialog — displayed, never typed in.
  const lefNum = form.lef.trim() === '' ? null : Number(form.lef)
  const lmNum = form.lm.trim() === '' ? null : Number(form.lm)
  const liveFair = computeFair(
    lefNum != null && !Number.isNaN(lefNum) ? lefNum : null,
    lmNum != null && !Number.isNaN(lmNum) ? lmNum : null,
  )

  const openCreate = () => {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  const openEdit = (r: FinancialRiskRecord) => {
    setEditTarget(r)
    setForm({
      title: r.title,
      finRef: r.finRef ?? '',
      scenario: r.scenario ?? '',
      category: r.category ?? 'Operational',
      modelId: r.modelId ?? NONE,
      linkedRiskId: r.linkedRiskId ?? NONE,
      lef: r.lossEventFrequency != null ? String(r.lossEventFrequency) : '',
      lm: r.lossMagnitude != null ? String(r.lossMagnitude) : '',
      currency: r.currency || 'NPR',
      status: r.status || 'draft',
      owner: r.owner ?? '',
    })
    setShowForm(true)
    setSelected(null)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('A scenario title is required'); return }
    if (lefNum != null && (Number.isNaN(lefNum) || lefNum < 0)) { toast.error('Loss event frequency must be a non-negative number'); return }
    if (lmNum != null && (Number.isNaN(lmNum) || lmNum < 0)) { toast.error('Loss magnitude must be a non-negative number'); return }
    const nowQuantified = lefNum != null && lmNum != null
    try {
      await save({
        id: editTarget?.id,
        finRef: form.finRef.trim() || undefined,
        title: form.title.trim(),
        scenario: form.scenario.trim() || undefined,
        modelId: form.modelId === NONE ? null : form.modelId,
        linkedRiskId: form.linkedRiskId === NONE ? null : form.linkedRiskId,
        category: form.category,
        methodology: editTarget?.methodology ?? 'FAIR',
        lossEventFrequency: lefNum,
        lossMagnitude: lmNum,
        currency: form.currency,
        owner: form.owner.trim() || null,
        status: form.status,
        // The quantification timestamp reflects the write actually happening now.
        lastQuantified: nowQuantified ? new Date().toISOString().slice(0, 10) : editTarget?.lastQuantified ?? null,
        controls: editTarget?.controls ?? [],
        insurance: editTarget?.insurance ?? {},
      })
      // Success toast fires from the mutation only after the write resolved.
      setShowForm(false)
      setEditTarget(null)
      setForm({ ...EMPTY_FORM })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
      setSelected(null)
    } catch {
      // Error toast fires from the mutation.
      setDeleteTarget(null)
    }
  }

  const handleExport = () => {
    if (filtered.length === 0) { toast.error('There are no quantifications to export.'); return }
    exportCsv(
      filtered.map(r => ({
        ref: r.finRef ?? '',
        title: r.title,
        category: r.category ?? '',
        model: r.modelId ? modelName(r.modelId) : '',
        methodology: r.methodology,
        loss_event_frequency: r.lossEventFrequency ?? '',
        loss_magnitude: r.lossMagnitude ?? '',
        single_loss_expectancy: r.singleLossExpectancy ?? '',
        annualized_loss_expectancy: r.annualizedLossExpectancy ?? '',
        currency: r.currency,
        status: r.status,
        owner: r.owner ?? '',
        last_quantified: r.lastQuantified ?? '',
      })),
      `financial-risk-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    toast.success(`Exported ${filtered.length} quantification${filtered.length === 1 ? '' : 's'} as CSV`)
  }

  if (isLoading) return <PageSkeleton title="Financial Risk Quantification" showStats rows={5} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial Risk Quantification"
        subtitle="FAIR-based monetary quantification of AI risks — ALE computed from loss event frequency × loss magnitude"
        icon={HandCoins}
        actions={
          <>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={handleExport} disabled={filtered.length === 0}>
              <Export size={14} /> Export CSV
            </Button>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openCreate}>
              <Plus size={14} /> Quantify Risk
            </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load financial risks</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Stats — computed from real rows */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Quantifications', value: String(items.length), sub: `${quantifiedCount} with a computed ALE`, color: 'hsl(var(--text-1))' },
          { label: 'Total Annualized Loss Expectancy', value: totalAleLabel, sub: aleByCurrency.size > 1 ? 'Summed per currency' : 'Across all quantified scenarios', color: 'hsl(var(--destructive))' },
          { label: 'Mitigating', value: String(mitigatingCount), sub: 'Scenarios with active treatment', color: 'hsl(var(--s-wn-tx))' },
          { label: 'Draft', value: String(items.filter(r => (r.status ?? '').toLowerCase() === 'draft').length), sub: 'Awaiting quantification', color: 'hsl(var(--text-4))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quantifications…" className="pl-9" style={{ borderRadius: 0 }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="All">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-raised">
                {['Ref', 'Scenario', 'Model', 'Category', 'ALE', 'Status', 'Last Quantified', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !error ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <HandCoins size={28} className="mx-auto mb-3 opacity-40 text-[hsl(var(--text-4))]" />
                    <p className="text-sm text-[hsl(var(--text-2))]">No quantifications yet — add your first financial risk scenario.</p>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-1">ALE is computed from loss event frequency × loss magnitude when you quantify a scenario.</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-[hsl(var(--text-4))]">No quantifications match the current filters.</td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.finRef || '—'}</td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <p className="text-xs font-medium text-[hsl(var(--text-1))] truncate">{r.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.modelId
                        ? <InterlinkChip label={modelName(r.modelId)} to={`/models/inventory/${r.modelId}`} onClick={e => e.stopPropagation()} />
                        : <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.category || '—'}</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[hsl(var(--destructive))]">{formatMoney(r.annualizedLossExpectancy, r.currency)}</td>
                    <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium capitalize" style={statusStyle(r.status)}>{r.status}</span></td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{r.lastQuantified || 'Not yet quantified'}</td>
                    <td className="px-4 py-3" onClick={ev => ev.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button aria-label="View" onClick={() => setSelected(r)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-raised"><Eye size={13} /></button>
                        <button aria-label="Edit" onClick={() => openEdit(r)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-raised"><PencilSimple size={13} /></button>
                        <button aria-label="Delete" onClick={() => setDeleteTarget(r)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]"><Trash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null) }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {selected.finRef && <span className="font-mono text-xs text-[hsl(var(--brand))]">{selected.finRef}</span>}
                  <span className="text-[11px] px-2 py-0.5 font-medium capitalize" style={statusStyle(selected.status)}>{selected.status}</span>
                  <span className="text-[11px] px-2 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.methodology}</span>
                  {selected.category && <span className="text-[11px] px-2 py-0.5 bg-raised border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.category}</span>}
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>{selected.title}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {selected.scenario && (
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Scenario</p>
                    <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed p-3 bg-raised border border-[hsl(var(--border))]">{selected.scenario}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Loss Event Frequency (/yr)', value: selected.lossEventFrequency != null ? String(selected.lossEventFrequency) : '—' },
                    { label: 'Loss Magnitude', value: formatMoney(selected.lossMagnitude, selected.currency) },
                    { label: 'Single Loss Expectancy', value: formatMoney(selected.singleLossExpectancy, selected.currency) },
                    { label: 'Annualized Loss Expectancy', value: formatMoney(selected.annualizedLossExpectancy, selected.currency) },
                    { label: 'Owner', value: selected.owner || 'Unassigned' },
                    { label: 'Last Quantified', value: selected.lastQuantified || 'Not yet quantified' },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                      <p className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Model</p>
                  {selected.modelId
                    ? <InterlinkChip label={modelName(selected.modelId)} to={`/models/inventory/${selected.modelId}`} />
                    : <p className="text-xs italic text-[hsl(var(--text-4))]">No model linked to this quantification.</p>}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Linked Risk</p>
                  {selected.linkedRiskId
                    ? <InterlinkChip label={riskTitle(selected.linkedRiskId)} to={`/risks?open=${selected.linkedRiskId}`} />
                    : <p className="text-xs italic text-[hsl(var(--text-4))]">No register risk linked to this quantification.</p>}
                </div>

                {/* Controls ROI — real per-record data only */}
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ShieldCheck size={13} /> Controls
                  </p>
                  {selected.controls.length === 0 ? (
                    <p className="text-xs italic text-[hsl(var(--text-4))]">No controls recorded against this scenario yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.controls.map((c, i) => (
                        <div key={`${c.name}-${i}`} className="p-2 border border-[hsl(var(--border))]">
                          <p className="text-xs font-medium text-[hsl(var(--text-1))]">{c.name}</p>
                          <div className="grid grid-cols-2 gap-2 mt-1 text-[10px]">
                            <div>
                              <p className="text-[hsl(var(--text-4))]">Annual Cost</p>
                              <p className="font-semibold text-[hsl(var(--text-2))]">{c.annual_cost != null ? formatMoney(c.annual_cost, selected.currency) : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[hsl(var(--text-4))]">Risk Reduction</p>
                              <p className="font-semibold text-[hsl(var(--s-ok-tx))]">{c.risk_reduction_pct != null ? `${c.risk_reduction_pct}%` : '—'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Insurance — shown only when the record carries insurance data */}
                {(selected.insurance?.policy || selected.insurance?.carrier || selected.insurance?.coverage != null || selected.insurance?.deductible != null) && (
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Insurance</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Policy', value: selected.insurance.policy ?? '—' },
                        { label: 'Carrier', value: selected.insurance.carrier ?? '—' },
                        { label: 'Coverage', value: selected.insurance.coverage != null ? formatMoney(selected.insurance.coverage, selected.currency) : '—' },
                        { label: 'Deductible', value: selected.insurance.deductible != null ? formatMoney(selected.insurance.deductible, selected.currency) : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                          <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                          <p className="text-sm font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-[hsl(var(--border))] flex gap-2">
                  <Button variant="outline" style={{ borderRadius: 0 }} className="flex-1" onClick={() => openEdit(selected)}>
                    <PencilSimple size={13} /> Edit
                  </Button>
                  <Button variant="outline" style={{ borderRadius: 0, borderColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive))' }} onClick={() => setDeleteTarget(selected)}>
                    <Trash size={13} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Dialog — ALE computed live, never typed in */}
      <Dialog open={showForm} onOpenChange={o => { setShowForm(o); if (!o) setEditTarget(null) }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editTarget ? 'Edit Quantification' : 'Quantify New Risk'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Scenario Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Biased lending decisions — regulatory fine exposure" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Reference</Label>
                <Input value={form.finRef} onChange={e => setForm(f => ({ ...f, finRef: e.target.value }))} placeholder="e.g. FIN-001" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Model</Label>
              <Select value={form.modelId} onValueChange={v => setForm(f => ({ ...f, modelId: v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value={NONE}>No model</SelectItem>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Linked Risk (Risk Register)</Label>
              <Select value={form.linkedRiskId} onValueChange={v => setForm(f => ({ ...f, linkedRiskId: v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value={NONE}>No linked risk</SelectItem>
                  {risks.map(r => <SelectItem key={r.id} value={r.id}>{r.risk_id ? `${r.risk_id} — ${r.title}` : r.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Loss Event Frequency (events/yr)</Label>
                <Input type="number" min={0} step="0.01" value={form.lef} onChange={e => setForm(f => ({ ...f, lef: e.target.value }))} placeholder="e.g. 0.25" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Loss Magnitude ({form.currency})</Label>
                <Input type="number" min={0} step="1" value={form.lm} onChange={e => setForm(f => ({ ...f, lm: e.target.value }))} placeholder="e.g. 5000000" style={{ borderRadius: 0 }} />
              </div>
            </div>
            {/* Computed ALE — read-only, from computeFair */}
            <div className="flex items-center gap-3 p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
              <div className="text-xs text-[hsl(var(--text-3))]">Annualized Loss Expectancy</div>
              <div className="text-xl font-black text-[hsl(var(--text-1))]">
                {liveFair.ale != null ? formatMoney(liveFair.ale, form.currency) : '—'}
              </div>
              <div className="text-[11px] text-[hsl(var(--text-4))]">
                {liveFair.ale != null ? 'Computed as LEF × loss magnitude' : 'Enter LEF and loss magnitude to compute'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['NPR', 'USD', 'EUR', 'GBP', 'INR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Owner</Label>
                <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g. Risk lead" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Scenario Description</Label>
              <Textarea value={form.scenario} onChange={e => setForm(f => ({ ...f, scenario: e.target.value }))} rows={3} placeholder="FAIR model assumptions, data sources, and the loss scenario…" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={isSaving} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus size={14} />{isSaving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Quantification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Quantification"
        message={`Delete ${deleteTarget?.finRef ? `${deleteTarget.finRef} — ` : ''}"${deleteTarget?.title}"? This removes the FAIR quantification permanently.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
