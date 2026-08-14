// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DataLineage — flow view over the canonical `datasets` table:
// upstream sources → dataset (transformations) → downstream models
// (ai_models uuids resolved to pills). Edits persist to `datasets`.
// Honors ?model=<uuid> with a dismissible filter chip.

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRight, ArrowSquareOut, GitBranch, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { useDatasets } from '@/hooks/useDatasetData'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { DatasetRecord } from '@/services/datasetService'

export default function DataLineage() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')

  const { data, isLoading, isError, error, refetch, update } = useDatasets()
  const { models, loading: modelsLoading } = useModelOptions()

  const [selected, setSelected] = useState<DatasetRecord | null>(null)
  const [editing, setEditing] = useState<DatasetRecord | null>(null)

  const modelName = (id?: string) => (id ? models.find((m) => m.id === id)?.name : undefined)

  const rows = useMemo(
    () => data.filter((d) => !modelParam || d.usedInModels.includes(modelParam)),
    [data, modelParam],
  )

  const stats = {
    total: data.length,
    pii: data.filter((d) => d.containsPii).length,
    sources: new Set(data.map((d) => d.source).filter(Boolean)).size,
    unlinked: data.filter((d) => d.usedInModels.length === 0).length,
  }

  const modelPill = (mid: string) => {
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
  }

  const columns: Column<DatasetRecord>[] = [
    { key: 'name', header: 'Dataset', sortable: true, render: (d) => (
      <div>
        <button
          onClick={(e) => { e.stopPropagation(); nav(`/datasets/${d.id}`) }}
          className="text-xs font-medium text-[hsl(var(--brand))] hover:underline"
        >{d.name}</button>
        {d.version && <span className="ml-2 font-mono text-[10px] text-[hsl(var(--text-4))]">{d.version}</span>}
      </div>
    ) },
    { key: 'source', header: 'Source System', sortable: true, render: (d) => (
      <span className="text-xs text-[hsl(var(--text-2))]">{d.source ?? '—'}</span>
    ) },
    { key: 'ingestionMethod', header: 'Ingestion', render: (d) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{d.ingestionMethod ?? '—'}</span>
    ) },
    { key: 'upstreamSources', header: 'Upstream', render: (d) => (
      <span className="text-xs text-[hsl(var(--text-3))]">{d.upstreamSources.length || '—'}</span>
    ) },
    { key: 'usedInModels', header: 'Downstream Models', render: (d) => (
      d.usedInModels.length === 0
        ? <span className="text-xs text-[hsl(var(--text-4))]">—</span>
        : <span className="inline-flex flex-wrap items-center gap-1">
            {d.usedInModels.slice(0, 2).map(modelPill)}
            {d.usedInModels.length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{d.usedInModels.length - 2}</span>}
          </span>
    ) },
    { key: 'containsPii', header: 'PII', render: (d) => d.containsPii ? (
      <span className="px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>PII</span>
    ) : <span className="text-xs text-[hsl(var(--text-4))]">—</span> },
    { key: 'sla', header: 'SLA', render: (d) => (
      <span className="text-xs text-[hsl(var(--text-4))]">{d.sla ?? '—'}</span>
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
        title="Data Lineage"
        subtitle="Where each governed dataset comes from and which models consume it"
        icon={GitBranch}
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
          { label: 'Tracked Datasets', value: stats.total },
          { label: 'With PII', value: stats.pii },
          { label: 'Source Systems', value: stats.sources },
          { label: 'No Downstream Model', value: stats.unlinked },
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
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState message={error?.message} onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState
              title={modelParam ? 'No datasets feed this model' : 'No lineage to show yet'}
              message={modelParam
                ? 'Clear the model filter, or link a dataset to this model from the Dataset Registry.'
                : 'Register datasets in the Dataset Registry — their sources and model links appear here.'}
              actionLabel="Open Dataset Registry"
              onAction={() => nav('/datasets')} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="name" searchPlaceholder="Search datasets…"
              onView={setSelected}
              onEdit={can('update') ? setEditing : undefined}
              onRowClick={setSelected}
            />
          )}
      </Card>

      {/* Flow drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-[560px] max-w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name} — lineage</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--text-4))]">Upstream Sources</p>
                {selected.upstreamSources.length === 0 && !selected.source ? (
                  <p className="mt-1 text-xs text-[hsl(var(--text-4))]">No upstream sources documented.</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {(selected.upstreamSources.length ? selected.upstreamSources : [selected.source!]).map((s, i) => (
                      <div key={i} className="border border-[hsl(var(--border))] px-3 py-2 text-xs text-[hsl(var(--text-1))]">{s}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-center text-[hsl(var(--text-4))]"><ArrowRight size={16} className="rotate-90" /></div>
              <div className="border border-[hsl(var(--brand))/40] bg-[hsl(var(--brand-subtle))] px-3 py-2">
                <p className="text-xs font-medium text-[hsl(var(--brand))]">{selected.name}{selected.version ? ` · ${selected.version}` : ''}</p>
                <p className="mt-0.5 text-[10px] text-[hsl(var(--text-4))]">
                  {selected.ingestionMethod ?? 'Ingestion not documented'}{selected.sla ? ` · SLA ${selected.sla}` : ''}
                </p>
                {selected.preprocessingSteps && (
                  <p className="mt-1 text-[10px] text-[hsl(var(--text-3))]">Transformations: {selected.preprocessingSteps}</p>
                )}
              </div>
              <div className="flex justify-center text-[hsl(var(--text-4))]"><ArrowRight size={16} className="rotate-90" /></div>
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--text-4))]">Downstream Models</p>
                {selected.usedInModels.length === 0 ? (
                  <p className="mt-1 text-xs text-[hsl(var(--text-4))]">Not linked to any model yet.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5">{selected.usedInModels.map(modelPill)}</div>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-3">
                <Button size="sm" variant="outline" onClick={() => nav(`/datasets/${selected.id}`)}>Open Dataset</Button>
                {can('update') && <Button size="sm" onClick={() => { setEditing(selected); setSelected(null) }}>Edit Lineage</Button>}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <LineageForm
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing}
        onSubmit={async (patch) => {
          if (!editing) return
          await update.mutateAsync({ id: editing.id, patch })
          toast.success('Lineage updated')
          setEditing(null)
        }}
      />
    </div>
  )
}

// ── Lineage edit form (persists to the dataset record) ────────────────────────

function LineageForm({ open, onOpenChange, initial, onSubmit }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: DatasetRecord | null
  onSubmit: (patch: Partial<DatasetRecord>) => Promise<void>
}) {
  const [source, setSource] = useState('')
  const [ingestionMethod, setIngestionMethod] = useState('')
  const [upstream, setUpstream] = useState('')
  const [transformations, setTransformations] = useState('')
  const [sla, setSla] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset per open using key-less sync: initialize when the target changes.
  const [lastId, setLastId] = useState<string | null>(null)
  if (initial && initial.id !== lastId) {
    setLastId(initial.id)
    setSource(initial.source ?? '')
    setIngestionMethod(initial.ingestionMethod ?? '')
    setUpstream(initial.upstreamSources.join('\n'))
    setTransformations(initial.preprocessingSteps ?? '')
    setSla(initial.sla ?? '')
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      await onSubmit({
        source: source.trim() || undefined,
        ingestionMethod: ingestionMethod.trim() || undefined,
        upstreamSources: upstream.split('\n').map((s) => s.trim()).filter(Boolean),
        preprocessingSteps: transformations.trim() || undefined,
        sla: sla.trim() || undefined,
      })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update lineage')
    } finally {
      setSaving(false)
    }
  }

  const label = 'text-xs font-semibold text-[hsl(var(--text-4))]'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit lineage — {initial?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div><label className={label}>Source System</label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} className="mt-1" placeholder="e.g. Core Banking System" /></div>
          <div><label className={label}>Ingestion Method</label>
            <Input value={ingestionMethod} onChange={(e) => setIngestionMethod(e.target.value)} className="mt-1" placeholder="e.g. Batch ETL · Daily" /></div>
          <div><label className={label}>Upstream Sources (one per line)</label>
            <textarea value={upstream} onChange={(e) => setUpstream(e.target.value)} rows={3}
              className="mt-1 w-full border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm text-[hsl(var(--text-1))]" /></div>
          <div><label className={label}>Transformations</label>
            <Input value={transformations} onChange={(e) => setTransformations(e.target.value)} className="mt-1" placeholder="e.g. PII tokenization, normalization" /></div>
          <div><label className={label}>SLA</label>
            <Input value={sla} onChange={(e) => setSla(e.target.value)} className="mt-1" placeholder="e.g. By 03:00 UTC daily" /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={saving} onClick={handleSubmit}>{saving ? 'Saving…' : 'Save Lineage'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
