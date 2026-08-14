// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetDetail — a single dataset from the canonical `datasets` table.
// Schema comes from schema_definition; the Quality tab shows real
// data_quality_assessments; linked models resolve to ai_models pills.

import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowSquareOut, Clock, Database, Lock, Robot } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, ErrorState } from '@/components/evals/states'
import { useDataset, useQualityAssessments } from '@/hooks/useDatasetData'
import { useModelOptions } from '@/hooks/useAiiaData'

function classStyle(c?: string) {
  switch (c) {
    case 'restricted': return { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }
    case 'confidential': return { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
    case 'public': return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
    default: return { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' }
  }
}

function art10Style(s?: string) {
  switch (s) {
    case 'met': return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
    case 'partial': return { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
    case 'not_met': return { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }
    default: return { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' }
  }
}

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: dataset, isLoading, isError, error } = useDataset(id)
  const { data: assessments } = useQualityAssessments(id)
  const { models, loading: modelsLoading } = useModelOptions()

  const back = (
    <Button variant="outline" onClick={() => navigate('/datasets')} className="gap-2 mb-4">
      <ArrowLeft size={16} /> Back to Registry
    </Button>
  )

  if (isLoading) return <div className="p-6 text-sm text-[hsl(var(--text-4))]">Loading dataset…</div>
  if (isError) return <div className="p-6">{back}<ErrorState message={error?.message} /></div>
  if (!dataset) {
    return (
      <div className="p-6">
        {back}
        <div className="text-[hsl(var(--text-4))]">Dataset not found.</div>
      </div>
    )
  }

  const linkedModels = dataset.usedInModels
    .map((mid) => ({ id: mid, name: models.find((m) => m.id === mid)?.name }))

  return (
    <div className="space-y-6">
      <div>
        {back}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="border border-[hsl(var(--border))] bg-surface p-2">
              <Database size={24} className="text-[hsl(var(--brand))]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">{dataset.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                {dataset.version && <span className="font-mono text-xs text-[hsl(var(--text-4))]">{dataset.version}</span>}
                <span className="px-2 py-0.5 text-xs" style={classStyle(dataset.classification)}>{dataset.classification ?? 'unclassified'}</span>
                {dataset.containsPii && (
                  <span className="px-2 py-0.5 text-xs" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>PII</span>
                )}
                {dataset.status && <span className="px-2 py-0.5 text-xs text-[hsl(var(--text-2))] border border-[hsl(var(--border))]">{dataset.status}</span>}
              </div>
              {dataset.description && <p className="mt-1 text-sm text-[hsl(var(--text-4))]">{dataset.description}</p>}
            </div>
          </div>
          <div className="text-right text-xs text-[hsl(var(--text-4))]">
            {dataset.owner && <div>Owner: {dataset.owner}</div>}
            <div className="mt-0.5">Last Audit: {dataset.lastAuditDate ?? 'never'}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="linked">Linked Models</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Records</div>
              <div className="mt-1 text-2xl font-bold text-[hsl(var(--text-1))]">{dataset.recordCount != null ? dataset.recordCount.toLocaleString() : '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Encryption</div>
              <div className="mt-1 flex items-center gap-1 text-sm font-medium text-[hsl(var(--text-1))]"><Lock size={14} /> {dataset.encryption ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Retention</div>
              <div className="mt-1 flex items-center gap-1 text-sm font-medium text-[hsl(var(--text-1))]"><Clock size={14} /> {dataset.retentionPolicy ?? '—'}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Format</div>
              <div className="mt-1 text-sm font-medium text-[hsl(var(--text-1))]">{dataset.format ?? '—'}</div>
            </Card>
          </div>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><p className="text-[hsl(var(--text-4))]">Source System</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.source ?? '—'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">Ingestion</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.ingestionMethod ?? '—'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">Collection Method</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.collectionMethod ?? '—'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">License</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.license ?? '—'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">PII Categories</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.piiTypes.length ? dataset.piiTypes.join(', ') : '—'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">Demographic Data</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.demographicData ? 'Yes' : 'No'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">Known Biases</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.knownBiases ?? '—'}</p></div>
              <div><p className="text-[hsl(var(--text-4))]">Bias Mitigation</p><p className="mt-1 text-[hsl(var(--text-1))]">{dataset.biasMitigation ?? '—'}</p></div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="mt-4">
          {dataset.schemaDefinition.length === 0 ? (
            <EmptyState
              title="No schema documented"
              message="Column definitions have not been recorded for this dataset yet." />
          ) : (
            <Card>
              <div className="border-b border-[hsl(var(--border))] p-4">
                <div className="text-sm font-medium text-[hsl(var(--text-1))]">Column Definitions</div>
                <div className="mt-0.5 text-xs text-[hsl(var(--text-4))]">
                  {dataset.schemaDefinition.length} columns · {dataset.schemaDefinition.filter((c) => c.pii).length} PII columns
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      {['Column', 'Type', 'Nullable', 'PII', 'Description'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[hsl(var(--text-4))]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.schemaDefinition.map((col) => (
                      <tr key={col.column} className="border-b border-[hsl(var(--border))]">
                        <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-1))]">{col.column}</td>
                        <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{col.type}</td>
                        <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{col.nullable ? 'YES' : 'NO'}</td>
                        <td className="px-4 py-3">
                          {col.pii && <span className="px-1.5 py-0.5 text-xs" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>PII</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{col.description ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="linked" className="mt-4">
          {linkedModels.length === 0 ? (
            <EmptyState
              title="No linked models"
              message="Link this dataset to models from the registry edit form to trace training-data lineage." />
          ) : (
            <div className="space-y-3">
              {linkedModels.map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="border border-[hsl(var(--border))] bg-surface p-2">
                        <Robot size={18} className="text-[hsl(var(--brand))]" />
                      </div>
                      <div className="text-sm font-medium text-[hsl(var(--text-1))]">
                        {m.name ?? (modelsLoading ? '…' : 'Unavailable')}
                      </div>
                    </div>
                    {m.name && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate(`/models/inventory/${m.id}`)}>
                        View Model <ArrowSquareOut size={12} />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          {assessments.length === 0 ? (
            <EmptyState
              title="No quality assessments"
              message="Run a data quality assessment for this dataset from the Data Quality module."
              actionLabel="Open Data Quality"
              onAction={() => navigate(`/data-quality?dataset=${dataset.id}`)} />
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[hsl(var(--text-1))]">
                          {a.overallScore != null ? `Overall ${a.overallScore}/100` : 'Assessment'}
                        </span>
                        {a.art10Status && (
                          <span className="px-2 py-0.5 text-xs" style={art10Style(a.art10Status)}>
                            Art. 10 {a.art10Status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[hsl(var(--text-4))]">
                        {a.assessmentMethod}{a.assessor ? ` · ${a.assessor}` : ''} · {a.assessedAt}
                      </div>
                      {a.deficiencies.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-[hsl(var(--text-2))]">
                          {a.deficiencies.map((d, i) => (
                            <li key={i}>• <strong>{d.dimension}</strong> ({d.severity}): {d.issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/data-quality?dataset=${dataset.id}`)}>Details</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
