// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DPIA — Data Protection Impact Assessments (GDPR Article 35), including the
// Article 36 prior-consultation trigger when residual risk stays high.
//
// Backed by the canonical org-scoped `dpia_assessments` table. The page
// previously read the generic `dpia_table (id, doc jsonb)` demo table with
// local-only writes, and no real table existed at all.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FileMagnifyingGlass, Plus, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { LinkChip, LinkChips, ChipMultiSelect } from '@/components/ui/LinkChips'
import { useDpiaRecords } from '@/hooks/useDpiaRecords'
import { useRopaRecords } from '@/hooks/useComplianceRecords'
import { useModelOptions, useUseCases } from '@/hooks/useAiiaData'
import { useRisksData } from '@/hooks/useRisksData'
import { useRBAC } from '@/hooks/useRBAC'
import {
  DPIA_STATUSES, RISK_LEVELS,
  type DpiaRecord, type DpiaStatus, type RiskLevel,
} from '@/services/dpiaService'

const STATUS_LABEL: Record<DpiaStatus, string> = {
  draft: 'Draft', in_progress: 'In progress', pending_review: 'Pending review',
  approved: 'Approved', rejected: 'Rejected',
}

const STATUS_TONE: Record<DpiaStatus, string> = {
  draft: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
  in_progress: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
  pending_review: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  approved: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  rejected: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const RISK_TONE: Record<string, string> = {
  critical: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  high: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  medium: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  low: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
}

const EMPTY: Partial<DpiaRecord> = {
  reference: '', title: '', description: '', processingPurpose: '',
  necessityJustification: '', dataCategories: [], dataSubjects: '',
  riskLevel: 'medium', identifiedRisks: '', mitigationMeasures: '',
  residualRiskLevel: null, consultationRequired: false, status: 'draft',
  dpoOpinion: '', ownerName: '', linkedModelIds: [], linkedRopaId: null,
  linkedRiskId: null, linkedUseCaseId: null,
}

function daysUntil(due?: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000)
}

export default function DPIA() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const dpia = useDpiaRecords()
  const ropa = useRopaRecords()
  const { models } = useModelOptions()
  const useCases = useUseCases()
  const { risks } = useRisksData()

  const useCaseName = (id: string) => useCases.data.find((u) => u.id === id)?.title
  const riskName = (id: string) => risks.find((r) => r.id === id)?.title

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DpiaRecord | null>(null)
  const [form, setForm] = useState<Partial<DpiaRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<DpiaRecord | null>(null)

  const set = <K extends keyof DpiaRecord>(k: K, v: DpiaRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(d: DpiaRecord) { setEditing(d); setForm({ ...d }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save assessment')
    if (editing) {
      dpia.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('DPIA updated'); setFormOpen(false) }, onError,
      })
    } else {
      dpia.create.mutate(form, {
        onSuccess: () => { toast.success('DPIA created'); setFormOpen(false) }, onError,
      })
    }
  }

  const modelName = (id: string) => models.find((m) => m.id === id)?.name
  const ropaName = (id?: string | null) =>
    id ? ropa.data.find((r) => r.id === id)?.processingActivity : undefined

  const stats = useMemo(() => {
    const rows = dpia.data
    return {
      total: rows.length,
      approved: rows.filter((d) => d.status === 'approved').length,
      // Art. 36: residual high/critical risk obliges prior consultation.
      consultationDue: rows.filter(
        (d) => (d.residualRiskLevel === 'high' || d.residualRiskLevel === 'critical') && !d.consultationDate,
      ).length,
      reviewOverdue: rows.filter((d) => {
        const n = daysUntil(d.nextReviewAt)
        return n != null && n < 0
      }).length,
    }
  }, [dpia.data])

  const columns: Column<DpiaRecord>[] = [
    { key: 'title', header: 'Assessment', sortable: true, render: (d) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{d.title}</div>
        <div className="text-xs text-[hsl(var(--text-4))]">
          {d.reference || '—'}{d.processingPurpose ? ` · ${d.processingPurpose}` : ''}
        </div>
      </div>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (d) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[d.status]}`}>
        {STATUS_LABEL[d.status]}
      </span>
    ) },
    { key: 'riskLevel', header: 'Inherent risk', sortable: true, render: (d) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${RISK_TONE[d.riskLevel]}`}>
        {d.riskLevel}
      </span>
    ) },
    { key: 'residualRiskLevel', header: 'Residual risk', sortable: true, render: (d) => d.residualRiskLevel ? (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${RISK_TONE[d.residualRiskLevel]}`}>
        {d.residualRiskLevel}
      </span>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">not assessed</span> },
    { key: 'consultation', header: 'Art. 36', render: (d) => {
      const due = (d.residualRiskLevel === 'high' || d.residualRiskLevel === 'critical') && !d.consultationDate
      if (due) return (
        <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--s-er-tx))]">
          <Warning size={11} /> consultation due
        </span>
      )
      if (d.consultationDate) return (
        <span className="font-mono text-xs text-[hsl(var(--text-3))]">{d.consultationDate.slice(0, 10)}</span>
      )
      return <span className="text-xs text-[hsl(var(--text-4))]">not required</span>
    } },
    { key: 'linkedModelIds', header: 'AI systems', render: (d) => d.linkedModelIds.length ? (
      <div className="flex flex-wrap gap-1">
        {d.linkedModelIds.slice(0, 2).map((id) => {
          const name = modelName(id)
          return name ? (
            <button key={id}
              className="border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--brand))] hover:underline"
              onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${id}`) }}>{name}</button>
          ) : <span key={id} className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-4))]">Unavailable</span>
        })}
        {d.linkedModelIds.length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{d.linkedModelIds.length - 2}</span>}
      </div>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'linkedRopaId', header: 'Processing activity', render: (d) => (
      <LinkChip id={d.linkedRopaId} resolve={ropaName}
        href={(id) => `/ropa?open=${id}`} onNavigate={nav} />
    ) },
    { key: 'linkedUseCaseId', header: 'Use case', render: (d) => (
      <LinkChip id={d.linkedUseCaseId} resolve={useCaseName}
        href={(id) => `/use-cases/${id}`} onNavigate={nav} />
    ) },
    { key: 'linkedRiskId', header: 'Residual risk', render: (d) => {
      // A DPIA whose residual risk stays high must leave something behind in
      // the risk register; an unlinked one is a dead end, not a closed issue.
      const high = d.residualRiskLevel === 'high' || d.residualRiskLevel === 'critical'
      if (!d.linkedRiskId && high) return (
        <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--s-er-tx))]">
          <Warning size={10} /> not in register
        </span>
      )
      return <LinkChip id={d.linkedRiskId} resolve={riskName}
        href={(id) => `/risk?open=${id}`} onNavigate={nav} />
    } },
    { key: 'nextReviewAt', header: 'Next review', sortable: true, render: (d) => {
      const n = daysUntil(d.nextReviewAt)
      if (n == null) return <span className="text-xs text-[hsl(var(--text-4))]">not scheduled</span>
      return (
        <span className="inline-flex items-center gap-1 text-xs"
          style={{ color: n < 0 ? 'hsl(var(--s-er-tx))' : n <= 30 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>
          {n < 0 && <Warning size={11} />}
          {n < 0 ? `${Math.abs(n)}d overdue` : `in ${n}d`}
        </span>
      )
    } },
  ]

  return (
    <div>
      <PageHeader
        title="Data Protection Impact Assessments"
        subtitle="GDPR Article 35 — required before high-risk processing; Article 36 consultation when residual risk stays high"
        icon={FileMagnifyingGlass}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/ropa')}>RoPA</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/aiia')}>AI Impact Assessments</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>New DPIA</Button>}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Assessments</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Approved</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-ok-tx))]">{stats.approved}</p></div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Art. 36 due</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.consultationDue}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">residual risk still high</p>
          </div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Review overdue</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.reviewOverdue}</p></div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {dpia.isLoading ? <TableSkeleton cols={8} />
          : dpia.isError ? <ErrorState message={dpia.error?.message} onRetry={() => dpia.refetch()} />
          : dpia.data.length === 0 ? (
            <EmptyState
              title="No impact assessments recorded"
              message="Article 35 requires a DPIA before processing that is likely to result in a high risk to individuals — including most automated decision-making."
              actionLabel={can('create') ? 'Start a DPIA' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <DataTable
              data={dpia.data} columns={columns} searchKey="title" searchPlaceholder="Search assessments…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (d) => setToDelete(d) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.title}` : 'New Impact Assessment'}
        description="Record the processing, its necessity, the risks identified and the measures that reduce them."
        submitLabel={editing ? 'Save changes' : 'Create'}
        busy={dpia.create.isPending || dpia.update.isPending}
        disabled={!form.title?.trim()}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reference"><Input value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} placeholder="DPIA-2026-001" /></Field>
          <Field label="Owner"><Input value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        </div>
        <Field label="Title" required><Input value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field label="Processing purpose"><Input value={form.processingPurpose ?? ''} onChange={(e) => set('processingPurpose', e.target.value)} /></Field>
        <Field label="Necessity & proportionality" hint="Art. 35(7)(b) — why this processing is necessary for the purpose">
          <Textarea rows={2} value={form.necessityJustification ?? ''} onChange={(e) => set('necessityJustification', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data subjects"><Input value={form.dataSubjects ?? ''} onChange={(e) => set('dataSubjects', e.target.value)} /></Field>
          <Field label="Data categories" hint="Comma-separated">
            <Input value={(form.dataCategories ?? []).join(', ')}
              onChange={(e) => set('dataCategories', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label="Inherent risk">
            <Select value={form.riskLevel ?? 'medium'} onValueChange={(v) => set('riskLevel', v as RiskLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Residual risk" hint="After mitigation — high or critical triggers Art. 36">
            <Select value={form.residualRiskLevel ?? '__none__'} onValueChange={(v) => set('residualRiskLevel', v === '__none__' ? null : (v as RiskLevel))}>
              <SelectTrigger><SelectValue placeholder="Not assessed" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not assessed</SelectItem>
                {RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Identified risks"><Textarea rows={2} value={form.identifiedRisks ?? ''} onChange={(e) => set('identifiedRisks', e.target.value)} /></Field>
        <Field label="Mitigation measures"><Textarea rows={2} value={form.mitigationMeasures ?? ''} onChange={(e) => set('mitigationMeasures', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select value={form.status ?? 'draft'} onValueChange={(v) => set('status', v as DpiaStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DPIA_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Next review"><Input type="date" value={form.nextReviewAt ?? ''} onChange={(e) => set('nextReviewAt', e.target.value)} /></Field>
          <Field label="Supervisory authority consultation date">
            <Input type="date" value={form.consultationDate ?? ''} onChange={(e) => set('consultationDate', e.target.value)} />
          </Field>
          <label className="flex items-center justify-between self-end border border-[hsl(var(--border))] px-3 py-2 text-sm">
            <span>Consultation required</span>
            <Switch checked={!!form.consultationRequired} onCheckedChange={(v) => set('consultationRequired', v)} />
          </label>
        </div>
        <Field label="DPO opinion"><Textarea rows={2} value={form.dpoOpinion ?? ''} onChange={(e) => set('dpoOpinion', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Use case" hint="The registered use case this assessment covers">
            <Select value={form.linkedUseCaseId ?? '__none__'} onValueChange={(v) => set('linkedUseCaseId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {useCases.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Residual risk in the register"
                 hint="Required where residual risk stays high — otherwise the finding dies here">
            <Select value={form.linkedRiskId ?? '__none__'} onValueChange={(v) => set('linkedRiskId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {risks.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Linked processing activity" hint="The RoPA entry this assessment covers">
          <Select value={form.linkedRopaId ?? '__none__'} onValueChange={(v) => set('linkedRopaId', v === '__none__' ? null : v)}>
            <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Not linked</SelectItem>
              {ropa.data.map((r) => <SelectItem key={r.id} value={r.id}>{r.processingActivity}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="AI systems covered">
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
            {models.length === 0 && <span className="text-xs text-[hsl(var(--text-4))]">No models registered yet.</span>}
          </div>
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.title ?? ''}"?`}
        description="The assessment is soft-deleted and retained as evidence of the decision made at the time."
        isDestructive confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete) return
          dpia.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('DPIA deleted'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to delete'),
          })
        }}
      />
    </div>
  )
}
