// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MetricProfileList — per model/version metric profiles with threshold posture.
// CRUD-backed; the interactive workbench remains at /evals/metric-studio/workspace.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Gauge, Plus, Wrench } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { MetricProfileForm } from './MetricProfileForm'
import { metricProfileHooks } from '@/hooks/queries/useEvalsCrud'
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

export default function MetricProfileList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = metricProfileHooks.useList()
  const del = metricProfileHooks.useDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MetricProfile | null>(null)
  const [toDelete, setToDelete] = useState<MetricProfile | null>(null)

  const rows = useMemo(() => (data ?? []).map((p) => ({ ...p, name: p.modelName })), [data])

  const columns: Column<MetricProfile & { name: string }>[] = [
    { key: 'modelName', header: 'Model', sortable: true },
    { key: 'modelVersion', header: 'Version', render: (p) => <span className="font-mono text-xs">{p.modelVersion}</span> },
    { key: 'owner', header: 'Owner', sortable: true },
    { key: 'metrics', header: 'Metrics', render: (p) => <span className="font-mono">{Object.keys(p.current).length}</span> },
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
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Wrench />} onClick={() => nav('/evals/metric-studio/workspace')}>Metric workbench</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Profile</Button>}
          </div>
        }
      />

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title="No metric profiles yet" message="Create a profile to track thresholds, drift and multi-objective trade-offs."
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
        onConfirm={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast.success('Profile deleted') }); setToDelete(null) }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
