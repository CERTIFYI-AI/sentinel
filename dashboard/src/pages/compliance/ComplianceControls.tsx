// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Compliance Controls — the org's control library over the canonical
// org-scoped `controls` table (uuid ids from the DB — no client-minted
// business codes). CRUD goes through useControls/useUpsertControl/
// useDeleteControl (services throw; hooks own the toasts). Interlinks:
// linked models (ai_models.id), risks and policies render as chips, and the
// page honors ?model= (dismissible filter chip) and ?open= (opens a record).

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckSquare, Plus, Warning, X, ArrowSquareOut, ListBullets, Kanban } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { StatCardRow, type StatCardRowItem } from '@/components/ui/StatCardRow'
import { useControls, useUpsertControl, useDeleteControl } from '@/hooks/queries/useControls'
import { useModelsData } from '@/hooks/useModelsData'
import { useRisksData } from '@/hooks/useRisksData'
import { usePolicies } from '@/hooks/queries/usePolicies'
import { useRBAC } from '@/hooks/useRBAC'
import { ControlCollabPanel } from '@/components/compliance/ControlCollabPanel'
import type { ControlRecord } from '@/services/controlService'

const STATUS_OPTIONS = [
  { value: 'not_implemented', label: 'Not implemented' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'partially_implemented', label: 'Partially implemented' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'effective', label: 'Effective' },
  { value: 'not_applicable', label: 'Not applicable' },
]

const STATUS_TONE: Record<string, string> = {
  implemented: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  effective: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  partially_implemented: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  in_progress: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  not_implemented: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  not_applicable: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const IMPLEMENTED = new Set(['implemented', 'effective'])

const EMPTY_FORM: Partial<ControlRecord> = {
  controlRef: '', name: '', framework: '', clauseRef: '', description: '',
  status: 'not_implemented', owner: '', effectivenessScore: undefined,
  lastTestedAt: null, nextTestAt: null, linkedModelIds: [],
}

const prettyStatus = (s?: string | null) => {
  const raw = (s || '').toLowerCase()
  if (!raw) return '—'
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ')
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Days until a test is due; negative means overdue. Null when unscheduled. */
function daysUntil(due?: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000)
}

/** Display ref: real control_ref, else a truncated uuid — never a minted code. */
const displayRef = (c: ControlRecord) => c.controlRef || (c.id ? `${c.id.slice(0, 8)}…` : '—')
const effectiveStatus = (c: ControlRecord) => (c.implementationStatus || c.status || '').toLowerCase()

export default function ComplianceControls() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const controlsQuery = useControls()
  const upsert = useUpsertControl()
  const remove = useDeleteControl()
  const { models } = useModelsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ControlRecord | null>(null)
  const [form, setForm] = useState<Partial<ControlRecord>>(EMPTY_FORM)
  const [toDelete, setToDelete] = useState<ControlRecord | null>(null)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'board'>('list')
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all')

  const rows = useMemo(() => controlsQuery.data ?? [], [controlsQuery.data])
  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? 'Unavailable'
  // Linked risks/policies resolve to display names at render time — never a
  // raw uuid; an unresolvable id shows "Unavailable".
  const { risks } = useRisksData()
  const policiesQuery = usePolicies()
  const riskName = (id: string) => {
    const r = risks.find((x) => x.id === id)
    return r ? (r.risk_id ? `${r.risk_id} — ${r.title}` : r.title) : 'Unavailable'
  }
  const policyName = (id: string) =>
    (policiesQuery.data ?? []).find((p) => p.id === id)?.title ?? 'Unavailable'

  // ?open=<uuid> opens the record's detail sheet.
  useEffect(() => { if (openParam) setSheetId(openParam) }, [openParam])
  const selected = sheetId ? rows.find((c) => c.id === sheetId) ?? null : null

  const closeSheet = () => {
    setSheetId(null)
    if (openParam) {
      const next = new URLSearchParams(searchParams)
      next.delete('open')
      setSearchParams(next, { replace: true })
    }
  }

  const clearModelFilter = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  const frameworks = useMemo(
    () => Array.from(new Set(rows.map((c) => c.framework).filter(Boolean) as string[])).sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    let out = modelParam ? rows.filter((c) => (c.linkedModelIds ?? []).includes(modelParam)) : rows
    if (frameworkFilter !== 'all') out = out.filter((c) => c.framework === frameworkFilter)
    return out
  }, [rows, modelParam, frameworkFilter])

  const set = <K extends keyof ControlRecord>(k: K, v: ControlRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm({ ...EMPTY_FORM }); setFormOpen(true) }
  function openEdit(c: ControlRecord) { setEditing(c); setForm({ ...c }); setFormOpen(true) }

  const toggleModel = (id: string) =>
    setForm((f) => {
      const cur = f.linkedModelIds ?? []
      return { ...f, linkedModelIds: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] }
    })

  // Save via the hook: the service throws, the hook toasts — the dialog
  // closes only after the write resolves.
  async function submit() {
    try {
      await upsert.mutateAsync({
        ...form,
        id: editing?.id, // uuid from the DB; new rows get their id server-side
        effectivenessScore: form.effectivenessScore ?? undefined,
      })
      setFormOpen(false)
    } catch { /* hook fires the error toast */ }
  }

  const stats = useMemo(() => {
    const inScope = rows.filter((c) => effectiveStatus(c) !== 'not_applicable')
    const implemented = rows.filter((c) => IMPLEMENTED.has(effectiveStatus(c))).length
    const overdue = rows.filter((c) => { const d = daysUntil(c.nextTestAt); return d != null && d < 0 }).length
    return {
      total: rows.length,
      implemented,
      coverage: inScope.length ? Math.round((implemented / inScope.length) * 100) : null,
      overdue,
    }
  }, [rows])

  const kpiCards: StatCardRowItem[] = [
    { label: 'Controls', value: String(stats.total), icon: <CheckSquare size={14} weight="fill" /> },
    {
      label: 'Coverage',
      value: stats.coverage == null ? '—' : `${stats.coverage}%`,
      variant: stats.coverage == null ? 'default' : stats.coverage >= 85 ? 'success' : 'warning',
      description: 'Implemented or effective, in-scope',
    },
    { label: 'Tests Overdue', value: String(stats.overdue), variant: stats.overdue > 0 ? 'danger' : 'default', icon: <Warning size={14} weight="fill" /> },
    { label: 'Gap Analysis', value: 'Open →', href: '/compliance/gap-analysis', description: 'Derived gaps across frameworks' },
  ]

  const columns: Column<ControlRecord>[] = [
    { key: 'controlRef', header: 'Ref', sortable: true, render: (c) => (
      <span className="font-mono text-xs text-[hsl(var(--text-2))]">{displayRef(c)}</span>
    ) },
    { key: 'name', header: 'Control', sortable: true, render: (c) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{c.name || c.title || 'Untitled control'}</div>
        {c.description && <div className="max-w-md truncate text-xs text-[hsl(var(--text-4))]">{c.description}</div>}
      </div>
    ) },
    { key: 'framework', header: 'Framework', sortable: true, render: (c) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{c.framework || '—'}</span>
    ) },
    { key: 'clauseRef', header: 'Clause', sortable: true, render: (c) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{c.clauseRef || '—'}</span>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (c) => {
      const s = effectiveStatus(c)
      return (
        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[s] ?? 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]'}`}>
          {prettyStatus(s)}
        </span>
      )
    } },
    { key: 'effectivenessScore', header: 'Effectiveness', sortable: true, render: (c) => (
      // Null means never measured — render a dash, never a 0.
      <span className="font-mono text-xs">{c.effectivenessScore == null ? '—' : `${c.effectivenessScore}%`}</span>
    ) },
    { key: 'owner', header: 'Owner', sortable: true, render: (c) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{c.owner || '—'}</span>
    ) },
    { key: 'lastTestedAt', header: 'Last tested', sortable: true, render: (c) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{formatDate(c.lastTestedAt)}</span>
    ) },
    { key: 'nextTestAt', header: 'Next test', sortable: true, render: (c) => {
      const d = daysUntil(c.nextTestAt)
      if (d == null) return <span className="text-xs text-[hsl(var(--text-4))]">not scheduled</span>
      const overdue = d < 0
      return (
        <span className="inline-flex items-center gap-1 text-xs"
          style={{ color: overdue ? 'hsl(var(--s-er-tx))' : d <= 14 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>
          {overdue && <Warning size={11} />}
          {overdue ? `${Math.abs(d)}d overdue` : `in ${d}d`}
        </span>
      )
    } },
    { key: 'models', header: 'Models', render: (c) => (
      <div className="flex flex-wrap gap-1">
        {(c.linkedModelIds ?? []).length > 0
          ? (c.linkedModelIds ?? []).map((id) => (
              <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} onClick={(e) => e.stopPropagation()} />
            ))
          : <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Compliance Controls"
        subtitle="The control library mapped to framework clauses, with test currency and interlinks"
        icon={CheckSquare}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/frameworks')}>Frameworks</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/control-testing')}>Control Testing</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>Add Control</Button>}
          </div>
        }
      />

      {/* Model-scoped filter chip (deep link from a model) */}
      {modelParam && (
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="mb-4"><StatCardRow cards={kpiCards} /></div>

      {/* View toggle + framework filter — the library covers all 15 frameworks */}
      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('list')} aria-pressed={view === 'list'}>
            <ListBullets size={13} /> List
          </Button>
          <Button variant={view === 'board' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('board')} aria-pressed={view === 'board'}>
            <Kanban size={13} /> Board
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
            <SelectTrigger className="w-72 h-8 text-xs"><SelectValue placeholder="All frameworks" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All frameworks ({rows.length} controls)</SelectItem>
              {frameworks.map((f) => (
                <SelectItem key={f} value={f}>{f} ({rows.filter((c) => c.framework === f).length})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-4">
        {controlsQuery.isLoading ? <TableSkeleton cols={9} />
          : controlsQuery.isError ? <ErrorState message={controlsQuery.error?.message} onRetry={() => controlsQuery.refetch()} />
          : filtered.length === 0 ? (
            rows.length === 0 ? (
              <EmptyState
                title="No controls defined"
                message="Define the controls your frameworks require, so implementation status and test currency are evidenced rather than asserted."
                actionLabel={can('create') ? 'Add a control' : undefined}
                onAction={can('create') ? openCreate : undefined}
              />
            ) : (
              <EmptyState title="No controls linked to this model" message="Clear the model filter to see the full control library." />
            )
          ) : view === 'list' ? (
            <DataTable
              data={filtered} columns={columns} searchKey="name" searchPlaceholder="Search controls…"
              onRowClick={(c) => setSheetId(c.id ?? null)}
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (c) => setToDelete(c) : undefined}
              actions={(c) => (
                <Button variant="ghost" size="sm" title="Open control detail"
                  onClick={(e) => { e.stopPropagation(); nav(`/compliance/controls/${c.id}`) }}>
                  <ArrowSquareOut size={13} /> Detail
                </Button>
              )}
            />
          ) : (
            /* ── Board view: one column per implementation status ── */
            <div className="overflow-x-auto">
              <div className="flex gap-3 min-w-max pb-2">
                {STATUS_OPTIONS.map((s) => {
                  const cards = filtered.filter((c) => effectiveStatus(c) === s.value)
                  return (
                    <div key={s.value} className="w-64 shrink-0">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[s.value] ?? ''}`}>{s.label}</span>
                        <span className="text-[11px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{cards.length}</span>
                      </div>
                      <div className="space-y-2 min-h-24 p-1" style={{ background: 'hsl(var(--bg-muted) / 0.4)' }}>
                        {cards.length === 0 ? (
                          <p className="p-2 text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>No controls</p>
                        ) : cards.map((c) => (
                          <div key={c.id} role="button" tabIndex={0}
                            onClick={() => setSheetId(c.id ?? null)}
                            onKeyDown={(e) => e.key === 'Enter' && setSheetId(c.id ?? null)}
                            className="cursor-pointer p-2 focus:outline-2 focus:outline-[hsl(var(--brand))]"
                            style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                            <p className="font-mono text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{displayRef(c)}</p>
                            <p className="mt-0.5 text-xs font-medium leading-snug" style={{ color: 'hsl(var(--text-1))' }}>
                              {c.name || c.title || 'Untitled control'}
                            </p>
                            {c.framework && (
                              <p className="mt-1 truncate text-[10px]" style={{ color: 'hsl(var(--text-3))' }}>{c.framework}</p>
                            )}
                            {can('update') && (
                              <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                                <Select value={effectiveStatus(c) || 'not_implemented'}
                                  onValueChange={(v) => upsert.mutate({ id: c.id, name: c.name, status: v, implementationStatus: v })}>
                                  <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
      </Card>

      {/* ── Detail sheet (?open= target) ── */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
                  <span className="font-mono text-sm mr-2" style={{ color: 'hsl(var(--text-4))' }}>{displayRef(selected)}</span>
                  {selected.name || selected.title || 'Untitled control'}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[effectiveStatus(selected)] ?? 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]'}`}>
                    {prettyStatus(effectiveStatus(selected))}
                  </span>
                  {selected.severity && <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{selected.severity}</Badge>}
                  {selected.testResult && <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>Last test: {selected.testResult}</Badge>}
                </div>

                {selected.description && (
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>
                )}

                <div className="space-y-0">
                  {[
                    { label: 'Framework', value: selected.framework || '—' },
                    { label: 'Clause', value: selected.clauseRef || '—' },
                    { label: 'Category', value: selected.category || '—' },
                    { label: 'Owner', value: selected.owner || '—' },
                    { label: 'Effectiveness score', value: selected.effectivenessScore == null ? '—' : `${selected.effectivenessScore}%` },
                    { label: 'Evidence count', value: selected.evidenceCount == null ? '—' : String(selected.evidenceCount) },
                    { label: 'Last tested', value: formatDate(selected.lastTestedAt) },
                    { label: 'Next test due', value: formatDate(selected.nextTestAt) },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Interlinks — the record participates in the platform graph */}
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-3))' }}>Linked models</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.linkedModelIds ?? []).length > 0
                      ? (selected.linkedModelIds ?? []).map((id) => (
                          <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                        ))
                      : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models linked yet.</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-3))' }}>Linked risks</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.linkedRiskIds ?? []).length > 0
                      ? (selected.linkedRiskIds ?? []).map((id) => (
                          <InterlinkChip key={id} label={riskName(id)} to={`/risks?open=${id}`} />
                        ))
                      : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No risks linked yet.</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'hsl(var(--text-3))' }}>Linked policies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.linkedPolicyIds ?? []).length > 0
                      ? (selected.linkedPolicyIds ?? []).map((id) => (
                          <InterlinkChip key={id} label={policyName(id)} to={`/policies?open=${id}`} />
                        ))
                      : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No policies linked yet.</span>}
                  </div>
                </div>

                {/* Collaboration: multi-user assignees, comments & recommendations,
                    evidence, cross-framework mappings — all persisted + audit-logged */}
                <div className="pt-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <ControlCollabPanel control={selected} allControls={rows} canEdit={can('update')} />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => nav(`/compliance/controls/${selected.id}`)}>Open detail page</Button>
                  {can('update') && (
                    <Button size="sm" variant="outline" onClick={() => { openEdit(selected); closeSheet() }}>Edit</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={closeSheet}>Close</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create / edit ── */}
      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${displayRef(editing)}` : 'Add Control'}
        description="Controls carry an implementation status and a test cadence; both are evidence at audit."
        submitLabel={editing ? 'Save changes' : 'Add'}
        busy={upsert.isPending}
        disabled={!form.name?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Control reference"><Input value={form.controlRef ?? ''} onChange={(e) => set('controlRef', e.target.value)} placeholder="A.6.2.4" /></Field>
          <Field label="Clause reference"><Input value={form.clauseRef ?? ''} onChange={(e) => set('clauseRef', e.target.value)} /></Field>
        </div>
        <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Framework"><Input value={form.framework ?? ''} onChange={(e) => set('framework', e.target.value)} placeholder="EU AI Act" /></Field>
          <Field label="Status">
            <Select value={form.status ?? 'not_implemented'} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Owner"><Input value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></Field>
          <Field label="Effectiveness score (%)" hint="Leave blank until measured">
            <Input type="number" min={0} max={100}
              value={form.effectivenessScore ?? ''}
              onChange={(e) => set('effectivenessScore', e.target.value === '' ? undefined : Number(e.target.value))} />
          </Field>
          <Field label="Last tested"><Input type="date" value={form.lastTestedAt ?? ''} onChange={(e) => set('lastTestedAt', e.target.value || null)} /></Field>
          <Field label="Next test due"><Input type="date" value={form.nextTestAt ?? ''} onChange={(e) => set('nextTestAt', e.target.value || null)} /></Field>
        </div>
        <Field label="Linked models" hint="Models this control governs — stored by ai_models.id">
          {models.length === 0 ? (
            <p className="text-xs text-[hsl(var(--text-4))]">No models in the inventory yet.</p>
          ) : (
            <div className="max-h-36 overflow-y-auto border border-[hsl(var(--border))] p-2 space-y-1">
              {models.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer text-[hsl(var(--text-2))]">
                  <input
                    type="checkbox"
                    checked={(form.linkedModelIds ?? []).includes(m.id)}
                    onChange={() => toggleModel(m.id)}
                    className="rounded-none border-[hsl(var(--border))]"
                  />
                  {m.name}
                </label>
              ))}
            </div>
          )}
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete ? displayRef(toDelete) : ''}?`}
        description="The control and its mapping are removed. Evidence already captured against it is retained."
        isDestructive confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete?.id) return false
          // Returns the promise so the dialog closes only after the delete
          // resolves; the hook toasts success/error.
          return remove.mutateAsync(toDelete.id).then(() => {
            setToDelete(null)
            if (sheetId === toDelete.id) closeSheet()
          })
        }}
      />
    </div>
  )
}
