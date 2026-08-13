// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetDetail — lineage & provenance, quality/representativeness/bias
// indicators, sensitivity + lawful basis + retention + allowed purposes,
// evaluation slices, and governance tags (EU AI Act Art.10, ISO 42001, GDPR).
// Tolerant of partial docs (wizard-created entries have no measured quality
// metrics yet) — absent values render as "—", never as invented numbers.

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Stat, Section, RiskBadge, VerdictBadge, MetricBar, RegMappingTable, AuditTimeline,
} from '@/components/evals/primitives'
import { datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import type { DatasetCatalogEntry } from '@/types/evals'

const pillCls = 'inline-flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-2 py-[2px] text-[11px] font-medium whitespace-nowrap'

type CatalogRow = DatasetCatalogEntry & {
  linkedModelIds?: string[]
  rows?: number
  containsPii?: boolean
  source?: string
  fileName?: string
  ingestionStatus?: string
}

export default function DatasetDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, isLoading, isError } = datasetCatalogHooks.useGet(id)
  const { models } = useModelOptions()
  const [tab, setTab] = useState('lineage')

  if (isLoading) return <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading dataset…</div>
  if (isError || !data) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-sm text-[hsl(var(--text-2))]">{isError ? 'Failed to load this dataset.' : 'Dataset not found.'}</p>
        <Button size="sm" variant="secondary" onClick={() => nav('/evals/dataset-preview')}>Back to Data Explorer</Button>
      </div>
    )
  }

  const ds = data as CatalogRow
  const linkedIds = ds.linkedModelIds ?? []
  const biasList: unknown[] = Array.isArray(ds.biasIndicators) ? ds.biasIndicators : []
  const slicesList: unknown[] = Array.isArray(ds.slices) ? ds.slices : []

  return (
    <div>
      <PageHeader
        title={ds.name}
        subtitle={[ds.datasetId ?? ds.id, ds.datasetVersion ? `v${ds.datasetVersion}` : null, ds.category ?? null].filter(Boolean).join(' · ')}
        badge={ds.sensitivity ? <RiskBadge r={ds.sensitivity} /> : undefined}
        onBack={() => nav('/evals/dataset-preview')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Bias audits using this dataset" onClick={() => nav('/bias-audits')}>Bias audits</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Sensitivity" value={ds.sensitivity ? <RiskBadge r={ds.sensitivity} /> : '—'} />
          <Stat label="Risk score" value={ds.riskScore ?? '—'} mono />
          <Stat label="Rows" value={typeof ds.rows === 'number' ? ds.rows.toLocaleString() : (ds.ingestionStatus === 'pending' ? 'Ingestion pending' : '—')} mono />
          <Stat label="Completeness" value={ds.quality ? ds.quality.completeness.toFixed(2) : '—'} mono />
          <Stat label="Slices" value={slicesList.length} mono />
          <Stat label="Retention" value={ds.retention || '—'} />
        </CardContent>
      </Card>

      {linkedIds.length > 0 && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <span className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Linked models</span>
            {linkedIds.map((mid) => {
              const name = models.find((m) => m.id === mid)?.name
              return name ? (
                <Link key={mid} to={`/models/inventory/${mid}`} className={`${pillCls} text-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-subtle))] hover:underline`}>
                  {name}
                </Link>
              ) : (
                <span key={mid} className={`${pillCls} text-[hsl(var(--text-4))]`}>Unavailable</span>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[['lineage', 'Lineage'], ['quality', 'Quality & bias'], ['governance', 'Governance'], ['slices', 'Eval slices'], ['tags', 'Reg tags'], ['activity', 'Activity']].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lineage" className="mt-4 space-y-4">
          <Section title="Lineage & provenance">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat label="Source" value={ds.lineage?.source || ds.source || '—'} />
              <Stat label="Transform" value={ds.lineage?.transform || '—'} />
              <Stat label="Upstream datasets" value={ds.lineage?.upstreamIds?.join(', ') || '—'} mono />
              {ds.fileName && <Stat label="Registered file" value={ds.fileName} mono />}
              {ds.ingestionStatus && <Stat label="Ingestion" value={ds.ingestionStatus} />}
            </dl>
          </Section>
        </TabsContent>

        <TabsContent value="quality" className="mt-4 space-y-4">
          <Section title="Quality">
            {ds.quality ? (
              <dl className="grid gap-3 sm:grid-cols-3">
                <Stat label="Completeness" value={ds.quality.completeness.toFixed(2)} mono />
                <Stat label="Duplicate rate" value={ds.quality.duplicateRate.toFixed(3)} mono />
                <Stat label="Label error rate" value={ds.quality.labelErrorRate !== undefined ? ds.quality.labelErrorRate.toFixed(3) : '—'} mono />
              </dl>
            ) : (
              <p className="text-[13px] text-[hsl(var(--text-3))]">No quality metrics measured yet — they will appear after ingestion and profiling.</p>
            )}
          </Section>
          <Section title="Representativeness (coverage by cohort)">
            {(ds.representativeness ?? []).length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {(ds.representativeness ?? []).map((r) => <MetricBar key={r.attribute} label={r.attribute} value={r.coverage} target={0.1} />)}
              </div>
            ) : (
              <p className="text-[13px] text-[hsl(var(--text-3))]">No representativeness data recorded.</p>
            )}
          </Section>
          <Section title="Bias indicators">
            {biasList.length === 0 ? (
              <p className="text-[13px] text-[hsl(var(--text-3))]">No bias indicators recorded.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Attribute</th><th className="py-2 pr-3 font-medium">Skew</th><th className="py-2 font-medium">Verdict</th></tr></thead>
                <tbody>
                  {biasList.map((raw, i) => {
                    if (typeof raw === 'string') {
                      return (
                        <tr key={i} className="border-t border-[hsl(var(--border))]">
                          <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{raw}</td>
                          <td className="py-2 pr-3 font-mono text-[hsl(var(--text-4))]">—</td>
                          <td className="py-2 text-[hsl(var(--text-4))]">—</td>
                        </tr>
                      )
                    }
                    const b = raw as DatasetCatalogEntry['biasIndicators'][number]
                    return (
                      <tr key={b.attribute ?? i} className="border-t border-[hsl(var(--border))]">
                        <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{b.attribute}</td>
                        <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{typeof b.skew === 'number' ? b.skew.toFixed(2) : '—'}</td>
                        <td className="py-2">{b.verdict ? <VerdictBadge v={b.verdict} /> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="governance" className="mt-4">
          <Section title="Sensitivity, lawful basis & purpose limitation">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Stat label="Lawful basis" value={ds.lawfulBasis || '—'} />
              <Stat label="Retention" value={ds.retention || '—'} />
              <Stat label="Allowed purposes" value={(ds.allowedPurposes ?? []).join(', ') || '—'} />
              <Stat label="Sensitivity" value={ds.sensitivity ? <RiskBadge r={ds.sensitivity} /> : '—'} />
              <Stat label="Contains PII" value={ds.containsPii === true ? 'Yes' : ds.containsPii === false ? 'No' : 'Unknown'} />
            </dl>
          </Section>
        </TabsContent>

        <TabsContent value="slices" className="mt-4">
          <Section title="Evaluation slices">
            {slicesList.length === 0 ? (
              <p className="text-[13px] text-[hsl(var(--text-3))]">No evaluation slices defined.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]"><th className="py-2 pr-3 font-medium">Slice</th><th className="py-2 pr-3 font-medium">Purpose</th><th className="py-2 pr-3 font-medium">Predicate</th><th className="py-2 font-medium">Rows</th></tr></thead>
                <tbody>
                  {slicesList.map((raw, i) => {
                    if (typeof raw === 'string') {
                      return (
                        <tr key={raw} className="border-t border-[hsl(var(--border))]">
                          <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{raw}</td>
                          <td className="py-2 pr-3 text-[hsl(var(--text-4))]">—</td>
                          <td className="py-2 pr-3 text-[hsl(var(--text-4))]">—</td>
                          <td className="py-2 text-[hsl(var(--text-4))]">—</td>
                        </tr>
                      )
                    }
                    const s = raw as DatasetCatalogEntry['slices'][number]
                    return (
                      <tr key={s.id ?? i} className="border-t border-[hsl(var(--border))]">
                        <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{s.name}</td>
                        <td className="py-2 pr-3 capitalize text-[hsl(var(--text-2))]">{s.purpose}</td>
                        <td className="py-2 pr-3 font-mono text-[hsl(var(--text-3))]">{s.predicate}</td>
                        <td className="py-2 font-mono text-[hsl(var(--text-3))]">{s.rowEstimate ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="tags" className="mt-4">
          <Section title="Governance tags (regulatory mappings)">
            {(ds.governanceTags ?? []).length ? (
              <RegMappingTable mappings={(ds.governanceTags ?? []).map((t) => t.mapping)} />
            ) : (
              <p className="text-[13px] text-[hsl(var(--text-3))]">No regulatory mappings recorded.</p>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Section title="Audit trail">
            {(ds.auditTrail ?? []).length ? (
              <AuditTimeline entries={ds.auditTrail ?? []} />
            ) : (
              <p className="text-[13px] text-[hsl(var(--text-3))]">No audit entries recorded.</p>
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}
