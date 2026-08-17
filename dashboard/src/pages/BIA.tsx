// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Business Impact Analysis — on the real org-scoped `bia_records` table via
// biaService / useBiaData. Replaces the `bia_table (id, doc jsonb)` demo table
// and the eight-row hardcoded SEED.
//
// What this rebuild deliberately drops:
//   * the fabricated financialImpact24h on every seeded row and the derived
//     "Avg RTO" KPI computed over that fiction;
//   * the free-text AI-system dependency blocks ("model: GPT-4o Risk Scorer
//     v2, fallback: Manual underwriting") that reached no real model;
//   * the impact-matrix likelihood scoring, which had no measured source.
//
// Interlinks (both directions): `linked_asset_ids` (assets.id) is the
// dependency graph — a process depends on the assets that implement it, and an
// asset is reachable back through it. `?asset=<assets.id>` filters to the
// processes that depend on that asset, with a dismissible chip;
// `?open=<bia_records.id>` opens a record.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChartLine, Plus, Export, ArrowSquareOut, X, Trash } from '@phosphor-icons/react'
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
import { useBiaData } from '@/hooks/useBiaData'
import { useAssetsData } from '@/hooks/useAssetsData'
import { useUserOptions } from '@/hooks/useUserOptions'
import type { BiaRecord, BiaCriticality } from '@/services/biaService'

const CRITICALITIES: BiaCriticality[] = ['critical', 'high', 'medium', 'low']
const CRIT_TONE: Record<string, { background: string; color: string }> = {
  critical: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' },
  high: { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  medium: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  low: { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))' },
}
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '—')
const text = (v: string | null | undefined) => (v && v.trim() ? v : '—')
/** null renders "—", never 0. */
const hrs = (v: number | null | undefined) => (typeof v === 'number' ? `${v}h` : '—')
const money = (v: number | null | undefined) =>
  typeof v === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v) : '—'

function Pill({ label, tone }: { label: string; tone: { background: string; color: string } }) {
  return <span className="px-2 py-0.5 text-[11px] font-medium" style={tone}>{label}</span>
}

const BLANK: Partial<BiaRecord> = {
  biaRef: '', processName: '', department: '', ownerId: null, criticality: 'medium',
  rtoHours: null, rpoHours: null, mtdHours: null, financialImpactPerHour: null,
  reputationalImpact: '', regulatoryImpact: '', dependencies: [], linkedAssetIds: [], lastReviewedAt: null,
}

export default function BIA() {
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const assetParam = searchParams.get('asset')
  const openParam = searchParams.get('open')

  const { records, isLoading, error, refetch, create, update, remove } = useBiaData()
  const { assets } = useAssetsData()
  const { options: users } = useUserOptions()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BiaRecord | null>(null)
  const [form, setForm] = useState<Partial<BiaRecord>>({ ...BLANK })
  const [toDelete, setToDelete] = useState<BiaRecord | null>(null)

  const selected = records.find(r => r.id === selectedId) ?? null
  const assetName = (id: string) => assets.find(a => a.id === id)?.name ?? 'Unavailable'
  const userName = (id: string | null | undefined) => (id ? (users.find(u => u.id === id)?.name ?? 'Unavailable') : null)

  const appliedOpen = useRef<string | null>(null)
  useEffect(() => {
    if (openParam && appliedOpen.current !== openParam && records.some(r => r.id === openParam)) {
      appliedOpen.current = openParam
      setSelectedId(openParam)
    }
  }, [openParam, records])

  const filtered = useMemo(
    () => (assetParam ? records.filter(r => r.linkedAssetIds.includes(assetParam)) : records),
    [records, assetParam],
  )
  const rows = useMemo(() => filtered.map(r => ({ ...r, _name: r.processName })), [filtered])
  type Row = (typeof rows)[number]

  function clearAssetFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('asset')
    setSearchParams(next, { replace: true })
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK, biaRef: `BIA-${Date.now().toString(36).toUpperCase().slice(-5)}`, linkedAssetIds: assetParam ? [assetParam] : [] })
    setFormOpen(true)
  }
  function openEdit(r: BiaRecord) { setEditing(r); setForm({ ...r }); setFormOpen(true) }

  const toNum = (v: unknown): number | null => {
    if (v === '' || v === null || v === undefined) return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }

  async function submitForm() {
    if (!form.processName?.trim()) { toast.error('A process name is required'); return }
    const patch: Partial<BiaRecord> = {
      biaRef: form.biaRef?.trim() || null,
      processName: form.processName.trim(),
      department: form.department?.trim() || null,
      ownerId: form.ownerId || null,
      criticality: form.criticality,
      rtoHours: toNum(form.rtoHours),
      rpoHours: toNum(form.rpoHours),
      mtdHours: toNum(form.mtdHours),
      financialImpactPerHour: toNum(form.financialImpactPerHour),
      reputationalImpact: form.reputationalImpact?.trim() || null,
      regulatoryImpact: form.regulatoryImpact?.trim() || null,
      linkedAssetIds: form.linkedAssetIds ?? [],
      dependencies: form.dependencies ?? [],
    }
    try {
      if (editing) { await update.mutateAsync({ id: editing.id, patch }); toast.success(`${patch.processName} updated`) }
      else { await create.mutateAsync(patch); toast.success(`${patch.processName} added`) }
      setFormOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save the BIA record')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      if (selectedId === toDelete.id) setSelectedId(null)
      toast.success(`${toDelete.processName} deleted`)
      setToDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete the BIA record')
      throw e
    }
  }

  function exportRecords() {
    if (!filtered.length) { toast.info('No BIA records to export'); return }
    exportCsv(filtered.map(r => ({
      bia_ref: r.biaRef ?? '', process_name: r.processName, department: r.department ?? '',
      owner: userName(r.ownerId) ?? '', criticality: r.criticality,
      rto_hours: r.rtoHours ?? '', rpo_hours: r.rpoHours ?? '', mtd_hours: r.mtdHours ?? '',
      financial_impact_per_hour: r.financialImpactPerHour ?? '',
      linked_assets: r.linkedAssetIds.map(assetName).join('; '),
    })), 'bia-records.csv')
  }

  const critHigh = filtered.filter(r => r.criticality === 'critical' || r.criticality === 'high').length
  const withAssets = filtered.filter(r => r.linkedAssetIds.length > 0).length

  const columns: Column<Row>[] = [
    { key: 'biaRef', header: 'Ref', render: r => <span className="font-mono text-xs text-[hsl(var(--brand))]">{text(r.biaRef)}</span> },
    { key: '_name', header: 'Business process', sortable: true, render: r => <span className="text-xs font-medium text-[hsl(var(--text-1))]">{r.processName}</span> },
    { key: 'department', header: 'Department', sortable: true, render: r => <span className="text-xs text-[hsl(var(--text-3))]">{text(r.department)}</span> },
    { key: 'criticality', header: 'Criticality', sortable: true, render: r => <Pill label={cap(r.criticality)} tone={CRIT_TONE[r.criticality] ?? CRIT_TONE.low} /> },
    { key: 'rtoHours', header: 'RTO', render: r => <span className="font-mono text-xs text-[hsl(var(--text-1))]">{hrs(r.rtoHours)}</span> },
    { key: 'rpoHours', header: 'RPO', render: r => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{hrs(r.rpoHours)}</span> },
    { key: 'financialImpactPerHour', header: 'Impact / hr', render: r => <span className="text-xs text-[hsl(var(--text-2))]">{money(r.financialImpactPerHour)}</span> },
    { key: 'assets', header: 'Assets', render: r => <span className="font-mono text-xs text-[hsl(var(--text-3))]">{r.linkedAssetIds.length || '—'}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Business Impact Analysis"
        subtitle="ISO 22301 8.2.2 — the recovery objectives and impact of disruption to each process, linked to the assets it depends on"
        icon={ChartLine}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={<Export />} onClick={exportRecords}>Export CSV</Button>
            <Button size="sm" icon={<Plus />} onClick={openCreate}>Add Process</Button>
          </div>
        }
      />

      {assetParam && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-3 py-1.5 text-sm text-[hsl(var(--brand))]">
            <span>Processes depending on <strong>{assetName(assetParam)}</strong></span>
            <button aria-label="Clear asset filter" onClick={clearAssetFilter} className="inline-flex cursor-pointer items-center hover:text-[hsl(var(--text-1))]"><X size={14} /></button>
          </span>
        </div>
      )}

      <StatCardRow
        className="mb-4"
        loading={isLoading}
        cards={[
          { label: 'Processes assessed', value: filtered.length },
          { label: 'Critical / High', value: critHigh, variant: critHigh ? 'warning' : 'default' },
          { label: 'With asset dependencies', value: withAssets, description: 'Processes linked to at least one asset' },
        ]}
      />

      {isLoading ? <TableSkeleton cols={8} />
        : error ? <ErrorState message={error.message} onRetry={() => refetch()} />
        : rows.length === 0 ? (
          <EmptyState
            title={assetParam ? 'No processes depend on this asset' : 'No BIA records yet'}
            message={assetParam ? 'Clear the filter to see every process, or add one that depends on this asset.' : 'Assess a business process to set its recovery objectives and record which assets it depends on.'}
            actionLabel="Add Process"
            onAction={openCreate}
          />
        ) : (
          <DataTable data={rows} columns={columns} searchKey="_name" searchPlaceholder="Search processes…"
            onRowClick={r => setSelectedId(r.id)} onView={r => setSelectedId(r.id)} onEdit={r => openEdit(r)} onDelete={r => setToDelete(r)} />
        )}

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.processName ?? ''}
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
                  { label: 'Reference', value: text(selected.biaRef) },
                  { label: 'Department', value: text(selected.department) },
                  { label: 'Owner', value: userName(selected.ownerId) ?? '—' },
                  { label: 'Last reviewed', value: selected.lastReviewedAt ? selected.lastReviewedAt.slice(0, 10) : '—' },
                  { label: 'RTO', value: hrs(selected.rtoHours) },
                  { label: 'RPO', value: hrs(selected.rpoHours) },
                  { label: 'MTD', value: hrs(selected.mtdHours) },
                  { label: 'Financial impact / hr', value: money(selected.financialImpactPerHour) },
                ].map(f => (
                  <div key={f.label} className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">{f.label}</p>
                    <p className="mt-0.5 truncate text-xs font-medium text-[hsl(var(--text-1))]">{f.value}</p>
                  </div>
                ))}
              </div>
              {(selected.reputationalImpact || selected.regulatoryImpact) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">Reputational impact</p>
                    <p className="mt-1 text-xs text-[hsl(var(--text-2))]">{text(selected.reputationalImpact)}</p>
                  </div>
                  <div className="border border-[hsl(var(--border))] bg-raised p-3">
                    <p className="text-[10px] uppercase text-[hsl(var(--text-4))]">Regulatory impact</p>
                    <p className="mt-1 text-xs text-[hsl(var(--text-2))]">{text(selected.regulatoryImpact)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Asset dependencies</p>
                {selected.linkedAssetIds.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))]">No assets linked. A process whose supporting assets are unrecorded cannot answer what breaks when it goes down.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selected.linkedAssetIds.map(id => (
                      <button key={id} onClick={() => nav(`/assets?open=${id}`)}
                        className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]">
                        {assetName(id)} <ArrowSquareOut size={11} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selected.dependencies.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--text-3))]">Other dependencies</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.dependencies.map((d, i) => <span key={i} className="border border-[hsl(var(--border))] bg-raised px-2 py-0.5 text-[11px] text-[hsl(var(--text-2))]">{d}</span>)}
                  </div>
                </div>
              )}
            </div>
          ),
        }] : []}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit BIA record' : 'New Business Impact Analysis'}
        description="Recovery objectives are entered as hours. Leave a field blank rather than guessing — a blank renders as an em-dash, not a fabricated number."
        submitLabel={editing ? 'Save changes' : 'Add process'}
        busy={create.isPending || update.isPending}
        onSubmit={submitForm}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reference"><input value={form.biaRef ?? ''} onChange={e => setForm(p => ({ ...p, biaRef: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="Process name" required><input value={form.processName ?? ''} onChange={e => setForm(p => ({ ...p, processName: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department"><input value={form.department ?? ''} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="Owner">
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
          <Field label="Criticality">
            <Select value={form.criticality} onValueChange={v => setForm(p => ({ ...p, criticality: v as BiaCriticality }))}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>{CRITICALITIES.map(c => <SelectItem key={c} value={c}>{cap(c)}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Financial impact per hour (USD)"><input type="number" value={form.financialImpactPerHour ?? ''} onChange={e => setForm(p => ({ ...p, financialImpactPerHour: e.target.value as any }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="RTO (hours)"><input type="number" value={form.rtoHours ?? ''} onChange={e => setForm(p => ({ ...p, rtoHours: e.target.value as any }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="RPO (hours)"><input type="number" value={form.rpoHours ?? ''} onChange={e => setForm(p => ({ ...p, rpoHours: e.target.value as any }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="MTD (hours)"><input type="number" value={form.mtdHours ?? ''} onChange={e => setForm(p => ({ ...p, mtdHours: e.target.value as any }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
        </div>
        <Field label="Asset dependencies" hint="Stored as assets.id — the process is reachable from each asset in the register">
          <div className="max-h-40 space-y-1 overflow-y-auto border border-[hsl(var(--border))] bg-raised p-2">
            {assets.length === 0 ? (
              <p className="text-xs text-[hsl(var(--text-4))]">No assets in the register yet. Register the assets this process depends on first.</p>
            ) : assets.map(a => {
              const checked = (form.linkedAssetIds ?? []).includes(a.id)
              return (
                <label key={a.id} className="flex cursor-pointer items-center gap-2 text-xs text-[hsl(var(--text-2))]">
                  <input type="checkbox" checked={checked} onChange={e => {
                    const cur = form.linkedAssetIds ?? []
                    setForm(p => ({ ...p, linkedAssetIds: e.target.checked ? [...cur, a.id] : cur.filter(x => x !== a.id) }))
                  }} />
                  {a.name}
                </label>
              )
            })}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reputational impact"><input value={form.reputationalImpact ?? ''} onChange={e => setForm(p => ({ ...p, reputationalImpact: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
          <Field label="Regulatory impact"><input value={form.regulatoryImpact ?? ''} onChange={e => setForm(p => ({ ...p, regulatoryImpact: e.target.value }))} className="w-full border border-[hsl(var(--border))] bg-raised px-3 py-2 text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none" /></Field>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete BIA record"
        description={`Delete "${toDelete?.processName}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
