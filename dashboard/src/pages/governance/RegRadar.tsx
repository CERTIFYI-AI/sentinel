// Regulatory Radar — horizon view over the org-scoped regulation_entries
// register (the same table Risk Intelligence reads). Deadlines are computed at
// render time via daysUntil(), obligation progress comes from the obligations
// jsonb, and models in scope resolve through ai_models.id → InterlinkChip.
// Writes go through useRegulationEntries (services throw; success toasts fire
// only from the mutation's onSuccess).
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Broadcast as Radar, ArrowSquareOut, Plus, PencilSimple, Trash, Globe } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { useRegulationEntries } from '@/hooks/useRiskIncidents'
import { useModelsData } from '@/hooks/useModelsData'
import { daysUntil, type RegulationEntryRecord } from '@/services/riskGroupService'

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  enacted:  { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  guidance: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  draft:    { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}
const statusStyle = (s?: string): React.CSSProperties =>
  STATUS_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

function HorizonBadge({ effectiveOn }: { effectiveOn?: string | null }) {
  const d = daysUntil(effectiveOn)
  if (d == null) return <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">No date set</span>
  if (d < 0) return <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]">In force</span>
  if (d <= 90) return <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--destructive))] font-semibold">{d}d until effective</span>
  return <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{d}d until effective</span>
}

interface RegForm {
  name: string; jurisdiction: string; status: string; effectiveOn: string
  relevanceScore: string; owner: string; sourceUrl: string; requirementsSummary: string
}
const EMPTY_FORM: RegForm = {
  name: '', jurisdiction: '', status: 'Draft', effectiveOn: '',
  relevanceScore: '', owner: '', sourceUrl: '', requirementsSummary: '',
}

export default function RegRadar() {
  const navigate = useNavigate()
  const { items, isLoading, error, save, remove, isSaving } = useRegulationEntries()
  const { models } = useModelsData()
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable'

  const [statusFilter, setStatusFilter] = useState('all')
  const [jurisdictionFilter, setJurisdictionFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RegulationEntryRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RegulationEntryRecord | null>(null)
  const [form, setForm] = useState<RegForm>({ ...EMPTY_FORM })

  const jurisdictions = useMemo(
    () => Array.from(new Set(items.map(r => r.jurisdiction).filter(Boolean))).sort() as string[],
    [items],
  )
  const statuses = useMemo(
    () => Array.from(new Set(items.map(r => r.status).filter(Boolean))).sort() as string[],
    [items],
  )

  // Horizon view: nearest effective date first (computed, never stored);
  // entries already in force sink below upcoming ones, undated entries last.
  const sorted = useMemo(() => {
    const filtered = items.filter(r =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (jurisdictionFilter === 'all' || r.jurisdiction === jurisdictionFilter))
    const rank = (r: RegulationEntryRecord) => {
      const d = daysUntil(r.effectiveOn)
      if (d == null) return Number.MAX_SAFE_INTEGER      // no date → last
      if (d < 0) return 1_000_000 - d                    // in force → after upcoming
      return d                                           // upcoming → soonest first
    }
    return [...filtered].sort((a, b) => rank(a) - rank(b))
  }, [items, statusFilter, jurisdictionFilter])

  // Stats — derived from the loaded rows only.
  const inForce = items.filter(r => { const d = daysUntil(r.effectiveOn); return d != null && d < 0 }).length
  const due90 = items.filter(r => { const d = daysUntil(r.effectiveOn); return d != null && d >= 0 && d <= 90 }).length
  const totalObligations = items.reduce((s, r) => s + r.obligations.length, 0)
  const mappedObligations = items.reduce((s, r) => s + r.obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length, 0)

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true) }
  const openEdit = (r: RegulationEntryRecord) => {
    setEditing(r)
    setForm({
      name: r.name, jurisdiction: r.jurisdiction ?? '', status: r.status ?? 'Draft',
      effectiveOn: r.effectiveOn ?? '', relevanceScore: r.relevanceScore != null ? String(r.relevanceScore) : '',
      owner: r.owner ?? '', sourceUrl: r.sourceUrl ?? '', requirementsSummary: r.requirementsSummary ?? '',
    })
    setDialogOpen(true)
  }

  // Persists via save() — the row id is the uuid the DB minted (no client
  // REG- id fabrication); edits keep obligations and links untouched.
  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Regulation name is required'); return }
    const relevance = form.relevanceScore.trim() === '' ? null : Number(form.relevanceScore)
    if (relevance != null && (Number.isNaN(relevance) || relevance < 0 || relevance > 100)) {
      toast.error('Relevance score must be a number between 0 and 100'); return
    }
    try {
      await save({
        ...(editing ?? { obligations: [], alertOnChange: true, linkedModelIds: [], linkedRiskIds: [] }),
        name: form.name.trim(),
        jurisdiction: form.jurisdiction.trim() || undefined,
        status: form.status,
        effectiveOn: form.effectiveOn || null,
        relevanceScore: relevance,
        requirementsSummary: form.requirementsSummary.trim() || null,
        owner: form.owner.trim() || null,
        sourceUrl: form.sourceUrl.trim() || null,
      })
      // Success toast fires from the mutation only after the write resolved.
      setDialogOpen(false)
      setEditing(null)
      setForm({ ...EMPTY_FORM })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) { setDeleteTarget(null); return }
    try { await remove(deleteTarget.id) } catch { /* error toast from the mutation */ }
    setDeleteTarget(null)
  }

  if (isLoading) return <PageSkeleton title="Regulatory Radar" showStats rows={5} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regulatory Radar"
        subtitle="Horizon scanning over the regulation register — deadlines computed from effective dates, obligations from the register itself"
        icon={Radar}
        actions={
          <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openCreate}>
            <Plus size={14} /> Add Regulation
          </Button>
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
          { label: 'Regulations Tracked', value: String(items.length), sub: `${jurisdictions.length} ${jurisdictions.length === 1 ? 'jurisdiction' : 'jurisdictions'}`, color: 'hsl(var(--brand))' },
          { label: 'Effective Within 90 Days', value: String(due90), sub: 'Computed from effective dates', color: due90 > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' },
          { label: 'Already In Force', value: String(inForce), sub: 'Effective date has passed', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Obligations Mapped', value: totalObligations > 0 ? `${mappedObligations}/${totalObligations}` : '—', sub: totalObligations > 0 ? 'Across all tracked regulations' : 'No obligations extracted yet', color: 'hsl(var(--text-1))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Cross-link: same register, risk lens */}
      <Link to="/risk-intelligence" className="flex items-center justify-between rounded border border-[hsl(var(--border))] bg-surface p-3 hover:border-[hsl(var(--brand)/0.4)] transition-colors">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-[hsl(var(--brand))]" />
          <div>
            <p className="text-xs font-semibold text-[hsl(var(--text-1))]">Risk lens on the same register</p>
            <p className="text-[11px] text-[hsl(var(--text-4))]">Regulatory Intelligence shows gap tracking and control mapping for these same entries.</p>
          </div>
        </div>
        <ArrowSquareOut size={14} className="text-[hsl(var(--brand))]" />
      </Link>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={jurisdictionFilter} onValueChange={setJurisdictionFilter}>
          <SelectTrigger className="w-[190px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All jurisdictions</SelectItem>
            {jurisdictions.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto text-[hsl(var(--text-4))]">{sorted.length} of {items.length} regulations</span>
      </div>

      {/* Horizon list */}
      {items.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-14 text-center">
          <Radar size={28} className="mx-auto mb-3 opacity-40 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-2))]">No regulations tracked yet.</p>
          <p className="text-xs text-[hsl(var(--text-4))] mt-1">
            Use &quot;Add Regulation&quot; to start the horizon scan, or open <Link to="/risk-intelligence" className="underline text-[hsl(var(--brand))]">Regulatory Intelligence</Link> for the risk view of the register.
          </p>
        </div>
      ) : sorted.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-10 text-center">
          <p className="text-sm text-[hsl(var(--text-4))]">No regulations match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(reg => {
            const mapped = reg.obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length
            return (
              <div
                key={reg.id}
                onClick={() => reg.id && navigate(`/reg-radar/${reg.id}`)}
                className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {reg.regulationRef && <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{reg.regulationRef}</span>}
                      {reg.status && <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(reg.status)}>{reg.status}</span>}
                      {reg.jurisdiction && <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{reg.jurisdiction}</span>}
                      <HorizonBadge effectiveOn={reg.effectiveOn} />
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
                    {reg.owner && <p className="text-xs text-[hsl(var(--text-4))]">Owner: {reg.owner}</p>}
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} aria-label={`Edit ${reg.name}`} onClick={() => openEdit(reg)}>
                        <PencilSimple size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: 'hsl(var(--destructive))' }} aria-label={`Delete ${reg.name}`} onClick={() => setDeleteTarget(reg)}>
                        <Trash size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Obligation progress — from the obligations jsonb, never invented */}
                {reg.obligations.length > 0 ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-[hsl(var(--text-4))]">{mapped}/{reg.obligations.length} obligations mapped</p>
                      <p className="text-[10px] text-[hsl(var(--text-4))]">{Math.round((mapped / reg.obligations.length) * 100)}%</p>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(mapped / reg.obligations.length) * 100}%`, background: 'hsl(var(--brand))' }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[hsl(var(--text-4))] mt-3 italic">No obligations extracted yet.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit dialog — persists via save() (write throws on failure) */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editing ? 'Edit Regulation' : 'Add Regulation'}</DialogTitle>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Add Regulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm — the row disappears only after the delete persisted */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Regulation</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong> from the register? Obligations and model links on this entry are removed with it. This cannot be undone.
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
