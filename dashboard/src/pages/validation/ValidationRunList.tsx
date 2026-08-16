// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ValidationRunList — enterprise list view for the Validation Lab.
// DataTable (sort/filter/paginate) over the unified ValidationRun model with
// fully wired New / View / Edit / Delete. View routes to the full detail page.
// Honors ?model=<uuid> (dismissible filter chip) and ?open=<id> deep links.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Flask, Plus, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, RiskBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { ValidationRunForm } from './ValidationRunForm'
import { validationRunHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { ValidationRun } from '@/types/evals'

export default function ValidationRunList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')
  const { data, isLoading, isError, error, refetch } = validationRunHooks.useList()

  // Runs that have actually completed are the ones Benchmarks can score.
  // Null while loading, so the chip never shows a premature zero.
  const benchmarkableRuns = isLoading || !data
    ? null
    : (data as any[]).filter((r) => (r.status ?? '').toLowerCase() === 'completed').length
  const del = validationRunHooks.useDelete()
  const { models, loading: modelsLoading } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ValidationRun | null>(null)
  const [toDelete, setToDelete] = useState<ValidationRun | null>(null)

  // Resolve a model uuid to its display name; never leak the raw uuid.
  const modelName = (id?: string) => (id ? models.find((m) => m.id === id)?.name : undefined)

  // Deep-link: ?open=<id> routes straight to that record's detail page.
  useEffect(() => {
    if (!openParam || !data) return
    if (data.some((r) => r.id === openParam)) nav(`/model-validation/${openParam}`, { replace: true })
  }, [openParam, data, nav])

  const rows = useMemo(
    () => (data ?? [])
      .filter((r) => !modelParam || r.modelId === modelParam)
      .map((r) => ({ ...r, name: r.runId })),
    [data, modelParam],
  )

  const columns: Column<ValidationRun & { name: string }>[] = [
    { key: 'runId', header: 'ID', sortable: true, render: (r) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{r.runId}</span> },
    { key: 'modelName', header: 'Model', sortable: true, render: (r) => {
      const name = modelName(r.modelId)
      if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">{!r.modelId ? '—' : modelsLoading ? '…' : 'Unavailable'}</span>
      return (
        <button
          onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${r.modelId}`) }}
          className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
        >
          {name} <ArrowSquareOut size={12} />
        </button>
      )
    } },
    { key: 'modelVersion', header: 'Version', render: (r) => <span className="font-mono text-xs">{r.modelVersion || '—'}</span> },
    { key: 'framework', header: 'Framework', sortable: true },
    { key: 'state', header: 'Status', render: (r) => <StateBadge s={r.state} /> },
    { key: 'overallScore', header: 'Score', sortable: true, render: (r) => <span className="font-mono">{r.overallScore || '—'}</span> },
    { key: 'riskRating', header: 'Risk', render: (r) => <RiskBadge r={r.riskRating} /> },
    { key: 'validatorId', header: 'Validator', sortable: true },
  ]

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(r: ValidationRun) { setEditing(r); setFormOpen(true) }
  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }
  function confirmDelete() {
    if (!toDelete) return
    const target = toDelete
    del.mutate(target.id, {
      onSuccess: () => toast.success(`Deleted ${target.runId}`),
      onError: (err: any) => toast.error(err?.message ?? 'Delete failed'),
    })
    setToDelete(null)
  }

  return (
    <div>
      <PageHeader
        title="Validation Lab"
        subtitle="Independent model validation records (SR 11-7 / OCC 2011-12)"
        icon={Flask}
        actions={
          <div className="flex items-center gap-2">
            {/* Benchmarks is a scored view over these same validation runs, so
                the count comes from data already loaded here — no extra query. */}
            <Button variant="ghost" size="sm" onClick={() => nav('/evals/benchmark')}>
              Benchmarks
              {benchmarkableRuns != null && (
                <span className="ml-1.5 text-[11px] text-[hsl(var(--text-4))]">{benchmarkableRuns} scored</span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/evals/techniques')}>Eval Techniques</Button>
            {can('create') && <Button size="sm" icon={<Plus />} onClick={openNew}>New Validation Run</Button>}
          </div>
        }
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

      <Card className="p-4">
        {isLoading ? (
          <TableSkeleton cols={9} />
        ) : isError ? (
          <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
        ) : rows.length === 0 ? (
          modelParam ? (
            <EmptyState
              title="No validation runs for this model"
              message="Clear the model filter to see all validation runs, or create one for this model."
              actionLabel={can('create') ? 'New Validation Run' : undefined}
              onAction={can('create') ? openNew : undefined}
            />
          ) : (
            <EmptyState
              title="No validation runs yet"
              message="Create the first validation run to record scope, test coverage and sign-offs."
              actionLabel={can('create') ? 'New Validation Run' : undefined}
              onAction={can('create') ? openNew : undefined}
            />
          )
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
        description="This soft-deletes the validation record; it will no longer appear in the Validation Lab."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
