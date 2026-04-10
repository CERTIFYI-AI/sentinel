import { useState } from 'react'
import { Certificate, MagnifyingGlass, Plus, X, Export, Trash, ShieldCheck, FileText, ArrowClockwise, Pencil } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

type AttestationStatus = 'Valid' | 'Expired' | 'Pending' | 'Rejected' | 'Under Review'
type AttestationType = 'Data Provenance' | 'Model Integrity' | 'Security Review' | 'Bias Audit' | 'Privacy Assessment' | 'SBOM/AIBOM Verification'
type SubjectType = 'Model' | 'Dataset' | 'Vendor' | 'Pipeline'

interface Attestation {
  id: string
  subject: string
  subjectType: SubjectType
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
  reviewNotes?: string
  nextReviewDate?: string
}

const SEED: Attestation[] = [
  { id: 'ATT-001', subject: 'Credit Scoring Model v2.1', subjectType: 'Model', type: 'Bias Audit', status: 'Valid', attestedBy: 'Maria Santos', attestedDate: '2026-04-01', validUntil: '2026-07-01', scope: 'Full fairness evaluation across 6 protected attributes per ECOA/FHA requirements', findings: 'All fairness metrics within acceptable thresholds. Demographic parity ≥ 90% for all groups. Equalized odds: 91.2%.', evidence: ['BiasAuditReport_v2.1_Q1.pdf', 'FairnessMetrics_Q1_2026.xlsx', 'SHAP_Explanations_Sample.html'], sigHash: 'sha256:9f3a2b...', framework: 'ISO 42001 A.8.4', nextReviewDate: '2026-07-01', reviewNotes: 'Q1 2026 audit passed all fairness thresholds. Recommend expanding to intersectional analysis in Q2.' },
  { id: 'ATT-002', subject: 'ACME Credit History Dataset v2025-Q4', subjectType: 'Dataset', type: 'Data Provenance', status: 'Valid', attestedBy: 'James Liu', attestedDate: '2026-01-15', validUntil: '2027-01-15', scope: 'Full data lineage tracing, PII assessment, consent verification, and data quality audit', findings: 'Data provenance verified to source. 0 PII records without consent. Data quality score: 94.2%. Schema validated against v3.1 standard.', evidence: ['DataLineage_CreditHistory.json', 'PIIAudit_Q4_2025.pdf', 'DataQualityReport.html'], sigHash: 'sha256:c7d4e1...', framework: 'GDPR Art. 5', nextReviewDate: '2027-01-15', reviewNotes: 'Annual review. All consent records verified. Minor schema drift resolved.' },
  { id: 'ATT-003', subject: 'OpenAI GPT-4o API Integration', subjectType: 'Vendor', type: 'Security Review', status: 'Under Review', attestedBy: 'Sarah Chen', attestedDate: '2026-03-28', validUntil: '2026-04-28', scope: 'Security architecture review, data residency verification, incident response SLA assessment', findings: 'PENDING: Data residency confirmation for EU data still outstanding. Incident response SLA: 4h (acceptable). SOC 2 Type II certificate valid.', evidence: ['OpenAI_SOC2_2025.pdf', 'DataResidencyQuestionnaire.pdf'], sigHash: 'PENDING', framework: 'NIST AI RMF MS-2.5', reviewNotes: 'Awaiting EU data residency confirmation from OpenAI compliance team. Expected by Apr 25.' },
  { id: 'ATT-004', subject: 'Fraud Detection Engine v4.2', subjectType: 'Model', type: 'Model Integrity', status: 'Expired', attestedBy: 'James Liu', attestedDate: '2025-10-01', validUntil: '2026-01-01', scope: 'Model hash verification, adversarial robustness testing, performance benchmark validation', findings: 'EXPIRED — Model hash mismatch detected on re-verification (likely due to fine-tuning in Jan 2026). New attestation required.', evidence: ['ModelIntegrityReport_v4.2.pdf', 'AdversarialTests_Oct2025.xlsx'], sigHash: 'sha256:STALE', framework: 'NIST AI RMF MG-2.2', reviewNotes: 'Fine-tuning in Jan 2026 invalidated the hash. New attestation cycle must be initiated.' },
  { id: 'ATT-005', subject: 'Loan Approval Model v3.0', subjectType: 'Model', type: 'Privacy Assessment', status: 'Valid', attestedBy: 'Maria Santos', attestedDate: '2026-02-14', validUntil: '2026-08-14', scope: 'DPIA for automated credit decisions, data minimization review, retention policy compliance', findings: 'DPIA completed. Automated decision-making compliant with GDPR Art. 22. Opt-out mechanism verified. Data retention: 7 years (regulatory minimum met).', evidence: ['DPIA_LoanApproval_v3.pdf', 'DataMinimizationAudit.pdf', 'RetentionPolicyReview.pdf'], sigHash: 'sha256:e5f8a2...', framework: 'GDPR Art. 22 / Art. 35', nextReviewDate: '2026-08-14' },
  { id: 'ATT-006', subject: 'ML Training Pipeline v2.1', subjectType: 'Pipeline', type: 'SBOM/AIBOM Verification', status: 'Valid', attestedBy: 'James Liu', attestedDate: '2026-04-08', validUntil: '2026-07-08', scope: 'Full AIBOM verification including dependency CVE scan, license compliance check, supply chain integrity', findings: 'AIBOM verified. 0 known CVEs in production dependencies. All licenses OSI-approved. No copyleft contamination. Supply chain integrity verified via Sigstore.', evidence: ['AIBOM_MLPipeline_v2.1.cdx.json', 'CVEScan_April2026.pdf', 'SigstoreVerification.json'], sigHash: 'sha256:b2c9f4...', framework: 'EU CRA / NTIA SBOM Minimum Elements', nextReviewDate: '2026-07-08' },
]

const STATUS_STYLE: Record<AttestationStatus, { bg: string; color: string }> = {
  Valid: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Expired: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Pending: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Rejected: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  'Under Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
}

const SUBJECT_COLOR: Record<SubjectType, string> = {
  Model: 'hsl(var(--brand))',
  Dataset: 'hsl(142 71% 45%)',
  Vendor: 'hsl(280 67% 56%)',
  Pipeline: 'hsl(220 90% 56%)',
}

const BLANK = {
  subject: '', subjectType: 'Model' as SubjectType, type: 'Bias Audit' as AttestationType,
  attestedBy: '', attestedDate: '', validUntil: '', scope: '', findings: '',
  evidence: '', sigHash: '', framework: '', reviewNotes: '', nextReviewDate: '',
}

export default function SupplyChainAttestations() {
  const [attestations, setAttestations] = useState<Attestation[]>(SEED)
  const [selected, setSelected] = useState<Attestation | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'document' | 'verification' | 'renewal'>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<Attestation | null>(null)

  const filtered = attestations.filter(a => {
    const q = search.toLowerCase()
    const ms = a.subject.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.attestedBy.toLowerCase().includes(q)
    return ms && (statusFilter === 'All' || a.status === statusFilter) && (typeFilter === 'All' || a.type === typeFilter)
  })

  const stats = {
    total: attestations.length,
    valid: attestations.filter(a => a.status === 'Valid').length,
    expired: attestations.filter(a => a.status === 'Expired').length,
    underReview: attestations.filter(a => a.status === 'Under Review').length,
  }

  function openCreate() {
    setForm(BLANK)
    setEditMode(false)
    setShowCreate(true)
  }

  function openEdit(a: Attestation) {
    setForm({
      subject: a.subject, subjectType: a.subjectType, type: a.type,
      attestedBy: a.attestedBy, attestedDate: a.attestedDate, validUntil: a.validUntil,
      scope: a.scope, findings: a.findings, evidence: a.evidence.join('\n'),
      sigHash: a.sigHash, framework: a.framework,
      reviewNotes: a.reviewNotes ?? '', nextReviewDate: a.nextReviewDate ?? '',
    })
    setEditMode(true)
    setShowCreate(true)
    setSelected(null)
  }

  function handleSave() {
    if (!form.subject || !form.attestedBy || !form.attestedDate) {
      toast.error('Subject, attested by, and attestation date are required')
      return
    }
    if (editMode && selected) {
      setAttestations(prev => prev.map(a => a.id === selected.id ? {
        ...a, subject: form.subject, subjectType: form.subjectType, type: form.type,
        attestedBy: form.attestedBy, attestedDate: form.attestedDate, validUntil: form.validUntil,
        scope: form.scope, findings: form.findings,
        evidence: form.evidence.split('\n').map(s => s.trim()).filter(Boolean),
        sigHash: form.sigHash, framework: form.framework,
        reviewNotes: form.reviewNotes || undefined, nextReviewDate: form.nextReviewDate || undefined,
      } : a))
      toast.success(`${form.subject} attestation updated`)
    } else {
      const newId = `ATT-${String(attestations.length + 1).padStart(3, '0')}`
      const newA: Attestation = {
        id: newId, subject: form.subject, subjectType: form.subjectType, type: form.type,
        status: 'Pending', attestedBy: form.attestedBy,
        attestedDate: form.attestedDate || new Date().toISOString().slice(0, 10),
        validUntil: form.validUntil || '', scope: form.scope, findings: form.findings || 'Pending assessment',
        evidence: form.evidence.split('\n').map(s => s.trim()).filter(Boolean),
        sigHash: form.sigHash || 'PENDING', framework: form.framework || 'TBD',
        reviewNotes: form.reviewNotes || undefined, nextReviewDate: form.nextReviewDate || undefined,
      }
      setAttestations(prev => [newA, ...prev])
      toast.success(`${newId} — Attestation created for ${newA.subject}`)
    }
    setShowCreate(false)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setAttestations(prev => prev.filter(a => a.id !== deleteTarget.id))
    if (selected?.id === deleteTarget.id) setSelected(null)
    toast.success(`Attestation ${deleteTarget.id} removed`)
    setDeleteTarget(null)
  }

  function openDrawer(a: Attestation) {
    setSelected(a)
    setDrawerTab('overview')
  }

  const allTypes = Array.from(new Set(attestations.map(a => a.type)))

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
          <button onClick={() => toast.success('Attestations exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> New Attestation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Attestations', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Valid', value: stats.valid, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Expired', value: stats.expired, color: 'hsl(var(--destructive))' },
          { label: 'Under Review', value: stats.underReview, color: 'hsl(45 85% 40%)' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search attestations…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Valid', 'Expired', 'Pending', 'Under Review', 'Rejected'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          <option>All</option>
          {allTypes.map(t => <option key={t}>{t}</option>)}
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
              <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => openDrawer(a)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{a.id}</td>
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-[hsl(var(--text-1))]">{a.subject}</p>
                  <p className="text-[10px] font-medium mt-0.5" style={{ color: SUBJECT_COLOR[a.subjectType] }}>{a.subjectType}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.type}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.attestedBy}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{a.attestedDate}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{a.validUntil || '—'}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] max-w-[120px] truncate">{a.framework}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[a.status]}>{a.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(a)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteTarget(a)} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No attestations found</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.type}</h2>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => openEdit(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>
                <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
              </div>
            </div>

            <div className="flex border-b border-[hsl(var(--border))]">
              {(['overview', 'document', 'verification', 'renewal'] as const).map(tab => (
                <button key={tab} onClick={() => setDrawerTab(tab)} className="flex-1 py-2.5 text-[11px] font-medium capitalize transition-colors" style={drawerTab === tab ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'overview' && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                    <span className="text-[11px] px-2 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-3))] font-medium" style={{ color: SUBJECT_COLOR[selected.subjectType] }}>{selected.subjectType}</span>
                  </div>
                  <div>
                    <p className="text-[11px] text-[hsl(var(--text-4))] uppercase mb-1">Subject</p>
                    <p className="text-sm font-medium text-[hsl(var(--text-1))]">{selected.subject}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Attested By', value: selected.attestedBy },
                      { label: 'Framework', value: selected.framework },
                      { label: 'Attestation Date', value: selected.attestedDate },
                      { label: 'Valid Until', value: selected.validUntil || 'N/A' },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Scope</p>
                    <p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.scope}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Findings</p>
                    <p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.findings}</p>
                  </div>
                  {selected.reviewNotes && (
                    <div>
                      <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Review Notes</p>
                      <p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.reviewNotes}</p>
                    </div>
                  )}
                </>
              )}

              {drawerTab === 'document' && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Evidence Files</p>
                    <div className="space-y-2">
                      {selected.evidence.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--text-4))]">No evidence files attached</p>
                      ) : selected.evidence.map(e => (
                        <div key={e} className="flex items-center gap-2 p-2.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] cursor-pointer hover:border-[hsl(var(--brand)/0.4)]" onClick={() => toast.info(`Opening ${e}`)}>
                          <FileText size={14} className="text-[hsl(var(--brand))] flex-shrink-0" />
                          <span className="text-xs font-mono text-[hsl(var(--text-2))] flex-1 truncate">{e}</span>
                          <Export size={12} className="text-[hsl(var(--text-4))]" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Document Metadata</p>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                          <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">Type</p>
                          <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{selected.type}</p>
                        </div>
                        <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                          <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">Subject Type</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: SUBJECT_COLOR[selected.subjectType] }}>{selected.subjectType}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'verification' && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Cryptographic Verification</p>
                    <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Signature Hash (SHA-256)</p>
                      <p className="text-[11px] font-mono text-[hsl(var(--text-1))] break-all">{selected.sigHash}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Verification Status</p>
                    <div className="space-y-2">
                      {[
                        { check: 'Signature Valid', pass: selected.sigHash !== 'PENDING' && selected.sigHash !== 'sha256:STALE' },
                        { check: 'Within Validity Period', pass: selected.status === 'Valid' },
                        { check: 'Evidence Files Present', pass: selected.evidence.length > 0 },
                        { check: 'Framework Reference', pass: !!selected.framework },
                      ].map(({ check, pass }) => (
                        <div key={check} className="flex items-center gap-2 p-2.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }} />
                          <p className="text-xs text-[hsl(var(--text-2))]">{check}</p>
                          <span className="ml-auto text-[10px] font-medium" style={{ color: pass ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>{pass ? 'PASS' : 'FAIL'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Regulatory Framework</p>
                    <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                      <p className="text-sm font-medium text-[hsl(var(--text-1))]">{selected.framework}</p>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'renewal' && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Renewal Schedule</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">Valid Until</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{selected.validUntil || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">Next Review</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{selected.nextReviewDate ?? 'Not scheduled'}</p>
                      </div>
                    </div>
                  </div>
                  {(selected.status === 'Expired' || selected.status === 'Under Review') && (
                    <div className="p-3 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)]">
                      <p className="text-xs font-semibold text-[hsl(var(--destructive))] mb-1">Action Required</p>
                      <p className="text-xs text-[hsl(var(--text-2))]">
                        {selected.status === 'Expired' ? 'This attestation has expired and must be renewed before this component can be considered compliant.' : 'This attestation is under review. Findings are pending — do not assume compliance until review is complete.'}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Renewal History</p>
                    <div className="space-y-2">
                      <div className="p-2.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-xs font-medium text-[hsl(var(--text-1))]">Current Cycle</p>
                        <p className="text-[10px] text-[hsl(var(--text-4))] mt-0.5">Attested {selected.attestedDate} by {selected.attestedBy}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => openEdit(selected)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))] flex items-center justify-center gap-1.5">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => { toast.success('Renewal workflow initiated'); setSelected(null) }} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90 flex items-center justify-center gap-1.5">
                <ArrowClockwise size={13} /> Renew
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
                <ShieldCheck size={15} className="text-[hsl(var(--brand))]" />
                {editMode ? 'Edit Attestation' : 'New Attestation'}
              </h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Subject Name *</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Credit Scoring Model v2.1" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Subject Type</label>
                  <select value={form.subjectType} onChange={e => setForm(p => ({ ...p, subjectType: e.target.value as SubjectType }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    {['Model', 'Dataset', 'Vendor', 'Pipeline'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Attestation Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as AttestationType }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    {['Data Provenance', 'Model Integrity', 'Security Review', 'Bias Audit', 'Privacy Assessment', 'SBOM/AIBOM Verification'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Attested By *</label>
                  <input value={form.attestedBy} onChange={e => setForm(p => ({ ...p, attestedBy: e.target.value }))} placeholder="e.g. Maria Santos" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Framework</label>
                  <input value={form.framework} onChange={e => setForm(p => ({ ...p, framework: e.target.value }))} placeholder="e.g. ISO 42001 A.8.4" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Attestation Date *</label>
                  <input type="date" value={form.attestedDate} onChange={e => setForm(p => ({ ...p, attestedDate: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Valid Until</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Scope</label>
                <textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} rows={3} placeholder="Describe what this attestation covers..." className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Findings</label>
                <textarea value={form.findings} onChange={e => setForm(p => ({ ...p, findings: e.target.value }))} rows={3} placeholder="Key findings from the attestation..." className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Evidence Files (one per line)</label>
                <textarea value={form.evidence} onChange={e => setForm(p => ({ ...p, evidence: e.target.value }))} rows={2} placeholder="e.g. BiasAuditReport.pdf&#10;FairnessMetrics.xlsx" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Signature Hash</label>
                <input value={form.sigHash} onChange={e => setForm(p => ({ ...p, sigHash: e.target.value }))} placeholder="e.g. sha256:9f3a2b..." className="w-full px-3 py-2 text-sm font-mono border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">{editMode ? 'Save Changes' : 'Create Attestation'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete attestation?"
        description={`Permanently delete attestation ${deleteTarget?.id} for "${deleteTarget?.subject}". This cannot be undone.`}
        isDestructive
        confirmLabel="Delete Attestation"
      />
    </div>
  )
}
