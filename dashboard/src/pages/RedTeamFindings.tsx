// SPDX-License-Identifier: Apache-2.0
// Red Team Findings — adversarial testing results on the platform contract.
// Reads/writes the org-scoped red_team_findings table via useFindings() (writes
// throw; the hook fires the real success/error toast). The affected model is
// stored as an ai_models.id uuid and resolved to a name at render; the picker
// selects real registry models. No fabricated dollar impacts, no hardcoded dates.

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bug, MagnifyingGlass, Plus, Eye, X, CheckCircle, PencilSimple, Trash } from '@phosphor-icons/react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { InterlinkChip } from '../components/ui/InterlinkChip'
import { PageHeader } from '../components/ui/PageHeader'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { useFindings } from '../hooks/useSecurityGroup'
import { useModelsData } from '../hooks/useModelsData'
import type { FindingRecord } from '../services/securityGroupService'

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const STATUSES = ['Open', 'In Remediation', 'Resolved', 'Accepted Risk']
const VECTORS = [
  'Prompt Injection', 'Jailbreak', 'Model Extraction', 'Data Poisoning', 'Adversarial Input',
  'Membership Inference', 'Training Data Leakage', 'Supply Chain', 'API Abuse', 'Evasion Attack',
]
const OWASP = [
  'LLM01: Prompt Injection', 'LLM02: Insecure Output Handling', 'LLM03: Training Data Poisoning',
  'LLM04: Model Denial of Service', 'LLM05: Supply Chain Vulnerabilities', 'LLM06: Sensitive Information Disclosure',
  'LLM07: Insecure Plugin Design', 'LLM08: Excessive Agency', 'LLM09: Overreliance', 'LLM10: Model Theft',
]
const NONE = '__none'

const SEV: Record<string, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
}
const STS: Record<string, { bg: string; color: string }> = {
  Open: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  'In Remediation': { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Resolved: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  'Accepted Risk': { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
}
const sevStyle = (s?: string) => SEV[s ?? ''] ?? { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }
const stsStyle = (s?: string) => STS[s ?? ''] ?? { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }

const BLANK = {
  findingRef: '', title: '', description: '', severity: 'Medium', status: 'Open',
  attackVector: 'Prompt Injection', owaspLlmRef: '', cvss: '', modelId: NONE,
  impact: '', recommendation: '', remediationOwner: '', discoveredBy: '', campaignId: '',
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
const cvssColor = (v?: number | null) => (v == null ? 'hsl(var(--text-4))' : v >= 9 ? 'hsl(var(--destructive))' : v >= 7 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))')

export default function RedTeamFindings() {
  const { items, isLoading, error, save, remove, isSaving } = useFindings()
  const { models } = useModelsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')

  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<FindingRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...BLANK })
  const [deleteTarget, setDeleteTarget] = useState<FindingRecord | null>(null)

  const findings = items as FindingRecord[]
  const modelName = (id?: string | null) => (id ? (models.find(m => m.id === id)?.name ?? 'Unavailable') : null)

  const scoped = useMemo(
    () => (modelParam ? findings.filter(f => f.modelId === modelParam) : findings),
    [findings, modelParam],
  )

  const filtered = useMemo(() => scoped.filter(f => {
    const q = search.toLowerCase()
    const ms = !q || (f.title ?? '').toLowerCase().includes(q) || (f.findingRef ?? '').toLowerCase().includes(q) || (modelName(f.modelId) ?? '').toLowerCase().includes(q)
    return ms && (sevFilter === 'All' || f.severity === sevFilter) && (statusFilter === 'All' || f.status === statusFilter)
  }), [scoped, search, sevFilter, statusFilter, models])

  const withCvss = scoped.filter(f => f.cvss != null)
  const stats = {
    open: scoped.filter(f => f.status === 'Open').length,
    critical: scoped.filter(f => f.severity === 'Critical').length,
    remediation: scoped.filter(f => f.status === 'In Remediation').length,
    avgCvss: withCvss.length ? (withCvss.reduce((s, f) => s + (f.cvss ?? 0), 0) / withCvss.length).toFixed(1) : null,
  }

  function openCreate() {
    setEditingId(null)
    setForm({ ...BLANK, modelId: modelParam ?? NONE })
    setDialogOpen(true)
  }
  function openEdit(f: FindingRecord) {
    setEditingId(f.id ?? null)
    setForm({
      findingRef: f.findingRef ?? '', title: f.title ?? '', description: f.description ?? '',
      severity: f.severity ?? 'Medium', status: f.status ?? 'Open', attackVector: f.attackVector ?? 'Prompt Injection',
      owaspLlmRef: f.owaspLlmRef ?? '', cvss: f.cvss != null ? String(f.cvss) : '', modelId: f.modelId ?? NONE,
      impact: f.impact ?? '', recommendation: f.recommendation ?? '', remediationOwner: f.remediationOwner ?? '',
      discoveredBy: f.discoveredBy ?? '', campaignId: f.campaignId ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return
    try {
      await save({
        ...(editingId ? { id: editingId } : {}),
        findingRef: form.findingRef || undefined,
        title: form.title.trim(),
        description: form.description || undefined,
        severity: form.severity,
        status: form.status,
        attackVector: form.attackVector,
        owaspLlmRef: form.owaspLlmRef || undefined,
        cvss: form.cvss === '' ? undefined : Number(form.cvss),
        modelId: form.modelId === NONE ? undefined : form.modelId,
        impact: form.impact || undefined,
        recommendation: form.recommendation || undefined,
        remediationOwner: form.remediationOwner || undefined,
        discoveredBy: form.discoveredBy || undefined,
        campaignId: form.campaignId || undefined,
      })
      setDialogOpen(false)
      setForm({ ...BLANK })
      setEditingId(null)
    } catch { /* hook fired the error toast */ }
  }

  async function markResolved(f: FindingRecord) {
    try {
      await save({ ...f, status: 'Resolved', resolvedAt: new Date().toISOString() })
      setSelected(prev => (prev && prev.id === f.id ? { ...prev, status: 'Resolved' } : prev))
    } catch { /* hook fired the error toast */ }
  }

  async function handleDelete() {
    if (!deleteTarget?.id) return
    try {
      await remove(deleteTarget.id)
      if (selected?.id === deleteTarget.id) setSelected(null)
      setDeleteTarget(null)
    } catch { setDeleteTarget(null) }
  }

  if (isLoading) return <PageSkeleton title="Red Team Findings" />
  if (error) return <ErrorState title="Failed to load findings" error={error} onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Red Team Findings"
        subtitle="AI adversarial testing results — attack vectors, CVSS scores, impact assessment, and remediation tracking"
        breadcrumbs={[{ label: 'Home', href: '/overview' }, { label: 'Security', href: '/security' }, { label: 'Red Team Findings' }]}
        badge={<Bug size={20} weight="fill" className="text-destructive ml-2" />}
        actions={<Button onClick={openCreate} style={{ borderRadius: 0 }}><Plus size={14} /> Log Finding</Button>}
      />

      {/* Model-scoped filter chip */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer"><X size={14} /></button>
          </span>
        </div>
      )}

      {/* KPI strip — computed only over real records */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open Findings', value: String(stats.open), sub: 'Require remediation', color: 'hsl(var(--destructive))' },
          { label: 'Critical Severity', value: String(stats.critical), sub: 'Highest severity', color: 'hsl(var(--destructive))' },
          { label: 'In Remediation', value: String(stats.remediation), sub: 'Active work in progress', color: 'hsl(var(--s-wn-tx))' },
          { label: 'Avg CVSS Score', value: stats.avgCvss ?? '—', sub: withCvss.length ? `Across ${withCvss.length} scored` : 'No CVSS recorded', color: stats.avgCvss && Number(stats.avgCvss) >= 7 ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))' },
        ].map(s => (
          <div key={s.label} className="border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-xs text-[hsl(var(--text-4))]">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings, models…" className="pl-8" style={{ borderRadius: 0 }} />
        </div>
        <Select value={sevFilter} onValueChange={setSevFilter}>
          <SelectTrigger className="w-40" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>{['All', ...SEVERITIES].map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All severities' : s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>{['All', ...STATUSES].map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All statuses' : s}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} finding{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table / empty states */}
      {findings.length === 0 ? (
        <EmptyState
          icon={<Bug size={32} weight="duotone" />}
          title="No findings logged yet"
          description="Log your first red team finding to track attack vectors, CVSS scores, and remediation."
          action={<Button onClick={openCreate}><Plus size={14} /> Log Finding</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlass size={32} weight="duotone" />}
          title="No findings match your filters"
          description="Adjust the search or filters to see more findings."
        />
      ) : (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    {['Ref', 'Finding', 'Vector', 'CVSS', 'Severity', 'Status', 'Model', 'Owner', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} className="border-b border-[hsl(var(--border))] hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--brand))] font-medium whitespace-nowrap">{f.findingRef || (f.id ? f.id.slice(0, 8) : '—')}</td>
                      <td className="px-3 py-2.5 max-w-xs">
                        <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{f.title}</p>
                        {f.discoveredBy && <p className="text-xs text-[hsl(var(--text-4))]">{f.discoveredBy}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{f.attackVector || '—'}</td>
                      <td className="px-3 py-2.5"><span className="text-sm font-bold" style={{ color: cvssColor(f.cvss) }}>{f.cvss ?? '—'}</span></td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 text-xs font-medium" style={sevStyle(f.severity)}>{f.severity || '—'}</span></td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 text-xs font-medium whitespace-nowrap" style={stsStyle(f.status)}>{f.status || '—'}</span></td>
                      <td className="px-3 py-2.5">
                        {f.modelId ? <InterlinkChip label={modelName(f.modelId) ?? 'Unavailable'} to={`/models/inventory/${f.modelId}`} /> : <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{f.remediationOwner || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelected(f)}><Eye size={13} style={{ color: 'hsl(var(--brand))' }} /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(f)}><PencilSimple size={13} style={{ color: 'hsl(var(--text-4))' }} /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(f)}><Trash size={13} className="text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.findingRef || (selected.id ? selected.id.slice(0, 8) : '')}</p>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 text-xs font-medium" style={sevStyle(selected.severity)}>{selected.severity || '—'}</span>
                  <span className="px-2 py-0.5 text-xs font-medium" style={stsStyle(selected.status)}>{selected.status || '—'}</span>
                  {selected.cvss != null && <span className="px-2 py-0.5 text-xs font-medium bg-raised text-[hsl(var(--text-3))]">CVSS {selected.cvss}</span>}
                  {selected.attackVector && <span className="px-2 py-0.5 text-xs font-medium bg-raised text-[hsl(var(--text-3))]">{selected.attackVector}</span>}
                  {selected.owaspLlmRef && <span className="px-2 py-0.5 text-xs font-medium" style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }}>{selected.owaspLlmRef}</span>}
                </div>
                <div>
                  <p className="text-xs text-[hsl(var(--text-4))] mb-1">Model Affected</p>
                  {selected.modelId ? <InterlinkChip label={modelName(selected.modelId) ?? 'Unavailable'} to={`/models/inventory/${selected.modelId}`} /> : <p className="text-sm text-[hsl(var(--text-1))]">—</p>}
                </div>
                {[
                  { label: 'Discovered By', value: selected.discoveredBy },
                  { label: 'Remediation Owner', value: selected.remediationOwner },
                  { label: 'Resolved At', value: selected.resolvedAt ? fmtDate(selected.resolvedAt) : undefined },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-[hsl(var(--text-4))]">{r.label}</p>
                    <p className="text-sm text-[hsl(var(--text-1))] mt-0.5">{r.value || '—'}</p>
                  </div>
                ))}
                {[
                  { label: 'Description', value: selected.description },
                  { label: 'Business Impact', value: selected.impact },
                  { label: 'Recommendation', value: selected.recommendation },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">{r.label}</p>
                    <p className="text-sm text-[hsl(var(--text-2))] bg-raised p-3">{r.value || '—'}</p>
                  </div>
                ))}
                <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                  {selected.status !== 'Resolved' && (
                    <Button size="sm" onClick={() => markResolved(selected)} disabled={isSaving}><CheckCircle size={13} /> Mark Resolved</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { const f = selected; setSelected(null); openEdit(f) }}><PencilSimple size={13} /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(selected)} style={{ color: 'hsl(var(--destructive))' }}><Trash size={13} /> Delete</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 620 }} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editingId ? 'Edit Finding' : 'Log Red Team Finding'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Finding Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Describe the vulnerability or attack finding" style={{ borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Reference ID</Label>
                <Input value={form.findingRef} onChange={e => setForm(p => ({ ...p, findingRef: e.target.value }))} placeholder="Optional (e.g. RTF-2026-001)" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Model Affected</Label>
                <Select value={form.modelId} onValueChange={v => setForm(p => ({ ...p, modelId: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select model…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Attack Vector</Label>
                <Select value={form.attackVector} onValueChange={v => setForm(p => ({ ...p, attackVector: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{VECTORS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>OWASP LLM Ref</Label>
                <Select value={form.owaspLlmRef || NONE} onValueChange={v => setForm(p => ({ ...p, owaspLlmRef: v === NONE ? '' : v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    <SelectItem value={NONE}>— None —</SelectItem>
                    {OWASP.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>CVSS Score (0–10)</Label>
                <Input type="number" min={0} max={10} step={0.1} value={form.cvss} onChange={e => setForm(p => ({ ...p, cvss: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Discovered By</Label>
                <Input value={form.discoveredBy} onChange={e => setForm(p => ({ ...p, discoveredBy: e.target.value }))} placeholder="Red Team Alpha" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Remediation Owner</Label>
                <Input value={form.remediationOwner} onChange={e => setForm(p => ({ ...p, remediationOwner: e.target.value }))} placeholder="Owner name" style={{ borderRadius: 0 }} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ borderRadius: 0, minHeight: 64 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Business Impact</Label>
              <Textarea value={form.impact} onChange={e => setForm(p => ({ ...p, impact: e.target.value }))} style={{ borderRadius: 0, minHeight: 56 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Recommendation</Label>
              <Textarea value={form.recommendation} onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))} style={{ borderRadius: 0, minHeight: 56 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || isSaving} style={{ borderRadius: 0 }}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Log Finding'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Finding?"
        message="This permanently removes the finding record."
        confirmLabel="Delete"
      />
    </div>
  )
}
