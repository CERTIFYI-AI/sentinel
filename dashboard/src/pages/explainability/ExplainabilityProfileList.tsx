// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ExplainabilityProfileList — per model/version XAI profiles with adequacy
// posture. CRUD-backed; the analysis workspace (legacy Explainability Center)
// remains available at /explainability/center.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, Plus } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { ExplainabilityProfileForm } from './ExplainabilityProfileForm'
import { explainProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import type { ExplainabilityProfile } from '@/types/evals'

export default function ExplainabilityProfileList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = explainProfileHooks.useList()
  const del = explainProfileHooks.useDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExplainabilityProfile | null>(null)
  const [toDelete, setToDelete] = useState<ExplainabilityProfile | null>(null)

  const rows = useMemo(() => (data ?? []).map((p) => ({ ...p, name: p.modelName })), [data])

  const columns: Column<ExplainabilityProfile & { name: string }>[] = [
    { key: 'modelName', header: 'Model', sortable: true },
    { key: 'modelVersion', header: 'Version', render: (p) => <span className="font-mono text-xs">{p.modelVersion}</span> },
    { key: 'owner', header: 'Owner', sortable: true },
    { key: 'globalMethod', header: 'Global method', render: (p) => p.global.method },
    { key: 'fidelity', header: 'Fidelity', render: (p) => <span className="font-mono">{p.global.fidelity.toFixed(2)}</span> },
    { key: 'adequacy', header: 'Adequacy', render: (p) => <VerdictBadge v={p.reports[0]?.verdict ?? 'na'} /> },
    { key: 'state', header: 'Status', render: (p) => <StateBadge s={p.state} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Explainability Center"
        subtitle="Model explainability profiles, adequacy scoring and jurisdiction-ready explanations"
        icon={Eye}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => nav('/explainability/center')}>Analysis workspace</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Profile</Button>}
          </div>
        }
      />

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title="No explainability profiles yet" message="Create a profile to track global/local methods and adequacy vs policy."
              actionLabel={can('create') ? 'New Profile' : undefined}
              onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="modelName" searchPlaceholder="Search by model…"
              onView={(p) => nav(`/explainability/${p.id}`)}
              onEdit={can('update') ? (p) => { setEditing(p); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(p) => nav(`/explainability/${p.id}`)}
            />
          )}
      </Card>

      <ExplainabilityProfileForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete profile for ${toDelete?.modelName ?? ''}?`}
        description="Soft-deletes the explainability profile; reports remain in the audit trail."
        confirmLabel="Delete"
        onConfirm={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast.success('Profile deleted') }); setToDelete(null) }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
