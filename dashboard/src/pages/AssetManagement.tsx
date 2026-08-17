// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Asset Registry — ISO 27001 A.5.9 inventory of the AI estate, on the real
// org-scoped `assets` table.
//
// The previous page read `assetmanagement_table` (generic doc-jsonb demo
// table), seeded ten fictional assets on first load, saved through a
// setTimeout so every toast was fake success, and offered an "Import Assets"
// dialog that toasted "validation in progress" without reading a file. All of
// that is gone. What an asset can now do that it never could: resolve to the
// registry record it represents (`entity_id` → ai_models / datasets), carry
// the BIA's recovery objectives instead of a second unmaintained copy, and be
// referenced back from risks.linked_asset_ids.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Database, Plus } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { LinkChip } from '@/components/ui/LinkChips'
import { useAssetsData } from '@/hooks/useAdminData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useDatasets } from '@/hooks/useDatasetData'
import {
  ASSET_TYPES, ASSET_TYPE_LABEL, DATA_CLASSIFICATIONS, LIFECYCLE_STAGES,
  CRITICALITIES, LINKABLE_ENTITY_TYPES, type AssetRecord,
} from '@/services/assetService'

const CRIT_TONE: Record<string, string> = {
  critical: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  high: 'bg-[hsl(var(--r-hi-bg))] text-[hsl(var(--r-hi-tx))]',
  medium: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  low: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
}

const CLASS_TONE: Record<string, string> = {
  public: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
  internal: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]',
  confidential: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  restricted: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
}

const EMPTY: Partial<AssetRecord> = {
  name: '', type: 'infrastructure', riskLevel: 'Medium',
  dataClassification: 'internal', lifecycleStage: 'active',
  department: '', location: '', tags: [], entityId: null, entityType: null,
}

function cap(s?: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

export default function AssetManagement() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const modelFilter = params.get('model')

  const { items, isLoading, error, refetch, saveAsset, removeAsset, isSaving } =
    useAssetsData(modelFilter ? { entityId: modelFilter } : {})
  const { models } = useModelOptions()
  const datasets = useDatasets()

  const [typeFilter, setTypeFilter] = useState('all')
  const [critFilter, setCritFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetRecord | null>(null)
  const [form, setForm] = useState<Partial<AssetRecord>>(EMPTY)
  const [toDelete, setToDelete] = useState<AssetRecord | null>(null)

  const set = <K extends keyof AssetRecord>(k: K, v: AssetRecord[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  /** Resolve entity_id to a display name; undefined means "Unavailable". */
  const entityName = (a: { entityId?: string | null; entityType?: string | null }) => {
    if (!a.entityId) return undefined
    if (a.entityType === 'ai_model') return models.find((m) => m.id === a.entityId)?.name
    if (a.entityType === 'dataset') return datasets.data.find((d) => d.id === a.entityId)?.name
    return undefined
  }

  const rows = useMemo(() => items.filter((a) => {
    const q = search.toLowerCase()
    return (!q || a.name.toLowerCase().includes(q) || (a.assetRef ?? '').toLowerCase().includes(q))
      && (typeFilter === 'all' || a.type === typeFilter)
      && (critFilter === 'all' || a.criticality === critFilter)
  }), [items, search, typeFilter, critFilter])

  const stats = useMemo(() => ({
    total: items.length,
    linked: items.filter((a) => a.entityId).length,
    critical: items.filter((a) => a.criticality === 'critical' || a.criticality === 'high').length,
    withRto: items.filter((a) => a.biaRtoHours != null).length,
  }), [items])

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(a: AssetRecord) { setEditing(a); setForm({ ...a }); setFormOpen(true) }

  async function submit() {
    try {
      await saveAsset(editing ? { ...form, id: editing.id } : form)
      setFormOpen(false)
    } catch { /* hook surfaces the error; dialog stays open */ }
  }

  const columns: Column<AssetRecord>[] = [
    { key: 'assetRef', header: 'Ref', render: (a) => <span className="font-mono text-xs text-[hsl(var(--text-3))]">{a.assetRef ?? '—'}</span> },
    { key: 'name', header: 'Asset', render: (a) => <span className="font-medium text-[hsl(var(--text-1))]">{a.name}</span> },
    { key: 'type', header: 'Type', render: (a) => <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-2))]">{ASSET_TYPE_LABEL[a.type] ?? cap(a.type)}</span> },
    {
      key: 'entityId', header: 'Registry record',
      render: (a) => (
        <LinkChip
          id={a.entityId}
          resolve={() => entityName(a)}
          href={(id) => a.entityType === 'ai_model' ? `/models/inventory/${id}` : `/data/datasets?open=${id}`}
          onNavigate={nav}
        />
      ),
    },
    { key: 'criticality', header: 'Criticality', render: (a) => a.criticality ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${CRIT_TONE[a.criticality] ?? ''}`}>{cap(a.criticality)}</span> : <span className="text-[hsl(var(--text-4))]">—</span> },
    { key: 'dataClassification', header: 'Classification', render: (a) => a.dataClassification ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${CLASS_TONE[a.dataClassification] ?? ''}`}>{cap(a.dataClassification)}</span> : <span className="text-[hsl(var(--text-4))]">—</span> },
    { key: 'department', header: 'Department', render: (a) => <span className="text-xs text-[hsl(var(--text-2))]">{a.department ?? '—'}</span> },
    {
      key: 'biaRtoHours', header: 'RTO / RPO',
      render: (a) => (a.biaRtoHours != null || a.biaRpoHours != null)
        ? <span className="text-xs text-[hsl(var(--text-2))]">{a.biaRtoHours ?? '—'}h / {a.biaRpoHours ?? '—'}h</span>
        : <span className="text-xs text-[hsl(var(--text-4))]">—</span>,
    },
    { key: 'lifecycleStage', header: 'Lifecycle', render: (a) => <span className="text-xs text-[hsl(var(--text-2))]">{cap(a.lifecycleStage)}</span> },
  ]

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <PageHeader
        icon={<Database size={24} weight="duotone" />}
        title="Asset Registry"
        description="ISO 27001 A.5.9 — the AI estate: models, datasets, infrastructure, and which registry record each asset represents. Recovery objectives come from the BIA."
        actions={<Button onClick={openCreate} className="gap-2"><Plus weight="bold" size={16} />Register Asset</Button>}
      />

      {modelFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[hsl(var(--text-3))]">Filtered to assets representing</span>
          <LinkChip
            id={modelFilter}
            resolve={(id) => models.find((m) => m.id === id)?.name}
            href={(id) => `/models/inventory/${id}`}
            onNavigate={nav}
          />
          <Button variant="ghost" size="sm" onClick={() => { params.delete('model'); setParams(params) }}>×</Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total assets', value: stats.total },
          { label: 'Linked to registry', value: stats.linked },
          { label: 'Critical / high', value: stats.critical },
          { label: 'With recovery objectives', value: stats.withRto },
        ].map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by name or ref…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 max-w-xs" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{ASSET_TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={critFilter} onValueChange={setCritFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All criticalities</SelectItem>
            {CRITICALITIES.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton /> : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No assets found"
          message={search || typeFilter !== 'all' || critFilter !== 'all'
            ? 'No assets match the current filters.'
            : 'Register the first asset to start the inventory.'}
          actionLabel="Register Asset"
          onAction={openCreate}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          onEdit={openEdit}
          onDelete={(a) => setToDelete(a)}
          emptyMessage="No assets match the current filters."
        />
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.assetRef ?? editing.name}` : 'Register Asset'}
        onSubmit={submit}
        busy={isSaving}
        disabled={!form.name?.trim()}
      >
        <Field label="Name" required>
          <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onValueChange={(v) => {
              set('type', v)
              // Only model/dataset assets represent a registry record.
              if (!LINKABLE_ENTITY_TYPES.includes(v as never)) { set('entityId', null); set('entityType', null) }
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{ASSET_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Risk level">
            <Select value={form.riskLevel} onValueChange={(v) => set('riskLevel', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['Critical', 'High', 'Medium', 'Low'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        {form.type === 'ai_model' && (
          <Field label="Registry model" hint="The ai_models record this asset represents">
            <Select value={form.entityId ?? 'none'} onValueChange={(v) => { set('entityId', v === 'none' ? null : v); set('entityType', v === 'none' ? null : 'ai_model') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}
        {form.type === 'dataset' && (
          <Field label="Registry dataset" hint="The datasets record this asset represents">
            <Select value={form.entityId ?? 'none'} onValueChange={(v) => { set('entityId', v === 'none' ? null : v); set('entityType', v === 'none' ? null : 'dataset') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {datasets.data.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data classification">
            <Select value={form.dataClassification} onValueChange={(v) => set('dataClassification', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DATA_CLASSIFICATIONS.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lifecycle stage">
            <Select value={form.lifecycleStage} onValueChange={(v) => set('lifecycleStage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LIFECYCLE_STAGES.map((s) => <SelectItem key={s} value={s}>{cap(s)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department">
            <Input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} />
          </Field>
          <Field label="Location">
            <Input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="e.g. AWS ap-south-1" />
          </Field>
        </div>
        {editing && (editing.biaRtoHours != null || editing.biaRpoHours != null) && (
          <p className="text-xs text-[hsl(var(--text-3))]">
            Recovery objectives (RTO {editing.biaRtoHours ?? '—'}h / RPO {editing.biaRpoHours ?? '—'}h) are
            sourced from the Business Impact Analysis and edited there.
          </p>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { try { await removeAsset(toDelete.id) } finally { setToDelete(null) } } }}
        title="Delete asset"
        description={`Delete "${toDelete?.name}" from the registry? Risks referencing it will show an unresolvable link.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
