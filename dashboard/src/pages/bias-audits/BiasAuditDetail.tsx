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
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, StateBadge, RiskBadge, VerdictBadge, MetricBar, Heatmap,
  RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { biasAuditHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'

const DRIFT_TONE = { stable: 'pass', WATCH: 'warn', WARNING: 'warn', CRITICAL: 'fail', undefined: 'na' } as const

export default function BiasAuditDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: audit } = biasAuditHooks.useGet(id)
  const { can } = useRBAC()
  const [tab, setTab] = useState('metrics')

  if (!audit) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading bias audit…</div>

  const pre = audit.snapshots.filter((s) => s.phase === 'pre_deploy')
  const post = audit.snapshots.filter((s) => s.phase === 'post_deploy')

  return (
    <div>
      <PageHeader
        title={audit.auditId}
        subtitle={`${audit.modelName} · ${audit.datasetId} · ${audit.framework}`}
        badge={<StateBadge s={audit.state} />}
        onBack={() => nav('/bias-audits')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Open dataset catalog entry" onClick={() => nav(`/evals/dataset/${audit.datasetId}`)}>Dataset</Button>
            <Button variant="ghost" size="sm" title="Validation runs for this model" onClick={() => nav('/model-validation')}>Validation</Button>
            <Button variant="ghost" size="sm" title="Metric profile for this model" onClick={() => nav(`/evals/metric-studio/MP-${audit.modelId.replace(/\D/g, '') || '003'}`)}>Metrics</Button>
            {can('update') && (
              <Button variant="secondary" size="sm" onClick={() => setTab('remediation')}>Manage remediation</Button>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Auditor" value={audit.auditor} />
          <Stat label="Fairness score" value={audit.fairnessScore.toFixed(2)} mono />
          <Stat label="Result" value={<VerdictBadge v={audit.result} />} />
          <Stat label="Risk tier" value={<RiskBadge r={audit.riskTier} />} />
          <Stat label="Post-deploy drift" value={<VerdictBadge v={DRIFT_TONE[audit.drift ?? 'undefined']} />} />
          <Stat label="Protected attrs" value={audit.protectedAttributes.length} mono />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['metrics', 'Fairness metrics'], ['intersectional', 'Intersectional'], ['prepost', 'Pre/Post'], ['counterfactual', 'Counterfactual'], ['remediation', 'Remediation'], ['regmap', 'Regulatory'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="metrics" className="mt-4 space-y-4">
          {(post[0] ?? pre[0]) && (
            <Section title={`Group fairness metrics — ${(post[0] ?? pre[0]).groups.join(', ')} (${post.length ? 'post-deploy' : 'pre-deploy'})`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries((post[0] ?? pre[0]).metrics).map(([k, v]) => (
                  <MetricBar key={k} label={k} value={v as number} target={k.includes('Ratio') ? 0.8 : 0.85} max={k === 'fprRatio' ? 1.5 : 1} />
                ))}
              </div>
            </Section>
          )}
          <Section title="Protected attribute catalog">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Attribute</th><th className="py-2 pr-3 font-medium">Lawful basis</th><th className="py-2 font-medium">Proxy risks</th></tr></thead>
              <tbody>
                {audit.protectedAttributes.map((p) => (
                  <tr key={p.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{p.attribute}</td>
                    <td className="py-2 pr-3 text-[hsl(var(--text-3))]">{p.lawfulBasis}</td>
                    <td className="py-2 font-mono text-[hsl(var(--text-3))]">{p.proxyRisks.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="intersectional" className="mt-4">
          <Section title="Intersectional heatmap" right={<span className="text-[11px] text-[hsl(var(--text-4))]">click a cell to view flagged cases</span>}>
            <Heatmap cells={audit.intersections} onCell={(k) => {
              const cell = audit.intersections.find((c) => c.key === k)
              toast(cell?.caseRefs.length ? `${k}: ${cell.caseRefs.join(', ')}` : `${k}: within threshold`)
            }} />
          </Section>
        </TabsContent>

        <TabsContent value="prepost" className="mt-4">
          <Section title="Pre- vs post-deployment" right={<VerdictBadge v={DRIFT_TONE[audit.drift ?? 'undefined']} />}>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Metric</th><th className="py-2 pr-3 font-medium">Pre-deploy</th><th className="py-2 pr-3 font-medium">Post-deploy</th><th className="py-2 font-medium">Δ</th></tr></thead>
              <tbody>
                {pre[0] && Object.keys(pre[0].metrics).map((k) => {
                  const a = (pre[0].metrics as Record<string, number>)[k]
                  const b = post[0] ? (post[0].metrics as Record<string, number>)[k] : undefined
                  return (
                    <tr key={k} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{k}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{a.toFixed(2)}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{b?.toFixed(2) ?? '—'}</td>
                      <td className="py-2 font-mono text-[hsl(var(--text-3))]">{b !== undefined ? (b - a >= 0 ? '+' : '') + (b - a).toFixed(2) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="counterfactual" className="mt-4">
          <Section title="Counterfactual fairness" right={<span className="text-[11px] text-[hsl(var(--text-4))]">flip rate {(audit.counterfactual.flipRate * 100).toFixed(1)}%</span>}>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Case</th><th className="py-2 pr-3 font-medium">Perturbed attribute</th><th className="py-2 font-medium">Outcome flipped</th></tr></thead>
              <tbody>
                {audit.counterfactual.cases.map((c) => (
                  <tr key={c.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-1))]">{c.id}</td>
                    <td className="py-2 pr-3 text-[hsl(var(--text-2))]">{c.attribute}</td>
                    <td className="py-2"><VerdictBadge v={c.flipped ? 'fail' : 'pass'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="remediation" className="mt-4">
          <Section title="Remediation plan" right={audit.remediationPlan && <StateBadge s={audit.remediationPlan.state} />}>
            {audit.remediationPlan ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Task</th><th className="py-2 pr-3 font-medium">Owner</th><th className="py-2 pr-3 font-medium">Due</th><th className="py-2 font-medium">Status</th></tr></thead>
                <tbody>
                  {audit.remediationPlan.tasks.map((t) => (
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
          <Section title="Regulatory mapping"><RegMappingTable mappings={audit.regMappings} /></Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail"><AuditTimeline entries={audit.auditTrail} /></Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
