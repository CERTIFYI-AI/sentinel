// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Business Impact Analysis — recovery objectives per business process, on the
// real org-scoped `bia_processes` table.
//
// The previous page read `bia_table` (doc-jsonb demo table), seeded eight
// fictional processes with invented "financial impact / 24h" figures, and
// saved through a setTimeout so every toast was fake success. The invented
// dollar figures are gone entirely — this platform does not display fabricated
// metrics as if measured. What the register can now do that it never could:
// name the Asset Registry entries each process depends on
// (linked_asset_ids) and the registry models reached through them
// (linked_model_ids), so "what breaks if this is down?" resolves to real
// records instead of prose.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChartLine, Plus } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { LinkChips, ChipMultiSelect } from '@/components/ui/LinkChips'
import { useBiaData, useAssetsData } from '@/hooks/useAdminData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { BIA_CRITICALITIES, type BiaProcess } from '@/services/resilienceService'

const CRIT_TONE: Record<string, string> = {
  critical: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  high: 'bg-[hsl(var(--r-hi-bg))] text-[hsl(var(--r-hi-tx))]',
  medium: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
  low: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
}

const EMPTY: Partial<BiaProcess> = {
  businessProcess: '', department: '', criticality: 'medium',
  rtoHours: null, rpoHours: null, mtpdHours: null,
  linkedAssetIds: [], linkedModelIds: [],
}

function cap(s?: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

function hours(v?: number | null): string {
  return v == null ? '—' : `${v}h`
}

export default function BIA() {
  const nav = useNavigate()
  const { items, isLoading, error, refetch, saveProcess, removeProcess, isSaving } = useBiaData()
  const assets = useAssetsData()
  const { models } = useModelOptions()

  const [critFilter, setCritFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BiaProcess | null>(null)
  const [form, setForm] = useState<Partial<BiaProcess>>(EMPTY)
  const [toDelete, setToDelete] = useState<BiaProcess | null>(null)

  const set = <K extends keyof BiaProcess>(k: K, v: BiaProcess[K] | undefined) =>
    setForm((f) => ({ ...f, [k]: v }))

  const assetName = (id: string) => {
    const a = assets.items.find((x) => x.id === id)
    return a ? (a.assetRef ? `${a.assetRef} ${a.name}` : a.name) : undefined
  }
  const modelName = (id: string) => models.find((m) => m.id === id)?.name

  const rows = useMemo(() => items.filter(
    (p) => critFilter === 'all' || p.criticality === critFilter,
  ), [items, critFilter])

  const stats = useMemo(() => ({
    total: items.length,
    critical: items.filter((p) => p.criticality === 'critical').length,
    tightRto: items.filter((p) => p.rtoHours != null && p.rtoHours <= 4).length,
    withDeps: items.filter((p) => p.linkedAssetIds.length > 0).length,
  }), [items])

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }
  function openEdit(p: BiaProcess) { setEditing(p); setForm({ ...p }); setFormOpen(true) }

  async function submit() {
    try {
      await saveProcess(editing ? { ...form, id: editing.id } : form)
      setFormOpen(false)
    } catch { /* hook surfaces the error; dialog stays open */ }
  }

  const columns: Column<BiaProcess>[] = [
    { key: 'refCode', header: 'Ref', render: (p) => <span className="font-mono text-xs text-[hsl(var(--text-3))]">{p.refCode ?? '—'}</span> },
    { key: 'businessProcess', header: 'Business process', render: (p) => <span className="font-medium text-[hsl(var(--text-1))]">{p.businessProcess}</span> },
    { key: 'department', header: 'Department', render: (p) => <span className="text-xs text-[hsl(var(--text-2))]">{p.department ?? '—'}</span> },
    { key: 'criticality', header: 'Criticality', render: (p) => p.criticality ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${CRIT_TONE[p.criticality] ?? ''}`}>{cap(p.criticality)}</span> : <span className="text-[hsl(var(--text-4))]">—</span> },
    { key: 'rtoHours', header: 'RTO', render: (p) => <span className="text-xs text-[hsl(var(--text-2))]">{hours(p.rtoHours)}</span> },
    { key: 'rpoHours', header: 'RPO', render: (p) => <span className="text-xs text-[hsl(var(--text-2))]">{hours(p.rpoHours)}</span> },
    { key: 'mtpdHours', header: 'MTPD', render: (p) => <span className="text-xs text-[hsl(var(--text-2))]">{hours(p.mtpdHours)}</span> },
    {
      key: 'linkedAssetIds', header: 'Depends on',
      render: (p) => (
        <LinkChips ids={p.linkedAssetIds} resolve={assetName}
          hrefFor={() => '/admin/assets'} onNavigate={nav} />
      ),
    },
    {
      key: 'linkedModelIds', header: 'AI models',
      render: (p) => (
        <LinkChips ids={p.linkedModelIds} resolve={modelName}
          hrefFor={(id) => `/models/inventory/${id}`} onNavigate={nav} />
      ),
    },
  ]

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <PageHeader
        icon={<ChartLine size={24} weight="duotone" />}
        title="Business Impact Analysis"
        description="Recovery objectives the business has agreed per process. The Asset Registry reads its RTO/RPO from here — this register is the source, not a copy."
        actions={<Button onClick={openCreate} className="gap-2"><Plus weight="bold" size={16} />Add Process</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Processes assessed', value: stats.total },
          { label: 'Critical', value: stats.critical },
          { label: 'RTO ≤ 4h', value: stats.tightRto },
          { label: 'With mapped dependencies', value: stats.withDeps },
        ].map((k) => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-[hsl(var(--text-1))]">{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select value={critFilter} onValueChange={setCritFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All criticalities</SelectItem>
            {BIA_CRITICALITIES.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TableSkeleton /> : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No processes assessed"
          message={critFilter !== 'all'
            ? 'No processes match the selected criticality.'
            : 'Add the first business process to start the impact analysis.'}
          actionLabel="Add Process"
          onAction={openCreate}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          searchKey="businessProcess"
          searchPlaceholder="Search processes…"
          onEdit={openEdit}
          onDelete={(p) => setToDelete(p)}
          emptyMessage="No processes match the current filters."
        />
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${editing.refCode ?? editing.businessProcess}` : 'Add Process'}
        onSubmit={submit}
        busy={isSaving}
        disabled={!form.businessProcess?.trim()}
      >
        <Field label="Business process" required>
          <Input value={form.businessProcess ?? ''} onChange={(e) => set('businessProcess', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department">
            <Input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} />
          </Field>
          <Field label="Criticality">
            <Select value={form.criticality} onValueChange={(v) => set('criticality', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BIA_CRITICALITIES.map((c) => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="RTO (hours)" hint="Recovery time objective">
            <Input type="number" min={0} value={form.rtoHours ?? ''} onChange={(e) => set('rtoHours', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
          <Field label="RPO (hours)" hint="Tolerable data loss">
            <Input type="number" min={0} value={form.rpoHours ?? ''} onChange={(e) => set('rpoHours', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
          <Field label="MTPD (hours)" hint="Max tolerable disruption">
            <Input type="number" min={0} value={form.mtpdHours ?? ''} onChange={(e) => set('mtpdHours', e.target.value === '' ? null : Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Dependent assets" hint="Asset Registry entries this process runs on">
          <ChipMultiSelect
            options={assets.items.map((a) => ({ id: a.id, name: a.assetRef ? `${a.assetRef} ${a.name}` : a.name }))}
            value={form.linkedAssetIds ?? []}
            onChange={(v) => set('linkedAssetIds', v)}
          />
        </Field>
        <Field label="AI models" hint="Registry models this process depends on">
          <ChipMultiSelect
            options={models.map((m) => ({ id: m.id, name: m.name }))}
            value={form.linkedModelIds ?? []}
            onChange={(v) => set('linkedModelIds', v)}
          />
        </Field>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => { if (toDelete) { try { await removeProcess(toDelete.id) } finally { setToDelete(null) } } }}
        title="Delete process"
        description={`Delete "${toDelete?.businessProcess}" from the BIA? Assets sourcing recovery objectives from it keep their current values.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
