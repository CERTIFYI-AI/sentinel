// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// BiasAuditList — fairness audits with score, result and risk tier.
// CRUD-backed; the guided wizard remains available at /bias-audits/wizard.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Scales, Plus, MagicWand } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, RiskBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { BiasAuditForm } from './BiasAuditForm'
import { biasAuditHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import type { BiasAudit } from '@/types/evals'

export default function BiasAuditList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = biasAuditHooks.useList()
  const del = biasAuditHooks.useDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BiasAudit | null>(null)
  const [toDelete, setToDelete] = useState<BiasAudit | null>(null)

  const rows = useMemo(() => (data ?? []).map((a) => ({ ...a, name: a.auditId })), [data])

  const columns: Column<BiasAudit & { name: string }>[] = [
    { key: 'auditId', header: 'ID', sortable: true, render: (a) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{a.auditId}</span> },
    { key: 'modelName', header: 'Model', sortable: true },
    { key: 'datasetId', header: 'Dataset', render: (a) => (
      <button className="font-mono text-xs text-[hsl(var(--brand))] hover:underline"
        onClick={(e) => { e.stopPropagation(); nav(`/evals/dataset/${a.datasetId}`) }}>{a.datasetId}</button>
    ) },
    { key: 'framework', header: 'Framework', sortable: true },
    { key: 'fairnessScore', header: 'Fairness', sortable: true, render: (a) => <span className="font-mono">{a.fairnessScore.toFixed(2)}</span> },
    { key: 'result', header: 'Result', render: (a) => <VerdictBadge v={a.result} /> },
    { key: 'riskTier', header: 'Risk', render: (a) => <RiskBadge r={a.riskTier} /> },
    { key: 'state', header: 'Status', render: (a) => <StateBadge s={a.state} /> },
    { key: 'auditor', header: 'Auditor', sortable: true },
  ]

  return (
    <div>
      <PageHeader
        title="Bias Audits"
        subtitle="Fairness assessments across protected attributes and intersections"
        icon={Scales}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<MagicWand />} onClick={() => nav('/bias-audits/wizard')}>Guided wizard</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Audit</Button>}
          </div>
        }
      />

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={9} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title="No bias audits yet" message="Run the first audit to measure fairness across protected attributes."
              actionLabel={can('create') ? 'New Audit' : undefined}
              onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="auditId" searchPlaceholder="Search by audit ID…"
              onView={(a) => nav(`/bias-audits/record/${a.id}`)}
              onEdit={can('update') ? (a) => { setEditing(a); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(a) => nav(`/bias-audits/record/${a.id}`)}
            />
          )}
      </Card>

      <BiasAuditForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete ${toDelete?.auditId ?? ''}?`}
        description="Soft-deletes the audit record. Snapshots and remediation history are retained."
        confirmLabel="Delete"
        onConfirm={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast.success('Audit deleted') }); setToDelete(null) }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
