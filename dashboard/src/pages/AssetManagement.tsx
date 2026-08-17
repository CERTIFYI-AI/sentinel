// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Asset Registry — on the real org-scoped `assets` table via assetService /
// useAssetsData. Replaces the `assetmanagement_table (id, doc jsonb)` demo
// table and the hardcoded ten-row SEED the page used to render.
//
// What this rebuild deliberately drops:
//   * the fabricated audit history, named auditors and "Pass — 2 minor
//     findings" strings — none of it was ever measured;
//   * the fake "Import Assets" flow that toasted success without importing;
//   * the setTimeout(700) that faked a save latency then wrote to local state.
//
// Interlinks (both directions): entity_id/entity_type → the model or dataset
// the asset *is* (resolved to a name, linked to its detail page); vendor_id →
// the supplier. `?model=<ai_models.id>` filters to that model's assets with a
// dismissible chip; `?open=<assets.id>` opens the record. Assets are reached
// back from BIA (linked_asset_ids), risks (linked_asset_ids) and model detail.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Plus, Export, ArrowSquareOut, X, Trash } from '@phosphor-icons/react'
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
import { useAssetsData } from '@/hooks/useAssetsData'
import { useSupplyChainEntities } from '@/hooks/useSupplyChainEntities'
import { useUserOptions } from '@/hooks/useUserOptions'
import type { AssetRecord, AssetType, Criticality, DataClassification, LifecycleStage } from '@/services/assetService'

const TYPES: AssetType[] = ['ai_model', 'dataset', 'agent', 'api_endpoint', 'code_repo', 'saas_app', 'infrastructure', 'prompt', 'llm_gateway', 'container']
const CRITICALITIES: Criticality[] = ['critical', 'high', 'medium', 'low']
const CLASSIFICATIONS: DataClassification[] = ['public', 'internal', 'confidential', 'restricted', 'pii']
const LIFECYCLES: LifecycleStage[] = ['planned', 'active', 'decommissioning', 'decommissioned']

const TYPE_LABEL: Record<string, string> = {
  ai_model: 'AI Model', dataset: 'Dataset', agent: 'Agent', api_endpoint: 'API Endpoint',
  code_repo: 'Code Repo', saas_app: 'SaaS App', infrastructure: 'Infrastructure',
  prompt: 'Prompt', llm_gateway: 'LLM Gateway', container: 'Container',
}
const CRIT_TONE: Record<string, { background: string; color: string }> = {
  critical: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
  high: { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  medium: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  low: { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))' },
}
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')
const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
/** null renders "—", never 0. */
const numHrs = (v: number | null | undefined) => (typeof v === 'number' ? `${v}h` : '—')

function Pill({ label, tone }: { label: string; tone: { background: string; color: string } }) {
  return <span className="px-2 py-0.5 text-[11px] font-medium" style={tone}>{label}</span>
}

const BLANK: Partial<AssetRecord> = {
  assetRef: '', name: '', type: 'ai_model', ownerId: null, department: '',
  criticality: 'medium', dataClassification: 'internal', lifecycleStage: 'active',
  entityType: null, entityId: null, vendorId: null, vendorText: '', hostname: '', version: '',
}

export default function AssetManagement() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')

  const { assets, isLoading, error, refetch, create, update, remove } = useAssetsData()
  const entities = useSupplyChainEntities()
  const { options: users } = useUserOptions()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AssetRecord | null>(null)
  const [form, setForm] = useState<Partial<AssetRecord>>({ ...BLANK })
  const [toDelete, setToDelete] = useState<AssetRecord | null>(null)

  const selected = assets.find(a => a.id === selectedId) ?? null

  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (openParam && appliedOpen.current !== openParam && assets.some(a => a.id === openParam)) {
      appliedOpen.current = openParam
      setSelectedId(openParam)
    }
  }, [openParam, assets])

  const userName = (id: string | null | undefined) => {
    if (!id) return null
    return users.find(u => u.id === id)?.name ?? 'Unavailable'
  }

  // The registry record an asset *is* — a model or a dataset.
  const entityName = (a: AssetRecord): string | null => {
    if (!a.entityId || !a.entityType) return null
    return entities.resolve(a.entityType === 'ai_model' ? 'model' : 'dataset', a.entityId)
  }
  const entityRoute = (a: AssetRecord): string | null => {
    if (!a.entityId || !a.entityType) return null
    return entities.routeFor(a.entityType === 'ai_model' ? 'model' : 'dataset', a.entityId)
  }

  const filtered = useMemo(
    () => (modelParam ? assets.filter(a => a.entityType === 'ai_model' && a.entityId === modelParam) : assets),
    [assets, modelParam],
  )

  const rows = useMemo(() => filtered.map(a => ({ ...a, _name: a.name })), [filtered])
  type Row = (typeof rows)[number]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, assetRef: `AST-${Date.now().toString(36).toUpperCase().slice(-5)}`, entityId: modelParam ?? null, entityType: modelParam ? 'ai_model' : null })
    setFormOpen(true)
  }
  function openEdit(a: AssetRecord) {
    setEditing(a)
    setForm({ ...a })
    setFormOpen(true)
  }

  async function submitForm() {
    if (!form.name?.trim()) { toast.error('An asset name is required'); return }
    const patch: Partial<AssetRecord> = {
      assetRef: form.assetRef?.trim() || null,
      name: form.name.trim(),
      type: form.type,
      ownerId: form.ownerId || null,
      department: form.department?.trim() || null,
      criticality: form.criticality,
      dataClassification: form.dataClassification,
      lifecycleStage: form.lifecycleStage,
      entityType: form.entityId ? form.entityType : null,
      entityId: form.entityId || null,
      vendorId: form.vendorId || null,
      vendorText: form.vendorText?.trim() || null,
      hostname: form.hostname?.trim() || null,
      version: form.version?.trim() || null,
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch })
        toast.success(`${patch.name} updated`)
      } else {
        await create.mutateAsync(patch)
        toast.success(`${patch.name} registered`)
      }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the asset')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      if (selectedId === toDelete.id) setSelectedId(null)
      toast.success(`${toDelete.name} deleted`)
      setToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the asset')
      throw e
    }
  }

  function exportRegistry() {
    if (!filtered.length) { toast.info('No assets to export'); return }
    exportCsv(filtered.map(a => ({
      asset_ref: a.assetRef ?? '', name: a.name, type: a.type,
      owner: userName(a.ownerId) ?? '', department: a.department ?? '',
      criticality: a.criticality, data_classification: a.dataClassification,
      lifecycle_stage: a.lifecycleStage,
      registry_entity: entityName(a) ?? '', entity_id: a.entityId ?? '',
      vendor: entities.resolve('vendor', a.vendorId) ?? '', vendor_id: a.vendorId ?? '',
      bia_rto_hours: a.biaRtoHours ?? '', bia_rpo_hours: a.biaRpoHours ?? '',
    })), 'asset-registry.csv')
  }

  // Honest metrics from the real inventory. A null-owner count of 0 is real (0
  // is correct for a count); an em-dash is used only for unmeasured values.
  const critHigh = filtered.filter(a => a.criticality === 'critical' || a.criticality === 'high').length
  const linked = filtered.filter(a => !!a.entityId).length
  const noOwner = filtered.filter(a => !a.ownerId).length

  const columns: Column<Row>[] = [
    { key: 'assetRef', header: 'Ref', render: a => <span className="font-mono text-xs text-[hsl(var(--brand))]">{text(a.assetRef)}</span> },
    { key: '_name', header: 'Asset', sortable: true, render: a => <span className="text-xs font-medium text-[hsl(var(--text-1))]">{a.name}</span> },
    { key: 'type', header: 'Type', sortable: true, render: a => <span className="text-xs text-[hsl(var(--text-3))]">{TYPE_LABEL[a.type] ?? a.type}</span> },
    {
      key: 'entity', header: 'Registry link',
      render: a => {
        const name = entityName(a)
        const route = entityRoute(a)
        if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>
        if (!route) return <span className="text-xs text-[hsl(var(--text-4))]">{name}</span>
        return (
          <button onClick={e => { e.stopPropagation(); nav(route) }}
            className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]">
            {name} <ArrowSquareOut size={12} />
          </button>
        )
      },
    },
    {
      key: 'vendor', header: 'Vendor',
      render: a => {
        const name = entities.resolve('vendor', a.vendorId)
        const route = entities.routeFor('vendor', a.vendorId)
        if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">{a.vendorText ?? '—'}</span>
        if (!route) return <span className="text-xs text-[hsl(var(--text-3))]">{name}</span>
        return <button onClick={e => { e.stopPropagation(); nav(route) }} className="text-xs text-[hsl(var(--brand))] hover:underline">{name}</button>
      },
    },
    { key: 'owner', header: 'Owner', render: a => <span className="text-xs text-[hsl(var(--text-3))]">{userName(a.ownerId) ?? '—'}</span> },
    { key: 'criticality', header: 'Criticality', sortable: true, render: a => <Pill label={cap(a.criticality)} tone={CRIT_TONE[a.criticality] ?? CRIT_TONE.low} /> },
    { key: 'lifecycleStage', header: 'Lifecycle', sortable: true, render: a => <span className="text-xs text-[hsl(var(--text-3))]">{cap(a.lifecycleStage)}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Asset Registry"
        subtitle="ISO 27001 A.5.9 — inventory of AI systems, datasets, infrastructure and endpoints, each linked to the model or dataset it is"
        icon={Database}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportRegistry}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={openCreate}>Register Asset</Button>
          </div>
        }
      />

      {modelParam && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Filtered to <strong>{entities.resolve('model', modelParam) ?? 'Unavailable'}</strong></span>
            <button aria-label="Clear model filter" onClick={clearModelFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]"><X size={14} /></button>
          </span>
        </div>
      )}

      <StatCardRow
        className="mb-4"
        loading={isLoading}
        cards={[
          { label: 'Assets', value: filtered.length },
          { label: 'Critical / High', value: critHigh, variant: critHigh ? 'warning' : 'default' },
          { label: 'Linked to registry', value: linked, description: 'Assets that resolve to a model or dataset' },
          { label: 'Without owner', value: noOwner, variant: noOwner ? 'danger' : 'success' },
        ]}
      />

      {isLoading ? <TableSkeleton cols={8} />
        : error ? <ErrorState message={error.message} onRetry={() => refetch()} />
        : rows.length === 0 ? (
          <EmptyState
            title={modelParam ? 'No assets for this model' : 'No assets yet'}
            message={modelParam ? 'Clear the filter to see the whole register, or register an asset for this model.' : 'Register the AI systems, datasets, endpoints and infrastructure this organisation runs.'}
            actionLabel="Register Asset"
            onAction={openCreate}
          />
        ) : (
          <DataTable data={rows} columns={columns} searchKey="_name" searchPlaceholder="Search assets…"
            onRowClick={a => setSelectedId(a.id)} onView={a => setSelectedId(a.id)} onEdit={a => openEdit(a)} onDelete={a => setToDelete(a)} />
        )}

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        subtitle={selected ? <Pill label={cap(selected.criticality)} tone={CRIT_TONE[selected.criticality] ?? CRIT_TONE.low} /> : undefined}
        size="lg"
        actions={selected ? (
          <div className="flex gap-2">
            <Button size="xs" variant="secondary" onClick={() => openEdit(selected)}>Edit</Button>
            <Button size="xs" variant="danger" icon={<Trash />} onClick={() => setToDelete(selected)}>Delete</Button>
          </div>
        ) : undefined}
        tabs={selected ? [{
          id: 'overview', label: 'Overview',
          content: (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Reference', value: text(selected.assetRef) },
                  { label: 'Type', value: TYPE_LABEL[selected.type] ?? selected.type },
                  { label: 'Owner', value: userName(selected.ownerId) ?? '—' },
                  { label: 'Department', value: text(selected.department) },
                  { label: 'Classification', value: cap(selected.dataClassification) },
                  { label: 'Lifecycle', value: cap(selected.lifecycleStage) },
                  { label: 'BIA RTO', value: numHrs(selected.biaRtoHours) },
                  { label: 'BIA RPO', value: numHrs(selected.biaRpoHours) },
                  { label: 'Hostname', value: text(selected.hostname) },
                  { label: 'Version', value: text(selected.version) },
                ].map(f => (
                  <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-[hsl(var(--text-1))]">{f.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Interlinks</p>
                <div className="flex flex-wrap gap-2">
                  {entityRoute(selected) && (
                    <Button size="xs" variant="secondary" icon={<ArrowSquareOut />} onClick={() => nav(entityRoute(selected)!)}>
                      {selected.entityType === 'ai_model' ? 'Model' : 'Dataset'}: {entityName(selected)}
                    </Button>
                  )}
                  {entities.routeFor('vendor', selected.vendorId) && (
                    <Button size="xs" variant="secondary" onClick={() => nav(entities.routeFor('vendor', selected.vendorId)!)}>Vendor: {entities.resolve('vendor', selected.vendorId)}</Button>
                  )}
                  {selected.entityType === 'ai_model' && selected.entityId && (
                    <Button size="xs" variant="secondary" onClick={() => nav(`/bia?asset=${selected.id}`)}>BIA dependencies</Button>
                  )}
                  {!entityRoute(selected) && !entities.routeFor('vendor', selected.vendorId) && (
                    <span className="text-xs text-[hsl(var(--text-4))]">No registry or vendor link recorded. Link this asset to the model or dataset it represents so it can answer an impact question.</span>
                  )}
                </div>
              </div>
            </div>
          ),
        }] : []}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit asset' : 'Register asset'}
        description="Link the asset to the model or dataset it is, so it can answer which system an impact or incident touches."
        submitLabel={editing ? 'Save changes' : 'Register'}
        busy={create.isPending || update.isPending}
        onSubmit={submitForm}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset reference">
            <input value={form.assetRef ?? ''} onChange={e => setForm(p => ({ ...p, assetRef: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Name" required>
            <input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as AssetType }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Owner" hint="From the org directory — stored as user_profiles.id">
            <Select value={form.ownerId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, ownerId: v === '__none' ? null : v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">Unassigned</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registry link — what this asset is" hint="Stored as the entity id; the name resolves at render">
            <Select
              value={form.entityId ?? '__none'}
              onValueChange={v => {
                if (v === '__none') { setForm(p => ({ ...p, entityId: null, entityType: null })); return }
                const isModel = entities.models.some(m => m.id === v)
                setForm(p => ({ ...p, entityId: v, entityType: isModel ? 'ai_model' : 'dataset' }))
              }}
            >
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Not a registry record" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">Not a registry record</SelectItem>
                {entities.models.map(m => <SelectItem key={m.id} value={m.id}>Model · {m.name}</SelectItem>)}
                {entities.datasets.map(d => <SelectItem key={d.id} value={d.id}>Dataset · {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vendor" hint="The supplier — stored as vendors.id">
            <Select value={form.vendorId ?? '__none'} onValueChange={v => setForm(p => ({ ...p, vendorId: v === '__none' ? null : v }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="No vendor" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="__none">No vendor</SelectItem>
                {entities.vendors.map(vd => <SelectItem key={vd.id} value={vd.id}>{vd.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Criticality">
            <Select value={form.criticality} onValueChange={v => setForm(p => ({ ...p, criticality: v as Criticality }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{CRITICALITIES.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Classification">
            <Select value={form.dataClassification} onValueChange={v => setForm(p => ({ ...p, dataClassification: v as DataClassification }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{CLASSIFICATIONS.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lifecycle">
            <Select value={form.lifecycleStage} onValueChange={v => setForm(p => ({ ...p, lifecycleStage: v as LifecycleStage }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{LIFECYCLES.map(l => <SelectItem key={l} value={l}>{cap(l)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department">
            <input value={form.department ?? ''} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
          <Field label="Version">
            <input value={form.version ?? ''} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" />
          </Field>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete asset"
        description={`Delete "${toDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
