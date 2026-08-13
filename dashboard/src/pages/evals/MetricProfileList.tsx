// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MetricProfileList — per model/version metric profiles with threshold posture.
// CRUD-backed; thresholds are edited inline in the profile form. Supports
// ?model=<uuid> filtering and ?open=<id> deep links.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Gauge, Plus, Warning, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { MetricProfileForm } from './MetricProfileForm'
import { metricProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions, type ModelOption } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { MetricProfile } from '@/types/evals'

/** Worst threshold verdict across configured metrics — the profile's posture. */
export function posture(p: MetricProfile): 'pass' | 'warn' | 'fail' | 'na' {
  let worst: 'pass' | 'warn' | 'fail' | 'na' = 'na'
  for (const t of p.thresholds) {
    const cur = p.current[t.metric]
    if (cur === undefined) continue
    const breach = t.direction === 'higher_better' ? (v: number, x: number) => v < x : (v: number, x: number) => v > x
    const v = breach(cur, t.fail) ? 'fail' : breach(cur, t.warn) ? 'warn' : 'pass'
    if (v === 'fail') return 'fail'
    if (v === 'warn') worst = 'warn'
    else if (worst === 'na') worst = 'pass'
  }
  return worst
}

/** Pill link to the governed model (resolved name, never a raw uuid). */
function ModelPill({ modelId, models, onOpen }: {
  modelId?: string; models: ModelOption[]; onOpen: (id: string) => void
}) {
  const m = modelId ? models.find((x) => x.id === modelId) : undefined
  if (!modelId || !m) return (
    <span title="Linked model is not in the registry"
      className="inline-flex items-center gap-1 border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] px-2 py-[2px] text-[11px] font-medium text-[hsl(var(--s-er-tx))]">
      <Warning size={10} weight="fill" />Unavailable
    </span>
  )
  return (
    <button title={`Open ${m.name}`}
      onClick={(e) => { e.stopPropagation(); onOpen(modelId) }}
      className="inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-2 py-[2px] text-[11px] font-medium text-[hsl(var(--brand))] hover:border-[hsl(var(--brand))] hover:underline">
      {m.name}
    </button>
  )
}

export default function MetricProfileList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = metricProfileHooks.useList()
  const del = metricProfileHooks.useDelete()
  const { models } = useModelOptions()
  const [params, setParams] = useSearchParams()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MetricProfile | null>(null)
  const [toDelete, setToDelete] = useState<MetricProfile | null>(null)

  // ?open=<id> deep link opens that record's detail.
  const openId = params.get('open')
  useEffect(() => {
    if (openId) nav(`/evals/metric-studio/${openId}`, { replace: true })
  }, [openId, nav])

  const modelFilter = params.get('model')
  const clearParam = (k: string) => {
    const next = new URLSearchParams(params)
    next.delete(k)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    const all = data ?? []
    return modelFilter ? all.filter((p) => p.modelId === modelFilter) : all
  }, [data, modelFilter])

  const columns: Column<MetricProfile>[] = [
    { key: 'modelName', header: 'Model', sortable: true, render: (p) => (
      <ModelPill modelId={p.modelId} models={models} onOpen={(id) => nav(`/models/inventory/${id}`)} />
    ) },
    { key: 'modelVersion', header: 'Version', render: (p) => <span className="font-mono text-xs">{p.modelVersion}</span> },
    { key: 'owner', header: 'Owner', sortable: true },
    { key: 'metrics', header: 'Metrics', render: (p) => <span className="font-mono">{(p.metrics ?? Object.keys(p.current)).length}</span> },
    { key: 'thresholds', header: 'Thresholds', render: (p) => <span className="font-mono">{p.thresholds.length}</span> },
    { key: 'posture', header: 'Posture', render: (p) => <VerdictBadge v={posture(p)} /> },
    { key: 'state', header: 'Status', render: (p) => <StateBadge s={p.state} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Metric Studio"
        subtitle="Metric profiles, thresholds and champion/challenger benchmarks"
        icon={Gauge}
        actions={can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Profile</Button>}
      />

      {modelFilter && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-[hsl(var(--brand))] bg-[hsl(var(--bg-raised))] px-2 py-[3px] text-[12px] text-[hsl(var(--text-1))]">
            Model: <span className="font-medium">{models.find((m) => m.id === modelFilter)?.name ?? 'Unknown model'}</span>
            <button onClick={() => clearParam('model')} title="Clear model filter"
              className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={12} /></button>
          </span>
        </div>
      )}

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title={modelFilter ? 'No metric profiles for this model' : 'No metric profiles yet'}
              message="Create a profile to track thresholds, drift and multi-objective trade-offs."
              actionLabel={can('create') ? 'New Profile' : undefined}
              onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="modelName" searchPlaceholder="Search by model…"
              onView={(p) => nav(`/evals/metric-studio/${p.id}`)}
              onEdit={can('update') ? (p) => { setEditing(p); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(p) => nav(`/evals/metric-studio/${p.id}`)}
            />
          )}
      </Card>

      <MetricProfileForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete metric profile for ${toDelete?.modelName ?? ''}?`}
        description="Soft-deletes the profile; time-series history is retained."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, {
            onSuccess: () => toast.success('Profile deleted'),
            onError: (err) => toast.error(err.message),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
