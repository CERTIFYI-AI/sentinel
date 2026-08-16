// Transparency Reports — backed by the org-scoped transparency_reports table
// via useTransparencyReports (writes throw; success toasts fire only from the
// mutation's onSuccess). The governance mesh's NarrativeEngineAgent writes
// rows here too: those show generated_by + event_id, labelled honestly. Models
// resolve through ai_models.id → InterlinkChip; Download hands over the real
// stored content, and Publish is an awaited write.
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Plus, MagnifyingGlass, PencilSimple, Trash, DownloadSimple, Cube, X, Robot } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { PageHeader } from '../components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { useTransparencyReports } from '@/hooks/useComplianceGroup'
import { useModelsData } from '@/hooks/useModelsData'
import type { TransparencyReportRecord } from '@/services/regulatoryOpsService'

const prettifyStatus = (s?: string) => {
  const v = (s ?? 'DRAFT').toUpperCase()
  return v.charAt(0) + v.slice(1).toLowerCase()
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PUBLISHED: { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  DRAFT:     { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}
const statusStyle = (s?: string): React.CSSProperties =>
  STATUS_STYLE[(s ?? 'DRAFT').toUpperCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

interface ReportForm {
  title: string; audience: string; reportType: string
  content: string; version: string; modelId: string
}
const EMPTY_FORM: ReportForm = { title: '', audience: '', reportType: '', content: '', version: '1.0', modelId: '' }

export default function TransparencyReports() {
  const { items, isLoading, error, save, remove, isSaving } = useTransparencyReports()
  const { models } = useModelsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable'

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TransparencyReportRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TransparencyReportRecord | null>(null)
  const [form, setForm] = useState<ReportForm>({ ...EMPTY_FORM })
  const [deleteTarget, setDeleteTarget] = useState<TransparencyReportRecord | null>(null)
  const [publishing, setPublishing] = useState(false)

  // ?model=<uuid> deep link — dismissible filter chip.
  const modelParam = searchParams.get('model')
  const modelFilter = modelParam ? models.find(m => m.id === modelParam) : undefined
  const clearModelFilter = () =>
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('model'); return next }, { replace: true })

  // ?open=<id> deep link → open that report's detail sheet once loaded.
  useEffect(() => {
    const openId = searchParams.get('open')
    if (!openId || items.length === 0) return
    const record = items.find(r => r.id === openId)
    if (record) setSelected(record)
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('open'); return next }, { replace: true })
  }, [items, searchParams, setSearchParams])

  const filtered = useMemo(() => items.filter(r => {
    if (modelParam && r.modelId !== modelParam) return false
    const q = search.toLowerCase()
    return !q || r.title.toLowerCase().includes(q) || (r.audience ?? '').toLowerCase().includes(q) || (r.reportType ?? '').toLowerCase().includes(q)
  }), [items, search, modelParam])

  // KPIs — derived from loaded rows only.
  const published = items.filter(r => (r.status ?? '').toUpperCase() === 'PUBLISHED').length
  const drafts = items.filter(r => (r.status ?? '').toUpperCase() !== 'PUBLISHED').length
  const meshGenerated = items.filter(r => !!r.generatedBy).length

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true) }
  const openEdit = (r: TransparencyReportRecord) => {
    setEditing(r)
    setForm({
      title: r.title, audience: r.audience ?? '', reportType: r.reportType ?? '',
      content: r.content ?? '', version: r.version ?? '1.0', modelId: r.modelId ?? '',
    })
    setSelected(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Report title is required'); return }
    try {
      await save({
        ...(editing ?? { status: 'DRAFT' }),
        title: form.title.trim(),
        audience: form.audience.trim() || undefined,
        reportType: form.reportType.trim() || undefined,
        content: form.content || null,
        version: form.version.trim() || null,
        modelId: form.modelId || null,
      })
      // Success toast fires from the mutation only after the write resolved.
      setDialogOpen(false)
      setEditing(null)
      setForm({ ...EMPTY_FORM })
    } catch {
      // Error toast fires from the mutation; keep the dialog open.
    }
  }

  // Publish — awaited write; the sheet reflects the new state via the cache.
  const publish = async (r: TransparencyReportRecord) => {
    setPublishing(true)
    try {
      const saved = await save({ ...r, status: 'PUBLISHED', publishedAt: new Date().toISOString() })
      setSelected(saved)
    } catch {
      // Error toast fires from the mutation.
    } finally {
      setPublishing(false)
    }
  }

  // Download — a real Blob of the stored content text, nothing synthesized.
  const download = (r: TransparencyReportRecord) => {
    if (!r.content) { toast.error('This report has no content to download yet.'); return }
    const blob = new Blob([r.content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${r.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}${r.version ? `-v${r.version}` : ''}.txt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) { setDeleteTarget(null); return }
    try { await remove(deleteTarget.id); setSelected(null) } catch { /* error toast from the mutation */ }
    setDeleteTarget(null)
  }

  if (isLoading) return <PageSkeleton title="Transparency Reports" showStats rows={6} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transparency Reports"
        subtitle="Transparency disclosures per EU AI Act Articles 13 and 50 — written by the team and by the governance mesh's narrative engine"
        icon={FileText}
        actions={
          <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openCreate}>
            <Plus size={14} /> New Report
          </Button>
        }
      />

      {error && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load transparency reports</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* KPIs — derived from loaded rows */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: String(items.length), sub: 'In the register', color: 'hsl(var(--text-1))' },
          { label: 'Published', value: String(published), sub: 'Visible to their audience', color: 'hsl(var(--s-ok-tx))' },
          { label: 'Drafts', value: String(drafts), sub: 'Not yet published', color: 'hsl(var(--s-wn-tx))' },
          { label: 'Mesh-Generated', value: String(meshGenerated), sub: 'Written by governance agents', color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Model deep-link filter chip */}
      {modelParam && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--border))' }}>
          <Cube size={14} style={{ color: 'hsl(var(--brand))' }} />
          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
            Showing reports for <strong style={{ color: 'hsl(var(--brand))' }}>{modelFilter ? modelFilter.name : 'Unavailable'}</strong>
          </span>
          <button onClick={clearModelFilter} aria-label="Clear model filter" className="ml-auto text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" className="pl-9" style={{ borderRadius: 0 }} />
      </div>

      {/* Table */}
      {items.length === 0 && !error ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="No transparency reports yet"
          description="Draft one here, or let the governance mesh's narrative engine generate one from a risk or incident event."
          action={<Button onClick={openCreate} style={{ borderRadius: 0 }}><Plus size={14} /> New Report</Button>}
        />
      ) : filtered.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-10 text-center">
          <p className="text-sm text-[hsl(var(--text-4))]">No reports match the current filters.</p>
        </div>
      ) : (
        <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-raised))' }}>
                {['Title', 'Audience', 'Model', 'Status', 'Version', 'Published', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setSelected(r)} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer transition-colors">
                  <td className="px-3 py-2.5 font-medium text-[hsl(var(--text-1))] max-w-[280px]">
                    <span className="truncate block">{r.title}</span>
                    {r.generatedBy && (
                      <span className="inline-flex items-center gap-1 text-[10px] mt-0.5" style={{ color: 'hsl(var(--brand))' }}>
                        <Robot size={11} /> Generated by the governance mesh
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.audience
                      ? <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-3))] uppercase tracking-wide">{r.audience}</span>
                      : <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
                  </td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    {r.modelId
                      ? <InterlinkChip label={modelName(r.modelId)} to={`/models/inventory/${r.modelId}`} />
                      : <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(r.status)}>{prettifyStatus(r.status)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--text-3))]">{r.version ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{r.publishedAt ? r.publishedAt.slice(0, 10) : '—'}</td>
                  <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" aria-label={`Edit ${r.title}`} onClick={() => openEdit(r)}><PencilSimple size={14} /></Button>
                      <Button variant="ghost" size="sm" aria-label={`Delete ${r.title}`} className="text-[hsl(var(--destructive))]" onClick={() => setDeleteTarget(r)}><Trash size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet — the real stored content */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null) }}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(selected.status)}>{prettifyStatus(selected.status)}</span>
                  {selected.audience && <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))] uppercase tracking-wide">{selected.audience}</span>}
                  {selected.version && <span className="text-[10px] font-mono text-[hsl(var(--text-4))]">v{selected.version}</span>}
                </div>
                <SheetTitle className="text-base" style={{ color: 'hsl(var(--text-1))' }}>{selected.title}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {selected.generatedBy && (
                  <div className="flex items-start gap-2 p-3" style={{ background: 'hsl(var(--brand-subtle))', border: '1px solid hsl(var(--border))' }}>
                    <Robot size={15} style={{ color: 'hsl(var(--brand))', marginTop: 1, flexShrink: 0 }} />
                    <div className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
                      <p className="font-semibold" style={{ color: 'hsl(var(--brand))' }}>Generated by the governance mesh</p>
                      <p className="mt-0.5">Agent: <span className="font-mono">{selected.generatedBy}</span></p>
                      {selected.eventId && <p>Triggering event: <span className="font-mono">{selected.eventId}</span></p>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Report Type', value: selected.reportType ?? '—' },
                    { label: 'Published At', value: selected.publishedAt ? new Date(selected.publishedAt).toLocaleString() : 'Not published' },
                    { label: 'Created', value: selected.createdAt ? selected.createdAt.slice(0, 10) : '—' },
                    { label: 'External URL', value: selected.url ?? '—' },
                  ].map(fld => (
                    <div key={fld.label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{fld.label}</p>
                      <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5 break-all">{fld.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Model</p>
                  {selected.modelId ? (
                    <InterlinkChip label={modelName(selected.modelId)} to={`/models/inventory/${selected.modelId}`} />
                  ) : (
                    <p className="text-xs italic text-[hsl(var(--text-4))]">Not linked to a model.</p>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Content</p>
                  {selected.content ? (
                    <pre className="text-xs p-3 whitespace-pre-wrap break-words leading-relaxed" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontFamily: 'inherit' }}>
                      {selected.content}
                    </pre>
                  ) : (
                    <p className="text-xs italic text-[hsl(var(--text-4))]">No content written yet — edit the report to add it.</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))] flex-wrap">
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => openEdit(selected)}>
                    <PencilSimple size={14} /> Edit
                  </Button>
                  {(selected.status ?? '').toUpperCase() !== 'PUBLISHED' && (
                    <Button
                      size="sm"
                      style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                      disabled={publishing}
                      onClick={() => publish(selected)}
                    >
                      {publishing ? 'Publishing…' : 'Publish'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" style={{ borderRadius: 0 }} disabled={!selected.content} onClick={() => download(selected)}>
                    <DownloadSimple size={14} /> Download
                  </Button>
                  <Button size="sm" variant="outline" className="text-[hsl(var(--destructive))]" style={{ borderRadius: 0 }} onClick={() => setDeleteTarget(selected)}>
                    <Trash size={14} /> Delete
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null) }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 620 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editing ? 'Edit Report' : 'New Transparency Report'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Credit Risk Scorer — public transparency report" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Audience</Label>
                <Input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder="e.g. public, regulator, board" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Report Type</Label>
                <Input value={form.reportType} onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))} placeholder="e.g. system_transparency, annual_summary" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Model</Label>
                <Select value={form.modelId || 'none'} onValueChange={v => setForm(f => ({ ...f, modelId: v === 'none' ? '' : v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No linked model" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value="none">No linked model</SelectItem>
                    {models.map(m => <SelectItem key={m.id} value={m.id!}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Version</Label>
                <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Content</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={8} placeholder="The disclosure text as it will be published…" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Report</AlertDialogTitle>
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
