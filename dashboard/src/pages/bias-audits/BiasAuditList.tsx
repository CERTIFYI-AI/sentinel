// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// BiasAuditList — fairness audits with score, result and risk tier.
// CRUD-backed on the canonical `bias_audits` table (the legacy mock wizard at
// /bias-audits/wizard is retired and now redirects here).
// Honors ?model=<uuid> (dismissible filter chip) and ?open=<id> deep links.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Scales, Plus, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, RiskBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { BiasAuditForm } from './BiasAuditForm'
import { biasAuditHooks, datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { BiasAudit } from '@/types/evals'

export default function BiasAuditList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')
  const { data, isLoading, isError, error, refetch } = biasAuditHooks.useList()
  const del = biasAuditHooks.useDelete()
  const { data: catalog } = datasetCatalogHooks.useList()
  const { models, loading: modelsLoading } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BiasAudit | null>(null)
  const [toDelete, setToDelete] = useState<BiasAudit | null>(null)

  // Resolve a model uuid to its display name; never leak the raw uuid.
  const modelName = (id?: string) => (id ? models.find((m) => m.id === id)?.name : undefined)

  // Deep-link: ?open=<id> routes straight to that record's detail page.
  useEffect(() => {
    if (!openParam || !data) return
    if (data.some((a) => a.id === openParam)) nav(`/bias-audits/record/${openParam}`, { replace: true })
  }, [openParam, data, nav])

  const rows = useMemo(
    () => (data ?? [])
      .filter((a) => !modelParam || a.modelId === modelParam)
      .map((a) => ({ ...a, name: a.auditId })),
    [data, modelParam],
  )

  const columns: Column<BiasAudit & { name: string }>[] = [
    { key: 'auditId', header: 'ID', sortable: true, render: (a) => <span className="font-mono text-xs text-[hsl(var(--text-2))]">{a.auditId}</span> },
    { key: 'modelName', header: 'Model', sortable: true, render: (a) => {
      const name = modelName(a.modelId)
      if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">{!a.modelId ? '—' : modelsLoading ? '…' : 'Unavailable'}</span>
      return (
        <button
          onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${a.modelId}`) }}
          className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
        >
          {name} <ArrowSquareOut size={12} />
        </button>
      )
    } },
    { key: 'datasetId', header: 'Dataset', render: (a) => {
      if (!a.datasetId) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>
      const entry = catalog?.find((d) => d.id === a.datasetId)
      // Only link ids that resolve in the catalog; legacy free-text ids render as plain text.
      return entry ? (
        <button className="text-xs text-[hsl(var(--brand))] hover:underline"
          onClick={(e) => { e.stopPropagation(); nav(`/evals/dataset/${entry.id}`) }}>{entry.name}</button>
      ) : <span className="font-mono text-xs text-[hsl(var(--text-4))]" title="Not in the Data Explorer catalog">{a.datasetId}</span>
    } },
    { key: 'framework', header: 'Framework', sortable: true },
    { key: 'fairnessScore', header: 'Fairness', sortable: true, render: (a) => <span className="font-mono">{typeof a.fairnessScore === 'number' ? a.fairnessScore.toFixed(2) : '—'}</span> },
    { key: 'result', header: 'Result', render: (a) => <VerdictBadge v={a.result} /> },
    { key: 'riskTier', header: 'Risk', render: (a) => <RiskBadge r={a.riskTier} /> },
    { key: 'state', header: 'Status', render: (a) => <StateBadge s={a.state} /> },
    { key: 'auditor', header: 'Auditor', sortable: true },
  ]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Bias Audits"
        subtitle="Fairness assessments across protected attributes and intersections"
        icon={Scales}
        actions={
          <div className="flex items-center gap-2">
            {can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Audit</Button>}
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
        {isLoading ? <TableSkeleton cols={10} />
          : isError ? <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState
              title={modelParam ? 'No bias audits for this model' : 'No bias audits yet'}
              message={modelParam
                ? 'Clear the model filter to see all audits, or run one for this model.'
                : 'Run the first audit to measure fairness across protected attributes.'}
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
        description="This soft-deletes the audit record; it will no longer appear in this list."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, {
            onSuccess: () => toast.success('Audit deleted'),
            onError: (err: any) => toast.error(err?.message ?? 'Delete failed'),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
