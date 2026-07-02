// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MetricProfileDetail — performance overview, thresholds vs current metrics,
// drift/stability time-series, and a multi-objective (accuracy vs fairness vs
// robustness vs explainability) radar with Pareto hints.

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceLine,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Stat, Section, StateBadge, VerdictBadge, AuditTimeline } from '@/components/evals/primitives'
import { metricProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useChartTheme } from '@/hooks/useChartTheme'
import type { MetricThresholdConfig } from '@/types/evals'

function thresholdVerdict(value: number, t: MetricThresholdConfig) {
  const worseThan = (a: number, b: number) => (t.direction === 'higher_better' ? a < b : a > b)
  if (worseThan(value, t.fail)) return 'fail' as const
  if (worseThan(value, t.warn)) return 'warn' as const
  return 'pass' as const
}

export default function MetricProfileDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: mp } = metricProfileHooks.useGet(id)
  const ct = useChartTheme()
  const [tab, setTab] = useState('overview')

  if (!mp) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading metric profile…</div>

  const radarData = Object.entries(mp.objectives).map(([k, v]) => ({ dim: k, value: v as number }))

  return (
    <div>
      <PageHeader
        title={`${mp.modelName} — Metrics`}
        subtitle={`${mp.modelVersion} · owner ${mp.owner}`}
        badge={<StateBadge s={mp.state} />}
        onBack={() => nav('/evals/metric-studio')}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(mp.current).map(([k, v]) => <Stat key={k} label={k} value={(v as number).toFixed(3)} mono />)}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['overview', 'Thresholds'], ['benchmarks', 'Benchmarks'], ['drift', 'Drift & stability'], ['objectives', 'Multi-objective'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Section title="Thresholds vs current">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Metric</th><th className="py-2 pr-3 font-medium">Current</th><th className="py-2 pr-3 font-medium">Warn</th><th className="py-2 pr-3 font-medium">Fail</th><th className="py-2 pr-3 font-medium">Breach action</th><th className="py-2 font-medium">Status</th></tr></thead>
              <tbody>
                {mp.thresholds.map((t) => {
                  const cur = mp.current[t.metric]
                  return (
                    <tr key={t.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{t.metric}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{cur?.toFixed(3) ?? '—'}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-4))]">{t.warn}</td>
                      <td className="py-2 pr-3 font-mono text-[hsl(var(--text-4))]">{t.fail}</td>
                      <td className="py-2 pr-3 text-[hsl(var(--text-3))]">{t.breachAction ?? '—'}</td>
                      <td className="py-2">{cur !== undefined ? <VerdictBadge v={thresholdVerdict(cur, t)} /> : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-4">
          <Section title="Champion / challenger / legacy baseline">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Role</th><th className="py-2 pr-3 font-medium">Model</th><th className="py-2 pr-3 font-medium">Version</th><th className="py-2 font-medium">Metrics</th></tr></thead>
              <tbody>
                {mp.benchmarks.map((b) => (
                  <tr key={b.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2 pr-3 capitalize text-[hsl(var(--text-1))]">{b.role.replace('_', ' ')}</td>
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{b.modelId}</td>
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-3))]">{b.modelVersion}</td>
                    <td className="py-2 font-mono text-[hsl(var(--text-3))]">{Object.entries(b.metrics).map(([k, v]) => `${k} ${v}`).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="drift" className="mt-4 grid gap-4 lg:grid-cols-2">
          {mp.timeseries.map((s) => (
            <Section key={s.metric} title={`${s.metric} — trend`}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={s.points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={ct.grid} strokeDasharray="3 3" />
                  <XAxis dataKey="at" tick={{ fill: ct.axis, fontSize: 11 }} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 11 }} domain={['auto', 'auto']} />
                  <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke={ct.brand} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </Section>
          ))}
        </TabsContent>

        <TabsContent value="objectives" className="mt-4">
          <Section title="Multi-objective trade-off" right={<span className="text-[11px] text-[hsl(var(--text-4))]">balanced ≥ 0.85 on all axes = Pareto-preferred</span>}>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData} outerRadius={110}>
                <PolarGrid stroke={ct.grid} />
                <PolarAngleAxis dataKey="dim" tick={{ fill: ct.axis, fontSize: 12 }} />
                <Radar dataKey="value" stroke={ct.brand} fill={ct.brand} fillOpacity={0.35} />
                <ReferenceLine y={0.85} stroke={ct.grid} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {radarData.map((d) => <Stat key={d.dim} label={d.dim} value={d.value.toFixed(2)} mono />)}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail"><AuditTimeline entries={mp.auditTrail} /></Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
