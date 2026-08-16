// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Benchmarks — cross-model comparison view over the Validation Lab's real
// `validation_runs` (suite scores and per-test metrics measured during
// validation). Nothing here is invented: every number renders from a
// persisted run, and an org with no runs sees an honest empty state.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowSquareOut, ChartBar } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { PageHeader } from '../components/ui/PageHeader'
import { VerdictBadge, RiskBadge } from '../components/evals/primitives'
import { EmptyState, ErrorState, TableSkeleton } from '../components/evals/states'
import { validationRunHooks } from '../hooks/queries/useEvalsCrud'
import type { ValidationRun, ValSuiteKind, Verdict } from '../types/evals'

const SUITE_KINDS: ValSuiteKind[] = ['performance', 'robustness', 'adversarial', 'backtesting']

const verdictText: Record<Verdict, string> = {
  pass: 'text-[hsl(var(--s-ok-tx))]', warn: 'text-[hsl(var(--s-wn-tx))]',
  fail: 'text-[hsl(var(--s-er-tx))]', na: 'text-[hsl(var(--text-4))]',
}
const verdictBg: Record<Verdict, string> = {
  pass: 'bg-[hsl(var(--s-ok-bg))]', warn: 'bg-[hsl(var(--s-wn-bg))]',
  fail: 'bg-[hsl(var(--s-er-bg))]', na: 'bg-[hsl(var(--bg-muted))]',
}

const recDot: Record<ValidationRun['recommendation'], string> = {
  Approve: 'bg-[hsl(var(--s-ok-tx))]',
  'Conditional Approval': 'bg-[hsl(var(--s-wn-tx))]',
  Reject: 'bg-[hsl(var(--s-er-tx))]',
  Pending: 'bg-[hsl(var(--text-4))]',
}

export default function Benchmark() {
  const nav = useNavigate()
  const { data, isLoading, isError, error, refetch } = validationRunHooks.useList()
  const runs = useMemo(() => data ?? [], [data])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const run = runs.find((r) => r.id === selectedId) ?? runs[0]

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Benchmarks" subtitle="Suite scores and per-test metrics from the Validation Lab" icon={ChartBar} />
        <Card><CardContent className="p-4"><TableSkeleton cols={6} /></CardContent></Card>
      </div>
    )
  }
  if (isError) {
    return (
      <div className="space-y-5">
        <PageHeader title="Benchmarks" subtitle="Suite scores and per-test metrics from the Validation Lab" icon={ChartBar} />
        <ErrorState message={(error as Error | null)?.message} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!run) {
    return (
      <div className="space-y-5">
        <PageHeader title="Benchmarks" subtitle="Suite scores and per-test metrics from the Validation Lab" icon={ChartBar} />
        <EmptyState
          title="No validation runs to benchmark"
          message="Benchmarks are read from completed validation runs — open the Validation Lab to start one."
          actionLabel="Open Validation Lab" onAction={() => nav('/model-validation')}
        />
      </div>
    )
  }

  const tests = (run.suites ?? []).flatMap((s) => (s.tests ?? []).map((t) => ({ ...t, suite: s.name, suiteKind: s.kind })))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Benchmarks"
        subtitle="Suite scores and per-test metrics from the Validation Lab"
        icon={ChartBar}
        actions={
          <Button size="sm" variant="secondary" onClick={() => nav('/model-validation')}>Open Validation Lab</Button>
        }
      />

      {/* Run selector */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {runs.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border transition-all ${
              r.id === run.id
                ? 'bg-[hsl(var(--brand-subtle))] border-[hsl(var(--brand))] text-[hsl(var(--brand))]'
                : 'bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:border-[hsl(var(--text-4))]'
            }`}
          >
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${recDot[r.recommendation] ?? recDot.Pending}`} />
            {r.modelName} <span className="font-mono text-xs">v{r.modelVersion}</span>
          </button>
        ))}
      </div>

      {/* Selected run */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">{run.runId || run.modelName} — measured metrics</CardTitle>
            <div className="flex items-center gap-3 text-xs text-[hsl(var(--text-3))]">
              <span>Framework: {run.framework || '—'}</span>
              <span>Overall: <span className="font-mono">{typeof run.overallScore === 'number' ? run.overallScore.toFixed(2) : '—'}</span></span>
              <RiskBadge r={run.riskRating} />
              <button
                onClick={() => nav(`/model-validation/${run.id}`)}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                Validation run <ArrowSquareOut size={12} />
              </button>
              <button
                onClick={() => nav(`/models/inventory/${run.modelId}`)}
                className="inline-flex items-center gap-1 border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-2 py-0.5 font-medium text-[hsl(var(--brand))] transition-colors hover:bg-[hsl(var(--brand))] hover:text-[hsl(var(--bg-surface))]"
              >
                Model <ArrowSquareOut size={12} />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="py-6 text-center text-sm text-[hsl(var(--text-4))]">This run has no per-test metrics recorded yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {tests.map((t) => (
                <div key={`${t.suite}:${t.name}`} className={`border border-[hsl(var(--border))] p-3 ${verdictBg[t.verdict] ?? verdictBg.na}`}>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--text-3))]">{t.name}</p>
                  <div className="mt-1 flex items-end justify-between">
                    <span className={`font-mono text-xl font-bold ${verdictText[t.verdict] ?? verdictText.na}`}>
                      {typeof t.value === 'number' ? t.value : '—'}
                    </span>
                    <VerdictBadge v={t.verdict} />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-[hsl(var(--text-4))]">
                    <span>{t.metric}</span>
                    <span>{typeof t.threshold === 'number' ? `threshold ${t.threshold}` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-run comparison by suite */}
      <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cross-model comparison — suite scores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))]">Suite</th>
                  {runs.map((r) => (
                    <th key={r.id} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-3))]">
                      {r.modelName} <span className="font-mono normal-case">v{r.modelVersion}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {SUITE_KINDS.map((kind) => (
                  <tr key={kind} className="hover:bg-[hsl(var(--bg-muted))]">
                    <td className="px-4 py-2.5 text-xs font-medium capitalize text-[hsl(var(--text-2))]">{kind}</td>
                    {runs.map((r) => {
                      const suite = (r.suites ?? []).find((s) => s.kind === kind)
                      return (
                        <td key={r.id} className={`px-4 py-2.5 font-mono text-xs font-bold ${suite ? verdictText[suite.verdict] ?? verdictText.na : 'text-[hsl(var(--text-4))]'}`}>
                          {suite ? suite.score.toFixed(2) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="hover:bg-[hsl(var(--bg-muted))]">
                  <td className="px-4 py-2.5 text-xs font-medium text-[hsl(var(--text-2))]">Overall</td>
                  {runs.map((r) => (
                    <td key={r.id} className="px-4 py-2.5 font-mono text-xs font-bold text-[hsl(var(--text-1))]">
                      {typeof r.overallScore === 'number' ? r.overallScore.toFixed(2) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-[hsl(var(--bg-muted))]">
                  <td className="px-4 py-2.5 text-xs font-medium text-[hsl(var(--text-2))]">Recommendation</td>
                  {runs.map((r) => (
                    <td key={r.id} className="px-4 py-2.5 text-xs">
                      <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${recDot[r.recommendation] ?? recDot.Pending}`} />
                      {r.recommendation}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
