import { useState } from 'react'
import { Certificate, MagnifyingGlass, Plus, Eye, X, Export, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

type AttestationStatus = 'Valid' | 'Expired' | 'Pending' | 'Rejected' | 'Under Review'
type AttestationType = 'Data Provenance' | 'Model Integrity' | 'Security Review' | 'Bias Audit' | 'Privacy Assessment' | 'SBOM/AIBOM Verification'

interface Attestation {
  id: string
  subject: string
  subjectType: 'Model' | 'Dataset' | 'Vendor' | 'Pipeline'
  type: AttestationType
  status: AttestationStatus
  attestedBy: string
  attestedDate: string
  validUntil: string
  scope: string
  findings: string
  evidence: string[]
  sigHash: string
  framework: string
}

const SEED: Attestation[] = [
  { id: 'ATT-001', subject: 'Credit Scoring Model v2.1', subjectType: 'Model', type: 'Bias Audit', status: 'Valid', attestedBy: 'Maria Santos', attestedDate: '2026-04-01', validUntil: '2026-07-01', scope: 'Full fairness evaluation across 6 protected attributes per ECOA/FHA requirements', findings: 'All fairness metrics within acceptable thresholds. Demographic parity ≥ 90% for all groups. Equalized odds: 91.2%.', evidence: ['BiasAuditReport_v2.1_Q1.pdf', 'FairnessMetrics_Q1_2026.xlsx', 'SHAP_Explanations_Sample.html'], sigHash: 'sha256:9f3a2b...', framework: 'ISO 42001 A.8.4' },
  { id: 'ATT-002', subject: 'ACME Credit History Dataset v2025-Q4', subjectType: 'Dataset', type: 'Data Provenance', status: 'Valid', attestedBy: 'James Liu', attestedDate: '2026-01-15', validUntil: '2027-01-15', scope: 'Full data lineage tracing, PII assessment, consent verification, and data quality audit', findings: 'Data provenance verified to source. 0 PII records without consent. Data quality score: 94.2%. Schema validated against v3.1 standard.', evidence: ['DataLineage_CreditHistory.json', 'PIIAudit_Q4_2025.pdf', 'DataQualityReport.html'], sigHash: 'sha256:c7d4e1...', framework: 'GDPR Art. 5' },
  { id: 'ATT-003', subject: 'OpenAI GPT-4o API Integration', subjectType: 'Vendor', type: 'Security Review', status: 'Under Review', attestedBy: 'Sarah Chen', attestedDate: '2026-03-28', validUntil: '2026-04-28', scope: 'Security architecture review, data residency verification, incident response SLA assessment', findings: 'PENDING: Data residency confirmation for EU data still outstanding. Incident response SLA: 4h (acceptable). SOC 2 Type II certificate valid.', evidence: ['OpenAI_SOC2_2025.pdf', 'DataResidencyQuestionnaire.pdf'], sigHash: 'PENDING', framework: 'NIST AI RMF MS-2.5' },
  { id: 'ATT-004', subject: 'Fraud Detection Engine v4.2', subjectType: 'Model', type: 'Model Integrity', status: 'Expired', attestedBy: 'James Liu', attestedDate: '2025-10-01', validUntil: '2026-01-01', scope: 'Model hash verification, adversarial robustness testing, performance benchmark validation', findings: 'EXPIRED — Model hash mismatch detected on re-verification (likely due to fine-tuning in Jan 2026). New attestation required.', evidence: ['ModelIntegrityReport_v4.2.pdf', 'AdversarialTests_Oct2025.xlsx'], sigHash: 'sha256:STALE', framework: 'NIST AI RMF MG-2.2' },
  { id: 'ATT-005', subject: 'Loan Approval Model v3.0', subjectType: 'Model', type: 'Privacy Assessment', status: 'Valid', attestedBy: 'Maria Santos', attestedDate: '2026-02-14', validUntil: '2026-08-14', scope: 'DPIA for automated credit decisions, data minimization review, retention policy compliance', findings: 'DPIA completed. Automated decision-making compliant with GDPR Art. 22. Opt-out mechanism verified. Data retention: 7 years (regulatory minimum met).', evidence: ['DPIA_LoanApproval_v3.pdf', 'DataMinimizationAudit.pdf', 'RetentionPolicyReview.pdf'], sigHash: 'sha256:e5f8a2...', framework: 'GDPR Art. 22 / Art. 35' },
  { id: 'ATT-006', subject: 'ML Training Pipeline v2.1', subjectType: 'Pipeline', type: 'SBOM/AIBOM Verification', status: 'Valid', attestedBy: 'James Liu', attestedDate: '2026-04-08', validUntil: '2026-07-08', scope: 'Full AIBOM verification including dependency CVE scan, license compliance check, supply chain integrity', findings: 'AIBOM verified. 0 known CVEs in production dependencies. All licenses OSI-approved. No copyleft contamination. Supply chain integrity verified via Sigstore.', evidence: ['AIBOM_MLPipeline_v2.1.cdx.json', 'CVEScan_April2026.pdf', 'SigstoreVerification.json'], sigHash: 'sha256:b2c9f4...', framework: 'EU CRA / NTIA SBOM Minimum Elements' },
]

const STATUS_STYLE: Record<AttestationStatus, { bg: string; color: string }> = {
  Valid: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Expired: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Pending: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Rejected: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  'Under Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
}

export default function SupplyChainAttestations() {
  const [selected, setSelected] = useState<Attestation | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = SEED.filter(a => {
    const ms = a.subject.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'All' || a.status === statusFilter)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Certificate size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Supply Chain Attestations
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Cryptographically signed attestations for AI supply chain — data, models, vendors, and pipelines</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
          <button onClick={() => toast.info('New attestation wizard')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"><Plus size={14} /> New Attestation</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Attestations', value: SEED.length, color: 'hsl(var(--text-1))' },
          { label: 'Valid', value: SEED.filter(a => a.status === 'Valid').length, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Expired', value: SEED.filter(a => a.status === 'Expired').length, color: 'hsl(var(--destructive))' },
          { label: 'Under Review', value: SEED.filter(a => a.status === 'Under Review').length, color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search attestations…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Valid', 'Expired', 'Pending', 'Under Review', 'Rejected'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Subject', 'Type', 'Attested By', 'Attested', 'Valid Until', 'Framework', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(a)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{a.id}</td>
                <td className="px-4 py-3"><p className="text-xs font-medium text-[hsl(var(--text-1))]">{a.subject}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{a.subjectType}</p></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.type}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.attestedBy}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{a.attestedDate}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{a.validUntil}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.framework}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[a.status]}>{a.status}</span></td>
                <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No attestations found</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.type}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span><span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.subjectType}</span></div>
              <div><p className="text-[11px] text-[hsl(var(--text-4))] uppercase mb-1">Subject</p><p className="text-sm font-medium text-[hsl(var(--text-1))]">{selected.subject}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Scope</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.scope}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Findings</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.findings}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Evidence Files</p><div className="space-y-1">{selected.evidence.map(e => <div key={e} className="text-xs font-mono text-[hsl(var(--brand))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-page))]" onClick={() => toast.info(`Opening ${e}`)}>{e}</div>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Signature Hash</p><p className="text-[10px] font-mono text-[hsl(var(--text-4))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] break-all">{selected.sigHash}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
