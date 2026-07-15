import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { exportCsv } from '@/lib/exportUtils';
import { FileMagnifyingGlass, Plus, Eye, X, Trash, PencilSimple, Export, Warning, CheckCircle, Clock, MagnifyingGlass, ArrowRight } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useSupabaseTable } from '@/hooks/useSupabaseTable'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { StatCardRow, StatCardRowItem } from '../components/ui/StatCardRow'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { PageHeader } from '../components/ui/PageHeader'


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
  Draft: { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' },
  'In Progress': { bg: 'bg-[hsl(var(--brand-subtle))]', color: 'text-[hsl(var(--brand))]' },
  'Pending Review': { bg: 'bg-[hsl(var(--s-wn-tx))]', color: 'text-[hsl(var(--s-wn-tx))]' },
  Approved: { bg: 'bg-[hsl(var(--s-ok-tx))]', color: 'text-[hsl(var(--s-ok-tx))]' },
  Rejected: { bg: 'bg-[hsl(var(--s-er-tx))]', color: 'text-[hsl(var(--s-er-tx))]' },
  Completed: { bg: 'bg-[hsl(var(--s-ok-tx))]', color: 'text-[hsl(var(--s-ok-tx))]' },
}

const RISK_STYLE: Record<RiskLevel, { bg: string; color: string }> = {
  Critical: { bg: 'bg-[hsl(var(--s-er-tx))]', color: 'text-[hsl(var(--s-er-tx))]' },
  High: { bg: 'bg-[hsl(var(--s-wn-tx))]', color: 'text-[hsl(var(--s-wn-tx))]' },
  Medium: { bg: 'bg-[hsl(var(--s-wn-tx))]', color: 'text-[hsl(var(--s-wn-tx))]' },
  Low: { bg: 'bg-[hsl(var(--s-ok-tx))]', color: 'text-[hsl(var(--s-ok-tx))]' },
  Minimal: { bg: 'bg-[hsl(var(--s-ok-tx))]', color: 'text-[hsl(var(--s-ok-tx))]' },
}

const MITIGATION_STATUS: Record<string, { bg: string; color: string }> = {
  Implemented: { bg: 'bg-[hsl(var(--s-ok-tx))]', color: 'text-[hsl(var(--s-ok-tx))]' },
  Planned: { bg: 'bg-[hsl(var(--s-wn-tx))]', color: 'text-[hsl(var(--s-wn-tx))]' },
  'Not Applicable': { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' },
}

const FINDING_SEV: Record<string, { bg: string; color: string, border: string }> = {
  High: { bg: 'bg-[hsl(var(--s-er-tx))]', color: 'text-[hsl(var(--s-er-tx))]', border: 'border-[hsl(var(--s-er-br))]' },
  Medium: { bg: 'bg-[hsl(var(--s-wn-tx))]', color: 'text-[hsl(var(--s-wn-tx))]', border: 'border-[hsl(var(--s-wn-br))]' },
  Low: { bg: 'bg-[hsl(var(--s-ok-tx))]', color: 'text-[hsl(var(--s-ok-tx))]', border: 'border-[hsl(var(--s-ok-br))]' },
}

export default function AIImpactAssessments() {
  const { data: records, setData: setRecords } = useSupabaseTable<AIIA>('ai_impact_assessments', SEED)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader 
          title="AI Impact Assessments" 
          description="Document and review the impact of AI systems on individuals and society per EU AI Act Art. 9"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportCsv(filtered as any, 'ai-impact-assessments.csv')} className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))]">
            <Export size={16} /> Export
          </Button>
          <Button onClick={openCreate} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]">
            <Plus size={16} /> New Assessment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatCardRow cards={[
        { label: 'Total Assessments', value: stats.total, variant: 'default' },
        { label: 'High / Critical Risk', value: stats.critical, variant: 'error' },
        { label: 'Pending Review', value: stats.pending, variant: 'warn' },
        { label: 'Completed / Approved', value: stats.completed, variant: 'ok' },
      ]} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search assessments…" 
            className="pl-9 bg-surface border-[hsl(var(--border))] rounded-none h-9" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['All', 'Draft', 'In Progress', 'Pending Review', 'Approved', 'Rejected', 'Completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['All', 'Critical', 'High', 'Medium', 'Low', 'Minimal'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[hsl(var(--border))] bg-surface rounded-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-raised border-b border-[hsl(var(--border))]">
              <tr>
                {['ID', 'Assessment Name', 'AI System', 'Risk Level', 'Status', 'Owner', 'Due Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-[hsl(var(--text-3))]">No assessments match your filters.</td></tr>
              )}
              {filtered.map(r => {
                const ss = STATUS_STYLE[r.status] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }
                const rs = RISK_STYLE[r.risk] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }
                return (
                  <tr key={r.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-muted))] transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{r.id}</td>
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[200px] truncate">{r.name}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))]">{r.system}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${rs.bg} ${rs.color} border-0 rounded-none uppercase text-[10px]`}>{r.risk}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${ss.bg} ${ss.color} border-0 rounded-none`}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-2))]">{r.owner}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))] font-mono text-xs">{r.dueDate || '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(r)} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none"><Eye size={16} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] rounded-none"><PencilSimple size={16} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)} className="h-8 w-8 p-0 text-[hsl(var(--text-2))] hover:text-[hsl(var(--s-er-tx))] rounded-none"><Trash size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs text-[hsl(var(--text-3))] bg-raised border-t border-[hsl(var(--border))]">
          Showing {filtered.length} of {records.length} assessments
        </div>
      </Card>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-[700px] h-full bg-surface border-l border-[hsl(var(--border))] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border))] bg-raised">
              <div>
                <span className="font-mono text-xs text-[hsl(var(--brand))] mb-1 block">{selected.id}</span>
                <h2 className="text-lg font-bold text-[hsl(var(--text-1))]">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${(STATUS_STYLE[selected.status] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }).bg} ${(STATUS_STYLE[selected.status] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }).color} border-0 rounded-none`}>{selected.status}</Badge>
                  <Badge className={`${(RISK_STYLE[selected.risk] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }).bg} ${(RISK_STYLE[selected.risk] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }).color} border-0 rounded-none uppercase text-[10px]`}>{selected.risk} Risk</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(selected)} className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))]"><PencilSimple size={16} /> Edit</Button>
                {selected.status === 'Draft' || selected.status === 'In Progress' ? (
                  <Button size="sm" onClick={() => submitForReview(selected)} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]"><ArrowRight size={16} /> Submit for Review</Button>
                ) : selected.status === 'Pending Review' ? (
                  <Button size="sm" onClick={() => approveAssessment(selected)} className="rounded-none bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]"><CheckCircle size={16} /> Approve</Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="h-8 w-8 p-0 rounded-none"><X size={20} className="text-[hsl(var(--text-3))]" /></Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full">
                <div className="px-6 border-b border-[hsl(var(--border))] bg-raised">
                  <TabsList className="bg-transparent space-x-4 h-12 p-0">
                    <TabsTrigger value="overview" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="mitigations" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Mitigations & Findings</TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 text-sm">
                  <TabsContent value="overview" className="m-0 space-y-6 focus:outline-none">
                    {/* Overview Grid */}
                    <div className="grid grid-cols-2 gap-4 p-5 border border-[hsl(var(--border))] bg-raised rounded-none">
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

                    <Section title="Description">
                      <p className="text-[hsl(var(--text-2))] text-sm leading-relaxed">{selected.description}</p>
                    </Section>

                    <Section title="Purpose of Use">
                      <p className="text-[hsl(var(--text-2))] text-sm leading-relaxed">{selected.purposeOfUse}</p>
                    </Section>

                    <Section title="Data & Affected Groups">
                      <div className="space-y-5">
                        <div>
                          <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase mb-2 tracking-wider">Data Categories</p>
                          <div className="flex flex-wrap gap-2">
                            {selected.dataCategories.map(d => <Badge key={d} className="bg-sunken text-[hsl(var(--text-2))] border-[hsl(var(--border))] rounded-none font-normal">{d}</Badge>)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase mb-1 tracking-wider">Affected Groups</p>
                          <p className="text-[hsl(var(--text-2))]">{selected.affectedGroups}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[hsl(var(--text-3))] uppercase mb-1 tracking-wider">Human Oversight</p>
                          <p className="text-[hsl(var(--text-2))]">{selected.humanOversight}</p>
                        </div>
                      </div>
                    </Section>

                    {selected.approvers.length > 0 && (
                      <Section title="Approvers">
                        <div className="flex flex-wrap gap-2">
                          {selected.approvers.map(a => (
                            <Badge key={a} className="bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none flex items-center gap-2 px-3 py-1.5 font-normal">
                              <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))]" weight="fill" /> {a}
                            </Badge>
                          ))}
                        </div>
                      </Section>
                    )}

                    {selected.notes && (
                      <Section title="Notes">
                        <div className="bg-[hsl(var(--brand-subtle))] border-l-4 border-[hsl(var(--brand))] p-4 text-[hsl(var(--brand))] text-sm">
                          {selected.notes}
                        </div>
                      </Section>
                    )}
                  </TabsContent>

                  <TabsContent value="mitigations" className="m-0 space-y-8 focus:outline-none">
                    <Section title={`Risk Mitigations (${selected.mitigations.length})`}>
                      {selected.mitigations.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--text-3))]">No mitigations recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {selected.mitigations.map((m, i) => (
                            <div key={i} className="flex items-start justify-between gap-4 p-4 border border-[hsl(var(--border))] bg-raised rounded-none">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-[hsl(var(--text-1))] uppercase tracking-wider">{m.area}</span>
                                </div>
                                <p className="text-sm text-[hsl(var(--text-2))] mt-1">{m.measure}</p>
                              </div>
                              <Badge className={`${(MITIGATION_STATUS[m.status] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }).bg} ${(MITIGATION_STATUS[m.status] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]' }).color} border-0 rounded-none whitespace-nowrap`}>{m.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>

                    <Section title={`Findings (${selected.findings.length})`}>
                      {selected.findings.length === 0 ? (
                        <p className="text-sm text-[hsl(var(--text-3))]">No findings recorded.</p>
                      ) : (
                        <div className="space-y-3">
                          {selected.findings.map(f => (
                            <div key={f.id} className={`flex items-start justify-between gap-4 p-4 border border-[hsl(var(--border))] bg-surface border-l-4 ${(FINDING_SEV[f.severity] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]', border: 'border-[hsl(var(--border))]' }).border} rounded-none`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-mono text-xs font-bold text-[hsl(var(--text-1))]">{f.id}</span>
                                  <Badge className={`${(FINDING_SEV[f.severity] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]', border: 'border-[hsl(var(--border))]' }).bg} ${(FINDING_SEV[f.severity] || { bg: 'bg-sunken', color: 'text-[hsl(var(--text-3))]', border: 'border-[hsl(var(--border))]' }).color} border-0 rounded-none uppercase text-[10px]`}>{f.severity} Severity</Badge>
                                  <Badge className={f.status === 'Resolved' ? 'bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] border-0 rounded-none' : 'bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))] border-0 rounded-none'}>{f.status}</Badge>
                                </div>
                                <p className="text-sm text-[hsl(var(--text-2))]">{f.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative w-[700px] max-h-[85vh] overflow-y-auto bg-surface border border-[hsl(var(--border))] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[hsl(var(--border))] bg-raised">
              <h2 className="text-lg font-bold text-[hsl(var(--text-1))]">{editing ? 'Edit Assessment' : 'New AI Impact Assessment'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)} className="h-8 w-8 p-0 rounded-none"><X size={20} className="text-[hsl(var(--text-3))]" /></Button>
            </div>
            <div className="p-6 space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-5">
                <FormField label="Assessment Name *">
                  <Input value={form.name} onChange={e => sf('name', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Customer Scoring Model v3" />
                </FormField>
                <FormField label="AI System *">
                  <Input value={form.system} onChange={e => sf('system', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Credit Engine" />
                </FormField>
                <FormField label="Department">
                  <Input value={form.department} onChange={e => sf('department', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Risk & Compliance" />
                </FormField>
                <FormField label="Owner">
                  <Input value={form.owner} onChange={e => sf('owner', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Sarah Chen" />
                </FormField>
                <FormField label="Risk Level">
                  <Select value={form.risk} onValueChange={v => sf('risk', v as RiskLevel)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Critical', 'High', 'Medium', 'Low', 'Minimal'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Status">
                  <Select value={form.status} onValueChange={v => sf('status', v as AIIAStatus)}>
                    <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {['Draft', 'In Progress', 'Pending Review', 'Approved', 'Rejected', 'Completed'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Framework">
                  <Input value={form.framework} onChange={e => sf('framework', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. EU AI Act Art. 9" />
                </FormField>
                <FormField label="Version">
                  <Input value={form.version} onChange={e => sf('version', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. v1.0.0" />
                </FormField>
                <FormField label="Assessment Date">
                  <Input type="date" value={form.date} onChange={e => sf('date', e.target.value)} className="rounded-none bg-raised" />
                </FormField>
                <FormField label="Due Date">
                  <Input type="date" value={form.dueDate} onChange={e => sf('dueDate', e.target.value)} className="rounded-none bg-raised" />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea value={form.description} onChange={e => sf('description', e.target.value)} rows={3} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none rounded-none" placeholder="Describe the AI system and its use case…" />
              </FormField>
              <FormField label="Purpose of Use">
                <textarea value={form.purposeOfUse} onChange={e => sf('purposeOfUse', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none rounded-none" placeholder="How and why the AI system is used…" />
              </FormField>
              <FormField label="Affected Groups">
                <Input value={form.affectedGroups} onChange={e => sf('affectedGroups', e.target.value)} className="rounded-none bg-raised" placeholder="e.g. Loan applicants (est. 15,000/month)" />
              </FormField>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="autoDecision" checked={form.automatedDecision} onChange={e => sf('automatedDecision', e.target.checked)} className="w-4 h-4 accent-[hsl(var(--brand))]" />
                <label htmlFor="autoDecision" className="text-sm text-[hsl(var(--text-1))] font-medium">Makes automated decisions affecting individuals</label>
              </div>
              <FormField label="Human Oversight Mechanism">
                <textarea value={form.humanOversight} onChange={e => sf('humanOversight', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none rounded-none" placeholder="Describe human oversight and appeal processes…" />
              </FormField>
              <FormField label="Notes">
                <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] text-sm focus:outline-none resize-none rounded-none" placeholder="Additional reviewer notes…" />
              </FormField>
            </div>
            <div className="flex justify-end gap-3 px-6 py-5 border-t border-[hsl(var(--border))] bg-raised">
              <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))]">Cancel</Button>
              <Button onClick={saveForm} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]">{editing ? 'Save Changes' : 'Create Assessment'}</Button>
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
      <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--text-3))] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-[hsl(var(--text-1))] font-medium">{value}</p>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[hsl(var(--text-2))] tracking-wide uppercase">{label}</label>
      {children}
    </div>
  )
}
