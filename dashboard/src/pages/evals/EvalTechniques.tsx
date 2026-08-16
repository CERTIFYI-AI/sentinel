// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Eval Techniques — the catalogue of evaluation methods the org runs against
// its models, each with a cadence, an owner, a due date and the governed models
// it applies to.
//
// Backed by the canonical org-scoped `eval_techniques` table. The page
// previously ran on the generic `evaltechniques_table (id, doc jsonb)` demo
// table seeded from a hardcoded array, with local-only writes.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CheckCircle, ChartLine, Flask, Gauge, Lightbulb, Lock,
  MagnifyingGlass, Plus, Scales, ShieldWarning, Warning,
} from '@phosphor-icons/react'
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
import { useEvalTechniques } from '@/hooks/useEvalTechniques'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import {
  TECHNIQUE_CADENCES, TECHNIQUE_CATEGORIES, TECHNIQUE_STATUSES,
  type EvalTechniqueRecord, type TechniqueCadence,
  type TechniqueCategory, type TechniqueStatus,
} from '@/services/evalTechniqueService'

/** Stored as a stable key so the icon choice survives a schema/library change. */
const ICONS: Record<string, React.ElementType> = {
  'check-circle': CheckCircle, 'scales': Scales, 'gauge': Gauge,
  'shield-warning': ShieldWarning, 'magnifying-glass': MagnifyingGlass,
  'lightbulb': Lightbulb, 'lock': Lock, 'chart-line': ChartLine, 'flask': Flask,
}
const ICON_KEYS = Object.keys(ICONS)

const CATEGORY_LABEL: Record<TechniqueCategory, string> = {
  performance: 'Performance', fairness: 'Fairness', robustness: 'Robustness',
  security: 'Security', quality: 'Quality', explainability: 'Explainability',
  privacy: 'Privacy', other: 'Other',
}

const STATUS_TONE: Record<TechniqueStatus, string> = {
  completed: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  in_progress: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
  planned: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
  blocked: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const EMPTY: Partial<EvalTechniqueRecord> = {
  name: '', description: '', category: 'performance', methodology: '', scoringMethod: '',
  applicableTypes: [], cadence: 'quarterly', status: 'planned', iconKey: 'flask',
  owner: '', linkedModelIds: [], referenceUrl: '',
}

/** Days until a due date; negative means overdue. Null when nothing is scheduled. */
function daysUntil(due?: string | null): number | null {
  if (!due) return null
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000)
}

export default function EvalTechniques() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const techniques = useEvalTechniques()
  const { models } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EvalTechniqueRecord | null>(null)
  const [form, setForm] = useState<Partial<EvalTechniqueRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<EvalTechniqueRecord | null>(null)

  const set = <K extends keyof EvalTechniqueRecord>(k: K, v: EvalTechniqueRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(t: EvalTechniqueRecord) { setEditing(t); setForm({ ...t }); setFormOpen(true) }

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save technique')
    if (editing) {
      techniques.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Technique updated'); setFormOpen(false) }, onError,
      })
    } else {
      techniques.create.mutate(form, {
        onSuccess: () => { toast.success('Technique added'); setFormOpen(false) }, onError,
      })
    }
  }

  /** Records a run against the real row and rolls the due date by cadence. */
  function markRun(t: EvalTechniqueRecord) {
    const today = new Date()
    const addDays = { continuous: 1, monthly: 30, quarterly: 91, semiannual: 182, annual: 365, ad_hoc: 0 }[t.cadence] ?? 91
    const next = addDays ? new Date(today.getTime() + addDays * 86_400_000) : null
    techniques.update.mutate(
      {
        id: t.id,
        patch: {
          lastRunAt: today.toISOString().slice(0, 10),
          nextDueAt: next ? next.toISOString().slice(0, 10) : null,
          status: 'completed',
        },
      },
      {
        onSuccess: () => toast.success(`${t.name}: run recorded`),
        onError: (e: any) => toast.error(e?.message ?? 'Failed to record run'),
      },
    )
  }

  const modelName = (id: string) => models.find((m) => m.id === id)?.name

  const stats = useMemo(() => {
    const rows = techniques.data
    const overdue = rows.filter((t) => {
      const d = daysUntil(t.nextDueAt)
      return d != null && d < 0
    }).length
    return {
      total: rows.length,
      active: rows.filter((t) => t.status === 'in_progress').length,
      overdue,
      unlinked: rows.filter((t) => t.linkedModelIds.length === 0).length,
    }
  }, [techniques.data])

  const columns: Column<EvalTechniqueRecord>[] = [
    { key: 'name', header: 'Technique', sortable: true, render: (t) => {
      const Icon = ICONS[t.iconKey] ?? Flask
      return (
        <div className="flex items-start gap-2">
          <Icon size={16} className="mt-[2px] shrink-0 text-[hsl(var(--brand))]" />
          <div>
            <div className="text-sm font-medium text-[hsl(var(--text-1))]">{t.name}</div>
            {t.description && (
              <div className="max-w-lg text-xs text-[hsl(var(--text-4))]">{t.description}</div>
            )}
          </div>
        </div>
      )
    } },
    { key: 'category', header: 'Category', sortable: true, render: (t) => (
      <span className="text-xs text-[hsl(var(--text-2))]">{CATEGORY_LABEL[t.category]}</span>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (t) => (
      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TONE[t.status]}`}>
        {t.status.replace('_', ' ')}
      </span>
    ) },
    { key: 'cadence', header: 'Cadence', sortable: true, render: (t) => (
      <span className="text-xs capitalize text-[hsl(var(--text-3))]">{t.cadence.replace('_', ' ')}</span>
    ) },
    { key: 'nextDueAt', header: 'Next due', sortable: true, render: (t) => {
      const d = daysUntil(t.nextDueAt)
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
    { key: 'linkedModelIds', header: 'Applies to', render: (t) => t.linkedModelIds.length ? (
      <div className="flex flex-wrap gap-1">
        {t.linkedModelIds.slice(0, 2).map((id) => {
          const name = modelName(id)
          return name ? (
            <button
              key={id}
              className="border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--brand))] hover:underline"
              onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${id}`) }}
            >{name}</button>
          ) : (
            <span key={id} className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-4))]">Unavailable</span>
          )
        })}
        {t.linkedModelIds.length > 2 && (
          <span className="text-[10px] text-[hsl(var(--text-4))]">+{t.linkedModelIds.length - 2}</span>
        )}
      </div>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">all models</span> },
    { key: 'owner', header: 'Owner', sortable: true, render: (t) => (
      <span className="text-xs text-[hsl(var(--text-2))]">{t.owner ?? '—'}</span>
    ) },
    { key: 'lastRunAt', header: 'Last run', sortable: true, render: (t) => (
      <span className="font-mono text-xs text-[hsl(var(--text-3))]">{t.lastRunAt ?? 'never'}</span>
    ) },
  ]

  return (
    <div>
      <PageHeader
        title="Eval Techniques"
        subtitle="The evaluation methods run against governed models — cadence, ownership and coverage"
        icon={Flask}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/model-validation')}>Validation Lab</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>Add Technique</Button>}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Techniques</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">In progress</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-in-tx))]">{stats.active}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Overdue</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.overdue}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Not model-scoped</p><p className="font-mono text-xl font-bold">{stats.unlinked}</p></div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {techniques.isLoading ? <TableSkeleton cols={8} />
          : techniques.isError ? <ErrorState message={techniques.error?.message} onRetry={() => techniques.refetch()} />
          : techniques.data.length === 0 ? (
            <EmptyState
              title="No evaluation techniques defined"
              message="Define the methods you run against models — accuracy, fairness, robustness, adversarial probing — so each carries a cadence, an owner and a due date."
              actionLabel={can('create') ? 'Add a technique' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <DataTable
              data={techniques.data} columns={columns} searchKey="name" searchPlaceholder="Search techniques…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (t) => setToDelete(t) : undefined}
              actions={can('update') ? (t) => (
                <Button variant="ghost" size="sm" title="Record a run"
                  onClick={(e) => { e.stopPropagation(); markRun(t) }}>Record run</Button>
              ) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen} onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.name}` : 'Add Evaluation Technique'}
        description="Techniques scoped to specific models appear on those model records; leave the scope empty to apply across the inventory."
        submitLabel={editing ? 'Save changes' : 'Add'}
        busy={techniques.create.isPending || techniques.update.isPending}
        disabled={!form.name?.trim()}
        onSubmit={submit}
      >
        <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={form.category ?? 'performance'} onValueChange={(v) => set('category', v as TechniqueCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TECHNIQUE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Cadence">
            <Select value={form.cadence ?? 'quarterly'} onValueChange={(v) => set('cadence', v as TechniqueCadence)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TECHNIQUE_CADENCES.map((c) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'planned'} onValueChange={(v) => set('status', v as TechniqueStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TECHNIQUE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Icon">
            <Select value={form.iconKey ?? 'flask'} onValueChange={(v) => set('iconKey', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ICON_KEYS.map((k) => <SelectItem key={k} value={k}>{k.replace('-', ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Owner"><Input value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></Field>
          <Field label="Next due">
            <Input type="date" value={form.nextDueAt ?? ''} onChange={(e) => set('nextDueAt', e.target.value)} />
          </Field>
        </div>
        <Field label="Methodology"><Textarea rows={2} value={form.methodology ?? ''} onChange={(e) => set('methodology', e.target.value)} /></Field>
        <Field label="Scoring method"><Input value={form.scoringMethod ?? ''} onChange={(e) => set('scoringMethod', e.target.value)} /></Field>
        <Field label="Applicable model types" hint="Comma-separated">
          <Input value={(form.applicableTypes ?? []).join(', ')}
            onChange={(e) => set('applicableTypes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </Field>
        <Field label="Applies to models" hint="Leave empty to apply across the whole inventory">
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
        title={`Remove ${toDelete?.name ?? ''}?`}
        description="The technique is soft-deleted; historical run records are retained."
        isDestructive confirmLabel="Remove"
        onConfirm={() => {
          if (!toDelete) return
          techniques.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Technique removed'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to remove'),
          })
        }}
      />
    </div>
  )
}
