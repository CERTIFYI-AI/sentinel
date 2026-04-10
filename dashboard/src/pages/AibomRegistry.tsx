import { useState } from 'react'
import { Package, MagnifyingGlass, Plus, Eye, X, Export, Warning, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AIBOMRecord {
  id: string
  modelName: string
  modelVersion: string
  format: 'CycloneDX' | 'SPDX' | 'Sentinel-AIBOM'
  generatedDate: string
  status: 'Verified' | 'Pending Verification' | 'Stale' | 'Incomplete'
  baseModel: string
  baseModelProvider: string
  trainingDatasets: { name: string; version: string; license: string }[]
  frameworks: string[]
  dependencies: { name: string; version: string; license: string; risk: 'Low' | 'Medium' | 'High' }[]
  vulnerabilities: number
  licenseConflicts: number
  sha256: string
  attestedBy: string
  owner: string
}

const SEED: AIBOMRecord[] = [
  { id: 'AIBOM-001', modelName: 'Credit Scoring Model', modelVersion: 'v2.1', format: 'Sentinel-AIBOM', generatedDate: '2026-04-08', status: 'Verified', baseModel: 'LightGBM 4.3.0', baseModelProvider: 'Microsoft / Open Source', trainingDatasets: [{ name: 'ACME Credit History DS', version: '2025-Q4', license: 'Proprietary' }, { name: 'Experian Bureau Data', version: '2026-Q1', license: 'Commercial' }], frameworks: ['LightGBM 4.3.0', 'scikit-learn 1.4.0', 'SHAP 0.44', 'pandas 2.2.0'], dependencies: [{ name: 'LightGBM', version: '4.3.0', license: 'MIT', risk: 'Low' }, { name: 'scikit-learn', version: '1.4.0', license: 'BSD-3', risk: 'Low' }, { name: 'numpy', version: '1.26.4', license: 'BSD-3', risk: 'Low' }], vulnerabilities: 0, licenseConflicts: 0, sha256: 'a4b3c9d2e7f1...', attestedBy: 'James Liu', owner: 'ML Engineering' },
  { id: 'AIBOM-002', modelName: 'Loan Approval Model', modelVersion: 'v3.0', format: 'CycloneDX', generatedDate: '2026-04-05', status: 'Pending Verification', baseModel: 'XGBoost 2.0.3', baseModelProvider: 'DMLC / Open Source', trainingDatasets: [{ name: 'HMDA Mortgage Data', version: '2024', license: 'Public Domain' }, { name: 'ACME Loan History', version: '2025-Q4', license: 'Proprietary' }, { name: 'Bureau Employment Data', version: '2026-Q1', license: 'Commercial' }], frameworks: ['XGBoost 2.0.3', 'scikit-learn 1.4.0', 'Fairlearn 0.10', 'SHAP 0.44'], dependencies: [{ name: 'XGBoost', version: '2.0.3', license: 'Apache-2.0', risk: 'Low' }, { name: 'Fairlearn', version: '0.10.0', license: 'MIT', risk: 'Low' }, { name: 'imbalanced-learn', version: '0.11.0', license: 'MIT', risk: 'Low' }], vulnerabilities: 1, licenseConflicts: 0, sha256: 'b7e1a5c3f9d4...', attestedBy: 'Pending', owner: 'ML Engineering' },
  { id: 'AIBOM-003', modelName: 'Fraud Detection Engine', modelVersion: 'v4.2', format: 'Sentinel-AIBOM', generatedDate: '2026-03-20', status: 'Stale', baseModel: 'GPT-4o (fine-tuned)', baseModelProvider: 'OpenAI', trainingDatasets: [{ name: 'ACME Transaction History', version: '2025-Q3', license: 'Proprietary' }, { name: 'Synthetic Fraud Patterns', version: 'v3.0', license: 'Proprietary' }], frameworks: ['OpenAI API 1.x', 'Hugging Face Transformers 4.39', 'scikit-learn 1.3.2', 'PyTorch 2.2'], dependencies: [{ name: 'openai', version: '1.14.0', license: 'MIT', risk: 'Medium' }, { name: 'transformers', version: '4.39.3', license: 'Apache-2.0', risk: 'Low' }, { name: 'torch', version: '2.2.0', license: 'BSD-3', risk: 'High' }], vulnerabilities: 3, licenseConflicts: 0, sha256: 'c9d4f2b8a1e5...', attestedBy: 'Sarah Chen', owner: 'Security AI' },
  { id: 'AIBOM-004', modelName: 'Customer Churn Predictor', modelVersion: 'v2.3', format: 'CycloneDX', generatedDate: '2026-04-01', status: 'Incomplete', baseModel: 'Ensemble (Random Forest + GBDT)', baseModelProvider: 'Internal', trainingDatasets: [{ name: 'ACME Customer Behavior', version: '2026-Q1', license: 'Proprietary' }], frameworks: ['scikit-learn 1.4.0', 'pandas 2.2.0', 'MLflow 2.11.0'], dependencies: [{ name: 'scikit-learn', version: '1.4.0', license: 'BSD-3', risk: 'Low' }, { name: 'mlflow', version: '2.11.0', license: 'Apache-2.0', risk: 'Low' }], vulnerabilities: 0, licenseConflicts: 1, sha256: 'INCOMPLETE', attestedBy: 'Unassigned', owner: 'Customer Analytics' },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Verified: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  'Pending Verification': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Stale: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Incomplete: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
}

export default function AibomRegistry() {
  const [selected, setSelected] = useState<AIBOMRecord | null>(null)
  const [search, setSearch] = useState('')

  const filtered = SEED.filter(r =>
    r.modelName.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Package size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            AIBOM Registry
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">AI Bill of Materials — full component inventory for all AI models including base models, datasets, frameworks, and dependencies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported AIBOM catalog')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => toast.info('Generate AIBOM for model')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> Generate AIBOM
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Models in Registry', value: SEED.length, color: 'hsl(var(--text-1))' },
          { label: 'Verified', value: SEED.filter(r => r.status === 'Verified').length, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Total Vulnerabilities', value: SEED.reduce((s, r) => s + r.vulnerabilities, 0), color: 'hsl(var(--destructive))' },
          { label: 'License Conflicts', value: SEED.reduce((s, r) => s + r.licenseConflicts, 0), color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-xs">
        <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['AIBOM ID', 'Model', 'Base Model', 'Format', 'Datasets', 'Vulns', 'License Issues', 'Generated', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(r)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.id}</td>
                <td className="px-4 py-3"><p className="font-medium text-[hsl(var(--text-1))] text-xs">{r.modelName}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{r.modelVersion}</p></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] max-w-[120px] truncate">{r.baseModel}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.format}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{r.trainingDatasets.length}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold ${r.vulnerabilities > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--s-ok-tx))]'}`}>{r.vulnerabilities}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold ${r.licenseConflicts > 0 ? 'text-[hsl(45_85%_40%)]' : 'text-[hsl(var(--s-ok-tx))]'}`}>{r.licenseConflicts}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{r.generatedDate}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[r.status]}>{r.status}</span></td>
                <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.modelName} {selected.modelVersion}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.format}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Base Model', value: selected.baseModel },
                  { label: 'Provider', value: selected.baseModelProvider },
                  { label: 'Attested By', value: selected.attestedBy },
                  { label: 'Owner', value: selected.owner },
                  { label: 'Generated', value: selected.generatedDate },
                  { label: 'SHA-256', value: selected.sha256 },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-mono font-medium text-[hsl(var(--text-1))] mt-0.5 truncate">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Training Datasets</p>
                <div className="space-y-1">{selected.trainingDatasets.map(d => <div key={d.name} className="p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]"><p className="text-xs font-medium text-[hsl(var(--text-1))]">{d.name} {d.version}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{d.license}</p></div>)}</div>
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Dependencies</p>
                <div className="space-y-1">{selected.dependencies.map(d => <div key={d.name} className="flex items-center justify-between p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]"><div><p className="text-xs font-medium text-[hsl(var(--text-1))]">{d.name} {d.version}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{d.license}</p></div><span className="text-[10px] px-1.5 py-0.5" style={{ background: d.risk === 'High' ? 'hsl(0 72% 51% / 0.12)' : d.risk === 'Medium' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(142 71% 45% / 0.12)', color: d.risk === 'High' ? 'hsl(var(--destructive))' : d.risk === 'Medium' ? 'hsl(45 85% 40%)' : 'hsl(var(--s-ok-tx))' }}>{d.risk}</span></div>)}</div>
              </div>
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => toast.success('AIBOM downloaded')} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Download AIBOM</button>
              <button onClick={() => toast.success('Attestation requested')} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Request Attestation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
