// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ExplainabilityProfileDetail — per model/version XAI profile.
// Global feature importance, local methods (LIME/Anchors/Counterfactual) with
// fidelity/coverage, adequacy dashboard vs policy, jurisdiction toggles, and
// generated consumer/regulator explanation cards.

import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, StateBadge, VerdictBadge, MetricBar, RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { EmptyState, ErrorState } from '@/components/evals/states'
import { ADEQUACY_DIMS, type Jurisdiction } from '@/types/evals'
import { explainProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { cn } from '@/lib/utils'

export default function ExplainabilityProfileDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: p, isLoading, isError, error, refetch } = explainProfileHooks.useGet(id)
  const { models, loading: modelsLoading } = useModelOptions()
  const [tab, setTab] = useState('global')
  const [jur, setJur] = useState<Jurisdiction | 'all'>('all')

  const reports = useMemo(
    () => (p?.reports ?? []).filter(() => jur === 'all' || p?.jurisdictions.includes(jur as Jurisdiction)),
    [p, jur],
  )

  if (isLoading) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading explainability profile…</div>
  if (isError) {
    return (
      <div className="p-6">
        <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!p) {
    return (
      <div className="p-6">
        <EmptyState title="Explainability profile not found" message="It may have been deleted, or the link is stale." />
      </div>
    )
  }

  const resolvedModelName = models.find((m) => m.id === p.modelId)?.name
  const displayModelName = resolvedModelName ?? (modelsLoading ? p.modelName : 'Unavailable')
  const topFeatures = p.global?.topFeatures ?? []
  const maxImp = Math.max(...topFeatures.map((f) => f.importance), 0.01)
  const firstReport = p.reports?.[0]

  return (
    <div>
      <PageHeader
        title={`${displayModelName} — Explainability`}
        subtitle={`${p.modelVersion || '—'} · ${p.framework} · owner ${p.owner}`}
        badge={<StateBadge s={p.state} />}
        onBack={() => nav('/explainability')}
        actions={
          <div className="flex items-center gap-1">
            <button onClick={() => nav(`/model-validation?model=${p.modelId}`)} title="Validation runs for this model"
              className="border border-[hsl(var(--border))] px-2 py-1 text-[11px] text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]">Validation</button>
            <button onClick={() => nav(`/bias-audits?model=${p.modelId}`)} title="Bias audits for this model"
              className="mr-2 border border-[hsl(var(--border))] px-2 py-1 text-[11px] text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]">Bias audits</button>
            {(['all', ...p.jurisdictions] as (Jurisdiction | 'all')[]).map((j) => (
              <button key={j} onClick={() => setJur(j)}
                className={cn('border px-2 py-1 text-[11px]', jur === j
                  ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]')}>
                {j === 'all' ? 'All jurisdictions' : j}
              </button>
            ))}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
          <Stat
            label="Model"
            value={resolvedModelName ? (
              <button
                onClick={() => nav(`/models/inventory/${p.modelId}`)}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                {resolvedModelName} <ArrowSquareOut size={12} />
              </button>
            ) : (modelsLoading ? '…' : 'Unavailable')}
          />
          <Stat label="Global method" value={p.global?.method ?? '—'} />
          <Stat label="Global fidelity" value={typeof p.global?.fidelity === 'number' ? p.global.fidelity.toFixed(2) : '—'} mono />
          <Stat label="Local methods" value={(p.localMethods ?? []).length} mono />
          <Stat label="Computed" value={p.global?.computedAt?.slice(0, 10) ?? '—'} mono />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['global', 'Global'], ['local', 'Local methods'], ['adequacy', 'Adequacy'], ['explanations', 'Explanations'], ['regmap', 'Regulatory'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <Section title={`Global feature importance (${p.global?.method ?? '—'})`}>
            {topFeatures.length > 0 ? (
              <div className="space-y-2">
                {topFeatures.map((f) => (
                  <div key={f.feature} className="flex items-center gap-3">
                    <span className="w-48 shrink-0 font-mono text-[13px] text-[hsl(var(--text-2))]">{f.feature}</span>
                    <div className="h-3 flex-1 bg-[hsl(var(--bg-sunken))]">
                      <div className="h-3 bg-[hsl(var(--brand))]" style={{ width: `${(f.importance / maxImp) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-[13px] text-[hsl(var(--text-1))]">{f.importance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No global feature importances computed yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="local" className="mt-4">
          <Section title="Local explanation methods">
            {(p.localMethods ?? []).length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Method</th><th className="py-2 pr-3 font-medium">Fidelity</th><th className="py-2 pr-3 font-medium">Coverage</th><th className="py-2 font-medium">Stability</th></tr></thead>
                <tbody>
                  {(p.localMethods ?? []).map((m) => (
                    <tr key={m.method} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{m.method}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{m.fidelity.toFixed(2)}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{m.coverage.toFixed(2)}</td>
                      <td className="py-2 font-mono text-[hsl(var(--text-2))]">{m.stability.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No local explanation methods recorded yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="adequacy" className="mt-4">
          <Section title={`Explanation adequacy vs policy — ${p.adequacyPolicy?.name ?? '—'}`}>
            {firstReport ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {ADEQUACY_DIMS.map((d) => (
                  <MetricBar key={d} label={d} value={firstReport.adequacy?.[d] ?? 0} target={p.adequacyPolicy?.targets?.[d] ?? 0} />
                ))}
              </div>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No adequacy report yet — adequacy is scored when an explanation report is generated.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="explanations" className="mt-4 space-y-4">
          {reports.map((r) => (
            <Section key={r.id} title={`${r.audience === 'consumer' ? 'Consumer' : 'Regulator'} · ${r.scope} · ${r.method}`}
              right={<span className="flex items-center gap-2"><VerdictBadge v={r.verdict} />{r.subjectRef && <span className="font-mono text-[11px] text-[hsl(var(--text-4))]">{r.subjectRef}</span>}</span>}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--text-2))]">{r.bodyMarkdown}</p>
            </Section>
          ))}
          {reports.length === 0 && <p className="text-sm text-[hsl(var(--text-3))]">No explanations for this jurisdiction.</p>}
        </TabsContent>

        <TabsContent value="regmap" className="mt-4">
          <Section title="Regulatory mapping"><RegMappingTable mappings={p.regMappings ?? []} /></Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail"><AuditTimeline entries={p.auditTrail ?? []} /></Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
