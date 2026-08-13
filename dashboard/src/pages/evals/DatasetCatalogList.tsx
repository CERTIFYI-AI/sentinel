// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetCatalogList (Data Explorer) — governed dataset catalog with
// sensitivity, lawful basis and risk score. CRUD-backed on the org-scoped
// `dataset_catalog_entries` table (the same table the Dataset Wizard writes).
// Entries link to registry models by ai_models.id and honor ?model=<uuid>
// deep links with a dismissible filter chip.

import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Plus, Sparkle, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RiskBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { DatasetCatalogForm } from './DatasetCatalogForm'
import { datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { DatasetCatalogEntry } from '@/types/evals'

// Doc fields written by the Dataset Wizard / demo seed that the base type
// doesn't declare. Older docs may also carry strings in biasIndicators/slices.
type CatalogRow = DatasetCatalogEntry & {
  linkedModelIds?: string[]
  rows?: number
  containsPii?: boolean
  source?: string
  fileName?: string
  ingestionStatus?: string
}

const pillCls = 'inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap'

/** Bias summary that stays honest across doc shapes (objects, strings, absent). */
function biasCell(d: CatalogRow) {
  const list: unknown[] = Array.isArray(d.biasIndicators) ? d.biasIndicators : []
  if (list.length === 0) return <VerdictBadge v="na" />
  if (typeof list[0] === 'string') {
    return <span className="text-xs text-[hsl(var(--s-wn-tx))]">{list.length} flagged</span>
  }
  const objs = list as { verdict?: string }[]
  const worst = objs.some((b) => b.verdict === 'fail') ? 'fail'
    : objs.some((b) => b.verdict === 'warn') ? 'warn' : 'pass'
  return <VerdictBadge v={worst} />
}

/** Slice names for either shape: DatasetSliceDefinition[] or string[]. */
function sliceNames(d: CatalogRow): string[] {
  const list: unknown[] = Array.isArray(d.slices) ? d.slices : []
  return list.map((s) => (typeof s === 'string' ? s : (s as { name?: string }).name ?? '')).filter(Boolean)
}

export default function DatasetCatalogList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = datasetCatalogHooks.useList()
  const del = datasetCatalogHooks.useDelete()
  const { models } = useModelOptions()
  const [params, setParams] = useSearchParams()
  const modelFilter = params.get('model')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetCatalogEntry | null>(null)
  const [toDelete, setToDelete] = useState<DatasetCatalogEntry | null>(null)
  const [previewing, setPreviewing] = useState<CatalogRow | null>(null)

  const modelName = (id: string) => models.find((m) => m.id === id)?.name

  const rows = useMemo(() => {
    const all = (data ?? []) as CatalogRow[]
    if (!modelFilter) return all
    return all.filter((d) => (d.linkedModelIds ?? []).includes(modelFilter))
  }, [data, modelFilter])

  const clearModelFilter = () => {
    const next = new URLSearchParams(params)
    next.delete('model')
    setParams(next, { replace: true })
  }

  const modelPills = (ids: string[]) => (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const name = modelName(id)
        return name ? (
          <Link
            key={id}
            to={`/models/inventory/${id}`}
            onClick={(e) => e.stopPropagation()}
            className={`${pillCls} text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] hover:underline`}
          >
            {name}
          </Link>
        ) : (
          <span key={id} className={`${pillCls} text-[hsl(var(--text-4))]`}>Unavailable</span>
        )
      })}
    </div>
  )

  const columns: Column<CatalogRow>[] = [
    { key: 'datasetId', header: 'ID', sortable: true, render: (d) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{d.datasetId ?? d.id}</span> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'datasetVersion', header: 'Version', render: (d) => <span className="font-mono text-xs">{d.datasetVersion ? `v${d.datasetVersion}` : '—'}</span> },
    { key: 'sensitivity', header: 'Sensitivity', render: (d) => (d.sensitivity ? <RiskBadge r={d.sensitivity} /> : <span className="text-[hsl(var(--text-4))]">—</span>) },
    { key: 'riskScore', header: 'Risk score', sortable: true, render: (d) => <span className="font-mono">{d.riskScore ?? '—'}</span> },
    { key: 'bias', header: 'Bias indicators', render: biasCell },
    { key: 'slices', header: 'Slices', render: (d) => <span className="font-mono">{Array.isArray(d.slices) ? d.slices.length : 0}</span> },
    { key: 'models', header: 'Linked models', render: (d) => {
      const ids = d.linkedModelIds ?? []
      return ids.length ? modelPills(ids) : <span className="text-[hsl(var(--text-4))]">—</span>
    } },
  ]

  const previewSlices = previewing ? sliceNames(previewing) : []
  const previewBias: string[] = previewing && Array.isArray(previewing.biasIndicators)
    ? (previewing.biasIndicators as unknown[]).map((b) =>
        typeof b === 'string' ? b : `${(b as { attribute?: string }).attribute ?? 'attribute'} — ${(b as { verdict?: string }).verdict ?? 'n/a'}`)
    : []

  return (
    <div>
      <PageHeader
        title="Data Explorer"
        subtitle="Governed dataset catalog — lineage, sensitivity, lawful basis and evaluation slices"
        icon={Database}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Sparkle />} onClick={() => nav('/evals/dataset-create')}>Dataset Wizard</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Entry</Button>}
          </div>
        }
      />

      {modelFilter && (
        <div className="mb-3 flex items-center gap-2">
          <span className={`${pillCls} gap-1 text-[hsl(var(--brand))]`}>
            Filtered to {modelName(modelFilter) ?? 'Unavailable'}
            <button
              type="button"
              aria-label="Clear model filter"
              onClick={clearModelFilter}
              className="ml-1 hover:text-[hsl(var(--text-1))]"
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={8} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            modelFilter ? (
              <EmptyState
                title="No datasets linked to this model"
                message="No catalog entries reference this model. Clear the filter to see the full catalog."
                actionLabel="Clear filter"
                onAction={clearModelFilter}
              />
            ) : (
              <EmptyState title="No datasets catalogued yet" message="Register a dataset to track lineage, lawful basis and bias indicators — or use the guided wizard."
                actionLabel={can('create') ? 'New Entry' : undefined}
                onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
            )
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="name" searchPlaceholder="Search datasets…"
              onView={(d) => setPreviewing(d)}
              onEdit={can('update') ? (d) => { setEditing(d); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(d) => nav(`/evals/dataset/${d.id}`)}
            />
          )}
      </Card>

      <DatasetCatalogForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      {/* Honest per-entry preview: only what the catalog actually holds. */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewing?.name ?? ''}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{previewing?.datasetId ?? previewing?.id}</DialogDescription>
          </DialogHeader>
          {previewing && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Rows</dt>
                  <dd className="font-mono text-[hsl(var(--text-1))]">
                    {typeof previewing.rows === 'number' ? previewing.rows.toLocaleString() : 'Not ingested yet'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Sensitivity</dt>
                  <dd>{previewing.sensitivity ? <RiskBadge r={previewing.sensitivity} /> : <span className="text-[hsl(var(--text-4))]">Not classified</span>}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Contains PII</dt>
                  <dd className="text-[hsl(var(--text-1))]">
                    {previewing.containsPii === true ? 'Yes' : previewing.containsPii === false ? 'No' : 'Unknown'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Risk score</dt>
                  <dd className="font-mono text-[hsl(var(--text-1))]">{previewing.riskScore ?? '—'}</dd>
                </div>
              </dl>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))] mb-1">Slices</div>
                {previewSlices.length ? (
                  <div className="flex flex-wrap gap-1">{previewSlices.map((s) => <span key={s} className={`${pillCls} text-[hsl(var(--text-2))]`}>{s}</span>)}</div>
                ) : <span className="text-[hsl(var(--text-4))]">None defined</span>}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))] mb-1">Bias indicators</div>
                {previewBias.length ? (
                  <ul className="list-disc pl-4 text-[13px] text-[hsl(var(--text-2))]">{previewBias.map((b) => <li key={b}>{b}</li>)}</ul>
                ) : <span className="text-[hsl(var(--text-4))]">None recorded</span>}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))] mb-1">Linked models</div>
                {(previewing.linkedModelIds ?? []).length
                  ? modelPills(previewing.linkedModelIds ?? [])
                  : <span className="text-[hsl(var(--text-4))]">None</span>}
              </div>
              <p className="text-xs text-[hsl(var(--text-4))]">
                Row-level data preview is not available — ingestion is not connected for this entry.
              </p>
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => { const id = previewing.id; setPreviewing(null); nav(`/evals/dataset/${id}`) }}>
                  Open full record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete ${toDelete?.datasetId ?? ''}?`}
        description="Soft-deletes the catalog entry. Linked bias audits keep their reference."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) {
            del.mutate(toDelete.id, {
              onSuccess: () => toast.success('Entry deleted'),
              onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete entry'),
            })
          }
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
