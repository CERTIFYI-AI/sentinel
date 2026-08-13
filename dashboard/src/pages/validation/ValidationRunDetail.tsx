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
import { ArrowSquareOut, CheckCircle, Gavel, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, StateBadge, RiskBadge, VerdictBadge,
  CoverageMatrix, RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { EmptyState, ErrorState } from '@/components/evals/states'
import { RISK_DIMENSIONS, type WorkflowState } from '@/types/evals'
import { validationRunHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
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
  const { data: run, isLoading, isError, error, refetch } = validationRunHooks.useGet(id)
  const upsert = validationRunHooks.useUpsert()
  const { models, loading: modelsLoading } = useModelOptions()
  const { role, can, user } = useRBAC()
  const [tab, setTab] = useState<string>('scope')

  const mayApprove = useMemo(
    () => canApprove('validation_run', role, user?.id ?? 'me', run?.updatedBy),
    [role, user, run],
  )

  if (isLoading) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading validation run…</div>
  if (isError) {
    return (
      <div className="p-6">
        <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!run) {
    return (
      <div className="p-6">
        <EmptyState title="Validation run not found" message="It may have been deleted, or the link is stale." />
      </div>
    )
  }

  const resolvedModelName = models.find((m) => m.id === run.modelId)?.name

  function advance(to: WorkflowState, recommendation = run!.recommendation) {
    if (!canTransition(run!.state, to)) return toast.error(`Cannot move ${run!.state} → ${to}`)
    if (['Approved', 'CondApproved', 'Rejected'].includes(to) && !mayApprove) {
      return toast.error('Segregation of duties: an independent approver must sign off.')
    }
    upsert.mutate(
      { ...run!, state: to, recommendation, updatedBy: user?.id ?? 'me',
        auditTrail: [...(run!.auditTrail ?? []), { id: `A${Date.now()}`, actor: user?.id ?? 'me', action: `workflow → ${to}`, at: new Date().toISOString() }] },
      {
        onSuccess: () => toast.success(`Run moved to ${to}`),
        onError: (err: any) => toast.error(err?.message ?? 'Failed to update workflow state'),
      },
    )
  }

  return (
    <div>
      <PageHeader
        title={run.runId}
        subtitle={`${resolvedModelName ?? (modelsLoading ? run.modelName : 'Unavailable')} · ${run.modelVersion || '—'} · ${run.framework || '—'}`}
        badge={<StateBadge s={run.state} />}
        onBack={() => nav('/model-validation')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Metric Studio for this model" onClick={() => nav(`/evals/metric-studio?model=${run.modelId}`)}>Metrics</Button>
            <Button variant="ghost" size="sm" title="Bias audits for this model" onClick={() => nav(`/bias-audits?model=${run.modelId}`)}>Bias</Button>
            <Button variant="ghost" size="sm" title="Scenario templates for this model" onClick={() => nav(`/evals/multi-turn?model=${run.modelId}`)}>Scenarios</Button>
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
          <Stat label="Validator" value={run.validatorId || '—'} />
          <Stat label="Overall score" value={run.overallScore != null ? `${run.overallScore}/100` : '—'} mono />
          <Stat label="Recommendation" value={run.recommendation ?? '—'} />
          <Stat label="Risk rating" value={<RiskBadge r={run.riskRating} />} />
          <Stat
            label="Model"
            value={resolvedModelName ? (
              <button
                onClick={() => nav(`/models/inventory/${run.modelId}`)}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 text-xs font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                {resolvedModelName} <ArrowSquareOut size={12} />
              </button>
            ) : (modelsLoading ? '…' : 'Unavailable')}
          />
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
              <Stat label="Intended use" value={run.scope?.intendedUse || '—'} />
              <Stat label="Population" value={run.scope?.population || '—'} />
              <Stat label="Data period" value={run.scope?.dataPeriod || '—'} />
            </dl>
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Key limitations">
              {(run.scope?.keyLimitations ?? []).length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-[hsl(var(--text-2))]">
                  {(run.scope?.keyLimitations ?? []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--text-3))]">None recorded.</p>}
            </Section>
            <Section title="Assumptions">
              {(run.scope?.assumptions ?? []).length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-[hsl(var(--text-2))]">
                  {(run.scope?.assumptions ?? []).map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              ) : <p className="text-sm text-[hsl(var(--text-3))]">None recorded.</p>}
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <Section title="Test coverage matrix" right={<span className="text-[11px] text-[hsl(var(--text-4))]">suites × risk dimensions</span>}>
            {(run.suites ?? []).length > 0 ? (
              <CoverageMatrix dims={RISK_DIMENSIONS} rows={(run.suites ?? []).map((s) => ({ name: `${s.name} (${s.score})`, coverage: s.coverage }))} />
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No test suites recorded yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="backtesting" className="mt-4 space-y-4">
          <Section title="Challenger comparison">
            {run.challenger ? (
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Challenger" value={run.challenger.modelId ?? '—'} mono />
                <Stat label="Δ AUC" value={typeof run.challenger.deltaAuc === 'number' ? `+${run.challenger.deltaAuc.toFixed(3)}` : '—'} mono />
                <Stat label="Verdict" value={<VerdictBadge v={run.challenger.verdict} />} />
              </div>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No challenger recorded.</p>}
          </Section>
          <Section title="Backtesting suites">
            {(run.suites ?? []).some((s) => s.kind === 'backtesting' || s.kind === 'performance') ? (
              <div className="space-y-2">
                {(run.suites ?? []).filter((s) => s.kind === 'backtesting' || s.kind === 'performance').map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2 text-sm">
                    <span className="text-[hsl(var(--text-1))]">{s.name}</span>
                    <span className="flex items-center gap-2"><span className="font-mono text-[hsl(var(--text-2))]">{s.score}</span><VerdictBadge v={s.verdict} /></span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No backtesting suites recorded yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="adversarial" className="mt-4">
          <Section title="Adversarial robustness">
            {(run.adversarial ?? []).length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Attack</th><th className="py-2 pr-3 font-medium">Success rate</th><th className="py-2 pr-3 font-medium">Baseline</th><th className="py-2 font-medium">Verdict</th></tr></thead>
                <tbody>
                  {(run.adversarial ?? []).map((a, i) => (
                    <tr key={i} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{a.attack}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{typeof a.successRate === 'number' ? `${(a.successRate * 100).toFixed(1)}%` : '—'}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-4))]">{typeof a.baseline === 'number' ? `≤ ${(a.baseline * 100).toFixed(1)}%` : '—'}</td>
                      <td className="py-2"><VerdictBadge v={a.verdict} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No adversarial tests recorded yet.</p>}
          </Section>
        </TabsContent>

        <TabsContent value="residual" className="mt-4 space-y-4">
          <Section title="Residual risk">
            {run.residualRisk ? (
              <div className="flex items-start gap-4">
                <RiskBadge r={run.residualRisk.rating} />
                <p className="text-sm text-[hsl(var(--text-2))]">{run.residualRisk.rationale || '—'}</p>
              </div>
            ) : <p className="text-sm text-[hsl(var(--text-3))]">No residual risk assessment recorded.</p>}
          </Section>
          <Section title="Sign-offs" right={<span className="text-[11px] text-[hsl(var(--text-4))]">business · risk · compliance</span>}>
            <div className="grid gap-3 sm:grid-cols-3">
              {(run.signoffs ?? []).map((s) => (
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
            <RegMappingTable mappings={run.regMappings ?? []} />
          </Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail">
            <AuditTimeline entries={run.auditTrail ?? []} />
          </Section>
        </TabsContent>
      </Tabs>

      {!can('update') && (
        <p className="mt-3 text-[11px] text-[hsl(var(--text-4))]">Read-only — your role ({role}) cannot modify validation records. {stateClass(run.state).label}.</p>
      )}
    </div>
  )
}
