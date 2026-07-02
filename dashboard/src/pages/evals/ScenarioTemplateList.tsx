// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ScenarioTemplateList (Scenario Editor home) — multi-turn red-team scenarios
// with risk tags and guardrail checks. CRUD-backed; the turn-by-turn script
// editor remains at /evals/multi-turn/editor.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChatCircleDots, Plus, PencilSimpleLine } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { ScenarioTemplateForm } from './ScenarioTemplateForm'
import { scenarioTemplateHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import type { ScenarioTemplate } from '@/types/evals'

export default function ScenarioTemplateList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = scenarioTemplateHooks.useList()
  const del = scenarioTemplateHooks.useDelete()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ScenarioTemplate | null>(null)
  const [toDelete, setToDelete] = useState<ScenarioTemplate | null>(null)

  const rows = useMemo(() => data ?? [], [data])

  const columns: Column<ScenarioTemplate>[] = [
    { key: 'name', header: 'Scenario', sortable: true },
    { key: 'turns', header: 'Turns', render: (s) => <span className="font-mono">{s.turns.length}</span> },
    { key: 'guardrails', header: 'Guardrails', render: (s) => <span className="font-mono text-xs text-[hsl(var(--text-3))]">{s.guardrailChecks.join(', ') || '—'}</span> },
    { key: 'riskTags', header: 'Risk tags', render: (s) => (
      <span className="flex flex-wrap gap-1">
        {s.riskTags.slice(0, 2).map((t) => (
          <span key={t} className="border border-[hsl(var(--r-hi-br))] bg-[hsl(var(--r-hi-bg))] px-1.5 py-[1px] text-[10px] font-medium text-[hsl(var(--r-hi-tx))]">{t}</span>
        ))}
        {s.riskTags.length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{s.riskTags.length - 2}</span>}
      </span>
    ) },
    { key: 'campaigns', header: 'Campaigns', render: (s) => <span className="font-mono">{s.campaignIds.length}</span> },
    { key: 'state', header: 'Status', render: (s) => <StateBadge s={s.state} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Scenario Editor"
        subtitle="Multi-turn adversarial and compliance scenarios with guardrail expectations"
        icon={ChatCircleDots}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<PencilSimpleLine />} onClick={() => nav('/evals/multi-turn/editor')}>Script editor</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Scenario</Button>}
          </div>
        }
      />

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={6} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title="No scenarios yet" message="Author the first multi-turn scenario to probe guardrails and policy compliance."
              actionLabel={can('create') ? 'New Scenario' : undefined}
              onAction={can('create') ? () => { setEditing(null); setFormOpen(true) } : undefined} />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="name" searchPlaceholder="Search scenarios…"
              onView={(s) => nav(`/evals/scenario/${s.id}`)}
              onEdit={can('update') ? (s) => { setEditing(s); setFormOpen(true) } : undefined}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(s) => nav(`/evals/scenario/${s.id}`)}
            />
          )}
      </Card>

      <ScenarioTemplateForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete "${toDelete?.name ?? ''}"?`}
        description="Soft-deletes the scenario. Captured session traces are retained."
        confirmLabel="Delete"
        onConfirm={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast.success('Scenario deleted') }); setToDelete(null) }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
