// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ValidationRunList — enterprise list view for the Validation Lab.
// DataTable (sort/filter/paginate) over the unified ValidationRun model with
// fully wired New / View / Edit / Delete. View routes to the full detail page.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Flask, Plus } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, RiskBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { ValidationRunForm } from './ValidationRunForm'
import { validationRunHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import type { ValidationRun } from '@/types/evals'

export default function ValidationRunList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = validationRunHooks.useList()
  const del = validationRunHooks.useDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ValidationRun | null>(null)
  const [toDelete, setToDelete] = useState<ValidationRun | null>(null)

  const rows = useMemo(() => (data ?? []).map((r) => ({ ...r, name: r.runId })), [data])

  const columns: Column<ValidationRun & { name: string }>[] = [
    { key: 'runId', header: 'ID', sortable: true, render: (r) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{r.runId}</span> },
    { key: 'modelName', header: 'Model', sortable: true },
    { key: 'modelVersion', header: 'Version', render: (r) => <span className="font-mono text-xs">{r.modelVersion}</span> },
    { key: 'framework', header: 'Framework', sortable: true },
    { key: 'state', header: 'Status', render: (r) => <StateBadge s={r.state} /> },
    { key: 'overallScore', header: 'Score', sortable: true, render: (r) => <span className="font-mono">{r.overallScore || '—'}</span> },
    { key: 'riskRating', header: 'Risk', render: (r) => <RiskBadge r={r.riskRating} /> },
    { key: 'validatorId', header: 'Validator', sortable: true },
  ]

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(r: ValidationRun) { setEditing(r); setFormOpen(true) }
  function confirmDelete() {
    if (!toDelete) return
    del.mutate(toDelete.id, {
      onSuccess: () => toast.success(`Deleted ${toDelete.runId}`),
      onError: () => toast.error('Delete failed'),
    })
    setToDelete(null)
  }

  return (
    <div>
      <PageHeader
        title="Validation Lab"
        subtitle="Independent model validation records (SR 11-7 / OCC 2011-12)"
        icon={Flask}
        actions={can('create') && <Button size="sm" icon={<Plus />} onClick={openNew}>New Validation Run</Button>}
      />

      <Card className="p-4">
        {isLoading ? (
          <TableSkeleton cols={8} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No validation runs yet"
            message="Create the first validation run to record scope, test coverage and sign-offs."
            actionLabel={can('create') ? 'New Validation Run' : undefined}
            onAction={can('create') ? openNew : undefined}
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            searchKey="runId"
            searchPlaceholder="Search by run ID…"
            onView={(r) => nav(`/model-validation/${r.id}`)}
            onEdit={can('update') ? openEdit : undefined}
            onDelete={can('delete') ? setToDelete : undefined}
            onRowClick={(r) => nav(`/model-validation/${r.id}`)}
          />
        )}
      </Card>

      <ValidationRunForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDialog
        open={!!toDelete}
        type="danger"
        title={`Delete ${toDelete?.runId ?? ''}?`}
        description="This soft-deletes the validation record. It can be restored by an administrator."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
