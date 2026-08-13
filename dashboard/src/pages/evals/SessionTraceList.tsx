// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// SessionTraceList (Session Trace Viewer home) — captured conversations with
// policy-check verdicts. Traces are captured by the runtime, not authored, so
// there is no create form; view + delete only. Supports ?model=<uuid> and
// ?scenario=<id> filters plus ?open=<id> deep links.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ListMagnifyingGlass, Warning, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { sessionTraceHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions, type ModelOption } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { SessionTrace, Verdict } from '@/types/evals'

const VERDICTS: Verdict[] = ['pass', 'warn', 'fail', 'na']

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

export default function SessionTraceList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = sessionTraceHooks.useList()
  const del = sessionTraceHooks.useDelete()
  const { models } = useModelOptions()
  const [params, setParams] = useSearchParams()
  const [toDelete, setToDelete] = useState<SessionTrace | null>(null)
  const [verdictFilter, setVerdictFilter] = useState<'all' | Verdict>('all')

  // ?open=<id> deep link opens that record's detail.
  const openId = params.get('open')
  useEffect(() => {
    if (openId) nav(`/evals/trace/${openId}`, { replace: true })
  }, [openId, nav])

  const modelFilter = params.get('model')
  const scenarioFilter = params.get('scenario')
  const clearParam = (k: string) => {
    const next = new URLSearchParams(params)
    next.delete(k)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    let all = data ?? []
    if (modelFilter) all = all.filter((t) => t.modelId === modelFilter)
    if (scenarioFilter) all = all.filter((t) => t.scenarioId === scenarioFilter)
    if (verdictFilter !== 'all') all = all.filter((t) => t.verdict === verdictFilter)
    return all
  }, [data, modelFilter, scenarioFilter, verdictFilter])

  const columns: Column<SessionTrace>[] = [
    { key: 'id', header: 'Trace', sortable: true, render: (t) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{t.id}</span> },
    { key: 'modelId', header: 'Model', render: (t) => (
      <span className="inline-flex items-center gap-1.5">
        <ModelPill modelId={t.modelId} models={models} onOpen={(id) => nav(`/models/inventory/${id}`)} />
        <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">{t.modelVersion}</span>
      </span>
    ) },
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

  const chips = [
    modelFilter && {
      key: 'model',
      label: <>Model: <span className="font-medium">{models.find((m) => m.id === modelFilter)?.name ?? 'Unknown model'}</span></>,
    },
    scenarioFilter && {
      key: 'scenario',
      label: <>Scenario: <span className="font-mono">{scenarioFilter}</span></>,
    },
  ].filter(Boolean) as { key: string; label: ReactNode }[]

  return (
    <div>
      <PageHeader
        title="Session Trace Viewer"
        subtitle="Captured conversations with inline guardrail and policy-check results"
        icon={ListMagnifyingGlass}
        actions={
          <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value as 'all' | Verdict)}
            aria-label="Filter by verdict"
            className="h-8 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-2 text-xs text-[hsl(var(--text-2))] focus:outline-none">
            <option value="all">All verdicts</option>
            {VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        }
      />

      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5 border border-[hsl(var(--brand))] bg-[hsl(var(--bg-raised))] px-2 py-[3px] text-[12px] text-[hsl(var(--text-1))]">
              {c.label}
              <button onClick={() => clearParam(c.key)} title={`Clear ${c.key} filter`}
                className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title={modelFilter || scenarioFilter || verdictFilter !== 'all' ? 'No traces match the current filters' : 'No session traces captured'}
              message="Traces appear here when scenario campaigns run or the runtime records governed sessions." />
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
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, {
            onSuccess: () => toast.success('Trace deleted'),
            onError: (err) => toast.error(err.message),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
