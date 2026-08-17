// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Reporting — on the real org-scoped `security_reports` / `security_report_runs`
// tables via securityGroupService (useReports / useReportRuns /
// useGenerateReport). Replaces the `reporting_table (id, doc jsonb)` demo table
// and, more importantly, an entire page of fabrication.
//
// What this rebuild deliberately deletes (removed, not relabelled):
//   * REPORT_TEMPLATES — eight hardcoded cards with invented "Last generated"
//     dates and body copy like "12 risks", "6 models";
//   * GENERATION_HISTORY — eight fake runs signed by named people
//     ("Sarah Chen", "System (Scheduled)") with invented durations ("3.8s");
//   * SCHEDULED_REPORTS — three fake schedules with invented recipients;
//   * the Preview tab's COMPLIANCE_DATA / RISK_TREND / PIE_DATA — charts drawn
//     from arrays literally typed into the file, captioned "live data";
//   * the "Approvals & Sign-off" tab — four hardcoded rows and a
//     "RSA-SHA256 with certificate binding" standards block describing signing
//     the product does not perform;
//   * the fake generate flow (setTimeout(2000) → "Report Generated
//     Successfully" with a dead Download button) and the "4.2s Avg Generation
//     Time" KPI.
//
// A report definition names the registers it snapshots (`sections`); Generate
// assembles a real data-driven snapshot from those tenant-scoped tables,
// persists it as a run, and hands the viewer that exact artifact to download.
// A run that has never happened is not invented.
//
// Interlink: `linked_model_id` scopes a report to a model; `?model=<uuid>`
// filters with a dismissible chip and drives the link from a model's detail
// page. `?open=<security_reports.id>` opens a definition.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChartBar, Plus, Export, DownloadSimple, ArrowSquareOut, X, Trash, Play } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow } from '@/components/ui/StatCardRow'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { DetailDrawer } from '@/components/ui/DetailDrawer'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { exportCsv } from '@/lib/exportUtils'
import { useReports, useReportRuns, useGenerateReport } from '@/hooks/useSecurityGroup'
import { useSupplyChainEntities } from '@/hooks/useSupplyChainEntities'
import { useAuthStore } from '@/store/authStore'
import type { ReportTemplate } from '@/services/securityGroupService'

// Canonical vocabulary — matches the security_reports migration/seeds and the
// section keys generateReport() can actually snapshot.
const CATEGORIES = ['posture', 'vulnerabilities', 'red_team', 'compliance', 'executive']
const CATEGORY_LABELS: Record<string, string> = {
  posture: 'Posture', vulnerabilities: 'Vulnerabilities', red_team: 'Red team', compliance: 'Compliance', executive: 'Executive',
}
const FREQUENCIES = ['on_demand', 'weekly', 'monthly', 'quarterly']
const FREQUENCY_LABELS: Record<string, string> = { on_demand: 'On demand', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly' }
const SECTION_LABELS: Record<string, string> = {
  threats: 'Threats', scans: 'Scans', vulnerabilities: 'Vulnerabilities', attack_surface: 'Attack Surface',
  red_team_campaigns: 'Red Team Campaigns', red_team_findings: 'Red Team Findings',
  model_arena: 'Model Arena', policy_firewall_rules: 'Policy Firewall Rules',
}
const SECTION_KEYS = Object.keys(SECTION_LABELS)

const catLabel = (c?: string) => (c ? CATEGORY_LABELS[c] ?? c : '—')
const freqLabel = (f?: string) => (f ? FREQUENCY_LABELS[f] ?? f : '—')
const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
const date = (v: string | null | undefined) => (v ? v.slice(0, 10) : '—')
/** null renders "—", never 0: a definition that has never generated has no last-run date. */
const runCount = (v: number | null | undefined) => (typeof v === 'number' ? v : 0)

const BLANK: ReportTemplate = {
  name: '', category: 'posture', description: '', frequency: 'on_demand',
  sections: [], recipients: [], format: 'json', linkedModelId: null,
}

export default function Reporting() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { items: reports, isLoading, error, save, remove } = useReports()
  const runsQuery = useReportRuns()
  const generate = useGenerateReport()
  const entities = useSupplyChainEntities()
  const authUser = useAuthStore(s => s.user)
  const generatedBy = authUser?.name || authUser?.email || 'Unknown user'

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ReportTemplate | null>(null)
  const [form, setForm] = useState<ReportTemplate>({ ...BLANK })
  const [recipientsText, setRecipientsText] = useState('')
  const [toDelete, setToDelete] = useState<ReportTemplate | null>(null)

  const selected = reports.find(r => r.id === selectedId) ?? null
  const runs = runsQuery.data ?? []
  const runsFor = (id?: string) => runs.filter(r => r.reportId === id)

  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (openParam && appliedOpen.current !== openParam && reports.some(r => r.id === openParam)) {
      appliedOpen.current = openParam
      setSelectedId(openParam)
    }
  }, [openParam, reports])

  const filtered = useMemo(
    () => (modelParam ? reports.filter(r => r.linkedModelId === modelParam) : reports),
    [reports, modelParam],
  )
  const rows = useMemo(() => filtered.map(r => ({ ...r, _name: r.name })), [filtered])
  type Row = (typeof rows)[number]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, linkedModelId: modelParam ?? null })
    setRecipientsText('')
    setFormOpen(true)
  }
  function openEdit(r: ReportTemplate) {
    setEditing(r)
    setForm({ ...r })
    setRecipientsText((r.recipients ?? []).join(', '))
    setFormOpen(true)
  }

  async function submitForm() {
    if (!form.name.trim()) { toast.error('A report name is required'); return }
    const payload: ReportTemplate = {
      ...(editing?.id ? { id: editing.id } : {}),
      name: form.name.trim(),
      category: form.category,
      description: form.description?.trim() || undefined,
      frequency: form.frequency,
      sections: form.sections ?? [],
      recipients: recipientsText.split(',').map(s => s.trim()).filter(Boolean),
      format: form.format ?? 'json',
      linkedModelId: form.linkedModelId || null,
    }
    try {
      await save(payload)
      toast.success(editing ? `${payload.name} updated` : `${payload.name} created`)
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the report definition')
    }
  }

  async function runReport(r: ReportTemplate) {
    try {
      const run = await generate.mutateAsync({ template: r, by: generatedBy })
      // Hand the viewer the exact snapshot that was persisted.
      const blob = new Blob([JSON.stringify(run.content, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(r.name || 'report').replace(/\s+/g, '-').toLowerCase()}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      /* useGenerateReport already surfaces the error toast */
    }
  }

  async function confirmDelete() {
    if (!toDelete?.id) return
    try {
      await remove(toDelete.id)
      if (selectedId === toDelete.id) setSelectedId(null)
      toast.success(`${toDelete.name} deleted`)
      setToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the report definition')
      throw e
    }
  }

  function exportDefinitions() {
    if (!filtered.length) { toast.info('No report definitions to export'); return }
    exportCsv(filtered.map(r => ({
      name: r.name, category: r.category ?? '', frequency: r.frequency ?? '',
      sections: (r.sections ?? []).join('; '), recipients: (r.recipients ?? []).join('; '),
      model: entities.resolve('model', r.linkedModelId) ?? '', model_id: r.linkedModelId ?? '',
      generation_count: r.generationCount ?? 0, last_generated_at: r.lastGeneratedAt ?? '',
    })), 'report-definitions.csv')
  }

  const scheduled = filtered.filter(r => r.frequency && r.frequency !== 'on_demand').length
  const neverRun = filtered.filter(r => !r.lastGeneratedAt).length

  const columns: Column<Row>[] = [
    { key: '_name', header: 'Report', sortable: true, render: r => <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.name}</span> },
    { key: 'category', header: 'Category', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-3))]">{catLabel(r.category)}</span> },
    { key: 'frequency', header: 'Frequency', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-3))]">{freqLabel(r.frequency)}</span> },
    {
      key: 'model', header: 'Scope',
      render: r => {
        if (!r.linkedModelId) return <span className="text-xs text-[hsl(var(--text-4))]">Org-wide</span>
        const name = entities.resolve('model', r.linkedModelId)
        const route = entities.routeFor('model', r.linkedModelId)
        if (name && route) return <button onClick={e => { e.stopPropagation(); nav(route) }} className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline">{name} <ArrowSquareOut size={11} /></button>
        return <span className="text-xs text-[hsl(var(--text-4))]">{name ?? 'Unavailable'}</span>
      },
    },
    { key: 'generationCount', header: 'Runs', render: r => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{runCount(r.generationCount)}</span> },
    { key: 'lastGeneratedAt', header: 'Last run', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-4))]">{date(r.lastGeneratedAt)}</span> },
    {
      key: 'run', header: '',
      render: r => <Button size="xs" variant="secondary" icon={<Play />} disabled={generate.isPending} onClick={e => { (e as any).stopPropagation?.(); runReport(r) }}>Generate</Button>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Reporting"
        subtitle="Report definitions that snapshot the platform's real registers on demand — each run is a persisted, downloadable artifact, not a rendered mock"
        icon={ChartBar}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportDefinitions}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={openCreate}>New Report</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Reports scoped to <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]"><X size={14} /></button>
          </span>
        </div>
      )}

      <StatCardRow
        className="mb-4"
        loading={isLoading}
        cards={[
          { label: 'Report definitions', value: filtered.length },
          { label: 'Scheduled', value: scheduled, description: 'Definitions with a recurring frequency' },
          { label: 'Never generated', value: neverRun, variant: neverRun ? 'warning' : 'success' },
          { label: 'Runs recorded', value: runs.length, description: 'Persisted report_runs across all definitions' },
        ]}
      />

      {isLoading ? <TableSkeleton cols={7} />
        : error ? <ErrorState message={(error as Error).message} onRetry={() => window.location.reload()} />
        : rows.length === 0 ? (
          <EmptyState
            title={modelParam ? 'No reports scoped to this model' : 'No report definitions yet'}
            message={modelParam ? 'Clear the filter to see every definition, or create one scoped to this model.' : 'Create a report definition, choose which registers it snapshots, then generate a real artifact from live data.'}
            actionLabel="New Report"
            onAction={openCreate}
          />
        ) : (
          <DataTable data={rows} columns={columns} searchKey="_name" searchPlaceholder="Search reports…"
            onRowClick={r => setSelectedId(r.id!)} onView={r => setSelectedId(r.id!)} onEdit={r => openEdit(r)} onDelete={r => setToDelete(r)} />
        )}

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? <span className="text-xs text-[hsl(var(--text-3))]">{catLabel(selected.category)} · {freqLabel(selected.frequency)}</span> : undefined}
        size="lg"
        actions={selected ? (
          <div className="flex gap-2">
            <Button size="xs" icon={<Play />} disabled={generate.isPending} onClick={() => runReport(selected)}>Generate</Button>
            <Button size="xs" variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
            <Button size="xs" variant="danger" icon={<Trash />} onClick={() => setToDelete(selected)}>Delete</Button>
          </div>
        ) : undefined}
        tabs={selected ? [
          {
            id: 'overview', label: 'Overview',
            content: (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Category', value: catLabel(selected.category) },
                    { label: 'Frequency', value: freqLabel(selected.frequency) },
                    { label: 'Format', value: (selected.format ?? 'json').toUpperCase() },
                    { label: 'Runs', value: String(runCount(selected.generationCount)) },
                    { label: 'Last generated', value: date(selected.lastGeneratedAt) },
                    { label: 'Created', value: date(selected.createdAt) },
                  ].map(f => (
                    <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                      <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                      <p className="mt-0.5 truncate text-xs font-medium text-[hsl(var(--text-1))]">{f.value}</p>
                    </div>
                  ))}
                </div>
                {selected.description && (
                  <div className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">Description</p>
                    <p className="mt-1 text-xs text-[hsl(var(--text-2))]">{selected.description}</p>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Sections snapshotted</p>
                  {(selected.sections ?? []).length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))]">No sections selected — this report would generate an empty snapshot.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(selected.sections ?? []).map(s => <span key={s} className="border border-[hsl(var(--border))] bg-raised px-2 py-0.5 text-[11px] text-[hsl(var(--text-2))]">{SECTION_LABELS[s] ?? s}</span>)}
                    </div>
                  )}
                </div>
                {(selected.recipients ?? []).length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Recipients</p>
                    <div className="flex flex-wrap gap-1">
                      {(selected.recipients ?? []).map(r => <span key={r} className="border border-[hsl(var(--border))] bg-raised px-2 py-0.5 text-[11px] text-[hsl(var(--text-2))]">{r}</span>)}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Scope</p>
                  {entities.routeFor('model', selected.linkedModelId) ? (
                    <Button size="xs" variant="secondary" icon={<ArrowSquareOut />} onClick={() => nav(entities.routeFor('model', selected.linkedModelId)!)}>Model: {entities.resolve('model', selected.linkedModelId)}</Button>
                  ) : (
                    <span className="text-xs text-[hsl(var(--text-4))]">{selected.linkedModelId ? 'Unavailable' : 'Org-wide report'}</span>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: 'runs', label: `Run history (${runsFor(selected.id).length})`,
            content: (
              <div className="space-y-2">
                {runsFor(selected.id).length === 0 ? (
                  <EmptyState title="No runs yet" message="This report has never been generated. Generate it to produce a real, downloadable snapshot of the registers it names." />
                ) : runsFor(selected.id).map(run => (
                  <div key={run.id} className="flex items-center gap-3 border border-[hsl(var(--border))] bg-raised p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[hsl(var(--text-1))]">{new Date(run.generatedAt).toLocaleString()}</p>
                      <p className="text-[11px] text-[hsl(var(--text-4))]">
                        {text(run.generatedBy)} · {(run.format ?? 'json').toUpperCase()} · {typeof run.sizeBytes === 'number' ? `${run.sizeBytes.toLocaleString()} bytes` : '—'} · {run.status}
                      </p>
                    </div>
                    <Button size="xs" variant="secondary" icon={<DownloadSimple />} onClick={() => {
                      const blob = new Blob([JSON.stringify(run.content, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url
                      a.download = `${(selected.name || 'report').replace(/\s+/g, '-').toLowerCase()}-${run.id.slice(0, 8)}.json`
                      a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
                    }}>Download</Button>
                  </div>
                ))}
              </div>
            ),
          },
        ] : []}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit report definition' : 'New report definition'}
        description="A report snapshots the registers you name below. Generating it reads those real tables — nothing here is pre-rendered."
        submitLabel={editing ? 'Save changes' : 'Create'}
        busy={false}
        onSubmit={submitForm}
      >
        <Field label="Name" required>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Frequency">
            <Select value={form.frequency} onValueChange={v => setForm(p => ({ ...p, frequency: v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Model scope" hint="ai_models.id — leave org-wide unless the report is about one model">
          <Select value={form.linkedModelId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, linkedModelId: v === '__none' ? null : v }))}>
            <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Org-wide" /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="__none">Org-wide</SelectItem>
              {entities.models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Sections" hint="Which registers this report snapshots at generation time">
          <div className="grid grid-cols-2 gap-1 border border-[hsl(var(--border))] bg-raised p-2">
            {SECTION_KEYS.map(s => {
              const checked = (form.sections ?? []).includes(s)
              return (
                <label key={s} className="flex cursor-pointer items-center gap-2 text-xs text-[hsl(var(--text-2))]">
                  <input type="checkbox" checked={checked} onChange={e => {
                    const cur = form.sections ?? []
                    setForm(p => ({ ...p, sections: e.target.checked ? [...cur, s] : cur.filter(x => x !== s) }))
                  }} />
                  {SECTION_LABELS[s]}
                </label>
              )
            })}
          </div>
        </Field>
        <Field label="Recipients" hint="Comma-separated email addresses">
          <input value={recipientsText} onChange={e => setRecipientsText(e.target.value)} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
        <Field label="Description">
          <textarea value={form.description ?? ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete report definition"
        description={`Delete "${toDelete?.name}"? Persisted run artifacts are retained.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
