// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DSR / Rights Management — GDPR Arts. 15–22 requests against the statutory
// one-month clock of Art. 12(3).
//
// Rebuilt on the platform primitives. The previous hand-rolled page filtered
// and counted against Title Case literals ('Pending', 'In Review', 'High')
// while the table stores lowercase ('pending', 'in_review', 'high'), so every
// stat card read 0, every status and type filter returned nothing, and all ten
// rows rendered a LOW priority badge — including the five marked high. It also
// printed the raw uuid as the "Request ID" and toasted "DSR exported as PDF"
// without exporting anything. All vocabularies now come from the service,
// which mirrors the database CHECK constraints.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { UserList, Plus, Warning, Export } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { LinkChip, LinkChips, ChipMultiSelect } from '@/components/ui/LinkChips'
import { useDsrRequestsData } from '@/hooks/useDsrRequestsData'
import { useRopaRecords } from '@/hooks/useComplianceRecords'
import { useConsentRecordsData } from '@/hooks/useConsentRecordsData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import {
  DSR_REQUEST_TYPES, DSR_STATUSES, DSR_PRIORITIES,
  DSR_TYPE_LABEL, DSR_STATUS_LABEL, DSR_TYPE_ARTICLE, statutoryDueDate,
  type DsrRequest, type DsrRequestType, type DsrStatus, type DsrPriority,
} from '@/services/dsrRequestsService'

const STATUS_TONE: Record<DsrStatus, string> = {
  pending: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  in_review: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
  in_progress: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
  completed: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  rejected: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const TYPE_TONE: Record<DsrRequestType, string> = {
  access: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
  erasure: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  rectification: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  portability: 'bg-[hsl(var(--tag-purple-bg))] text-[hsl(var(--tag-purple))]',
  objection: 'bg-[hsl(var(--r-hi-bg))] text-[hsl(var(--r-hi-tx))]',
  restriction: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
}

const PRIORITY_TONE: Record<DsrPriority, string> = {
  urgent: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  high: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  normal: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
  low: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-4))]',
}

const EMPTY: Partial<DsrRequest> = {
  requesterName: '', requesterEmail: '', requestType: 'access', status: 'pending',
  priority: 'normal', description: '', notes: '', assignee: '',
  submittedDate: new Date().toISOString().slice(0, 10),
  dueDate: statutoryDueDate(), linkedModelIds: [], linkedRopaId: null,
  linkedConsentId: null, datasetId: null,
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function DsrManagement() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [params, setParams] = useSearchParams()
  const modelFilter = params.get('model')

  const { items, isLoading, error, saveDsrRequests, removeDsrRequests, isSaving } =
    useDsrRequestsData(modelFilter ? { modelId: modelFilter } : {})
  const ropa = useRopaRecords()
  const consent = useConsentRecordsData()
  const { models } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DsrRequest | null>(null)
  const [form, setForm] = useState<Partial<DsrRequest>>(EMPTY)
  const [toDelete, setToDelete] = useState<DsrRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const set = <K extends keyof DsrRequest>(k: K, v: DsrRequest[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  const modelName = (id: string) => models.find((m) => m.id === id)?.name
  const ropaName = (id?: string | null) =>
    id ? ropa.data.find((r) => r.id === id)?.processingActivity : undefined
  const consentRef = (id?: string | null) =>
    id ? consent.items.find((c: any) => c.id === id)?.consentRef : undefined

  const rows = useMemo(() => items.filter((d) =>
    (statusFilter === 'all' || d.status === statusFilter) &&
    (typeFilter === 'all' || d.requestType === typeFilter)), [items, statusFilter, typeFilter])

  const stats = useMemo(() => ({
    total: items.length,
    // Derived from the deadline, not from a stored 'Overdue' status that
    // nothing ever set.
    overdue: items.filter((d) => d.isOverdue).length,
    open: items.filter((d) => !['completed', 'rejected'].includes(d.status)).length,
    completed: items.filter((d) => d.status === 'completed').length,
  }), [items])

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(d: DsrRequest) { setEditing(d); setForm({ ...d }); setFormOpen(true) }

  async function submit() {
    try {
      await saveDsrRequests(editing ? { ...form, id: editing.id } : form)
      setFormOpen(false)
    } catch { /* the hook surfaces the error; the dialog stays open */ }
  }

  /**
   * Export the register as CSV. This is the real evidence export — the page
   * previously offered "Export Compliance Evidence" and only fired a success
   * toast. Ids are resolved to names so the file is readable by a regulator.
   */
  function exportCsv() {
    if (!rows.length) { toast.error('Nothing to export with the current filters'); return }
    const headers = [
      'reference', 'requester', 'email', 'type', 'article', 'status', 'priority',
      'submitted', 'due', 'days_remaining', 'overdue', 'processing_activity',
      'ai_systems', 'assignee', 'source',
    ]
    const lines = rows.map((d) => [
      d.reference, d.requesterName, d.requesterEmail, DSR_TYPE_LABEL[d.requestType],
      DSR_TYPE_ARTICLE[d.requestType], DSR_STATUS_LABEL[d.status], d.priority,
      d.submittedDate, d.dueDate, d.daysRemaining, d.isOverdue ? 'yes' : 'no',
      ropaName(d.linkedRopaId) ?? '',
      d.linkedModelIds.map((id) => modelName(id) ?? 'Unavailable').join('; '),
      d.assignee, d.source,
    ].map(csvEscape).join(','))
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dsr-register-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
    toast.success(`Exported ${rows.length} request${rows.length === 1 ? '' : 's'}`)
  }

  const columns: Column<DsrRequest>[] = [
    { key: 'reference', header: 'Reference', sortable: true, render: (d) => (
      <div>
        <div className="font-mono text-xs font-medium text-[hsl(var(--brand))]">
          {d.reference ?? '—'}
        </div>
        {d.autoGenerated && (
          <div className="text-[10px] text-[hsl(var(--text-4))]">
            raised by {d.createdByAgent ?? 'agent'}
          </div>
        )}
      </div>
    ) },
    { key: 'requesterName', header: 'Subject', sortable: true, render: (d) => (
      <div>
        <div className="text-sm text-[hsl(var(--text-1))]">
          {d.isBatch
            ? `${d.subjectCount ?? '—'} subjects (batch)`
            : d.requesterName || '—'}
        </div>
        <div className="font-mono text-[11px] text-[hsl(var(--text-4))]">
          {d.requesterEmail || '—'}
        </div>
      </div>
    ) },
    { key: 'requestType', header: 'Right', sortable: true, render: (d) => (
      <div>
        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${TYPE_TONE[d.requestType]}`}>
          {DSR_TYPE_LABEL[d.requestType]}
        </span>
        <div className="mt-0.5 font-mono text-[10px] text-[hsl(var(--text-4))]">
          {DSR_TYPE_ARTICLE[d.requestType]}
        </div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (d) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[d.status]}`}>
        {DSR_STATUS_LABEL[d.status]}
      </span>
    ) },
    { key: 'priority', header: 'Priority', sortable: true, render: (d) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_TONE[d.priority]}`}>
        {d.priority}
      </span>
    ) },
    { key: 'linkedRopaId', header: 'Processing activity', render: (d) => (
      <LinkChip id={d.linkedRopaId} resolve={(id) => ropaName(id)}
        href={(id) => `/ropa?open=${id}`} onNavigate={nav} />
    ) },
    { key: 'linkedConsentId', header: 'Consent', render: (d) => (
      <LinkChip id={d.linkedConsentId} resolve={(id) => consentRef(id)}
        href={(id) => `/consent-management?open=${id}`} onNavigate={nav} />
    ) },
    { key: 'linkedModelIds', header: 'AI systems', render: (d) => (
      <LinkChips ids={d.linkedModelIds} resolve={modelName}
        hrefFor={(id) => `/models/inventory/${id}`} onNavigate={nav} />
    ) },
    { key: 'dueDate', header: 'Art. 12(3) clock', sortable: true, render: (d) => {
      if (!d.dueDate) return <span className="text-xs text-[hsl(var(--text-4))]">no deadline set</span>
      if (d.daysRemaining == null) return (
        <span className="font-mono text-xs text-[hsl(var(--text-4))]">{d.dueDate.slice(0, 10)} · closed</span>
      )
      return (
        <div>
          <div className="font-mono text-xs text-[hsl(var(--text-2))]">{d.dueDate.slice(0, 10)}</div>
          <div className="inline-flex items-center gap-1 text-[11px]" style={{
            color: d.daysRemaining < 0 ? 'hsl(var(--s-er-tx))'
              : d.daysRemaining <= 7 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))',
          }}>
            {d.daysRemaining < 0 && <Warning size={10} />}
            {d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)}d overdue`
              : d.daysRemaining === 0 ? 'due today' : `${d.daysRemaining}d left`}
          </div>
        </div>
      )
    } },
  ]

  return (
    <div>
      <PageHeader
        title="DSR / Rights Management"
        subtitle="GDPR Arts. 15–22 rights requests against the Art. 12(3) one-month clock, mapped to the AI systems that hold the data"
        icon={UserList}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/ropa')}>RoPA</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/consent-management')}>Consent</Button>
            <Button variant="secondary" size="sm" icon={<Export />} onClick={exportCsv}>Export CSV</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>New request</Button>}
          </div>
        }
      />

      {modelFilter && (
        <div className="mb-3 inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2.5 py-1 text-xs text-[hsl(var(--brand))]">
          Filtered to {modelName(modelFilter) ?? 'Unavailable'}
          <button className="hover:underline" onClick={() => { params.delete('model'); setParams(params) }}>clear</button>
        </div>
      )}

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Requests</p>
            <p className="font-mono text-xl font-bold">{stats.total}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Overdue</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.overdue}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">past the statutory deadline</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Open</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.open}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Completed</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">{stats.completed}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={8} />
          : error ? <ErrorState message={(error as Error)?.message} />
          : items.length === 0 ? (
            <EmptyState
              title="No rights requests recorded"
              message="Every access, rectification, erasure, restriction, portability or objection request must be logged and answered within one month of receipt."
              actionLabel={can('create') ? 'Log a request' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {DSR_STATUSES.map((s) => <SelectItem key={s} value={s}>{DSR_STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All rights" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rights</SelectItem>
                    {DSR_REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{DSR_TYPE_LABEL[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">
                  {rows.length} of {items.length}
                </span>
              </div>
              <DataTable
                data={rows} columns={columns}
                searchKey="requesterName" searchPlaceholder="Search by subject…"
                onEdit={can('update') ? openEdit : undefined}
                onDelete={can('delete') ? (d) => setToDelete(d) : undefined}
                getRowClassName={(d) => d.isOverdue ? 'bg-[hsl(var(--s-er-bg))/40]' : ''}
              />
            </>
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.reference ?? 'request'}` : 'Log a rights request'}
        description="The response deadline defaults to one month from receipt under Art. 12(3); extend it only where the request is complex, and record why in the notes."
        submitLabel={editing ? 'Save changes' : 'Log request'}
        busy={isSaving}
        disabled={!form.requesterName?.trim() && !form.isBatch}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject name" required>
            <Input value={form.requesterName ?? ''} onChange={(e) => set('requesterName', e.target.value)} />
          </Field>
          <Field label="Subject email">
            <Input type="email" value={form.requesterEmail ?? ''} onChange={(e) => set('requesterEmail', e.target.value)} />
          </Field>
          <Field label="Right exercised" hint={DSR_TYPE_ARTICLE[(form.requestType ?? 'access') as DsrRequestType]}>
            <Select value={form.requestType ?? 'access'} onValueChange={(v) => set('requestType', v as DsrRequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DSR_REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{DSR_TYPE_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'pending'} onValueChange={(v) => set('status', v as DsrStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DSR_STATUSES.map((s) => <SelectItem key={s} value={s}>{DSR_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority ?? 'normal'} onValueChange={(v) => set('priority', v as DsrPriority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DSR_PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Assignee">
            <Input value={form.assignee ?? ''} onChange={(e) => set('assignee', e.target.value)} />
          </Field>
          <Field label="Received">
            <Input type="date" value={form.submittedDate ?? ''} onChange={(e) => set('submittedDate', e.target.value)} />
          </Field>
          <Field label="Response due" hint="One month from receipt unless extended">
            <Input type="date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} />
          </Field>
        </div>

        <Field label="What the subject asked for">
          <Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <Field label="Processing activity" hint="The Art. 30 record this request falls under">
          <Select value={form.linkedRopaId ?? '__none__'} onValueChange={(v) => set('linkedRopaId', v === '__none__' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {ropa.data.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.reference ? `${r.reference} — ` : ''}{r.processingActivity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Consent record" hint="Where the request contests consent-based processing">
          <Select value={form.linkedConsentId ?? '__none__'} onValueChange={(v) => set('linkedConsentId', v === '__none__' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {consent.items.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.consentRef ?? 'Unreferenced'} — {c.subjectName ?? c.subjectRef ?? 'subject'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="AI systems holding this subject's data"
               hint="What makes the request actionable — an erasure that names no system cannot be carried out">
          <ChipMultiSelect options={models} value={form.linkedModelIds ?? []}
            onChange={(v) => set('linkedModelIds', v)} emptyMessage="No models registered yet." />
        </Field>

        <Field label="Case notes">
          <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.reference ?? 'this request'}?`}
        description="The request is soft-deleted and retained: it is the evidence that the one-month deadline was met, and destroying it destroys the only proof."
        isDestructive confirmLabel="Delete"
        onConfirm={async () => {
          if (!toDelete) return
          try { await removeDsrRequests(toDelete.id); setToDelete(null) } catch { /* hook toasts */ }
        }}
      />
    </div>
  )
}
