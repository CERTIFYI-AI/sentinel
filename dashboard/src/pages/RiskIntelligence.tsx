// Regulatory Intelligence — backed by the org-scoped regulation_entries table
// (useRegulationEntries). Every figure on this page is derived from the loaded
// rows; deadlines are computed at render time via daysUntil(), and models in
// scope resolve through ai_models.id → InterlinkChip. Writes go through the
// hook (services throw; success toasts fire only from onSuccess).
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, ArrowSquareOut, MagnifyingGlass, Download, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { exportCsv } from '@/lib/exportUtils'
import { useRegulationEntries } from '@/hooks/useRiskIncidents'
import { useModelsData } from '@/hooks/useModelsData'
import { daysUntil, type RegulationEntryRecord } from '@/services/riskGroupService'
import { safeExternalUrl } from '@/lib/url';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  enacted:  { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  guidance: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  draft:    { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}
const statusStyle = (s?: string): React.CSSProperties =>
  STATUS_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

const OB_STYLE: Record<string, React.CSSProperties> = {
  mapped:   { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  unmapped: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  partial:  { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  exempt:   { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
}
const obStyle = (s?: string): React.CSSProperties =>
  OB_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

function DeadlineBadge({ effectiveOn }: { effectiveOn?: string | null }) {
  const d = daysUntil(effectiveOn)
  if (d == null) return null
  if (d < 0) return <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]">In force</span>
  if (d <= 90) return <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--destructive))] font-semibold">{d}d until effective</span>
  return <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{d}d until effective</span>
}

function gapColor(gap: number): string {
  if (gap <= 20) return 'hsl(var(--s-ok-tx))'
  if (gap <= 50) return 'hsl(var(--s-wn-tx))'
  return 'hsl(var(--destructive))'
}

const EMPTY_FORM = {
  name: '', jurisdiction: '', status: 'Draft', effectiveOn: '',
  relevanceScore: '', owner: '', sourceUrl: '', requirementsSummary: '',
}

export default function RiskIntelligence() {
  const { items, isLoading, error, save, isSaving } = useRegulationEntries()
  const { models } = useModelsData()
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<RegulationEntryRecord | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const statuses = useMemo(
    () => Array.from(new Set(items.map(r => r.status).filter(Boolean))).sort() as string[],
    [items],
  )

  const filtered = useMemo(() => items.filter(r => {
    const q = search.toLowerCase()
    const ms = !q || r.name.toLowerCase().includes(q) || (r.jurisdiction ?? '').toLowerCase().includes(q) || (r.regulationRef ?? '').toLowerCase().includes(q)
    const ss = statusFilter === 'All' || r.status === statusFilter
    return ms && ss
  }), [items, search, statusFilter])

  // Stats — derived from the loaded rows only
  const totalObligations = items.reduce((s, r) => s + r.obligations.length, 0)
  const mappedObligations = items.reduce((s, r) => s + r.obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length, 0)
  const inForce = items.filter(r => { const d = daysUntil(r.effectiveOn); return d != null && d < 0 }).length
  const withGap = items.filter(r => r.gapPercent != null)
  const avgGap = withGap.length > 0 ? Math.round(withGap.reduce((s, r) => s + (r.gapPercent ?? 0), 0) / withGap.length) : null

  const handleExport = () => {
    if (items.length === 0) { toast.error('There are no regulation entries to export yet.'); return }
    exportCsv(
      items.map(r => ({
        ref: r.regulationRef ?? '',
        name: r.name,
        jurisdiction: r.jurisdiction ?? '',
        status: r.status ?? '',
        effective_on: r.effectiveOn ?? '',
        days_until_effective: daysUntil(r.effectiveOn) ?? '',
        relevance_score: r.relevanceScore ?? '',
        obligations_total: r.obligations.length,
        obligations_mapped: r.obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length,
        gap_percent: r.gapPercent ?? '',
        models_in_scope: (r.linkedModelIds ?? []).map(modelName).join('; '),
        owner: r.owner ?? '',
        source_url: r.sourceUrl ?? '',
        summary: r.requirementsSummary ?? '',
      })),
      `regulatory-brief-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    // The download genuinely happened at this point — the toast is honest.
    toast.success(`Exported ${items.length} regulation ${items.length === 1 ? 'entry' : 'entries'} as CSV`)
  }

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Regulation name is required'); return }
    const relevance = form.relevanceScore.trim() === '' ? null : Number(form.relevanceScore)
    if (relevance != null && (Number.isNaN(relevance) || relevance < 0 || relevance > 100)) {
      toast.error('Relevance score must be a number between 0 and 100'); return
    }
    try {
      await save({
        name: form.name.trim(),
        jurisdiction: form.jurisdiction.trim() || undefined,
        status: form.status,
        effectiveOn: form.effectiveOn || null,
        relevanceScore: relevance,
        requirementsSummary: form.requirementsSummary.trim() || null,
        obligations: [],
        alertOnChange: true,
        owner: form.owner.trim() || null,
        sourceUrl: form.sourceUrl.trim() || null,
        linkedModelIds: [],
        linkedRiskIds: [],
      })
      // Success toast fires from the mutation only after the write resolved.
      setAddOpen(false)
      setForm({ ...EMPTY_FORM })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  if (isLoading) return <PageSkeleton title="Regulatory Intelligence" showStats rows={5} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regulatory Intelligence"
        subtitle="Tracked regulations, extracted obligations, and model scope — backed by the regulation register"
        icon={Globe}
        actions={
          <>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={handleExport} disabled={items.length === 0}>
              <Download size={14} /> Export Brief
            </Button>
            <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Regulation
            </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load regulation entries</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Stats — computed from real rows */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Regulations Tracked', value: String(items.length), sub: `${inForce} already in force`, color: 'hsl(var(--brand))' },
          { label: 'Obligations Extracted', value: String(totalObligations), sub: `${mappedObligations} mapped to controls`, color: 'hsl(var(--text-1))' },
          { label: 'Unmapped Obligations', value: String(totalObligations - mappedObligations), sub: 'Require control mapping', color: totalObligations - mappedObligations > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Average Compliance Gap', value: avgGap != null ? `${avgGap}%` : '—', sub: avgGap != null ? `Across ${withGap.length} assessed ${withGap.length === 1 ? 'regulation' : 'regulations'}` : 'No gap assessments recorded yet', color: avgGap != null ? gapColor(avgGap) : 'hsl(var(--text-4))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Cross-reference to the Reg Radar module */}
      <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-4))]">
        <span>Looking for horizon scanning and upcoming regulatory changes?</span>
        <Link to="/reg-radar" className="inline-flex items-center gap-1 text-[hsl(var(--brand))] hover:underline">
          Open Reg Radar <ArrowSquareOut size={12} />
        </Link>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regulations…" className="pl-9" style={{ borderRadius: 0 }} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="All">All statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Regulation feed */}
      {items.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-14 text-center">
          <Globe size={28} className="mx-auto mb-3 opacity-40 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-2))]">No regulations tracked yet.</p>
          <p className="text-xs text-[hsl(var(--text-4))] mt-1">
            Use &quot;Add Regulation&quot; to start tracking obligations and model scope, or browse <Link to="/reg-radar" className="underline text-[hsl(var(--brand))]">Reg Radar</Link> for upcoming changes.
          </p>
        </div>
      ) : filtered.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-10 text-center">
          <p className="text-sm text-[hsl(var(--text-4))]">No regulations match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reg => {
            const mapped = reg.obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length
            return (
              <div key={reg.id} onClick={() => setSelected(reg)} className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {reg.regulationRef && <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{reg.regulationRef}</span>}
                      {reg.status && <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(reg.status)}>{reg.status}</span>}
                      {reg.jurisdiction && <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{reg.jurisdiction}</span>}
                      <DeadlineBadge effectiveOn={reg.effectiveOn} />
                    </div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{reg.name}</h3>
                    {reg.requirementsSummary && <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 line-clamp-2">{reg.requirementsSummary}</p>}
                    {(reg.linkedModelIds ?? []).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-[hsl(var(--text-4))]">Models in scope:</span>
                        {(reg.linkedModelIds ?? []).map(id => (
                          <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} onClick={e => e.stopPropagation()} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    {reg.effectiveOn && <p className="text-xs text-[hsl(var(--text-4))]">Effective: {reg.effectiveOn}</p>}
                    <p className="text-xs text-[hsl(var(--text-3))]">{reg.obligations.length} {reg.obligations.length === 1 ? 'obligation' : 'obligations'}</p>
                    {reg.relevanceScore != null && <p className="text-xs text-[hsl(var(--text-3))]">Relevance: <span className="font-semibold text-[hsl(var(--text-1))]">{reg.relevanceScore}</span></p>}
                  </div>
                </div>
                {reg.gapPercent != null ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-[hsl(var(--text-4))]">{mapped}/{reg.obligations.length} obligations mapped</p>
                      <p className="text-[10px] font-semibold" style={{ color: gapColor(reg.gapPercent) }}>{reg.gapPercent}% gap</p>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, 100 - reg.gapPercent))}%`, background: gapColor(reg.gapPercent) }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[hsl(var(--text-4))] mt-3 italic">Gap not assessed yet.</p>
                )}
                {(reg.owner || reg.sourceUrl) && (
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[hsl(var(--border))]">
                    {reg.owner && <span className="text-[10px] text-[hsl(var(--text-4))]">Owner: {reg.owner}</span>}
                    {reg.sourceUrl && (
                      <a href={safeExternalUrl(reg.sourceUrl) ?? undefined} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-[hsl(var(--brand))] hover:underline inline-flex items-center gap-1">
                        Source <ArrowSquareOut size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null) }}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {selected.regulationRef && <span className="font-mono text-xs text-[hsl(var(--brand))]">{selected.regulationRef}</span>}
                  {selected.status && <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(selected.status)}>{selected.status}</span>}
                  <DeadlineBadge effectiveOn={selected.effectiveOn} />
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>{selected.name}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {selected.requirementsSummary && (
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.requirementsSummary}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Jurisdiction', value: selected.jurisdiction ?? '—' },
                    { label: 'Effective Date', value: selected.effectiveOn ?? '—' },
                    { label: 'Relevance Score', value: selected.relevanceScore != null ? String(selected.relevanceScore) : '—' },
                    { label: 'Compliance Gap', value: selected.gapPercent != null ? `${selected.gapPercent}%` : 'Not assessed' },
                    { label: 'Owner', value: selected.owner ?? '—' },
                    { label: 'Obligations', value: String(selected.obligations.length) },
                  ].map(f => (
                    <div key={f.label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{f.label}</p>
                      <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Obligations</p>
                  {selected.obligations.length === 0 ? (
                    <p className="text-xs italic text-[hsl(var(--text-4))]">No obligations extracted yet for this regulation.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.obligations.map((ob, i) => (
                        <div key={`${ob.ref}-${i}`} className="p-3 bg-raised border border-[hsl(var(--border))]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{ob.ref}</span>
                            <span className="text-[10px] px-1.5 py-0.5 font-medium" style={obStyle(ob.status)}>{ob.status}</span>
                          </div>
                          <p className="text-xs text-[hsl(var(--text-2))] leading-relaxed">{ob.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Models in Scope</p>
                  {(selected.linkedModelIds ?? []).length === 0 ? (
                    <p className="text-xs italic text-[hsl(var(--text-4))]">No models linked to this regulation yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.linkedModelIds ?? []).map(id => (
                        <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                      ))}
                    </div>
                  )}
                </div>

                {(selected.linkedRiskIds ?? []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Linked Risks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.linkedRiskIds ?? []).map(id => (
                        <InterlinkChip key={id} label="Open in Risk Register" to={`/risks?open=${id}`} />
                      ))}
                    </div>
                  </div>
                )}

                {selected.sourceUrl && (
                  <a href={safeExternalUrl(selected.sourceUrl) ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline">
                    View official source <ArrowSquareOut size={12} />
                  </a>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Regulation Dialog — persists via save() (write throws on failure) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Regulation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Regulation Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. EU AI Act" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Jurisdiction</Label>
                <Input value={form.jurisdiction} onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))} placeholder="e.g. European Union" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Enacted', 'Guidance', 'Draft'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Effective Date</Label>
                <Input type="date" value={form.effectiveOn} onChange={e => setForm(f => ({ ...f, effectiveOn: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Relevance Score (0–100)</Label>
                <Input type="number" min={0} max={100} value={form.relevanceScore} onChange={e => setForm(f => ({ ...f, relevanceScore: e.target.value }))} placeholder="e.g. 85" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Owner</Label>
                <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="e.g. Compliance lead" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Source URL</Label>
                <Input value={form.sourceUrl} onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))} placeholder="https://…" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Requirements Summary</Label>
              <Textarea value={form.requirementsSummary} onChange={e => setForm(f => ({ ...f, requirementsSummary: e.target.value }))} rows={3} placeholder="What this regulation requires and why it is relevant…" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isSaving} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              <Plus size={14} />{isSaving ? 'Saving…' : 'Add Regulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
