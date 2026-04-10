import { useState } from 'react'
import { ChartLine, Export, Eye, X, ArrowRight, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface LineageRecord {
  id: string
  datasetName: string
  version: string
  sourceSystem: string
  ingestionMethod: string
  transformations: string[]
  downstreamModels: string[]
  piiPresent: boolean
  piiTypes?: string[]
  dataClassification: 'Public' | 'Internal' | 'Confidential' | 'Restricted'
  retentionPolicy: string
  lastUpdated: string
  quality: number
  owner: string
  issues: string[]
}

const SEED: LineageRecord[] = [
  { id: 'DL-001', datasetName: 'ACME Credit History', version: '2026-Q1', sourceSystem: 'Core Banking System (FIS Horizon)', ingestionMethod: 'Batch ETL · Daily', transformations: ['PII tokenization', 'Normalization (Z-score)', 'Outlier removal (IQR)', 'Feature engineering (30-day rolling avg)'], downstreamModels: ['Credit Scoring Model v2.1', 'Loan Approval Model v3.0'], piiPresent: true, piiTypes: ['Account Number (tokenized)', 'SSN (hashed)', 'DOB (binned to decade)'], dataClassification: 'Restricted', retentionPolicy: '7 years (regulatory minimum)', lastUpdated: '2026-04-10 02:00:00', quality: 94, owner: 'Data Engineering', issues: [] },
  { id: 'DL-002', datasetName: 'Transaction Stream', version: 'Live', sourceSystem: 'Kafka · Transaction Processing', ingestionMethod: 'Streaming · Real-time', transformations: ['Deduplication', 'Schema validation', 'Fraud feature extraction', 'Session windowing (5min)'], downstreamModels: ['Fraud Detection Engine v4.2'], piiPresent: true, piiTypes: ['Card Number (truncated)', 'Merchant ID', 'Geolocation (city-level)'], dataClassification: 'Confidential', retentionPolicy: '90 days hot, 5 years cold', lastUpdated: '2026-04-10 09:20:00', quality: 98, owner: 'Data Engineering', issues: [] },
  { id: 'DL-003', datasetName: 'Experian Bureau Data', version: '2026-Q1', sourceSystem: 'Experian Credit Bureau API', ingestionMethod: 'API Pull · Weekly', transformations: ['Schema mapping', 'Score normalization', 'Missing value imputation'], downstreamModels: ['Credit Scoring Model v2.1'], piiPresent: true, piiTypes: ['Credit Score', 'Inquiry History'], dataClassification: 'Restricted', retentionPolicy: '2 years (bureau agreement)', lastUpdated: '2026-04-07 04:00:00', quality: 91, owner: 'Data Engineering', issues: ['Experian API latency spike on Apr 7 — 3% missing records imputed'] },
  { id: 'DL-004', datasetName: 'Customer Behavior Events', version: '2025-Q4', sourceSystem: 'CDP (Segment.io)', ingestionMethod: 'Batch ETL · Nightly', transformations: ['Event aggregation', 'Churn feature engineering', 'Behavioral clustering'], downstreamModels: ['Customer Churn Predictor v2.3'], piiPresent: false, dataClassification: 'Internal', retentionPolicy: '3 years', lastUpdated: '2026-04-09 03:00:00', quality: 87, owner: 'Analytics Engineering', issues: ['Schema drift detected on 2026-03-15 — field "session_duration" renamed to "session_length_sec"'] },
  { id: 'DL-005', datasetName: 'Synthetic Fraud Patterns', version: 'v3.0', sourceSystem: 'Internal Generator (GANs)', ingestionMethod: 'Manual upload', transformations: ['Quality validation', 'Distribution matching'], downstreamModels: ['Fraud Detection Engine v4.2'], piiPresent: false, dataClassification: 'Internal', retentionPolicy: 'Indefinite (synthetic)', lastUpdated: '2026-02-15', quality: 99, owner: 'Fraud AI Team', issues: [] },
]

const CLASS_STYLE: Record<string, { bg: string; color: string }> = {
  Public: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Internal: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Confidential: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Restricted: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
}

export default function DataLineage() {
  const [selected, setSelected] = useState<LineageRecord | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <ChartLine size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Data Lineage
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">End-to-end data lineage — trace from source system to AI model, with PII mapping, quality metrics, and compliance tagging</p>
        </div>
        <button onClick={() => toast.success('Lineage map exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tracked Datasets', value: SEED.length, color: 'hsl(var(--text-1))' },
          { label: 'PII Datasets', value: SEED.filter(d => d.piiPresent).length, color: 'hsl(var(--destructive))' },
          { label: 'Avg Quality Score', value: `${Math.round(SEED.reduce((s, d) => s + d.quality, 0) / SEED.length)}%`, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Datasets with Issues', value: SEED.filter(d => d.issues.length > 0).length, color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lineage cards */}
      <div className="space-y-3">
        {SEED.map(d => (
          <div key={d.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors" onClick={() => setSelected(d)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{d.id}</span>
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={CLASS_STYLE[d.dataClassification]}>{d.dataClassification}</span>
                  {d.piiPresent && <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' }}>PII</span>}
                  {d.issues.length > 0 && <Warning size={12} className="text-[hsl(45_85%_40%)]" />}
                </div>
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{d.datasetName} <span className="text-[hsl(var(--text-4))] font-normal text-xs">{d.version}</span></h3>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{d.sourceSystem} · {d.ingestionMethod}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: d.quality >= 95 ? 'hsl(var(--s-ok-tx))' : d.quality >= 85 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }}>{d.quality}%</p>
                <p className="text-[10px] text-[hsl(var(--text-4))]">Quality</p>
              </div>
            </div>

            {/* Lineage flow */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto">
              <div className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(220_90%_56%/0.1)] border border-[hsl(220_90%_56%/0.3)] text-[hsl(var(--s-in-tx))] whitespace-nowrap">{d.sourceSystem.split(' ')[0]}</div>
              <ArrowRight size={12} className="text-[hsl(var(--text-4))] flex-shrink-0" />
              <div className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))] whitespace-nowrap">{d.transformations.length} transforms</div>
              <ArrowRight size={12} className="text-[hsl(var(--text-4))] flex-shrink-0" />
              {d.downstreamModels.map(m => (
                <div key={m} className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(var(--brand)/0.1)] border border-[hsl(var(--brand)/0.2)] text-[hsl(var(--brand))] whitespace-nowrap">{m.split(' ')[0]}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.datasetName}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={CLASS_STYLE[selected.dataClassification]}>{selected.dataClassification}</span>
                {selected.piiPresent && <span className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' }}>Contains PII</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Source System', value: selected.sourceSystem },
                  { label: 'Ingestion', value: selected.ingestionMethod },
                  { label: 'Quality Score', value: `${selected.quality}%` },
                  { label: 'Owner', value: selected.owner },
                  { label: 'Retention Policy', value: selected.retentionPolicy },
                  { label: 'Last Updated', value: selected.lastUpdated },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {selected.piiPresent && selected.piiTypes && (
                <div><p className="text-[11px] font-semibold text-[hsl(var(--destructive))] uppercase tracking-wide mb-2">PII Types Present</p><div className="flex flex-wrap gap-1">{selected.piiTypes.map(t => <span key={t} className="text-[10px] px-2 py-0.5 bg-[hsl(0_72%_51%/0.08)] border border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))]">{t}</span>)}</div></div>
              )}
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Transformations</p><div className="space-y-1">{selected.transformations.map(t => <div key={t} className="text-xs text-[hsl(var(--text-2))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{t}</div>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Downstream Models</p><div className="space-y-1">{selected.downstreamModels.map(m => <div key={m} className="text-xs font-medium text-[hsl(var(--brand))] p-2 bg-[hsl(var(--brand)/0.08)] border border-[hsl(var(--brand)/0.2)]">{m}</div>)}</div></div>
              {selected.issues.length > 0 && (
                <div><p className="text-[11px] font-semibold text-[hsl(45_85%_40%)] uppercase tracking-wide mb-2">Issues</p><div className="space-y-1">{selected.issues.map(i => <div key={i} className="text-xs text-[hsl(var(--text-2))] p-2 bg-[hsl(45_93%_47%/0.08)] border border-[hsl(45_93%_47%/0.3)]">{i}</div>)}</div></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
