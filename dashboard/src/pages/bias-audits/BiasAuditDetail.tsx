// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// BiasAuditDetail — fairness assessment per model/dataset/framework.
// Intersectional metrics, pre/post-deploy drift, counterfactual fairness,
// remediation plan, and regulatory mapping (EU AI Act Art.9/10, ECOA,
// NIST MEASURE, ISO 42001, GDPR Art.22).

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowSquareOut } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, StateBadge, RiskBadge, VerdictBadge, MetricBar, Heatmap,
  RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { EmptyState, ErrorState } from '@/components/evals/states'
import { biasAuditHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useRBAC } from '@/hooks/useRBAC'

const DRIFT_TONE = { stable: 'pass', WATCH: 'warn', WARNING: 'warn', CRITICAL: 'fail', undefined: 'na' } as const

export default function BiasAuditDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: audit, isLoading, isError, error, refetch } = biasAuditHooks.useGet(id)
  const { models, loading: modelsLoading } = useModelOptions()
  const { can } = useRBAC()
  const [tab, setTab] = useState('metrics')

  if (isLoading) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading bias audit…</div>
  if (isError) {
    return (
      <div className="p-6">
        <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!audit) {
    return (
      <div className="p-6">
        <EmptyState title="Bias audit not found" message="It may have been deleted, or the link is stale." />
      </div>
    )
  }

  const resolvedModelName = models.find((m) => m.id === audit.modelId)?.name
  const snapshots = audit.snapshots ?? []
  const pre = snapshots.filter((s) => s.phase === 'pre_deploy')
  const post = snapshots.filter((s) => s.phase === 'post_deploy')
  const intersections = audit.intersections ?? []
  const protectedAttributes = audit.protectedAttributes ?? []
  const cfCases = audit.counterfactual?.cases ?? []

  return (
    <div>
      <PageHeader
        title={audit.auditId}
        subtitle={`${resolvedModelName ?? (modelsLoading ? audit.modelName : 'Unavailable')} · ${audit.datasetId || '—'} · ${audit.framework || '—'}`}
        badge={<StateBadge s={audit.state} />}
        onBack={() => nav('/bias-audits')}
        actions={
          <div className="flex items-center gap-2">
            {audit.datasetId && (
              <Button variant="ghost" size="sm" title="Open dataset catalog entry" onClick={() => nav(`/evals/dataset/${audit.datasetId}`)}>Dataset</Button>
            )}
            <Button variant="ghost" size="sm" title="Validation runs for this model" onClick={() => nav(`/model-validation?model=${audit.modelId}`)}>Validation</Button>
            <Button variant="ghost" size="sm" title="Metric Studio for this model" onClick={() => nav(`/evals/metric-studio?model=${audit.modelId}`)}>Metrics</Button>
            {can('update') && (
              <Button variant="secondary" size="sm" onClick={() => setTab('remediation')}>Manage remediation</Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Auditor" value={audit.auditor || '—'} />
          <Stat label="Fairness score" value={typeof audit.fairnessScore === 'number' ? audit.fairnessScore.toFixed(2) : '—'} mono />
          <Stat label="Result" value={<VerdictBadge v={audit.result} />} />
          <Stat label="Risk tier" value={<RiskBadge r={audit.riskTier} />} />
          <Stat
            label="Model"
            value={resolvedModelName ? (
              <button
                onClick={() => nav(`/models/inventory/${audit.modelId}`)}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                {resolvedModelName} <ArrowSquareOut size={12} />
              </button>
            ) : (modelsLoading ? '…' : 'Unavailable')}
          />
          <Stat label="Post-deploy drift" value={<VerdictBadge v={DRIFT_TONE[audit.drift ?? 'undefined']} />} />
          <Stat label="Protected attrs" value={protectedAttributes.length} mono />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['metrics', 'Fairness metrics'], ['intersectional', 'Intersectional'], ['prepost', 'Pre/Post'], ['counterfactual', 'Counterfactual'], ['remediation', 'Remediation'], ['regmap', 'Regulatory'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="metrics" className="mt-4 space-y-4">
          {(post[0] ?? pre[0]) ? (
            <Section title={`Group fairness metrics — ${((post[0] ?? pre[0]).groups ?? []).join(', ')} (${post.length ? 'post-deploy' : 'pre-deploy'})`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries((post[0] ?? pre[0]).metrics ?? {}).map(([k, v]) => (
                  <MetricBar key={k} label={k} value={v as number} target={k.includes('Ratio') ? 0.8 : 0.85} max={k === 'fprRatio' ? 1.5 : 1} />
                ))}
              </div>
            </Section>
          ) : (
            <Section title="Group fairness metrics">
              <p className="text-sm text-[hsl(var(--text-3))]">No metric snapshots captured yet.</p>
            </Section>
          )}
          <Section title="Protected attribute catalog">
            {protectedAttributes.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Attribute</th><th className="py-2 pr-3 font-medium">Lawful basis</th><th className="py-2 font-medium">Proxy risks</th></tr></thead>
                <tbody>
                  {protectedAttributes.map((p) => (
                    <tr key={p.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{p.attribute}</td>
                      <td className="py-2 pr-3 text-[hsl(var(--text-3))]">{p.lawfulBasis}</td>
                      <td className="py-2 font-mono text-[hsl(var(--text-3))]">{(p.proxyRisks ?? []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No protected attributes in scope.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="intersectional" className="mt-4">
          <Section title="Intersectional heatmap" right={<span className="text-[11px] text-[hsl(var(--text-4))]">click a cell to view flagged cases</span>}>
            {intersections.length > 0 ? (
              <Heatmap cells={intersections.map((c) => ({ ...c, verdict: c.verdict ?? 'na', caseRefs: c.caseRefs ?? [] }))} onCell={(k) => {
                const cell = intersections.find((c) => c.key === k)
                toast(cell?.caseRefs?.length ? `${k}: ${cell.caseRefs.join(', ')}` : `${k}: within threshold`)
              }} />
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No intersectional results recorded yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="prepost" className="mt-4">
          <Section title="Pre- vs post-deployment" right={<VerdictBadge v={DRIFT_TONE[audit.drift ?? 'undefined']} />}>
            {pre[0] ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Metric</th><th className="py-2 pr-3 font-medium">Pre-deploy</th><th className="py-2 pr-3 font-medium">Post-deploy</th><th className="py-2 font-medium">Δ</th></tr></thead>
                <tbody>
                  {Object.keys(pre[0].metrics ?? {}).map((k) => {
                    const a = ((pre[0].metrics ?? {}) as Record<string, number>)[k]
                    const b = post[0] ? ((post[0].metrics ?? {}) as Record<string, number>)[k] : undefined
                    const hasBoth = typeof a === 'number' && typeof b === 'number'
                    return (
                      <tr key={k} className="border-t border-[hsl(var(--border))]">
                        <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{k}</td>
                        <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{typeof a === 'number' ? a.toFixed(2) : '—'}</td>
                        <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{typeof b === 'number' ? b.toFixed(2) : '—'}</td>
                        <td className="py-2 font-mono text-[hsl(var(--text-3))]">{hasBoth ? (b! - a >= 0 ? '+' : '') + (b! - a).toFixed(2) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No pre-deployment snapshot captured yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="counterfactual" className="mt-4">
          <Section title="Counterfactual fairness" right={<span className="text-[11px] text-[hsl(var(--text-4))]">flip rate {typeof audit.counterfactual?.flipRate === 'number' ? `${(audit.counterfactual.flipRate * 100).toFixed(1)}%` : '—'}</span>}>
            {cfCases.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Case</th><th className="py-2 pr-3 font-medium">Perturbed attribute</th><th className="py-2 font-medium">Outcome flipped</th></tr></thead>
                <tbody>
                  {cfCases.map((c) => (
                    <tr key={c.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-1))]">{c.id}</td>
                      <td className="py-2 pr-3 text-[hsl(var(--text-2))]">{c.attribute}</td>
                      <td className="py-2"><VerdictBadge v={c.flipped ? 'fail' : 'pass'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No counterfactual cases recorded yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="remediation" className="mt-4">
          <Section title="Remediation plan" right={audit.remediationPlan && <StateBadge s={audit.remediationPlan.state} />}>
            {audit.remediationPlan ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Task</th><th className="py-2 pr-3 font-medium">Owner</th><th className="py-2 pr-3 font-medium">Due</th><th className="py-2 font-medium">Status</th></tr></thead>
                <tbody>
                  {(audit.remediationPlan.tasks ?? []).map((t) => (
                    <tr key={t.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{t.title}</td>
                      <td className="py-2 pr-3 text-[hsl(var(--text-2))]">{t.owner}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-3))]">{t.due}</td>
                      <td className="py-2"><VerdictBadge v={t.status === 'done' ? 'pass' : t.status === 'blocked' ? 'fail' : t.status === 'in_progress' ? 'warn' : 'na'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No remediation plan.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="regmap" className="mt-4">
          <Section title="Regulatory mapping"><RegMappingTable mappings={audit.regMappings ?? []} /></Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail"><AuditTimeline entries={audit.auditTrail ?? []} /></Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
