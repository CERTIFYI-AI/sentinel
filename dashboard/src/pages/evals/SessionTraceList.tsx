// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// SessionTraceList (Session Trace Viewer home) — captured conversations with
// policy-check verdicts. Traces are captured by the runtime, not authored, so
// there is no create form; view + delete only. The raw viewer stays at
// /evals/conversation/viewer.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ListMagnifyingGlass, Monitor } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { sessionTraceHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import type { SessionTrace } from '@/types/evals'

export default function SessionTraceList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = sessionTraceHooks.useList()
  const del = sessionTraceHooks.useDelete()
  const [toDelete, setToDelete] = useState<SessionTrace | null>(null)

  const rows = useMemo(() => (data ?? []).map((t) => ({ ...t, name: t.id })), [data])

  const columns: Column<SessionTrace & { name: string }>[] = [
    { key: 'id', header: 'Trace', sortable: true, render: (t) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{t.id}</span> },
    { key: 'modelId', header: 'Model', sortable: true, render: (t) => <span className="font-mono text-xs">{t.modelId} · {t.modelVersion}</span> },
    { key: 'scenarioId', header: 'Scenario', render: (t) => t.scenarioId ? (
      <button className="font-mono text-xs text-[hsl(var(--brand))] hover:underline"
        onClick={(e) => { e.stopPropagation(); nav(`/evals/scenario/${t.scenarioId}`) }}>{t.scenarioId}</button>
    ) : <span className="text-[hsl(var(--text-4))]">—</span> },
    { key: 'turns', header: 'Turns', render: (t) => <span className="font-mono">{t.turns.length}</span> },
    { key: 'checks', header: 'Policy checks', render: (t) => <span className="font-mono">{t.policyResults.length}</span> },
    { key: 'interventions', header: 'Interventions', render: (t) => (
      <span className="font-mono">{t.policyResults.filter((p) => p.intervention && p.intervention !== 'none').length}</span>
    ) },
    { key: 'verdict', header: 'Verdict', render: (t) => <VerdictBadge v={t.verdict} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Session Trace Viewer"
        subtitle="Captured conversations with inline guardrail and policy-check results"
        icon={ListMagnifyingGlass}
        actions={<Button variant="ghost" size="sm" icon={<Monitor />} onClick={() => nav('/evals/conversation/viewer')}>Raw viewer</Button>}
      />

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title="No session traces captured" message="Traces appear here when scenario campaigns run or the runtime records governed sessions." />
          ) : (
            <DataTable
              data={rows} columns={columns}
              searchKey="id" searchPlaceholder="Search by trace ID…"
              onView={(t) => nav(`/evals/trace/${t.id}`)}
              onDelete={can('delete') ? setToDelete : undefined}
              onRowClick={(t) => nav(`/evals/trace/${t.id}`)}
            />
          )}
      </Card>

      <ConfirmDialog
        open={!!toDelete} type="danger"
        title={`Delete trace ${toDelete?.id ?? ''}?`}
        description="Soft-deletes the captured conversation. Evidence references remain in linked audits."
        confirmLabel="Delete"
        onConfirm={() => { if (toDelete) del.mutate(toDelete.id, { onSuccess: () => toast.success('Trace deleted') }); setToDelete(null) }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
