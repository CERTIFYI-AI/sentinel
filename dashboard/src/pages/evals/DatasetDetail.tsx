// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetDetail — lineage & provenance, quality/representativeness/bias
// indicators, sensitivity + lawful basis + retention + allowed purposes,
// evaluation slices, and governance tags (EU AI Act Art.10, ISO 42001, GDPR).

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, RiskBadge, VerdictBadge, MetricBar, RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud'

export default function DatasetDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: ds } = datasetCatalogHooks.useGet(id)
  const [tab, setTab] = useState('lineage')

  if (!ds) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading dataset…</div>

  return (
    <div>
      <PageHeader
        title={ds.name}
        subtitle={`${ds.datasetId} · v${ds.datasetVersion} · ${ds.category}`}
        badge={<RiskBadge r={ds.sensitivity} />}
        onBack={() => nav('/evals/dataset-preview')}
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Sensitivity" value={<RiskBadge r={ds.sensitivity} />} />
          <Stat label="Risk score" value={ds.riskScore} mono />
          <Stat label="Completeness" value={ds.quality.completeness.toFixed(2)} mono />
          <Stat label="Duplicate rate" value={ds.quality.duplicateRate.toFixed(3)} mono />
          <Stat label="Slices" value={ds.slices.length} mono />
          <Stat label="Retention" value={ds.retention} />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['lineage', 'Lineage'], ['quality', 'Quality & bias'], ['governance', 'Governance'], ['slices', 'Eval slices'], ['tags', 'Reg tags'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lineage" className="mt-4 space-y-4">
          <Section title="Lineage & provenance">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat label="Source" value={ds.lineage.source} />
              <Stat label="Transform" value={ds.lineage.transform} />
              <Stat label="Upstream datasets" value={ds.lineage.upstreamIds.join(', ') || '—'} mono />
            </dl>
          </Section>
        </TabsContent>

        <TabsContent value="quality" className="mt-4 space-y-4">
          <Section title="Representativeness (coverage by cohort)">
            <div className="grid gap-4 sm:grid-cols-2">
              {ds.representativeness.map((r) => <MetricBar key={r.attribute} label={r.attribute} value={r.coverage} target={0.1} />)}
            </div>
          </Section>
          <Section title="Bias indicators">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Attribute</th><th className="py-2 pr-3 font-medium">Skew</th><th className="py-2 font-medium">Verdict</th></tr></thead>
              <tbody>
                {ds.biasIndicators.map((b) => (
                  <tr key={b.attribute} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{b.attribute}</td>
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{b.skew.toFixed(2)}</td>
                    <td className="py-2"><VerdictBadge v={b.verdict} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <Section title="Sensitivity, lawful basis & purpose limitation">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat label="Lawful basis" value={ds.lawfulBasis} />
              <Stat label="Retention" value={ds.retention} />
              <Stat label="Allowed purposes" value={ds.allowedPurposes.join(', ')} />
              <Stat label="Sensitivity" value={<RiskBadge r={ds.sensitivity} />} />
            </dl>
          </Section>
        </TabsContent>

        <TabsContent value="slices" className="mt-4">
          <Section title="Evaluation slices">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Slice</th><th className="py-2 pr-3 font-medium">Purpose</th><th className="py-2 pr-3 font-medium">Predicate</th><th className="py-2 font-medium">Rows</th></tr></thead>
              <tbody>
                {ds.slices.map((s) => (
                  <tr key={s.id} className="border-t border-[hsl(var(--border))]">
                    <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{s.name}</td>
                    <td className="py-2 pr-3 capitalize text-[hsl(var(--text-2))]">{s.purpose}</td>
                    <td className="py-2 pr-3 font-mono text-[hsl(var(--text-3))]">{s.predicate}</td>
                    <td className="py-2 font-mono text-[hsl(var(--text-3))]">{s.rowEstimate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <Section title="Governance tags (regulatory mappings)">
            <RegMappingTable mappings={ds.governanceTags.map((t) => t.mapping)} />
          </Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail"><AuditTimeline entries={ds.auditTrail} /></Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
