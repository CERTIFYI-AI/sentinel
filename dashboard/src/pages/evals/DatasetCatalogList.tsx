// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetCatalogList (Data Explorer) — governed dataset catalog with
// sensitivity, lawful basis and risk score. CRUD-backed; the step-by-step
// Dataset Wizard remains at /evals/dataset-create and the raw preview drawer
// at /evals/dataset-preview/drawer.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Database, Plus, Sparkle, Table } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RiskBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { DatasetCatalogForm } from './DatasetCatalogForm'
import { datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import type { DatasetCatalogEntry } from '@/types/evals'

export default function DatasetCatalogList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = datasetCatalogHooks.useList()
  const del = datasetCatalogHooks.useDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DatasetCatalogEntry | null>(null)
  const [toDelete, setToDelete] = useState<DatasetCatalogEntry | null>(null)

  const rows = useMemo(() => data ?? [], [data])

  const columns: Column<DatasetCatalogEntry>[] = [
    { key: 'datasetId', header: 'ID', sortable: true, render: (d) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{d.datasetId}</span> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'datasetVersion', header: 'Version', render: (d) => <span className="font-mono text-xs">v{d.datasetVersion}</span> },
    { key: 'category', header: 'Category', sortable: true },
    { key: 'sensitivity', header: 'Sensitivity', render: (d) => <RiskBadge r={d.sensitivity} /> },
    { key: 'riskScore', header: 'Risk score', sortable: true, render: (d) => <span className="font-mono">{d.riskScore}</span> },
    { key: 'bias', header: 'Bias indicators', render: (d) => {
      const worst = d.biasIndicators.some((b) => b.verdict === 'fail') ? 'fail'
        : d.biasIndicators.some((b) => b.verdict === 'warn') ? 'warn'
        : d.biasIndicators.length ? 'pass' : 'na'
      return <VerdictBadge v={worst} />
    } },
    { key: 'slices', header: 'Slices', render: (d) => <span className="font-mono">{d.slices.length}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Data Explorer"
        subtitle="Governed dataset catalog — lineage, sensitivity, lawful basis and evaluation slices"
        icon={Database}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Table />} onClick={() => nav('/evals/dataset-preview/drawer')}>Raw preview</Button>
            <Button variant="ghost" size="sm" icon={<Sparkle />} onClick={() => nav('/evals/dataset-create')}>Dataset Wizard</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Entry</Button>}
          </div>
        }
      />

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={8} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title="No datasets catalogued yet" message="Register a dataset to track lineage, lawful basis and bias indicators — or use the guided wizard."
              actionLabel={can('create') ? 'New Entry' : undefined}
              onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="name" searchPlaceholder="Search datasets…"
              onView={(d) => nav(`/evals/dataset/${d.id}`)}
              onEdit={can('update') ? (d) => { setEditing(d); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(d) => nav(`/evals/dataset/${d.id}`)}
            />
          )}
      </Card>

      <DatasetCatalogForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete ${toDelete?.datasetId ?? ''}?`}
        description="Soft-deletes the catalog entry. Linked bias audits keep their reference."
        confirmLabel="Delete"
        onConfirm={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast.success('Entry deleted') }); setToDelete(null) }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
