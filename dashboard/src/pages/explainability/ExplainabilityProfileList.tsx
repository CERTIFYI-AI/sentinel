// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ExplainabilityProfileList — per model/version XAI profiles with adequacy
// posture. CRUD-backed; the analysis workspace (legacy Explainability Center)
// remains available at /explainability/center.
// Honors ?model=<uuid> (dismissible filter chip) and ?open=<id> deep links.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut, Eye, Plus, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge, VerdictBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { ExplainabilityProfileForm } from './ExplainabilityProfileForm'
import { explainProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { ExplainabilityProfile } from '@/types/evals'

export default function ExplainabilityProfileList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const [searchParams, setSearchParams] = useSearchParams()
  const modelParam = searchParams.get('model')
  const openParam = searchParams.get('open')
  const { data, isLoading, isError, error, refetch } = explainProfileHooks.useList()
  const del = explainProfileHooks.useDelete()
  const { models, loading: modelsLoading } = useModelOptions()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExplainabilityProfile | null>(null)
  const [toDelete, setToDelete] = useState<ExplainabilityProfile | null>(null)

  // Resolve a model uuid to its display name; never leak the raw uuid.
  const modelName = (id?: string) => (id ? models.find((m) => m.id === id)?.name : undefined)

  // Deep-link: ?open=<id> routes straight to that record's detail page.
  useEffect(() => {
    if (!openParam || !data) return
    if (data.some((p) => p.id === openParam)) nav(`/explainability/${openParam}`, { replace: true })
  }, [openParam, data, nav])

  const rows = useMemo(
    () => (data ?? [])
      .filter((p) => !modelParam || p.modelId === modelParam)
      .map((p) => ({ ...p, name: p.modelName })),
    [data, modelParam],
  )

  const columns: Column<ExplainabilityProfile & { name: string }>[] = [
    { key: 'modelName', header: 'Model', sortable: true, render: (p) => {
      const name = modelName(p.modelId)
      if (!name) return <span className="text-xs text-[hsl(var(--text-4))]">{!p.modelId ? '—' : modelsLoading ? '…' : 'Unavailable'}</span>
      return (
        <button
          onClick={(e) => { e.stopPropagation(); nav(`/models/inventory/${p.modelId}`) }}
          className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
        >
          {name} <ArrowSquareOut size={12} />
        </button>
      )
    } },
    { key: 'modelVersion', header: 'Version', render: (p) => <span className="font-mono text-xs">{p.modelVersion || '—'}</span> },
    { key: 'owner', header: 'Owner', sortable: true },
    { key: 'globalMethod', header: 'Global method', render: (p) => p.global?.method ?? '—' },
    { key: 'fidelity', header: 'Fidelity', render: (p) => <span className="font-mono">{typeof p.global?.fidelity === 'number' ? p.global.fidelity.toFixed(2) : '—'}</span> },
    { key: 'adequacy', header: 'Adequacy', render: (p) => <VerdictBadge v={p.reports?.[0]?.verdict ?? 'na'} /> },
    { key: 'state', header: 'Status', render: (p) => <StateBadge s={p.state} /> },
  ]

  function clearModelFilter() {
    const next = new URLSearchParams(searchParams)
    next.delete('model')
    setSearchParams(next, { replace: true })
  }

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
        {isLoading ? <TableSkeleton cols={8} />
          : isError ? <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState
              title={modelParam ? 'No explainability profiles for this model' : 'No explainability profiles yet'}
              message={modelParam
                ? 'Clear the model filter to see all profiles, or create one for this model.'
                : 'Create a profile to track global/local methods and adequacy vs policy.'}
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
        title={`Delete profile for ${toDelete ? (modelName(toDelete.modelId) ?? toDelete.modelName) : ''}?`}
        description="This soft-deletes the explainability profile; it will no longer appear in this list."
        confirmLabel="Delete"
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, {
            onSuccess: () => toast.success('Profile deleted'),
            onError: (err: any) => toast.error(err?.message ?? 'Delete failed'),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
