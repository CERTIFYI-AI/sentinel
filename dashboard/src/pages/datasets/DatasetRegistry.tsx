// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetRegistry — governed dataset inventory over the canonical `datasets`
// table. Linked models are ai_models uuids resolved to name pills; honors
// ?model=<uuid> (dismissible filter chip) and ?open=<id> deep links.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Database, Plus, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useDatasets } from '@/hooks/useDatasetData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { DatasetRecord } from '@/services/datasetService'

const DATASET_TYPES = ['tabular', 'text_corpus', 'image', 'time_series', 'graph', 'audio', 'video', 'multimodal']
const CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted']
const STATUSES = ['active', 'archived', 'deprecated', 'draft']

function isAuditOverdue(lastAudit?: string): boolean {
  if (!lastAudit) return true
  return (Date.now() - new Date(lastAudit).getTime()) / 86_400_000 > 90
}

function classStyle(c?: string) {
  switch (c) {
    case 'restricted': return { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }
    case 'confidential': return { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
    case 'public': return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
    default: return { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }
  }
}

export default function DatasetRegistry() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { data, isLoading, isError, error, refetch, create, update, remove } = useDatasets()
  const { models, loading: modelsLoading } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetRecord | null>(null)
  const [toDelete, setToDelete] = useState<DatasetRecord | null>(null)

  // Resolve a model uuid to its display name; never leak the raw uuid.
  const modelName = (id?: string) => (id ? models.find((m) => m.id === id)?.name : undefined)

  // Deep-link: ?open=<id> routes straight to the dataset detail page.
  useEffect(() => {
    if (!openParam || !data.length) return
    if (data.some((d) => d.id === openParam)) nav(`/datasets/${openParam}`, { replace: true })
  }, [openParam, data, nav])

  const rows = useMemo(
    () => data.filter((d) => !modelParam || d.usedInModels.includes(modelParam)),
    [data, modelParam],
  )

  const piiCount = data.filter((d) => d.containsPii).length
  const unlinked = data.filter((d) => d.usedInModels.length === 0).length
  const overdue = data.filter((d) => isAuditOverdue(d.lastAuditDate)).length

  const columns: Column<DatasetRecord>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (d) => (
      <div>
        <span className="text-xs font-medium text-[hsl(var(--text-1))]">{d.name}</span>
        {d.version && <span className="ml-2 font-mono text-[10px] text-[hsl(var(--text-4))]">{d.version}</span>}
      </div>
    ) },
    { key: 'type', header: 'Type', sortable: true, render: (d) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{d.type?.replace('_', ' ') ?? '—'}</span>
    ) },
    { key: 'classification', header: 'Classification', sortable: true, render: (d) => (
      <span className="px-2 py-0.5 text-[10px] font-medium" style={classStyle(d.classification)}>{d.classification ?? '—'}</span>
    ) },
    { key: 'containsPii', header: 'PII', render: (d) => d.containsPii ? (
      <span className="px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>PII</span>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'usedInModels', header: 'Linked Models', render: (d) => {
      if (d.usedInModels.length === 0) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>
      const shown = d.usedInModels.slice(0, 2)
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          {shown.map((mid) => {
            const name = modelName(mid)
            if (!name) return <span key={mid} className="text-xs text-[hsl(var(--text-4))]">{modelsLoading ? '…' : 'Unavailable'}</span>
            return (
              <button
                key={mid}
                onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${mid}`) }}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                {name} <ArrowSquareOut size={12} />
              </button>
            )
          })}
          {d.usedInModels.length > 2 && (
            <span className="text-[10px] text-[hsl(var(--text-4))]">+{d.usedInModels.length - 2}</span>
          )}
        </span>
      )
    } },
    { key: 'recordCount', header: 'Records', sortable: true, render: (d) => (
      <span className="font-mono text-xs text-[hsl(var(--text-2))]">{d.recordCount != null ? d.recordCount.toLocaleString() : '—'}</span>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: (d) => (
      <span className="text-xs text-[hsl(var(--text-2))]">{d.status ?? '—'}</span>
    ) },
    { key: 'lastAuditDate', header: 'Last Audit', sortable: true, render: (d) => (
      <span className="text-xs" style={{ color: isAuditOverdue(d.lastAuditDate) ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-4))' }}>
        {d.lastAuditDate ?? 'never'}
      </span>
    ) },
  ]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Dataset Registry"
        subtitle="Governed inventory of AI training and evaluation data"
        icon={Database}
        actions={can('create') ? (
          <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Dataset</Button>
        ) : undefined}
      />

      {modelParam && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Filtered to <strong>{modelName(modelParam) ?? (modelsLoading ? '…' : 'Unavailable')}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Datasets', value: data.length },
          { label: 'Contain PII', value: piiCount },
          { label: 'Not Linked to a Model', value: unlinked },
          { label: 'Audit Overdue (>90d)', value: overdue },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="px-4 py-3">
              <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{isLoading ? '—' : s.value}</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--text-4))]">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={8} />
          : isError ? <ErrorState message={error?.message} onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState
              title={modelParam ? 'No datasets linked to this model' : 'No datasets yet'}
              message={modelParam
                ? 'Clear the model filter to see all datasets, or register one and link it to this model.'
                : 'Register the first dataset to start governing your AI training data.'}
              actionLabel={can('create') ? 'New Dataset' : undefined}
              onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="name" searchPlaceholder="Search datasets…"
              onView={(d) => nav(`/datasets/${d.id}`)}
              onEdit={can('update') ? (d) => { setEditing(d); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(d) => nav(`/datasets/${d.id}`)}
            />
          )}
      </Card>

      <DatasetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultModelId={modelParam ?? undefined}
        onSubmit={async (patch) => {
          if (editing) {
            await update.mutateAsync({ id: editing.id, patch })
            toast.success('Dataset updated')
          } else {
            await create.mutateAsync(patch)
            toast.success('Dataset registered')
          }
          setFormOpen(false)
        }}
      />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete ${toDelete?.name ?? ''}?`}
        description="This soft-deletes the dataset; it will no longer appear in the registry, lineage or quality views."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id, {
            onSuccess: () => toast.success('Dataset deleted'),
            onError: (err: any) => toast.error(err?.message ?? 'Delete failed'),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}

// ── Create / edit form ────────────────────────────────────────────────────────

function DatasetForm({ open, onOpenChange, initial, defaultModelId, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: DatasetRecord | null
  defaultModelId?: string
  onSubmit: (patch: Partial<DatasetRecord>) => Promise<void>
}) {
  const { models, loading: modelsLoading } = useModelOptions()
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [type, setType] = useState('tabular')
  const [classification, setClassification] = useState('internal')
  const [status, setStatus] = useState('active')
  const [owner, setOwner] = useState('')
  const [source, setSource] = useState('')
  const [format, setFormat] = useState('')
  const [containsPii, setContainsPii] = useState(false)
  const [piiTypes, setPiiTypes] = useState('')
  const [demographicData, setDemographicData] = useState(false)
  const [recordCount, setRecordCount] = useState('')
  const [encryption, setEncryption] = useState('')
  const [retentionPolicy, setRetentionPolicy] = useState('')
  const [lastAuditDate, setLastAuditDate] = useState('')
  const [description, setDescription] = useState('')
  const [linkedModels, setLinkedModels] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setVersion(initial?.version ?? '')
    setType(initial?.type ?? 'tabular')
    setClassification(initial?.classification ?? 'internal')
    setStatus(initial?.status ?? 'active')
    setOwner(initial?.owner ?? '')
    setSource(initial?.source ?? '')
    setFormat(initial?.format ?? '')
    setContainsPii(initial?.containsPii ?? false)
    setPiiTypes((initial?.piiTypes ?? []).join(', '))
    setDemographicData(initial?.demographicData ?? false)
    setRecordCount(initial?.recordCount != null ? String(initial.recordCount) : '')
    setEncryption(initial?.encryption ?? '')
    setRetentionPolicy(initial?.retentionPolicy ?? '')
    setLastAuditDate(initial?.lastAuditDate ?? '')
    setDescription(initial?.description ?? '')
    setLinkedModels(initial?.usedInModels ?? (defaultModelId ? [defaultModelId] : []))
  }, [open, initial, defaultModelId])

  const toggleModel = (id: string) =>
    setLinkedModels((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])

  const canSubmit = name.trim().length > 0 && owner.trim().length > 0 && !saving

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(), version: version.trim() || undefined, type, classification, status,
        owner: owner.trim(), source: source.trim() || undefined, format: format.trim() || undefined,
        containsPii,
        piiTypes: containsPii ? piiTypes.split(',').map((s) => s.trim()).filter(Boolean) : [],
        demographicData,
        recordCount: recordCount ? Number(recordCount) : undefined,
        encryption: encryption.trim() || undefined,
        retentionPolicy: retentionPolicy.trim() || undefined,
        lastAuditDate: lastAuditDate || undefined,
        description: description.trim() || undefined,
        usedInModels: linkedModels,
      })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save dataset')
    } finally {
      setSaving(false)
    }
  }

  const label = 'text-xs font-semibold text-[hsl(var(--text-4))]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? `Edit ${initial.name}` : 'Register Dataset'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Dataset name" /></div>
            <div><label className={label}>Version</label>
              <Input value={version} onChange={(e) => setVersion(e.target.value)} className="mt-1" placeholder="v1.0" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{DATASET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className={label}>Classification</label>
              <Select value={classification} onValueChange={setClassification}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><label className={label}>Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Owner *</label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1" placeholder="Owning team or person" /></div>
            <div><label className={label}>Source System</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} className="mt-1" placeholder="e.g. Core Banking DB" /></div>
          </div>
          <div className="flex items-center gap-6 py-1">
            <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-1))]">
              <input type="checkbox" checked={containsPii} onChange={(e) => setContainsPii(e.target.checked)} className="h-4 w-4" />
              Contains PII
            </label>
            <label className="flex items-center gap-2 text-xs text-[hsl(var(--text-1))]">
              <input type="checkbox" checked={demographicData} onChange={(e) => setDemographicData(e.target.checked)} className="h-4 w-4" />
              Demographic data
            </label>
          </div>
          {containsPii && (
            <div><label className={label}>PII Categories (comma-separated)</label>
              <Input value={piiTypes} onChange={(e) => setPiiTypes(e.target.value)} className="mt-1" placeholder="e.g. name, SSN, email" /></div>
          )}
          <div className="grid grid-cols-4 gap-3">
            <div><label className={label}>Records</label>
              <Input type="number" value={recordCount} onChange={(e) => setRecordCount(e.target.value)} className="mt-1" placeholder="0" /></div>
            <div><label className={label}>Format</label>
              <Input value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1" placeholder="Parquet" /></div>
            <div><label className={label}>Encryption</label>
              <Input value={encryption} onChange={(e) => setEncryption(e.target.value)} className="mt-1" placeholder="AES-256" /></div>
            <div><label className={label}>Last Audit</label>
              <Input type="date" value={lastAuditDate} onChange={(e) => setLastAuditDate(e.target.value)} className="mt-1" /></div>
          </div>
          <div><label className={label}>Retention Policy</label>
            <Input value={retentionPolicy} onChange={(e) => setRetentionPolicy(e.target.value)} className="mt-1" placeholder="e.g. 7 years (regulatory minimum)" /></div>
          <div><label className={label}>Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="What this dataset contains and how it is used" /></div>
          <div>
            <label className={label}>Linked Models</label>
            {modelsLoading ? (
              <p className="mt-1 text-xs text-[hsl(var(--text-4))]">Loading models…</p>
            ) : models.length === 0 ? (
              <p className="mt-1 text-xs text-[hsl(var(--text-4))]">No models registered yet — link models later from this form.</p>
            ) : (
              <div className="mt-1 max-h-36 space-y-1 overflow-y-auto border border-[hsl(var(--border))] p-2">
                {models.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-xs text-[hsl(var(--text-1))]">
                    <input type="checkbox" checked={linkedModels.includes(m.id)} onChange={() => toggleModel(m.id)} className="h-4 w-4" />
                    {m.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Register Dataset'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
