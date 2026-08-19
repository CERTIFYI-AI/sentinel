// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ScenarioTemplateDetail — multi-turn conversation script with expected
// outcomes, guardrail checks, referenced policies, EU AI Act risk tags, and
// links to test campaigns.

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Section, StateBadge, AuditTimeline } from '@/components/evals/primitives'
import { scenarioTemplateHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'

export default function ScenarioTemplateDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: sc, isLoading, error } = scenarioTemplateHooks.useGet(id)
  const { models } = useModelOptions()
  const [tab, setTab] = useState('script')

  if (isLoading) return <PageSkeleton />
  if (error) return <ErrorState title="Failed to load scenario" error={error} onRetry={() => window.location.reload()} />
  if (!sc) return <ErrorState title="Scenario not found" description={`No scenario template found with ID "${id}".`} />

  const model = sc.modelId ? models.find((m) => m.id === sc.modelId) : undefined

  return (
    <div>
      <PageHeader
        title={sc.name}
        subtitle={sc.description}
        badge={<StateBadge s={sc.state} />}
        onBack={() => nav('/evals/multi-turn')}
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          {sc.modelId && (
            model ? (
              <button title={`Open ${model.name}`} onClick={() => nav(`/models/inventory/${sc.modelId}`)}
                className="inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-2 py-[2px] text-[11px] font-medium text-[hsl(var(--brand))] hover:border-[hsl(var(--brand))] hover:underline">
                {model.name}
              </button>
            ) : (
              <span title="Linked model is not in the registry"
                className="inline-flex items-center gap-1 border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] px-2 py-[2px] text-[11px] font-medium text-[hsl(var(--s-er-tx))]">
                <Warning size={10} weight="fill" />Unavailable
              </span>
            )
          )}
          {(sc.riskTags ?? []).map((t) => (
            <span key={t} className="inline-flex items-center border border-[hsl(var(--r-hi-br))] bg-[hsl(var(--r-hi-bg))] px-2 py-[2px] text-[11px] font-medium text-[hsl(var(--r-hi-tx))]">{t}</span>
          ))}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['script', 'Script'], ['guardrails', 'Guardrails & policies'], ['campaigns', 'Campaigns'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="script" className="mt-4">
          <Section title="Multi-turn conversation script">
            <ol className="space-y-3">
              {(sc.turns ?? []).map((t, i) => (
                <li key={i} className="border-l-2 border-[hsl(var(--border))] pl-3">
                  <div className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{t.role}</div>
                  {t.content && <p className="text-sm text-[hsl(var(--text-1))]">{t.content}</p>}
                  {t.expected && <p className="mt-1 text-[13px] text-[hsl(var(--text-3))]"><span className="font-medium text-[hsl(var(--s-ok-tx))]">Expected:</span> {t.expected}</p>}
                </li>
              ))}
            </ol>
          </Section>
        </TabsContent>

        <TabsContent value="guardrails" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Section title="Guardrail checks (per turn)">
            <ul className="space-y-1">
              {(sc.guardrailChecks ?? []).map((g) => <li key={g} className="font-mono text-[13px] text-[hsl(var(--text-2))]">{g}</li>)}
            </ul>
          </Section>
          <Section title="Policies referenced">
            <ul className="space-y-1">
              {(sc.policiesReferenced ?? []).map((p) => <li key={p} className="text-[13px] text-[hsl(var(--text-2))]">{p}</li>)}
            </ul>
          </Section>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Section title="Linked test campaigns">
            {(sc.campaignIds ?? []).length ? (
              <ul className="space-y-1">
                {(sc.campaignIds ?? []).map((c) => (
                  <li key={c} className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[hsl(var(--text-1))]">{c}</span>
                    <button onClick={() => nav(`/evals/conversation?scenario=${sc.id}`)} className="text-[12px] text-[hsl(var(--brand))] hover:underline">view captured traces →</button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">Not linked to any campaign.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail"><AuditTimeline entries={sc.auditTrail ?? []} /></Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
