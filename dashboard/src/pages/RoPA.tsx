// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// RoPA — Records of Processing Activities (GDPR Article 30).
//
// Backed by the canonical org-scoped `ropa_records` table. The page previously
// read the generic `ropa_table (id, doc jsonb)` demo table seeded from a
// hardcoded array, with local-only writes. Article 30 is a named statutory
// artefact a supervisory authority can demand on request — a fabricated row
// here is the highest-consequence class of defect in the platform.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Table as TableIcon, Plus, Warning } from '@phosphor-icons/react'
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
import { useRopaRecords } from '@/hooks/useComplianceRecords'
import { useModelOptions, useUseCases } from '@/hooks/useAiiaData'
import { useDatasets } from '@/hooks/useDatasetData'
import { useVendorOptions } from '@/hooks/useGovernAddons'
import { useRBAC } from '@/hooks/useRBAC'
import { LEGAL_BASES, type RopaRecord } from '@/services/privacyRecordsService'

const LEGAL_BASIS_LABEL: Record<string, string> = {
  consent: 'Consent',
  contract: 'Contract',
  legal_obligation: 'Legal obligation',
  vital_interests: 'Vital interests',
  public_task: 'Public task',
  legitimate_interests: 'Legitimate interests',
}

const EMPTY: Partial<RopaRecord> = {
  processingActivity: '', purpose: '', legalBasis: 'contract', dataSubjects: '',
  dataCategories: '', recipients: '', crossBorderTransfers: false,
  retentionPeriod: '', dpiaRequired: false, dpiaCompleted: false,
  technicalMeasures: '', organizationalMeasures: '', controllerName: '',
  processorName: '', status: 'active',
  linkedModelIds: [], linkedDatasetIds: [], linkedUseCaseId: null,
  processorVendorId: null, nextReviewAt: null,
}

export default function RoPA() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [params, setParams] = useSearchParams()
  const modelFilter = params.get('model')
  const openId = params.get('open')

  const ropa = useRopaRecords()
  const { models } = useModelOptions()
  const datasets = useDatasets()
  const useCases = useUseCases()
  const { vendors } = useVendorOptions()

  const modelName = (id: string) => models.find((m) => m.id === id)?.name
  const datasetName = (id: string) => datasets.data.find((d: any) => d.id === id)?.name
  const useCaseName = (id: string) => useCases.data.find((u) => u.id === id)?.title
  const vendorName = (id: string) => vendors.find((v) => v.id === id)?.name

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RopaRecord | null>(null)
  const [form, setForm] = useState<Partial<RopaRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<RopaRecord | null>(null)

  const set = <K extends keyof RopaRecord>(k: K, v: RopaRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(r: RopaRecord) { setEditing(r); setForm({ ...r }); setFormOpen(true) }

  // ?open=<id> lands here from the rights, consent and transfer registers, all
  // of which link back to the activity a record falls under.
  useEffect(() => {
    if (!openId || formOpen) return
    const target = ropa.data.find((r) => r.id === openId)
    if (target) openEdit(target)
  }, [openId, ropa.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(
    () => modelFilter ? ropa.data.filter((r) => r.linkedModelIds.includes(modelFilter)) : ropa.data,
    [ropa.data, modelFilter],
  )

  function submit() {
    const onError = (e: any) => toast.error(e?.message ?? 'Failed to save record')
    if (editing) {
      ropa.update.mutate({ id: editing.id, patch: form }, {
        onSuccess: () => { toast.success('Processing record updated'); setFormOpen(false) }, onError,
      })
    } else {
      ropa.create.mutate(form, {
        onSuccess: () => { toast.success('Processing record added'); setFormOpen(false) }, onError,
      })
    }
  }

  const stats = useMemo(() => {
    const all = ropa.data
    return {
      total: all.length,
      crossBorder: all.filter((r) => r.crossBorderTransfers).length,
      // The compliance gap that matters: DPIA required but not completed.
      dpiaGap: all.filter((r) => r.dpiaRequired && !r.dpiaCompleted).length,
      // An Art. 30 record that names no system cannot answer the first
      // question an authority asks: which system carries out this processing?
      unlinked: all.filter((r) => r.linkedModelIds.length === 0).length,
    }
  }, [ropa.data])

  const columns: Column<RopaRecord>[] = [
    { key: 'reference', header: 'Ref', sortable: true, render: (r) => (
      <span className="font-mono text-xs font-medium text-[hsl(var(--brand))]">{r.reference ?? '—'}</span>
    ) },
    { key: 'processingActivity', header: 'Processing activity', sortable: true, render: (r) => (
      <div>
        <div className="text-sm font-medium text-[hsl(var(--text-1))]">{r.processingActivity}</div>
        {r.purpose && <div className="max-w-md truncate text-xs text-[hsl(var(--text-4))]">{r.purpose}</div>}
      </div>
    ) },
    { key: 'legalBasis', header: 'Legal basis', sortable: true, render: (r) => {
      if (!r.legalBasis) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>
      // Consent-based processing must be able to reach the consent evidence
      // that makes it lawful (Art. 7(1) — the controller must demonstrate it).
      if (r.legalBasis === 'consent') return (
        <button
          className="text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav('/consent-management') }}
          title="Relies on consent — open the consent register"
        >
          {LEGAL_BASIS_LABEL.consent}
        </button>
      )
      return (
        <span className="text-xs text-[hsl(var(--text-2))]">
          {LEGAL_BASIS_LABEL[r.legalBasis] ?? r.legalBasis}
        </span>
      )
    } },
    { key: 'dataSubjects', header: 'Data subjects', render: (r) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{r.dataSubjects || '—'}</span>
    ) },
    { key: 'crossBorderTransfers', header: 'Transfers', render: (r) => r.crossBorderTransfers ? (
      <button
        className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline"
        onClick={(e) => { e.stopPropagation(); nav('/tia') }}
        title="Cross-border transfer — see Transfer Impact Assessments"
      >
        cross-border
      </button>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">domestic</span> },
    { key: 'dpiaRequired', header: 'DPIA', render: (r) => {
      if (!r.dpiaRequired) return <span className="text-xs text-[hsl(var(--text-4))]">not required</span>
      return r.dpiaCompleted
        ? <span className="inline-flex px-2 py-0.5 text-[11px] bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]">completed</span>
        : (
          <button
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] hover:underline"
            onClick={(e) => { e.stopPropagation(); nav('/dpia') }}
          >
            <Warning size={10} /> outstanding
          </button>
        )
    } },
    { key: 'linkedModelIds', header: 'AI systems', render: (r) => (
      <LinkChips ids={r.linkedModelIds} resolve={modelName}
        hrefFor={(id) => `/models/inventory/${id}`} onNavigate={nav}
        emptyLabel="none recorded" />
    ) },
    { key: 'linkedDatasetIds', header: 'Datasets', render: (r) => (
      <LinkChips ids={r.linkedDatasetIds} resolve={datasetName}
        hrefFor={(id) => `/datasets/${id}`} onNavigate={nav} />
    ) },
    { key: 'linkedUseCaseId', header: 'Use case', render: (r) => (
      <LinkChip id={r.linkedUseCaseId} resolve={useCaseName}
        href={(id) => `/use-cases/${id}`} onNavigate={nav} />
    ) },
    { key: 'processorVendorId', header: 'Processor', render: (r) => (
      r.processorVendorId
        ? <LinkChip id={r.processorVendorId} resolve={vendorName}
            href={(id) => `/vendors?open=${id}`} onNavigate={nav} />
        : <span className="text-xs text-[hsl(var(--text-3))]">{r.processorName || '—'}</span>
    ) },
    { key: 'retentionPeriod', header: 'Retention', render: (r) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{r.retentionPeriod || '—'}</span>
    ) },
    { key: 'lastReviewedAt', header: 'Review', sortable: true, render: (r) => {
      const due = r.nextReviewAt && new Date(r.nextReviewAt).getTime() < Date.now()
      return (
        <div className="font-mono text-[11px]">
          <div className="text-[hsl(var(--text-3))]">
            {r.lastReviewedAt ? r.lastReviewedAt.slice(0, 10) : 'never reviewed'}
          </div>
          <div style={{ color: due ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-4))' }}>
            {r.nextReviewAt ? `${due ? 'overdue since ' : 'next '}${r.nextReviewAt.slice(0, 10)}` : 'no review scheduled'}
          </div>
        </div>
      )
    } },
  ]

  return (
    <div>
      <PageHeader
        title="Records of Processing Activities"
        subtitle="GDPR Article 30 register — the record a supervisory authority can demand on request"
        icon={TableIcon}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/dpia')}>DPIA</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/consent-management')}>Consent</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/tia')}>Transfer Assessments</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openCreate}>Add Activity</Button>}
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
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Activities</p><p className="font-mono text-xl font-bold">{stats.total}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Cross-border</p><p className="font-mono text-xl font-bold">{stats.crossBorder}</p></div>
          <div><p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">DPIA outstanding</p><p className="font-mono text-xl font-bold text-[hsl(var(--s-er-tx))]">{stats.dpiaGap}</p></div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">No AI system linked</p>
            <p className="font-mono text-xl font-bold text-[hsl(var(--s-wn-tx))]">{stats.unlinked}</p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">cannot answer "which system?"</p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-4">
        {ropa.isLoading ? <TableSkeleton cols={7} />
          : ropa.isError ? <ErrorState message={ropa.error?.message} onRetry={() => ropa.refetch()} />
          : ropa.data.length === 0 ? (
            <EmptyState
              title="No processing activities recorded"
              message="Article 30 requires a written record of every processing activity — purpose, legal basis, data subjects, recipients, transfers and retention."
              actionLabel={can('create') ? 'Add an activity' : undefined}
              onAction={can('create') ? openCreate : undefined}
            />
          ) : (
            <DataTable
              data={rows} columns={columns} searchKey="processingActivity" searchPlaceholder="Search activities…"
              onEdit={can('update') ? openEdit : undefined}
              onDelete={can('delete') ? (r) => setToDelete(r) : undefined}
            />
          )}
      </Card>

      <FormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o && openId) { params.delete('open'); setParams(params) }
        }}
        title={editing ? `Edit ${editing.processingActivity}` : 'Add Processing Activity'}
        description="Every field here is part of the Article 30 record; incomplete entries are a finding at audit."
        submitLabel={editing ? 'Save changes' : 'Add'}
        busy={ropa.create.isPending || ropa.update.isPending}
        disabled={!form.processingActivity?.trim()}
        onSubmit={submit}
      >
        <Field label="Processing activity" required>
          <Input value={form.processingActivity ?? ''} onChange={(e) => set('processingActivity', e.target.value)} />
        </Field>
        <Field label="Purpose"><Textarea rows={2} value={form.purpose ?? ''} onChange={(e) => set('purpose', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal basis">
            <Select value={form.legalBasis ?? 'contract'} onValueChange={(v) => set('legalBasis', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEGAL_BASES.map((b) => <SelectItem key={b} value={b}>{LEGAL_BASIS_LABEL[b]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Retention period"><Input value={form.retentionPeriod ?? ''} onChange={(e) => set('retentionPeriod', e.target.value)} placeholder="7 years after closure" /></Field>
          <Field label="Data subjects"><Input value={form.dataSubjects ?? ''} onChange={(e) => set('dataSubjects', e.target.value)} /></Field>
          <Field label="Data categories"><Input value={form.dataCategories ?? ''} onChange={(e) => set('dataCategories', e.target.value)} /></Field>
          <Field label="Controller"><Input value={form.controllerName ?? ''} onChange={(e) => set('controllerName', e.target.value)} /></Field>
          <Field label="Processor"><Input value={form.processorName ?? ''} onChange={(e) => set('processorName', e.target.value)} /></Field>
        </div>
        <Field label="Recipients"><Input value={form.recipients ?? ''} onChange={(e) => set('recipients', e.target.value)} /></Field>
        <Field label="Technical measures"><Textarea rows={2} value={form.technicalMeasures ?? ''} onChange={(e) => set('technicalMeasures', e.target.value)} /></Field>
        <Field label="Organisational measures"><Textarea rows={2} value={form.organizationalMeasures ?? ''} onChange={(e) => set('organizationalMeasures', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Next review due" hint="Art. 30 records are kept up to date, not written once">
            <Input type="date" value={form.nextReviewAt ?? ''} onChange={(e) => set('nextReviewAt', e.target.value)} />
          </Field>
          <Field label="Last reviewed">
            <Input type="date" value={form.lastReviewedAt ?? ''} onChange={(e) => set('lastReviewedAt', e.target.value)} />
          </Field>
        </div>

        <Field label="AI systems carrying out this processing"
               hint="Without this the register cannot answer which system performs the activity">
          <ChipMultiSelect options={models} value={form.linkedModelIds ?? []}
            onChange={(v) => set('linkedModelIds', v)} emptyMessage="No models registered yet." />
        </Field>

        <Field label="Datasets processed">
          <ChipMultiSelect
            options={datasets.data.map((d: any) => ({ id: d.id, name: d.name }))}
            value={form.linkedDatasetIds ?? []} onChange={(v) => set('linkedDatasetIds', v)}
            emptyMessage="No datasets registered yet." />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Use case">
            <Select value={form.linkedUseCaseId ?? '__none__'} onValueChange={(v) => set('linkedUseCaseId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {useCases.data.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Processor" hint="Resolved against the vendor register">
            <Select value={form.processorVendorId ?? '__none__'} onValueChange={(v) => set('processorVendorId', v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not linked</SelectItem>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2 text-sm">
            <span>Cross-border</span>
            <Switch checked={!!form.crossBorderTransfers} onCheckedChange={(v) => set('crossBorderTransfers', v)} />
          </label>
          <label className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2 text-sm">
            <span>DPIA required</span>
            <Switch checked={!!form.dpiaRequired} onCheckedChange={(v) => set('dpiaRequired', v)} />
          </label>
          <label className="flex items-center justify-between border border-[hsl(var(--border))] px-3 py-2 text-sm">
            <span>DPIA completed</span>
            <Switch checked={!!form.dpiaCompleted} onCheckedChange={(v) => set('dpiaCompleted', v)} />
          </label>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.processingActivity ?? ''}"?`}
        description="This removes an Article 30 record. Confirm the activity has genuinely ceased — the register must reflect actual processing."
        isDestructive confirmLabel="Delete"
        onConfirm={() => {
          if (!toDelete) return
          ropa.remove.mutate(toDelete.id, {
            onSuccess: () => { toast.success('Record deleted'); setToDelete(null) },
            onError: (e: any) => toast.error(e?.message ?? 'Failed to delete'),
          })
        }}
      />
    </div>
  )
}
