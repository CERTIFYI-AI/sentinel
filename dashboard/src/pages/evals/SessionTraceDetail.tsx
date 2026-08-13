// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// SessionTraceDetail — stored multi-turn conversation with inline policy-check
// results (toxicity/privacy/compliance), decision points, interventions and
// overrides.

import { useParams, useNavigate } from 'react-router-dom'
import { Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Stat, Section, VerdictBadge } from '@/components/evals/primitives'
import { sessionTraceHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { cn } from '@/lib/utils'

export default function SessionTraceDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: tr } = sessionTraceHooks.useGet(id)
  const { models } = useModelOptions()

  if (!tr) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading session trace…</div>

  const model = models.find((m) => m.id === tr.modelId)

  return (
    <div>
      <PageHeader
        title={tr.id}
        subtitle={`${tr.modelVersion}${tr.scenarioId ? ` · scenario ${tr.scenarioId}` : ''}`}
        badge={<VerdictBadge v={tr.verdict} />}
        onBack={() => nav('/evals/conversation')}
        actions={
          <div className="flex items-center gap-2">
            {model ? (
              <button title={`Open ${model.name}`} onClick={() => nav(`/models/inventory/${tr.modelId}`)}
                className="inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-2 py-[3px] text-[12px] font-medium text-[hsl(var(--brand))] hover:border-[hsl(var(--brand))] hover:underline">
                {model.name}
              </button>
            ) : (
              <span title="Linked model is not in the registry"
                className="inline-flex items-center gap-1 border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] px-2 py-[3px] text-[12px] font-medium text-[hsl(var(--s-er-tx))]">
                <Warning size={11} weight="fill" />Unavailable
              </span>
            )}
            {tr.scenarioId && (
              <Button variant="ghost" size="sm" title="Open source scenario" onClick={() => nav(`/evals/scenario/${tr.scenarioId}`)}>Scenario</Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <Stat label="Turns" value={(tr.turns ?? []).length} mono />
          <Stat label="Policy checks" value={(tr.policyResults ?? []).length} mono />
          <Stat label="Decision points" value={(tr.decisionPoints ?? []).length} mono />
          <Stat label="Overrides" value={(tr.decisionPoints ?? []).filter((d) => d.overridden).length} mono />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Conversation timeline" className="lg:col-span-2">
          <ol className="space-y-3">
            {(tr.turns ?? []).map((t) => {
              const checks = (tr.policyResults ?? []).filter((p) => p.turnIndex === t.index)
              const isUser = t.role === 'user'
              return (
                <li key={t.index} className={cn('border p-2', isUser ? 'border-[hsl(var(--border))] bg-[hsl(var(--bg-sunken))]' : 'border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{t.role}</span>
                    {t.latencyMs && <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">{t.latencyMs}ms</span>}
                  </div>
                  <p className="text-sm text-[hsl(var(--text-1))]">{t.content}</p>
                  {checks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {checks.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          <VerdictBadge v={c.verdict} />
                          <span className="text-[11px] text-[hsl(var(--text-3))]">{c.policyKey}{c.intervention && c.intervention !== 'none' ? ` · ${c.intervention}` : ''}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </Section>

        <Section title="Decision points & interventions">
          <ol className="space-y-2">
            {(tr.decisionPoints ?? []).map((d, i) => (
              <li key={i} className="border-b border-[hsl(var(--border))] pb-2">
                <div className="text-sm text-[hsl(var(--text-1))]">{d.decision}</div>
                <div className="text-[11px] text-[hsl(var(--text-4))]">turn {d.turnIndex}{d.actor ? ` · ${d.actor}` : ''}{d.overridden ? ' · overridden' : ''}</div>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  )
}
