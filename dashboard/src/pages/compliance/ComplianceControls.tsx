// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Compliance Controls — the org's control library, mapped to framework clauses,
// with implementation status, test currency and evidence counts.
//
// Backed by the canonical org-scoped `controls` table. The page previously read
// the generic `compliancecontrols_table (id, doc jsonb)` demo table seeded from
// a hardcoded array, while the real table already held hundreds of control
// records that were never displayed.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckSquare, Plus, Warning } from '@phosphor-icons/react'
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
import { useControls } from '@/hooks/useComplianceRecords'
import { useRBAC } from '@/hooks/useRBAC'
import {
  CONTROL_AUTOMATION, CONTROL_STATUSES,
  type ControlAutomation, type ControlRecord, type ControlStatus,
} from '@/services/complianceControlsService'

const STATUS_LABEL: Record<ControlStatus, string> = {
  implemented: 'Implemented',
  partially_implemented: 'Partially implemented',
  not_implemented: 'Not implemented',
  not_applicable: 'Not applicable',
}

const STATUS_TONE: Record<ControlStatus, string> = {
  implemented: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  partially_implemented: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  not_implemented: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  not_applicable: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
}

const EMPTY: Partial<ControlRecord> = {
  controlRef: '', name: '', description: '', clauseRef: '', category: '',
  status: 'not_implemented', severity: 'medium', score: null,
  automationStatus: 'manual', lastTestedAt: null, nextTestAt: null,
}

/** Days until a test is due; negative means overdue. Null when unscheduled. */
function daysUntil(due?: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000)
}

export default function ComplianceControls() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const controls = useControls()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ControlRecord | null>(null)
  const [form, setForm] = useState<Partial<ControlRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<ControlRecord | null>(null)

  const set = <K extends keyof ControlRecord>(k: K, v: ControlRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(c: ControlRecord) { setEditing(c); setForm({ ...c }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save control')
    if (editing) {
      controls.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Control updated'); setFormOpen(false) }, onError,
      })
    } else {
      controls.create.mutate(form, {
        onSuccess: () => { toast.success('Control added'); setFormOpen(false) }, onError,
      })
    }
  }

  /** Records a test against the real row — no simulated result. */
  function markTested(c: ControlRecord) {
    const today = new Date()
    const next = new Date(today.getTime() + 91 * 86_400_000)
    controls.update.mutate(
      {
        id: c.id,
        patch: {
          lastTestedAt: today.toISOString().slice(0, 10),
          nextTestAt: next.toISOString().slice(0, 10),
        },
      },
      {
        onSuccess: () => toast.success(`${c.controlRef}: test recorded`),
        onError: (e: any) => toast.error(e?.message ?? 'Failed to record test'),
      },
    )
  }

  const stats = useMemo(() => {
    const rows = controls.data
    const inScope = rows.filter((c) => c.status !== 'not_applicable')
    const implemented = rows.filter((c) => c.status === 'implemented').length
    const overdue = rows.filter((c) => {
      const d = daysUntil(c.nextTestAt)
      return d != null && d < 0
    }).length
    return {
      total: rows.length,
      implemented,
      // Coverage is computed over in-scope controls only; null when none exist,
      // so an empty library shows "—" rather than a misleading 0%.
      coverage: inScope.length ? Math.round((implemented / inScope.length) * 100) : null,
      overdue,
      untested: rows.filter((c) => !c.lastTestedAt).length,
    }
  }, [controls.data])

  const columns: Column<ControlRecord>[] = [
    { key: 'controlRef', header: 'Ref', sortable: true, render: (c) => (
      <span className="font-mono text-xs text-[hsl(var(--text-2))]">{c.controlRef || '—'}</span>
    ) },
    { key: 'name', header: 'Control', sortable: true, render: (c) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{c.name}</div>
        {c.description && <div className="max-w-lg truncate text-xs text-[hsl(var(--text-4))]">{c.description}</div>}
      </div>
    ) },
    { key: 'clauseRef', header: 'Clause', sortable: true, render: (c) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{c.clauseRef || '—'}</span>
    ) },
    { key: 'category', header: 'Category', sortable: true, render: (c) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{c.category || '—'}</span>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (c) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[c.status]}`}>
        {STATUS_LABEL[c.status]}
      </span>
    ) },
    { key: 'score', header: 'Score', sortable: true, render: (c) => (
      // Null means never scored — render a dash, never a 0.
      <span className="font-mono text-xs">{c.score == null ? '—' : `${c.score}%`}</span>
    ) },
    { key: 'evidenceCount', header: 'Evidence', sortable: true, render: (c) => (
      <span className="font-mono text-xs">{c.evidenceCount == null ? '—' : c.evidenceCount}</span>
    ) },
    { key: 'nextTestAt', header: 'Next test', sortable: true, render: (c) => {
      const d = daysUntil(c.nextTestAt)
      if (d == null) return <span className="text-xs text-[hsl(var(--text-4))]">not scheduled</span>
      const overdue = d < 0
      return (
        <span
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: overdue ? 'hsl(var(--s-er-tx))' : d <= 14 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}
        >
          {overdue && <Warning size={11} />}
          {overdue ? `${Math.abs(d)}d overdue` : `in ${d}d`}
        </span>
      )
    } },
    { key: 'automationStatus', header: 'Automation', render: (c) => (
      <span className="text-xs capitalize text-[hsl(var(--text-3))]">
        {c.automationStatus ? c.automationStatus.replace('_', ' ') : '—'}
      </span>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Compliance Controls"
        subtitle="The control library mapped to framework clauses, with test currency and evidence"
        icon={CheckSquare}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/frameworks')}>Frameworks</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/evidence')}>Evidence</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>Add Control</Button>}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Controls</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Coverage</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">
              {stats.coverage == null ? '—' : `${stats.coverage}%`}
            </p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">implemented, in-scope</p>
          </div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Test overdue</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.overdue}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Never tested</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.untested}</p></div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {controls.isLoading ? <TableSkeleton cols={9} />
          : controls.isError ? <ErrorState message={controls.error?.message} onRetry={() => controls.refetch()} />
          : controls.data.length === 0 ? (
            <EmptyState
              title="No controls defined"
              message="Define the controls your frameworks require, so implementation status and test currency are evidenced rather than asserted."
              actionLabel={can('create') ? 'Add a control' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <DataTable
              data={controls.data} columns={columns} searchKey="name" searchPlaceholder="Search controls…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (c) => setToDelete(c) : undefined}
              actions={can('update') ? (c) => (
                <Button variant="ghost" size="sm" title="Record a test"
                  onClick={(e) => { e.stopPropagation(); markTested(c) }}>Record test</Button>
              ) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.controlRef || editing.name}` : 'Add Control'}
        description="Controls carry an implementation status and a test cadence; both are evidence at audit."
        submitLabel={editing ? 'Save changes' : 'Add'}
        busy={controls.create.isPending || controls.update.isPending}
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
          <Field label="Category"><Input value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status ?? 'not_implemented'} onValueChange={(v) => set('status', v as ControlStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTROL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Severity">
            <Select value={form.severity ?? 'medium'} onValueChange={(v) => set('severity', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['critical', 'high', 'medium', 'low'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Automation">
            <Select value={form.automationStatus ?? 'manual'} onValueChange={(v) => set('automationStatus', v as ControlAutomation)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTROL_AUTOMATION.map((a) => <SelectItem key={a} value={a}>{a.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Last tested"><Input type="date" value={form.lastTestedAt ?? ''} onChange={(e) => set('lastTestedAt', e.target.value)} /></Field>
          <Field label="Next test due"><Input type="date" value={form.nextTestAt ?? ''} onChange={(e) => set('nextTestAt', e.target.value)} /></Field>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.controlRef || toDelete?.name || ''}?`}
        description="The control and its mapping are removed. Evidence already captured against it is retained."
        isDestructive confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete) return
          controls.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Control deleted'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to delete'),
          })
        }}
      />
    </div>
  )
}
