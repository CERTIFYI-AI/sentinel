import { useState } from 'react'
import { FileMagnifyingGlass, Plus, Eye, X, Trash, PencilSimple, Export, Warning, CheckCircle, Clock, MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

type AIIAStatus = 'Draft' | 'In Progress' | 'Pending Review' | 'Approved' | 'Rejected' | 'Completed'
type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal'

interface AIIA {
  id: string
  name: string
  system: string
  description: string
  status: AIIAStatus
  risk: RiskLevel
  date: string
  dueDate: string
  owner: string
  framework: string
  department: string
  version: string
  purposeOfUse: string
  dataCategories: string[]
  affectedGroups: string
  automatedDecision: boolean
  humanOversight: string
  mitigations: { area: string; measure: string; status: 'Implemented' | 'Planned' | 'Not Applicable' }[]
  findings: { id: string; description: string; severity: 'High' | 'Medium' | 'Low'; status: 'Open' | 'Resolved' }[]
  approvers: string[]
  reviewedAt?: string
  notes: string
}

const SEED: AIIA[] = [
  {
    id: 'AIIA-001', name: 'Customer Scoring Model v2', system: 'Credit Engine', description: 'Automated credit scoring model used for consumer loan decisions. Processes applicant financial history, income verification, and behavioural data.',
    status: 'Completed', risk: 'High', date: '2026-03-15', dueDate: '2026-04-15', owner: 'Sarah Chen', framework: 'EU AI Act Art. 10 + ECOA',
    department: 'Risk & Compliance', version: 'v2.1.0', purposeOfUse: 'Automated consumer credit scoring for loan approval decisions affecting individuals seeking personal and auto loans.',
    dataCategories: ['Financial history', 'Income verification', 'Employment data', 'Behavioural signals'], affectedGroups: 'Loan applicants (est. 15,000/month)',
    automatedDecision: true, humanOversight: 'Borderline scores (0.45–0.65) routed to underwriter review; all rejections require human sign-off.',
    mitigations: [
      { area: 'Bias', measure: 'Monthly demographic parity testing across protected attributes', status: 'Implemented' },
      { area: 'Transparency', measure: 'SHAP explanations provided with each decision', status: 'Implemented' },
      { area: 'Accuracy', measure: 'Monthly drift monitoring with automatic retraining trigger', status: 'Implemented' },
      { area: 'Appeal', measure: 'Automated appeal pathway via customer portal', status: 'Planned' },
    ],
    findings: [
      { id: 'F-001', description: 'Gender parity gap of 8.2% detected in March batch', severity: 'High', status: 'Resolved' },
      { id: 'F-002', description: 'Explanation generation fails for edge-case income profiles', severity: 'Medium', status: 'Open' },
    ],
    approvers: ['James Patel (Compliance)', 'Maria Santos (ML Lead)'], reviewedAt: '2026-03-20', notes: 'Approved subject to quarterly bias reviews and appeal pathway completion by Q3 2026.',
  },
  {
    id: 'AIIA-002', name: 'Resume Screening Agent', system: 'HR Platform', description: 'AI agent that pre-screens job applications by ranking candidates based on CV content, skills matching, and cultural fit signals.',
    status: 'In Progress', risk: 'Critical', date: '2026-03-28', dueDate: '2026-04-28', owner: 'Michael Torres', framework: 'EU AI Act + EEOC Guidelines',
    department: 'Human Resources', version: 'v1.3.0', purposeOfUse: 'Automated first-stage screening of job applications to rank candidates for human recruiter review.',
    dataCategories: ['CV / résumé content', 'Skills profiles', 'Education data', 'Work history'], affectedGroups: 'Job applicants (est. 2,000/month)',
    automatedDecision: false, humanOversight: 'All shortlisting decisions reviewed by recruiter. Agent provides ranked list only — no autonomous rejection.',
    mitigations: [
      { area: 'Bias', measure: 'Blind screening mode — name and graduation year masked', status: 'Implemented' },
      { area: 'Fairness', measure: 'Protected attribute neutralization in scoring model', status: 'Planned' },
      { area: 'Transparency', measure: 'Candidate score breakdown available to recruiting team', status: 'Implemented' },
    ],
    findings: [
      { id: 'F-003', description: 'Model over-weights elite university affiliation — proxy for socioeconomic bias', severity: 'High', status: 'Open' },
      { id: 'F-004', description: 'No documented appeal process for screened-out candidates', severity: 'Medium', status: 'Open' },
    ],
    approvers: ['Sarah Chen (CISO)', 'Legal Counsel'], notes: 'Critical risk — must complete bias remediation before production use.',
  },
  {
    id: 'AIIA-003', name: 'Fraud Detection Pipeline', system: 'Risk Engine', description: 'Real-time transaction fraud detection using ML ensemble. Flags suspicious transactions for human review or automatic block.',
    status: 'Completed', risk: 'Medium', date: '2026-02-20', dueDate: '2026-03-20', owner: 'Priya Gupta', framework: 'PCI DSS + FFIEC',
    department: 'Risk', version: 'v4.2.1', purposeOfUse: 'Real-time detection of fraudulent card transactions to protect customers and reduce financial losses.',
    dataCategories: ['Transaction data', 'Device fingerprint', 'Geolocation', 'Merchant data'], affectedGroups: 'Cardholders (all active accounts)',
    automatedDecision: true, humanOversight: 'Scores > 0.85 auto-blocked; scores 0.55–0.85 sent to fraud analyst queue.',
    mitigations: [
      { area: 'False positives', measure: 'Weekly FP rate review with 5% maximum threshold', status: 'Implemented' },
      { area: 'Explainability', measure: 'Top-5 contributing features shown to analysts', status: 'Implemented' },
      { area: 'Disparate impact', measure: 'Quarterly analysis of block rates by customer segment', status: 'Implemented' },
    ],
    findings: [],
    approvers: ['Head of Risk', 'Compliance Team'], reviewedAt: '2026-02-25', notes: 'Approved. No critical findings. Annual re-assessment due Feb 2027.',
  },
  {
    id: 'AIIA-004', name: 'Content Moderation Bot', system: 'Trust & Safety', description: 'Automated moderation of user-generated content on customer portal — flags, hides, or removes policy-violating content.',
    status: 'Pending Review', risk: 'High', date: '2026-04-01', dueDate: '2026-04-30', owner: 'James Wilson', framework: 'DSA + Platform Policy',
    department: 'Trust & Safety', version: 'v2.0.0', purposeOfUse: 'Automated moderation of user forum content at scale to enforce community guidelines.',
    dataCategories: ['User-generated text', 'Images', 'User account data'], affectedGroups: 'Portal users (est. 45,000 active)',
    automatedDecision: true, humanOversight: 'Removals > 3 strikes escalated to human moderator. All appeals reviewed by T&S team.',
    mitigations: [
      { area: 'False positives', measure: 'Over-refusal rate monitored daily; alert at > 2%', status: 'Implemented' },
      { area: 'Appeal', measure: 'User appeal button on all moderation actions', status: 'Implemented' },
      { area: 'Bias', measure: 'Language and dialect bias audit pending', status: 'Planned' },
    ],
    findings: [
      { id: 'F-005', description: 'Dialect and non-standard English over-flagged vs standard English', severity: 'High', status: 'Open' },
    ],
    approvers: ['Sarah Chen', 'Legal Counsel'], notes: 'Awaiting legal sign-off on DSA compliance section.',
  },
  {
    id: 'AIIA-005', name: 'Predictive Maintenance Model', system: 'Operations', description: 'Predicts equipment failure likelihood for data center infrastructure. Used to schedule preventive maintenance.',
    status: 'Draft', risk: 'Low', date: '2026-04-05', dueDate: '2026-05-05', owner: 'Anika Patel', framework: 'ISO 31000',
    department: 'Operations', version: 'v0.9.0', purposeOfUse: 'Predict hardware failure to optimize maintenance scheduling and reduce unplanned downtime.',
    dataCategories: ['Sensor telemetry', 'Maintenance logs', 'Equipment specs'], affectedGroups: 'Internal operations team only',
    automatedDecision: false, humanOversight: 'All maintenance decisions made by operations team. Model provides recommendations only.',
    mitigations: [
      { area: 'Accuracy', measure: 'Model accuracy monitored against historical failure data', status: 'Planned' },
    ],
    findings: [],
    approvers: ['CTO'], notes: 'Low-risk internal tool. Fast-track assessment in progress.',
  },
  {
    id: 'AIIA-006', name: 'Chatbot Response Generator', system: 'Customer Support', description: 'LLM-powered customer service chatbot that handles tier-1 support queries and routes complex cases to human agents.',
    status: 'Completed', risk: 'Medium', date: '2026-01-12', dueDate: '2026-02-12', owner: 'David Kim', framework: 'EU AI Act + Consumer Protection',
    department: 'Customer Experience', version: 'v3.5.2', purposeOfUse: 'Automated tier-1 customer support to reduce wait times and handle FAQs at scale.',
    dataCategories: ['Customer query text', 'Account data (read-only)', 'Interaction history'], affectedGroups: 'All customers contacting support',
    automatedDecision: false, humanOversight: 'Human escalation available at any time. Frustration detection triggers automatic agent routing.',
    mitigations: [
      { area: 'Hallucination', measure: 'RAG grounding with approved knowledge base only', status: 'Implemented' },
      { area: 'PII', measure: 'Automatic PII masking in logs', status: 'Implemented' },
      { area: 'Escalation', measure: 'Clear escalation path with < 30s wait time SLA', status: 'Implemented' },
    ],
    findings: [
      { id: 'F-006', description: 'Occasional hallucination on product pricing — patched with RAG guardrail', severity: 'Medium', status: 'Resolved' },
    ],
    approvers: ['VP Customer Experience', 'Legal Counsel'], reviewedAt: '2026-01-18', notes: 'Approved. Quarterly review scheduled.',
  },
]

const BLANK: Omit<AIIA, 'id' | 'findings'> = {
  name: '', system: '', description: '', status: 'Draft', risk: 'Medium', date: new Date().toISOString().slice(0, 10),
  dueDate: '', owner: '', framework: 'EU AI Act', department: '', version: 'v1.0.0',
  purposeOfUse: '', dataCategories: [], affectedGroups: '', automatedDecision: false,
  humanOversight: '', mitigations: [], approvers: [], notes: '',
}

const STATUS_STYLE: Record<AIIAStatus, { bg: string; color: string }> = {
  Draft: { bg: 'hsl(0 0% 50% / 0.12)', color: 'hsl(var(--text-4))' },
  'In Progress': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  'Pending Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Approved: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Rejected: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Completed: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
}

const RISK_STYLE: Record<RiskLevel, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(25 95% 45% / 0.12)', color: 'hsl(25 85% 40%)' },
  Medium: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Low: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
  Minimal: { bg: 'hsl(142 71% 45% / 0.08)', color: 'hsl(var(--s-ok-tx))' },
}

const MITIGATION_STATUS: Record<string, { bg: string; color: string }> = {
  Implemented: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Planned: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  'Not Applicable': { bg: 'hsl(0 0% 50% / 0.10)', color: 'hsl(var(--text-4))' },
}

const FINDING_SEV: Record<string, { bg: string; color: string }> = {
  High: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Medium: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Low: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
}

export default function AIImpactAssessments() {
  const [records, setRecords] = useState<AIIA[]>(SEED)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [riskFilter, setRiskFilter] = useState('All')
  const [selected, setSelected] = useState<AIIA | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AIIA | null>(null)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<AIIA | null>(null)

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const ms = r.name.toLowerCase().includes(q) || r.system.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    return ms && (statusFilter === 'All' || r.status === statusFilter) && (riskFilter === 'All' || r.risk === riskFilter)
  })

  const stats = {
    total: records.length,
    critical: records.filter(r => r.risk === 'Critical' || r.risk === 'High').length,
    pending: records.filter(r => r.status === 'Pending Review' || r.status === 'In Progress').length,
    completed: records.filter(r => r.status === 'Completed' || r.status === 'Approved').length,
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...BLANK })
    setFormOpen(true)
  }

  function openEdit(r: AIIA) {
    setEditing(r)
    setForm({ name: r.name, system: r.system, description: r.description, status: r.status, risk: r.risk, date: r.date, dueDate: r.dueDate, owner: r.owner, framework: r.framework, department: r.department, version: r.version, purposeOfUse: r.purposeOfUse, dataCategories: r.dataCategories, affectedGroups: r.affectedGroups, automatedDecision: r.automatedDecision, humanOversight: r.humanOversight, mitigations: r.mitigations, approvers: r.approvers, notes: r.notes })
    setFormOpen(true)
    setSelected(null)
  }

  function saveForm() {
    if (!form.name.trim() || !form.system.trim()) { toast.error('Name and system are required.'); return }
    if (editing) {
      setRecords(prev => prev.map(r => r.id === editing.id ? { ...editing, ...form } : r))
      toast.success('Assessment updated')
    } else {
      const newR: AIIA = { ...form, id: `AIIA-${String(records.length + 1).padStart(3, '0')}`, findings: [] }
      setRecords(prev => [newR, ...prev])
      toast.success('Assessment created')
    }
    setFormOpen(false)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast.success(`Assessment ${deleteTarget.id} deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
  }

  function submitForReview(r: AIIA) {
    setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Pending Review' as AIIAStatus } : x))
    setSelected(prev => prev?.id === r.id ? { ...prev, status: 'Pending Review' } : prev)
    toast.success(`${r.id} submitted for review`)
  }

  function approveAssessment(r: AIIA) {
    setRecords(prev => prev.map(x => x.id === r.id ? { ...x, status: 'Approved' as AIIAStatus, reviewedAt: new Date().toISOString().slice(0, 10) } : x))
    setSelected(prev => prev?.id === r.id ? { ...prev, status: 'Approved', reviewedAt: new Date().toISOString().slice(0, 10) } : prev)
    toast.success(`${r.id} approved`)
  }

  const sf = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <FileMagnifyingGlass size={20} className="text-[hsl(var(--brand))]" />
            AI Impact Assessments
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Document and review the impact of AI systems on individuals and society per EU AI Act Art. 9</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--brand))] hover:opacity-90">
            <Plus size={14} /> New Assessment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'High / Critical Risk', value: stats.critical, color: 'hsl(var(--destructive))' },
          { label: 'Under Review', value: stats.pending, color: 'hsl(45 85% 40%)' },
          { label: 'Completed / Approved', value: stats.completed, color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[180px] border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assessments…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Draft', 'In Progress', 'Pending Review', 'Approved', 'Rejected', 'Completed'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Critical', 'High', 'Medium', 'Low', 'Minimal'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Assessment Name', 'AI System', 'Risk Level', 'Status', 'Owner', 'Due Date', 'Actions'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-[hsl(var(--text-4))]">No assessments match your filters.</td></tr>
            )}
            {filtered.map(r => {
              const ss = STATUS_STYLE[r.status]
              const rs = RISK_STYLE[r.risk]
              return (
                <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[hsl(var(--brand))]">{r.id}</td>
                  <td className="px-3 py-2.5 font-medium text-[hsl(var(--text-1))] max-w-[200px] truncate">{r.name}</td>
                  <td className="px-3 py-2.5 text-[hsl(var(--text-3))]">{r.system}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={rs}>{r.risk}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={ss}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[hsl(var(--text-3))]">{r.owner}</td>
                  <td className="px-3 py-2.5 text-[hsl(var(--text-4))] font-mono text-xs">{r.dueDate || '—'}</td>
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(r)} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]" title="View"><Eye size={13} /></button>
                      <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]" title="Edit"><PencilSimple size={13} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]" title="Delete"><Trash size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-2 text-xs text-[hsl(var(--text-4))] border-t border-[hsl(var(--border))]">{filtered.length} of {records.length} assessments</div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-[640px] h-full bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <span className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</span>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={RISK_STYLE[selected.risk]}>{selected.risk} Risk</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><PencilSimple size={12} /> Edit</button>
                {selected.status === 'Draft' || selected.status === 'In Progress' ? (
                  <button onClick={() => submitForReview(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(var(--brand))] text-white hover:opacity-90"><ArrowRight size={12} /> Submit for Review</button>
                ) : selected.status === 'Pending Review' ? (
                  <button onClick={() => approveAssessment(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(var(--s-ok-tx))] text-white hover:opacity-90"><CheckCircle size={12} /> Approve</button>
                ) : null}
                <button onClick={() => setSelected(null)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              {/* Overview */}
              <div className="grid grid-cols-2 gap-4 p-4 border border-[hsl(var(--border))] rounded">
                <InfoRow label="AI System" value={selected.system} />
                <InfoRow label="Department" value={selected.department} />
                <InfoRow label="Owner" value={selected.owner} />
                <InfoRow label="Framework" value={selected.framework} />
                <InfoRow label="Version" value={selected.version} />
                <InfoRow label="Date" value={selected.date} />
                <InfoRow label="Due Date" value={selected.dueDate || '—'} />
                <InfoRow label="Automated Decision" value={selected.automatedDecision ? 'Yes' : 'No'} />
                {selected.reviewedAt && <InfoRow label="Reviewed At" value={selected.reviewedAt} />}
              </div>

              {/* Description */}
              <Section title="Description">
                <p className="text-[hsl(var(--text-3))] text-sm">{selected.description}</p>
              </Section>

              {/* Purpose of Use */}
              <Section title="Purpose of Use">
                <p className="text-[hsl(var(--text-3))] text-sm">{selected.purposeOfUse}</p>
              </Section>

              {/* Affected Groups */}
              <Section title="Data & Affected Groups">
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] text-[hsl(var(--text-4))] uppercase mb-1">Data Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.dataCategories.map(d => <span key={d} className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{d}</span>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-[hsl(var(--text-4))] uppercase mb-1">Affected Groups</p>
                    <p className="text-[hsl(var(--text-3))]">{selected.affectedGroups}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[hsl(var(--text-4))] uppercase mb-1">Human Oversight</p>
                    <p className="text-[hsl(var(--text-3))]">{selected.humanOversight}</p>
                  </div>
                </div>
              </Section>

              {/* Mitigations */}
              {selected.mitigations.length > 0 && (
                <Section title={`Risk Mitigations (${selected.mitigations.length})`}>
                  <div className="space-y-2">
                    {selected.mitigations.map((m, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-2.5 border border-[hsl(var(--border))]">
                        <div>
                          <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase">{m.area}</p>
                          <p className="text-xs text-[hsl(var(--text-2))] mt-0.5">{m.measure}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 font-medium flex-shrink-0" style={MITIGATION_STATUS[m.status]}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Findings */}
              <Section title={`Findings (${selected.findings.length})`}>
                {selected.findings.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--text-4))]">No findings recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.findings.map(f => (
                      <div key={f.id} className="flex items-start justify-between gap-3 p-2.5 border border-[hsl(var(--border))]">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{f.id}</span>
                            <span className="text-[10px] px-1.5 py-0.5 font-medium" style={FINDING_SEV[f.severity]}>{f.severity}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 font-medium ${f.status === 'Resolved' ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--s-wn-tx))]'}`}>{f.status}</span>
                          </div>
                          <p className="text-xs text-[hsl(var(--text-2))]">{f.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Approvers */}
              {selected.approvers.length > 0 && (
                <Section title="Approvers">
                  <div className="flex flex-wrap gap-2">
                    {selected.approvers.map(a => (
                      <span key={a} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-2))]">
                        <CheckCircle size={11} className="text-[hsl(var(--s-ok-tx))]" /> {a}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Notes */}
              {selected.notes && (
                <Section title="Notes">
                  <p className="text-xs text-[hsl(var(--text-3))]">{selected.notes}</p>
                </Section>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFormOpen(false)} />
          <div className="relative w-[600px] max-h-[85vh] overflow-y-auto bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{editing ? 'Edit Assessment' : 'New AI Impact Assessment'}</h2>
              <button onClick={() => setFormOpen(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Assessment Name *">
                  <input value={form.name} onChange={e => sf('name', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Customer Scoring Model v3" />
                </FormField>
                <FormField label="AI System *">
                  <input value={form.system} onChange={e => sf('system', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Credit Engine" />
                </FormField>
                <FormField label="Department">
                  <input value={form.department} onChange={e => sf('department', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Risk & Compliance" />
                </FormField>
                <FormField label="Owner">
                  <input value={form.owner} onChange={e => sf('owner', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. Sarah Chen" />
                </FormField>
                <FormField label="Risk Level">
                  <select value={form.risk} onChange={e => sf('risk', e.target.value as RiskLevel)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none">
                    {['Critical', 'High', 'Medium', 'Low', 'Minimal'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select value={form.status} onChange={e => sf('status', e.target.value as AIIAStatus)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none">
                    {['Draft', 'In Progress', 'Pending Review', 'Approved', 'Rejected', 'Completed'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </FormField>
                <FormField label="Framework">
                  <input value={form.framework} onChange={e => sf('framework', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. EU AI Act Art. 9" />
                </FormField>
                <FormField label="Version">
                  <input value={form.version} onChange={e => sf('version', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="e.g. v1.0.0" />
                </FormField>
                <FormField label="Assessment Date">
                  <input type="date" value={form.date} onChange={e => sf('date', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none" />
                </FormField>
                <FormField label="Due Date">
                  <input type="date" value={form.dueDate} onChange={e => sf('dueDate', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none" />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea value={form.description} onChange={e => sf('description', e.target.value)} rows={3} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none" placeholder="Describe the AI system and its use case…" />
              </FormField>
              <FormField label="Purpose of Use">
                <textarea value={form.purposeOfUse} onChange={e => sf('purposeOfUse', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none" placeholder="How and why the AI system is used…" />
              </FormField>
              <FormField label="Affected Groups">
                <input value={form.affectedGroups} onChange={e => sf('affectedGroups', e.target.value)} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none" placeholder="e.g. Loan applicants (est. 15,000/month)" />
              </FormField>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoDecision" checked={form.automatedDecision} onChange={e => sf('automatedDecision', e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
                <label htmlFor="autoDecision" className="text-sm text-[hsl(var(--text-2))]">Makes automated decisions affecting individuals</label>
              </div>
              <FormField label="Human Oversight Mechanism">
                <textarea value={form.humanOversight} onChange={e => sf('humanOversight', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none" placeholder="Describe human oversight and appeal processes…" />
              </FormField>
              <FormField label="Notes">
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none" placeholder="Additional reviewer notes…" />
              </FormField>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--brand))] hover:opacity-90">{editing ? 'Save Changes' : 'Create Assessment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Assessment"
        description={`Are you sure you want to delete ${deleteTarget?.id} — "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[hsl(var(--text-1))] font-medium mt-0.5">{value}</p>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">{label}</label>
      {children}
    </div>
  )
}
