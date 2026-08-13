// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ScenarioTemplateList (Scenario Editor home) — multi-turn red-team scenarios
// with risk tags and guardrail checks. CRUD-backed; turns are scripted inline
// in the scenario form. Supports ?model=<uuid> filtering and ?open=<id>.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChatCircleDots, Plus, Warning, X } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StateBadge } from '@/components/evals/primitives'
import { TableSkeleton, EmptyState, ErrorState } from '@/components/evals/states'
import { ScenarioTemplateForm } from './ScenarioTemplateForm'
import { scenarioTemplateHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions, type ModelOption } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'
import type { ScenarioTemplate } from '@/types/evals'

/** Pill link to the governed model (resolved name, never a raw uuid). */
function ModelPill({ modelId, models, onOpen }: {
  modelId?: string; models: ModelOption[]; onOpen: (id: string) => void
}) {
  if (!modelId) return <span className="text-[hsl(var(--text-4))]">—</span>
  const m = models.find((x) => x.id === modelId)
  if (!m) return (
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

export default function ScenarioTemplateList() {
  const nav = useNavigate()
  const { can } = useRBAC()
  const { data, isLoading, isError, refetch } = scenarioTemplateHooks.useList()
  const del = scenarioTemplateHooks.useDelete()
  const { models } = useModelOptions()
  const [params, setParams] = useSearchParams()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ScenarioTemplate | null>(null)
  const [toDelete, setToDelete] = useState<ScenarioTemplate | null>(null)

  // ?open=<id> deep link opens that record's detail.
  const openId = params.get('open')
  useEffect(() => {
    if (openId) nav(`/evals/scenario/${openId}`, { replace: true })
  }, [openId, nav])

  const modelFilter = params.get('model')
  const clearParam = (k: string) => {
    const next = new URLSearchParams(params)
    next.delete(k)
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    const all = data ?? []
    return modelFilter ? all.filter((s) => s.modelId === modelFilter) : all
  }, [data, modelFilter])

  const columns: Column<ScenarioTemplate>[] = [
    { key: 'name', header: 'Scenario', sortable: true },
    { key: 'modelId', header: 'Model', render: (s) => <ModelPill modelId={s.modelId} models={models} onOpen={(id) => nav(`/models/inventory/${id}`)} /> },
    { key: 'turns', header: 'Turns', render: (s) => <span className="font-mono">{(s.turns ?? []).length}</span> },
    { key: 'guardrails', header: 'Guardrails', render: (s) => <span className="font-mono text-xs text-[hsl(var(--text-3))]">{(s.guardrailChecks ?? []).join(', ') || '—'}</span> },
    { key: 'riskTags', header: 'Risk tags', render: (s) => (
      <span className="flex flex-wrap gap-1">
        {(s.riskTags ?? []).slice(0, 2).map((t) => (
          <span key={t} className="border border-[hsl(var(--r-hi-br))] bg-[hsl(var(--r-hi-bg))] px-1.5 py-[1px] text-[10px] font-medium text-[hsl(var(--r-hi-tx))]">{t}</span>
        ))}
        {(s.riskTags ?? []).length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{(s.riskTags ?? []).length - 2}</span>}
      </span>
    ) },
    { key: 'campaigns', header: 'Campaigns', render: (s) => <span className="font-mono">{(s.campaignIds ?? []).length}</span> },
    { key: 'state', header: 'Status', render: (s) => <StateBadge s={s.state} /> },
  ]

  return (
    <div>
      <PageHeader
        title="Scenario Editor"
        subtitle="Multi-turn adversarial and compliance scenarios with guardrail expectations"
        icon={ChatCircleDots}
        actions={can('create') && <Button size="sm" icon={<Plus />} onClick={() => { setEditing(null); setFormOpen(true) }}>New Scenario</Button>}
      />

      {modelFilter && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 border border-[hsl(var(--brand))] bg-[hsl(var(--bg-raised))] px-2 py-[3px] text-[12px] text-[hsl(var(--text-1))]">
            Model: <span className="font-medium">{models.find((m) => m.id === modelFilter)?.name ?? 'Unknown model'}</span>
            <button onClick={() => clearParam('model')} title="Clear model filter"
              className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"><X size={12} /></button>
          </span>
        </div>
      )}

      <Card className="p-4">
        {isLoading ? <TableSkeleton cols={7} />
          : isError ? <ErrorState onRetry={() => refetch()} />
          : rows.length === 0 ? (
            <EmptyState title={modelFilter ? 'No scenarios for this model' : 'No scenarios yet'}
              message="Author the first multi-turn scenario to probe guardrails and policy compliance."
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
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete.id, {
            onSuccess: () => toast.success('Scenario deleted'),
            onError: (err) => toast.error(err.message),
          })
          setToDelete(null)
        }}
        onOpenChange={(o) => !o && setToDelete(null)}
      />
    </div>
  )
}
