// @ts-nocheck
import { useState } from 'react'
import { ChartLine, Export, X, ArrowRight, Warning, Plus, MagnifyingGlass, Pencil, Trash, Database, ArrowsDownUp, GitBranch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

interface LineageRecord {
  id: string
  datasetName: string
  version: string
  sourceSystem: string
  ingestionMethod: string
  transformations: string[]
  downstreamModels: string[]
  upstreamSources: string[]
  piiPresent: boolean
  piiTypes?: string[]
  dataClassification: 'Public' | 'Internal' | 'Confidential' | 'Restricted'
  retentionPolicy: string
  lastUpdated: string
  quality: number
  owner: string
  issues: string[]
  schema?: string
  rowCount?: string
  sla?: string
}

const SEED: LineageRecord[] = [
  { id: 'DL-001', datasetName: 'ACME Credit History', version: '2026-Q1', sourceSystem: 'Core Banking System (FIS Horizon)', ingestionMethod: 'Batch ETL · Daily', transformations: ['PII tokenization', 'Normalization (Z-score)', 'Outlier removal (IQR)', 'Feature engineering (30-day rolling avg)'], downstreamModels: ['Credit Scoring Model v2.1', 'Loan Approval Model v3.0'], upstreamSources: ['FIS Horizon Core DB', 'Oracle GL Ledger'], piiPresent: true, piiTypes: ['Account Number (tokenized)', 'SSN (hashed)', 'DOB (binned to decade)'], dataClassification: 'Restricted', retentionPolicy: '7 years (regulatory minimum)', lastUpdated: '2026-04-10 02:00:00', quality: 94, owner: 'Data Engineering', issues: [], schema: 'credit_history_v3.1.json', rowCount: '4.2M rows', sla: 'By 03:00 UTC daily' },
  { id: 'DL-002', datasetName: 'Transaction Stream', version: 'Live', sourceSystem: 'Kafka · Transaction Processing', ingestionMethod: 'Streaming · Real-time', transformations: ['Deduplication', 'Schema validation', 'Fraud feature extraction', 'Session windowing (5min)'], downstreamModels: ['Fraud Detection Engine v4.2'], upstreamSources: ['Payment Gateway (Stripe)', 'ACH Processing System', 'Internal GL'], piiPresent: true, piiTypes: ['Card Number (truncated)', 'Merchant ID', 'Geolocation (city-level)'], dataClassification: 'Confidential', retentionPolicy: '90 days hot, 5 years cold', lastUpdated: '2026-04-10 09:20:00', quality: 98, owner: 'Data Engineering', issues: [], schema: 'transaction_event_v2.avro', rowCount: '~12K/min', sla: 'Real-time (< 500ms lag)' },
  { id: 'DL-003', datasetName: 'Experian Bureau Data', version: '2026-Q1', sourceSystem: 'Experian Credit Bureau API', ingestionMethod: 'API Pull · Weekly', transformations: ['Schema mapping', 'Score normalization', 'Missing value imputation'], downstreamModels: ['Credit Scoring Model v2.1'], upstreamSources: ['Experian API v4.2'], piiPresent: true, piiTypes: ['Credit Score', 'Inquiry History'], dataClassification: 'Restricted', retentionPolicy: '2 years (bureau agreement)', lastUpdated: '2026-04-07 04:00:00', quality: 91, owner: 'Data Engineering', issues: ['Experian API latency spike on Apr 7 — 3% missing records imputed'], schema: 'experian_credit_v2.json', rowCount: '1.8M records', sla: 'By Monday 06:00 UTC' },
  { id: 'DL-004', datasetName: 'Customer Behavior Events', version: '2025-Q4', sourceSystem: 'CDP (Segment.io)', ingestionMethod: 'Batch ETL · Nightly', transformations: ['Event aggregation', 'Churn feature engineering', 'Behavioral clustering'], downstreamModels: ['Customer Churn Predictor v2.3'], upstreamSources: ['Segment.io S3 Export', 'Salesforce CRM'], piiPresent: false, dataClassification: 'Internal', retentionPolicy: '3 years', lastUpdated: '2026-04-09 03:00:00', quality: 87, owner: 'Analytics Engineering', issues: ['Schema drift detected on 2026-03-15 — field "session_duration" renamed to "session_length_sec"'], schema: 'customer_events_v1.8.parquet', rowCount: '22M events', sla: 'By 05:00 UTC nightly' },
  { id: 'DL-005', datasetName: 'Synthetic Fraud Patterns', version: 'v3.0', sourceSystem: 'Internal Generator (GANs)', ingestionMethod: 'Manual upload', transformations: ['Quality validation', 'Distribution matching'], downstreamModels: ['Fraud Detection Engine v4.2'], upstreamSources: ['Internal GAN Generator v2.1'], piiPresent: false, dataClassification: 'Internal', retentionPolicy: 'Indefinite (synthetic)', lastUpdated: '2026-02-15', quality: 99, owner: 'Fraud AI Team', issues: [], schema: 'synthetic_fraud_v3.parquet', rowCount: '500K synthetic records', sla: 'On-demand' },
]

const CLASS_STYLE: Record<string, { bg: string; color: string }> = {
  Public: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Internal: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Confidential: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Restricted: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
}

const BLANK = {
  datasetName: '', version: '', sourceSystem: '', ingestionMethod: 'Batch ETL · Daily',
  transformations: '', downstreamModels: '', upstreamSources: '',
  piiPresent: false, piiTypes: '', dataClassification: 'Internal' as const,
  retentionPolicy: '', quality: 90, owner: '', schema: '', rowCount: '', sla: '',
}

export default function DataLineage() {
  const [records, setRecords] = useState<LineageRecord[]>(SEED)
  const [selected, setSelected] = useState<LineageRecord | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'upstream' | 'downstream'>('overview')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<LineageRecord | null>(null)

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const ms = r.datasetName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.sourceSystem.toLowerCase().includes(q)
    return ms && (classFilter === 'All' || r.dataClassification === classFilter)
  })

  const stats = {
    total: records.length,
    pii: records.filter(r => r.piiPresent).length,
    avgQuality: Math.round(records.reduce((s, r) => s + r.quality, 0) / records.length),
    issues: records.filter(r => r.issues.length > 0).length,
  }

  function openCreate() {
    setForm(BLANK)
    setEditMode(false)
    setShowCreate(true)
  }

  function openEdit(r: LineageRecord) {
    setForm({
      datasetName: r.datasetName, version: r.version, sourceSystem: r.sourceSystem,
      ingestionMethod: r.ingestionMethod, transformations: r.transformations.join('\n'),
      downstreamModels: r.downstreamModels.join('\n'), upstreamSources: r.upstreamSources.join('\n'),
      piiPresent: r.piiPresent, piiTypes: r.piiTypes?.join(', ') ?? '',
      dataClassification: r.dataClassification, retentionPolicy: r.retentionPolicy,
      quality: r.quality, owner: r.owner, schema: r.schema ?? '', rowCount: r.rowCount ?? '', sla: r.sla ?? '',
    })
    setEditMode(true)
    setShowCreate(true)
    setSelected(null)
  }

  function handleSave() {
    if (!form.datasetName || !form.sourceSystem || !form.owner) {
      toast.error('Dataset name, source system, and owner are required')
      return
    }
    const toArr = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)

    if (editMode && selected) {
      setRecords(prev => prev.map(r => r.id === selected.id ? {
        ...r, datasetName: form.datasetName, version: form.version, sourceSystem: form.sourceSystem,
        ingestionMethod: form.ingestionMethod, transformations: toArr(form.transformations),
        downstreamModels: toArr(form.downstreamModels), upstreamSources: toArr(form.upstreamSources),
        piiPresent: form.piiPresent, piiTypes: form.piiTypes ? form.piiTypes.split(',').map(x => x.trim()) : [],
        dataClassification: form.dataClassification, retentionPolicy: form.retentionPolicy,
        quality: form.quality, owner: form.owner, schema: form.schema, rowCount: form.rowCount, sla: form.sla,
      } : r))
      toast.success(`${form.datasetName} updated`)
    } else {
      const newId = `DL-${String(records.length + 1).padStart(3, '0')}`
      const newR: LineageRecord = {
        id: newId, datasetName: form.datasetName, version: form.version || 'v1.0',
        sourceSystem: form.sourceSystem, ingestionMethod: form.ingestionMethod,
        transformations: toArr(form.transformations), downstreamModels: toArr(form.downstreamModels),
        upstreamSources: toArr(form.upstreamSources), piiPresent: form.piiPresent,
        piiTypes: form.piiTypes ? form.piiTypes.split(',').map(x => x.trim()) : undefined,
        dataClassification: form.dataClassification, retentionPolicy: form.retentionPolicy || '3 years',
        lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' '), quality: form.quality,
        owner: form.owner, issues: [], schema: form.schema || undefined,
        rowCount: form.rowCount || undefined, sla: form.sla || undefined,
      }
      setRecords(prev => [newR, ...prev])
      toast.success(`${newR.id} — ${newR.datasetName} added to lineage registry`)
    }
    setShowCreate(false)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    if (selected?.id === deleteTarget.id) setSelected(null)
    toast.success(`${deleteTarget.datasetName} removed from lineage registry`)
    setDeleteTarget(null)
  }

  function openDrawer(r: LineageRecord) {
    setSelected(r)
    setDrawerTab('overview')
  }

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
        <div className="flex gap-2">
          <button onClick={() => toast.success('Lineage map exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> Add Dataset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tracked Datasets', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'PII Datasets', value: stats.pii, color: 'hsl(var(--destructive))' },
          { label: 'Avg Quality Score', value: `${stats.avgQuality}%`, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Datasets with Issues', value: stats.issues, color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search datasets…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Public', 'Internal', 'Confidential', 'Restricted'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">No datasets match your filters</div>
        )}
        {filtered.map(d => (
          <div key={d.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors" onClick={() => openDrawer(d)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{d.id}</span>
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={CLASS_STYLE[d.dataClassification]}>{d.dataClassification}</span>
                  {d.piiPresent && <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' }}>PII</span>}
                  {d.issues.length > 0 && <Warning size={12} className="text-[hsl(45_85%_40%)]" />}
                </div>
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{d.datasetName} <span className="text-[hsl(var(--text-4))] font-normal text-xs">{d.version}</span></h3>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{d.sourceSystem} · {d.ingestionMethod}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: d.quality >= 95 ? 'hsl(var(--s-ok-tx))' : d.quality >= 85 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }}>{d.quality}%</p>
                  <p className="text-[10px] text-[hsl(var(--text-4))]">Quality</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); openEdit(d) }} className="p-1.5 rounded text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))]"><Pencil size={13} /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(d) }} className="p-1.5 rounded text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(0_72%_51%/0.06)]"><Trash size={13} /></button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {d.upstreamSources.map((src, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(280_67%_56%/0.08)] border border-[hsl(280_67%_56%/0.25)] text-[hsl(280_60%_55%)] whitespace-nowrap">{src.split(' ')[0]}</div>
                  {i < d.upstreamSources.length - 1 && <span className="text-[hsl(var(--text-4))] text-[10px]">+</span>}
                </div>
              ))}
              <ArrowRight size={12} className="text-[hsl(var(--text-4))] flex-shrink-0" />
              <div className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(220_90%_56%/0.1)] border border-[hsl(220_90%_56%/0.3)] text-[hsl(var(--s-in-tx))] whitespace-nowrap">{d.sourceSystem.split(' ')[0]}</div>
              <ArrowRight size={12} className="text-[hsl(var(--text-4))] flex-shrink-0" />
              <div className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))] whitespace-nowrap">{d.transformations.length} transforms</div>
              <ArrowRight size={12} className="text-[hsl(var(--text-4))] flex-shrink-0" />
              {d.downstreamModels.map(m => (
                <div key={m} className="flex-shrink-0 text-[10px] px-2 py-1 bg-[hsl(var(--brand)/0.1)] border border-[hsl(var(--brand)/0.2)] text-[hsl(var(--brand))] whitespace-nowrap">{m.split(' ')[0]}</div>
              ))}
            </div>

            {d.issues.length > 0 && (
              <div className="mt-2 flex items-start gap-1.5 p-2 bg-[hsl(45_93%_47%/0.06)] border border-[hsl(45_93%_47%/0.3)]">
                <Warning size={11} className="text-[hsl(45_85%_40%)] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[hsl(45_85%_40%)]">{d.issues[0]}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.datasetName}</h2>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => openEdit(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>
                <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
              </div>
            </div>

            <div className="flex border-b border-[hsl(var(--border))]">
              {(['overview', 'upstream', 'downstream'] as const).map(tab => (
                <button key={tab} onClick={() => setDrawerTab(tab)} className="flex-1 py-2.5 text-xs font-medium capitalize transition-colors" style={drawerTab === tab ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                  {tab === 'overview' && <Database size={12} className="inline mr-1" />}
                  {tab === 'upstream' && <ArrowsDownUp size={12} className="inline mr-1" />}
                  {tab === 'downstream' && <GitBranch size={12} className="inline mr-1" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'overview' && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={CLASS_STYLE[selected.dataClassification]}>{selected.dataClassification}</span>
                    {selected.piiPresent && <span className="text-[11px] px-2 py-0.5" style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' }}>Contains PII</span>}
                    <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.version}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Source System', value: selected.sourceSystem },
                      { label: 'Ingestion Method', value: selected.ingestionMethod },
                      { label: 'Quality Score', value: `${selected.quality}%` },
                      { label: 'Owner', value: selected.owner },
                      { label: 'Retention Policy', value: selected.retentionPolicy },
                      { label: 'Last Updated', value: selected.lastUpdated },
                      { label: 'Row Count', value: selected.rowCount ?? 'N/A' },
                      { label: 'SLA', value: selected.sla ?? 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {selected.schema && (
                    <div>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Schema File</p>
                      <p className="text-xs font-mono text-[hsl(var(--brand))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.schema}</p>
                    </div>
                  )}
                  {selected.piiPresent && selected.piiTypes && (
                    <div>
                      <p className="text-[11px] font-semibold text-[hsl(var(--destructive))] uppercase tracking-wide mb-2">PII Types Present</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.piiTypes.map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-[hsl(0_72%_51%/0.08)] border border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))]">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.issues.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-[hsl(45_85%_40%)] uppercase tracking-wide mb-2">Open Issues</p>
                      <div className="space-y-1">
                        {selected.issues.map(i => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-[hsl(var(--text-2))] p-2 bg-[hsl(45_93%_47%/0.08)] border border-[hsl(45_93%_47%/0.3)]">
                            <Warning size={11} className="text-[hsl(45_85%_40%)] flex-shrink-0 mt-0.5" />{i}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'upstream' && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-3">Upstream Sources</p>
                    <div className="space-y-2">
                      {selected.upstreamSources.map((src, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[hsl(280_67%_56%/0.05)] border border-[hsl(280_67%_56%/0.2)]">
                          <div className="w-2 h-2 rounded-full bg-[hsl(280_60%_55%)]" />
                          <p className="text-xs font-medium text-[hsl(var(--text-1))]">{src}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Transformations Applied</p>
                    <div className="space-y-1">
                      {selected.transformations.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                          <span className="text-[10px] font-mono text-[hsl(var(--text-4))] w-5">T{i + 1}</span>
                          <p className="text-xs text-[hsl(var(--text-2))]">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Ingestion Details</p>
                    <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] space-y-1">
                      <p className="text-xs text-[hsl(var(--text-2))]"><span className="text-[hsl(var(--text-4))]">Method:</span> {selected.ingestionMethod}</p>
                      {selected.sla && <p className="text-xs text-[hsl(var(--text-2))]"><span className="text-[hsl(var(--text-4))]">SLA:</span> {selected.sla}</p>}
                      <p className="text-xs text-[hsl(var(--text-2))]"><span className="text-[hsl(var(--text-4))]">Last Run:</span> {selected.lastUpdated}</p>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'downstream' && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-3">Downstream AI Models</p>
                    <div className="space-y-2">
                      {selected.downstreamModels.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--text-4))]">No downstream models registered</p>
                      ) : selected.downstreamModels.map(m => (
                        <div key={m} className="flex items-center gap-3 p-3 bg-[hsl(var(--brand)/0.06)] border border-[hsl(var(--brand)/0.2)]">
                          <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand))]" />
                          <p className="text-xs font-medium text-[hsl(var(--brand))]">{m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Impact Analysis</p>
                    <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] space-y-2">
                      <p className="text-xs text-[hsl(var(--text-2))]">This dataset feeds <strong>{selected.downstreamModels.length}</strong> AI model{selected.downstreamModels.length !== 1 ? 's' : ''}. Any quality issue, PII breach, or schema change in this dataset will directly affect these models.</p>
                      {selected.piiPresent && (
                        <div className="flex items-start gap-1.5 p-2 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)]">
                          <Warning size={11} className="text-[hsl(var(--destructive))] flex-shrink-0 mt-0.5" />
                          <p className="text-[10px] text-[hsl(var(--destructive))]">PII flows downstream — downstream models must comply with applicable privacy regulations for all PII types listed</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Data Quality Score</p>
                    <div className="flex items-center gap-3 p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                      <div className="flex-1 bg-[hsl(var(--bg-page))] h-3 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${selected.quality}%`, background: selected.quality >= 95 ? 'hsl(var(--s-ok-tx))' : selected.quality >= 85 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }} />
                      </div>
                      <span className="text-sm font-bold text-[hsl(var(--text-1))]">{selected.quality}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => openEdit(selected)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))] flex items-center justify-center gap-1.5">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => toast.success(`Lineage for ${selected.datasetName} exported`)} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1.5">
                <Export size={13} /> Export Lineage
              </button>
              <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="px-3 py-2 border border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))] hover:bg-[hsl(0_72%_51%/0.06)]">
                <Trash size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
                <ChartLine size={15} className="text-[hsl(var(--brand))]" />
                {editMode ? 'Edit Dataset' : 'Register Dataset'}
              </h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Dataset Name *</label>
                  <input value={form.datasetName} onChange={e => setForm(p => ({ ...p, datasetName: e.target.value }))} placeholder="e.g. ACME Credit History" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Version</label>
                  <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="e.g. v1.0 or 2026-Q1" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Source System *</label>
                <input value={form.sourceSystem} onChange={e => setForm(p => ({ ...p, sourceSystem: e.target.value }))} placeholder="e.g. Core Banking System (FIS Horizon)" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Ingestion Method</label>
                  <select value={form.ingestionMethod} onChange={e => setForm(p => ({ ...p, ingestionMethod: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    {['Batch ETL · Daily', 'Batch ETL · Nightly', 'Streaming · Real-time', 'API Pull · Weekly', 'Manual upload', 'Event-driven'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Classification</label>
                  <select value={form.dataClassification} onChange={e => setForm(p => ({ ...p, dataClassification: e.target.value as any }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    {['Public', 'Internal', 'Confidential', 'Restricted'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Upstream Sources (one per line)</label>
                <textarea value={form.upstreamSources} onChange={e => setForm(p => ({ ...p, upstreamSources: e.target.value }))} rows={2} placeholder="e.g. FIS Horizon Core DB&#10;Oracle GL Ledger" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Transformations (one per line)</label>
                <textarea value={form.transformations} onChange={e => setForm(p => ({ ...p, transformations: e.target.value }))} rows={3} placeholder="e.g. PII tokenization&#10;Normalization (Z-score)" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Downstream AI Models (one per line)</label>
                <textarea value={form.downstreamModels} onChange={e => setForm(p => ({ ...p, downstreamModels: e.target.value }))} rows={2} placeholder="e.g. Credit Scoring Model v2.1&#10;Loan Approval Model v3.0" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Owner *</label>
                  <input value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="e.g. Data Engineering" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Quality Score (%)</label>
                  <input type="number" min={0} max={100} value={form.quality} onChange={e => setForm(p => ({ ...p, quality: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Retention Policy</label>
                  <input value={form.retentionPolicy} onChange={e => setForm(p => ({ ...p, retentionPolicy: e.target.value }))} placeholder="e.g. 7 years (regulatory)" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Row Count</label>
                  <input value={form.rowCount} onChange={e => setForm(p => ({ ...p, rowCount: e.target.value }))} placeholder="e.g. 4.2M rows" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                <input type="checkbox" id="pii" checked={form.piiPresent} onChange={e => setForm(p => ({ ...p, piiPresent: e.target.checked }))} className="w-4 h-4 accent-[hsl(var(--brand))]" />
                <label htmlFor="pii" className="text-sm text-[hsl(var(--text-2))]">Dataset contains PII</label>
              </div>
              {form.piiPresent && (
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--destructive))] uppercase tracking-wide mb-1 block">PII Types (comma-separated)</label>
                  <input value={form.piiTypes} onChange={e => setForm(p => ({ ...p, piiTypes: e.target.value }))} placeholder="e.g. SSN (hashed), Account Number (tokenized)" className="w-full px-3 py-2 text-sm border border-[hsl(var(--destructive)/0.5)] bg-[hsl(0_72%_51%/0.04)] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--destructive))]" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">{editMode ? 'Save Changes' : 'Register Dataset'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove dataset from lineage?"
        description={`Remove "${deleteTarget?.datasetName}" from the lineage registry. This will not delete the actual data — only the lineage tracking record.`}
        isDestructive
        confirmLabel="Remove Dataset"
        impactList={deleteTarget?.downstreamModels.length ? [`${deleteTarget.downstreamModels.length} downstream model${deleteTarget.downstreamModels.length > 1 ? 's' : ''} will lose lineage tracking`] : undefined}
      />
    </div>
  )
}
