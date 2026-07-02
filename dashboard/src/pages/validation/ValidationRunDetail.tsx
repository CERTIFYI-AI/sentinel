// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ValidationRunDetail — SR 11-7 / OCC 2011-12 model validation record.
// Scope & assumptions, test-coverage matrix, backtesting/challenger,
// adversarial robustness, residual risk + sign-offs, regulatory mapping,
// audit trail. Workflow advancement is gated by RBAC + segregation of duties.

import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle, Gavel, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, StateBadge, RiskBadge, VerdictBadge,
  CoverageMatrix, RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { RISK_DIMENSIONS, type WorkflowState } from '@/types/evals'
import { validationRunHooks } from '@/hooks/queries/useEvalsCrud'
import { useRBAC } from '@/hooks/useRBAC'
import { canApprove, canTransition, stateClass } from '@/lib/evalsWorkflow'

const TABS = [
  ['scope', 'Scope & assumptions'], ['coverage', 'Coverage matrix'],
  ['backtesting', 'Backtesting'], ['adversarial', 'Adversarial'],
  ['residual', 'Residual risk & sign-off'], ['regmap', 'Regulatory mapping'],
  ['activity', 'Activity'],
] as const

export default function ValidationRunDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: run } = validationRunHooks.useGet(id)
  const upsert = validationRunHooks.useUpsert()
  const { role, can, user } = useRBAC()
  const [tab, setTab] = useState<string>('scope')

  const mayApprove = useMemo(
    () => canApprove('validation_run', role, user?.id ?? 'me', run?.updatedBy),
    [role, user, run],
  )

  if (!run) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading validation run…</div>

  function advance(to: WorkflowState, recommendation = run!.recommendation) {
    if (!canTransition(run!.state, to)) return toast.error(`Cannot move ${run!.state} → ${to}`)
    if (['Approved', 'CondApproved', 'Rejected'].includes(to) && !mayApprove) {
      return toast.error('Segregation of duties: an independent approver must sign off.')
    }
    upsert.mutate(
      { ...run!, state: to, recommendation, updatedBy: user?.id ?? 'me',
        auditTrail: [...run!.auditTrail, { id: `A${Date.now()}`, actor: user?.id ?? 'me', action: `workflow → ${to}`, at: new Date().toISOString() }] },
      { onSuccess: () => toast.success(`Run moved to ${to}`) },
    )
  }

  return (
    <div>
      <PageHeader
        title={run.runId}
        subtitle={`${run.modelName} · ${run.modelVersion} · ${run.framework}`}
        badge={<StateBadge s={run.state} />}
        onBack={() => nav('/model-validation')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Metric Studio for this model" onClick={() => nav(`/evals/metric-studio/MP-${run.modelId.replace(/\D/g, '') || '003'}`)}>Metrics</Button>
            <Button variant="ghost" size="sm" title="Bias audit for this model" onClick={() => nav('/bias-audits/record/BIA-2026-014')}>Bias</Button>
            <Button variant="ghost" size="sm" title="Scenario campaigns" onClick={() => nav('/evals/scenario/SC-001')}>Scenarios</Button>
            {run.state === 'Draft' && can('update') && (
              <Button variant="secondary" size="sm" onClick={() => advance('InReview')}>Submit for review</Button>
            )}
            {run.state === 'InReview' && (
              <>
                <Button variant="brand-outline" size="sm" icon={<CheckCircle />} disabled={!mayApprove} onClick={() => advance('Approved', 'Approve')}>Approve</Button>
                <Button variant="secondary" size="sm" icon={<Gavel />} disabled={!mayApprove} onClick={() => advance('CondApproved', 'Conditional Approval')}>Conditional</Button>
                <Button variant="danger" size="sm" icon={<Warning />} disabled={!mayApprove} onClick={() => advance('Rejected', 'Reject')}>Reject</Button>
              </>
            )}
            {run.state === 'CondApproved' && (
              <Button variant="brand-outline" size="sm" icon={<CheckCircle />} disabled={!mayApprove} onClick={() => advance('Approved', 'Approve')}>Clear conditions</Button>
            )}
          </div>
        }
      />

      {/* Summary strip */}
      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Validator" value={run.validatorId} />
          <Stat label="Overall score" value={`${run.overallScore}/100`} mono />
          <Stat label="Recommendation" value={run.recommendation} />
          <Stat label="Risk rating" value={<RiskBadge r={run.riskRating} />} />
          <Stat label="Model" value={run.modelId} mono />
          <Stat label="Version" value={run.version ?? 1} mono />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="scope" className="mt-4 space-y-4">
          <Section title="Scope & intended use (SR 11-7 §III)">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat label="Intended use" value={run.scope.intendedUse} />
              <Stat label="Population" value={run.scope.population} />
              <Stat label="Data period" value={run.scope.dataPeriod} />
            </dl>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Key limitations">
              <ul className="list-disc space-y-1 pl-5 text-sm text-[hsl(var(--text-2))]">
                {run.scope.keyLimitations.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Section>
            <Section title="Assumptions">
              <ul className="list-disc space-y-1 pl-5 text-sm text-[hsl(var(--text-2))]">
                {run.scope.assumptions.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <Section title="Test coverage matrix" right={<span className="text-[11px] text-[hsl(var(--text-4))]">suites × risk dimensions</span>}>
            <CoverageMatrix dims={RISK_DIMENSIONS} rows={run.suites.map((s) => ({ name: `${s.name} (${s.score})`, coverage: s.coverage }))} />
          </Section>
        </TabsContent>

        <TabsContent value="backtesting" className="mt-4 space-y-4">
          <Section title="Challenger comparison">
            {run.challenger ? (
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Challenger" value={run.challenger.modelId} mono />
                <Stat label="Δ AUC" value={`+${run.challenger.deltaAuc.toFixed(3)}`} mono />
                <Stat label="Verdict" value={<VerdictBadge v={run.challenger.verdict} />} />
              </div>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No challenger recorded.</p>}
          </Section>
          <Section title="Backtesting suites">
            <div className="space-y-2">
              {run.suites.filter((s) => s.kind === 'backtesting' || s.kind === 'performance').map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2 text-sm">
                  <span className="text-[hsl(var(--text-1))]">{s.name}</span>
                  <span className="flex items-center gap-2"><span className="font-mono text-[hsl(var(--text-2))]">{s.score}</span><VerdictBadge v={s.verdict} /></span>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="adversarial" className="mt-4">
          <Section title="Adversarial robustness">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Attack</th><th className="py-2 pr-3 font-medium">Success rate</th><th className="py-2 pr-3 font-medium">Baseline</th><th className="py-2 font-medium">Verdict</th></tr></thead>
              <tbody>
                {run.adversarial.map((a, i) => (
                  <tr key={i} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{a.attack}</td>
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{(a.successRate * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-4))]">≤ {(a.baseline * 100).toFixed(1)}%</td>
                    <td className="py-2"><VerdictBadge v={a.verdict} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="residual" className="mt-4 space-y-4">
          <Section title="Residual risk">
            <div className="flex items-start gap-4">
              <RiskBadge r={run.residualRisk.rating} />
              <p className="text-sm text-[hsl(var(--text-2))]">{run.residualRisk.rationale}</p>
            </div>
          </Section>
          <Section title="Sign-offs" right={<span className="text-[11px] text-[hsl(var(--text-4))]">business · risk · compliance</span>}>
            <div className="grid gap-3 sm:grid-cols-3">
              {run.signoffs.map((s) => (
                <div key={s.role} className="border border-[hsl(var(--border))] p-3">
                  <div className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{s.role}</div>
                  <div className="mt-1"><VerdictBadge v={s.status === 'signed' ? 'pass' : s.status === 'rejected' ? 'fail' : 'na'} /></div>
                  {s.by && <div className="mt-1 text-[13px] text-[hsl(var(--text-3))]">{s.by} · {s.at?.slice(0, 10)}</div>}
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="regmap" className="mt-4">
          <Section title="Regulatory mapping">
            <RegMappingTable mappings={run.regMappings} />
          </Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail">
            <AuditTimeline entries={run.auditTrail} />
          </Section>
        </TabsContent>
      </Tabs>

      {!can('update') && (
        <p className="mt-3 text-[11px] text-[hsl(var(--text-4))]">Read-only — your role ({role}) cannot modify validation records. {stateClass(run.state).label}.</p>
      )}
    </div>
  )
}
