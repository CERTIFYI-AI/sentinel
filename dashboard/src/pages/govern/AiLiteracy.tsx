// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AI Literacy — training registry for staff competence on AI systems
// (EU AI Act Art.4 benchmark, ISO/IEC 42001 A.4.4). Sessions with attendees,
// completion tracking, and links to the governing policy and the models each
// training covers. Real org-scoped backend; honest empty/error states.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, GraduationCap, Plus } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useTrainings, usePolicyOptions } from '@/hooks/useGovernAddons'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { AttendeeStatus, TrainingRecord } from '@/services/aiLiteracyService'

const FORMATS = [
  ['live', 'Live session'], ['e_learning', 'E-learning'],
  ['workshop', 'Workshop'], ['certification', 'Certification'],
] as const
const STATUSES = [
  ['planned', 'Planned'], ['in_progress', 'In progress'],
  ['completed', 'Completed'], ['archived', 'Archived'],
] as const
const ATTENDEE_STATUSES: AttendeeStatus[] = ['enrolled', 'in_progress', 'completed', 'exempted', 'dropped']

const statusTone: Record<string, string> = {
  planned: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
  in_progress: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  completed: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  archived: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-4))]',
}

function completionPct(t: TrainingRecord): number | null {
  const counted = t.attendees.filter((a) => a.status !== 'exempted')
  if (!counted.length) return null
  return Math.round((counted.filter((a) => a.status === 'completed').length / counted.length) * 100)
}

const EMPTY_FORM: Partial<TrainingRecord> = {
  trainingRef: '', name: '', description: '', provider: '', format: 'e_learning',
  audience: '', status: 'planned', ownerName: '', linkedPolicyId: null,
  linkedModelIds: [], frameworkRefs: [], attendees: [],
}

export default function AiLiteracy() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, error, refetch, create, update, remove } = useTrainings()
  const { policies } = usePolicyOptions()
  const { models } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingRecord | null>(null)
  const [form, setForm] = useState<Partial<TrainingRecord>>(EMPTY_FORM)
  const [viewing, setViewing] = useState<TrainingRecord | null>(null)
  const [toDelete, setToDelete] = useState<TrainingRecord | null>(null)

  const set = <K extends keyof TrainingRecord>(k: K, v: TrainingRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setFormOpen(true) }
  function openEdit(t: TrainingRecord) { setEditing(t); setForm({ ...t }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save training')
    if (editing) {
      update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Training updated'); setFormOpen(false) }, onError,
      })
    } else {
      create.mutate(form, {
        onSuccess: () => { toast.success('Training registered'); setFormOpen(false) }, onError,
      })
    }
  }

  /** Cycle an attendee's status directly from the detail sheet. */
  function setAttendeeStatus(t: TrainingRecord, idx: number, status: AttendeeStatus) {
    const attendees = t.attendees.map((a, i) => i === idx
      ? { ...a, status, completedAt: status === 'completed' ? new Date().toISOString().slice(0, 10) : a.completedAt }
      : a)
    update.mutate({ id: t.id, patch: { attendees } }, {
      onSuccess: () => setViewing((v) => (v && v.id === t.id ? { ...v, attendees } : v)),
      onError: (e: any) => toast.error(e?.message ?? 'Failed to update attendee'),
    })
  }

  const stats = useMemo(() => {
    const total = data.length
    const completed = data.filter((t) => t.status === 'completed').length
    const inProgress = data.filter((t) => t.status === 'in_progress').length
    const attendees = data.flatMap((t) => t.attendees).filter((a) => a.status !== 'exempted')
    const pct = attendees.length
      ? Math.round((attendees.filter((a) => a.status === 'completed').length / attendees.length) * 100)
      : null
    return { total, completed, inProgress, pct }
  }, [data])

  const policyRef = (id?: string | null) => policies.find((p) => p.id === id)
  const modelName = (id: string) => models.find((m) => m.id === id)?.name

  const columns: Column<TrainingRecord>[] = [
    { key: 'trainingRef', header: 'Ref', sortable: true, render: (t) => <span className="font-mono text-xs">{t.trainingRef}</span> },
    { key: 'name', header: 'Training', sortable: true, render: (t) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{t.name}</div>
        <div className="text-xs text-[hsl(var(--text-4))]">{FORMATS.find(([v]) => v === t.format)?.[1]}{t.audience ? ` · ${t.audience}` : ''}</div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (t) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone[t.status] ?? ''}`}>{t.status.replace('_', ' ')}</span>
    ) },
    { key: 'completion', header: 'Completion', render: (t) => {
      const pct = completionPct(t)
      return pct == null ? <span className="text-xs text-[hsl(var(--text-4))]">—</span> : (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 bg-[hsl(var(--bg-muted))]"><div className="h-1.5 bg-[hsl(var(--brand))]" style={{ width: `${pct}%` }} /></div>
          <span className="font-mono text-xs">{pct}%</span>
        </div>
      )
    } },
    { key: 'ownerName', header: 'Owner', sortable: true },
    { key: 'policy', header: 'Policy', render: (t) => {
      const p = policyRef(t.linkedPolicyId)
      return p ? (
        <button className="text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/policies?open=${t.linkedPolicyId}`) }}>{p.ref || p.title}</button>
      ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span>
    } },
    { key: 'endsOn', header: 'Window', render: (t) => (
      <span className="font-mono text-xs text-[hsl(var(--text-3))]">{t.startsOn ?? '—'} → {t.endsOn ?? '—'}</span>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="AI Literacy"
        subtitle="Training registry — staff competence for AI systems (EU AI Act Art.4 benchmark, ISO 42001 A.4.4)"
        icon={GraduationCap}
        actions={can('create') ? <Button size="sm" icon={<Plus />} onClick={openCreate}>New Training</Button> : undefined}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Trainings</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Completed</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">{stats.completed}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">In progress</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.inProgress}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Attendee completion</p><p className="font-mono text-xl font-bold">{stats.pct == null ? '—' : `${stats.pct}%`}</p></div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState message={error?.message} onRetry={() => refetch()} />
          : data.length === 0 ? (
            <EmptyState title="No trainings registered yet"
              message="Track AI literacy sessions, attendees and completion — the record regulators ask for first."
              actionLabel={can('create') ? 'Register a training' : undefined}
              onAction={can('create') ? openCreate : undefined} />
          ) : (
            <DataTable
              data={data} columns={columns} searchKey="name" searchPlaceholder="Search trainings…"
              onRowClick={(t) => setViewing(t)}
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (t) => setToDelete(t) : undefined}
            />
          )}
      </Card>

      {/* Detail sheet: attendees + links */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {viewing && (
            <>
              <SheetHeader>
                <SheetTitle>{viewing.trainingRef} — {viewing.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                {viewing.description && <p className="text-[hsl(var(--text-2))]">{viewing.description}</p>}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-[hsl(var(--text-4))]">Provider</span><div>{viewing.provider ?? '—'}</div></div>
                  <div><span className="text-[hsl(var(--text-4))]">Duration</span><div>{viewing.durationHours != null ? `${viewing.durationHours}h` : '—'}</div></div>
                  <div><span className="text-[hsl(var(--text-4))]">Owner</span><div>{viewing.ownerName ?? '—'}</div></div>
                  <div><span className="text-[hsl(var(--text-4))]">Window</span><div className="font-mono">{viewing.startsOn ?? '—'} → {viewing.endsOn ?? '—'}</div></div>
                </div>

                {viewing.frameworkRefs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {viewing.frameworkRefs.map((f) => (
                      <span key={f} className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-0.5 text-[11px]">{f}</span>
                    ))}
                  </div>
                )}

                {(viewing.linkedModelIds.length > 0 || viewing.linkedPolicyId) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {viewing.linkedPolicyId && policyRef(viewing.linkedPolicyId) && (
                      <button onClick={() => nav(`/policies?open=${viewing.linkedPolicyId}`)}
                        className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]">
                        {policyRef(viewing.linkedPolicyId)!.ref || policyRef(viewing.linkedPolicyId)!.title} <ArrowSquareOut size={12} />
                      </button>
                    )}
                    {viewing.linkedModelIds.map((mid) => modelName(mid) ? (
                      <button key={mid} onClick={() => nav(`/models/inventory/${mid}`)}
                        className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]">
                        {modelName(mid)} <ArrowSquareOut size={12} />
                      </button>
                    ) : (
                      <span key={mid} className="border border-[hsl(var(--border))] px-2 py-0.5 text-xs text-[hsl(var(--text-4))]">Unavailable</span>
                    ))}
                  </div>
                )}

                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Attendees ({viewing.attendees.length})</p>
                  {viewing.linkedPolicyId && viewing.attendees.length > 0 && (
                    <p className="mb-2 text-[11px] text-[hsl(var(--text-4))]">
                      Attendees sync into the governing policy's acknowledgment register — completions count as acknowledged.{' '}
                      <button className="text-[hsl(var(--brand))] hover:underline"
                        onClick={() => nav(`/policies?open=${viewing.linkedPolicyId}`)}>
                        View acknowledgments
                      </button>
                    </p>
                  )}
                  {viewing.attendees.length === 0 ? (
                    <p className="text-xs text-[hsl(var(--text-4))]">No attendees recorded yet — edit the training to add them.</p>
                  ) : (
                    <div className="divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))]">
                      {viewing.attendees.map((a, i) => (
                        <div key={`${a.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div>
                            <div className="text-sm">{a.name}</div>
                            <div className="text-[11px] text-[hsl(var(--text-4))]">{a.role ?? '—'}{a.completedAt ? ` · completed ${a.completedAt}` : ''}</div>
                          </div>
                          {can('update') ? (
                            <Select value={a.status} onValueChange={(v) => setAttendeeStatus(viewing, i, v as AttendeeStatus)}>
                              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ATTENDEE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs capitalize text-[hsl(var(--text-3))]">{a.status.replace('_', ' ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / edit */}
      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.trainingRef}` : 'Register Training'}
        description="Competence records for staff working with AI systems; attendees are managed from the detail view."
        submitLabel={editing ? 'Save changes' : 'Register'}
        busy={create.isPending || update.isPending}
        disabled={!form.trainingRef?.trim() || !form.name?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reference" required><Input value={form.trainingRef ?? ''} disabled={!!editing} onChange={(e) => set('trainingRef', e.target.value)} placeholder="TRN-2026-005" /></Field>
          <Field label="Owner"><Input value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        </div>
        <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Description"><Textarea rows={3} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Format">
            <Select value={form.format ?? 'e_learning'} onValueChange={(v) => set('format', v as TrainingRecord['format'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FORMATS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'planned'} onValueChange={(v) => set('status', v as TrainingRecord['status'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Provider"><Input value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value)} /></Field>
          <Field label="Audience"><Input value={form.audience ?? ''} onChange={(e) => set('audience', e.target.value)} placeholder="Credit operations, all provinces" /></Field>
          <Field label="Starts"><Input type="date" value={form.startsOn ?? ''} onChange={(e) => set('startsOn', e.target.value)} /></Field>
          <Field label="Ends"><Input type="date" value={form.endsOn ?? ''} onChange={(e) => set('endsOn', e.target.value)} /></Field>
          <Field label="Duration (hours)"><Input type="number" value={form.durationHours ?? ''} onChange={(e) => set('durationHours', e.target.value === '' ? undefined : Number(e.target.value))} /></Field>
          <Field label="Governing policy">
            <Select value={form.linkedPolicyId ?? '__none__'} onValueChange={(v) => set('linkedPolicyId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.ref} · {p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Covered models" hint="Models this training teaches staff to operate or supervise">
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => {
              const selected = (form.linkedModelIds ?? []).includes(m.id)
              return (
                <button key={m.id} type="button"
                  onClick={() => set('linkedModelIds', selected
                    ? (form.linkedModelIds ?? []).filter((x) => x !== m.id)
                    : [...(form.linkedModelIds ?? []), m.id])}
                  className={`border px-2 py-1 text-[12px] ${selected
                    ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                    : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]'}`}>
                  {m.name}
                </button>
              )
            })}
          </div>
        </Field>
        <Field label="Framework references" hint="Comma-separated">
          <Input value={(form.frameworkRefs ?? []).join(', ')}
            onChange={(e) => set('frameworkRefs', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="EU AI Act Art.4 (benchmark), ISO 42001 A.4.4" />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.trainingRef ?? ''}?`}
        description="The training record is soft-deleted and disappears from the registry."
        isDestructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete) return
          remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Training deleted'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to delete'),
          })
        }}
      />
    </div>
  )
}
