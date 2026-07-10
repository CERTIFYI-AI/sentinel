import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { Globe, Lightning, Warning, CheckCircle, Clock, ArrowRight, MagnifyingGlass, Bell, ArrowUp, ArrowDown, Minus, FileText, Target, Shield, Download, Plus, X, TrendUp } from '@phosphor-icons/react'
import { toast } from 'sonner'


type RegStatus = 'Compliant' | 'Gap Identified' | 'Under Review' | 'Not Assessed'
type ObStatus = 'Mapped' | 'Unmapped' | 'Partial' | 'Exempt'
type Urgency = 'Critical' | 'High' | 'Medium' | 'Low'

interface Regulation {
  id: string
  name: string
  jurisdiction: string
  effectiveDate: string
  daysUntil: number
  status: RegStatus
  obligationCount: number
  mappedCount: number
  unmappedCount: number
  aiImpact: Urgency
  owner: string
  source: string
  summary: string
}

interface Obligation {
  id: string
  regId: string
  regName: string
  article: string
  text: string
  status: ObStatus
  mappedControls: string[]
  dueDate: string
  urgency: Urgency
  automatable: boolean
}

interface PredictedGap {
  id: string
  probability: number
  title: string
  regulation: string
  basis: string
  daysToDeadline: number
  urgency: Urgency
  remediationEstimate: string
  actions: { label: string; to: string }[]
}

const REGULATIONS: Regulation[] = [
  { id: 'REG-001', name: 'EU AI Act', jurisdiction: 'European Union', effectiveDate: '2026-08-02', daysUntil: 112, status: 'Under Review', obligationCount: 47, mappedCount: 31, unmappedCount: 16, aiImpact: 'Critical', owner: 'Maria Santos', source: 'Official Journal of EU', summary: 'Comprehensive risk-based regulatory framework for AI systems operating in or affecting EU markets. High-risk AI systems require conformity assessment, registration, and ongoing monitoring.' },
  { id: 'REG-002', name: 'SEC AI Guidance 2026', jurisdiction: 'United States', effectiveDate: '2026-07-01', daysUntil: 80, status: 'Gap Identified', obligationCount: 23, mappedCount: 14, unmappedCount: 9, aiImpact: 'High', owner: 'Sarah Chen', source: 'SEC Release 2026-AI-001', summary: 'SEC guidance on AI use in investment decision-making, requiring disclosure, explainability records, and human oversight protocols for algorithmically-assisted trading and credit decisions.' },
  { id: 'REG-003', name: 'NIST AI RMF 2.0', jurisdiction: 'United States', effectiveDate: '2026-04-15', daysUntil: 3, status: 'Under Review', obligationCount: 38, mappedCount: 30, unmappedCount: 8, aiImpact: 'High', owner: 'James Liu', source: 'NIST SP 1270 Rev.2', summary: 'Updated NIST AI Risk Management Framework with expanded Govern, Map, Measure, and Manage functions. New emphasis on GenAI-specific risks and third-party AI governance.' },
  { id: 'REG-004', name: 'GDPR (AI Amendment)', jurisdiction: 'European Union', effectiveDate: '2026-01-01', daysUntil: -100, status: 'Compliant', obligationCount: 19, mappedCount: 19, unmappedCount: 0, aiImpact: 'Medium', owner: 'Maria Santos', source: 'EDPB Guidelines 04/2026', summary: 'GDPR interpretation guidelines specifically addressing AI model training, automated decision-making, and data subject rights in the context of AI systems.' },
  { id: 'REG-005', name: 'UK AI Regulation Bill', jurisdiction: 'United Kingdom', effectiveDate: '2026-10-01', daysUntil: 172, status: 'Not Assessed', obligationCount: 31, mappedCount: 0, unmappedCount: 31, aiImpact: 'High', owner: 'Raj Gupta', source: 'UK Parliament', summary: 'UK\'s proposed AI safety framework establishing sector-specific oversight across FCA, ICO, CMA, and Ofcom. Extraterritorial reach for AI systems serving UK users.' },
  { id: 'REG-006', name: 'ISO/IEC 42001:2024', jurisdiction: 'International', effectiveDate: '2025-12-01', daysUntil: -131, status: 'Compliant', obligationCount: 56, mappedCount: 52, unmappedCount: 4, aiImpact: 'Medium', owner: 'Emma Wilson', source: 'ISO/IEC JTC 1/SC 42', summary: 'International standard for AI management systems. Requires documented AI policy, risk assessment methodology, performance monitoring, and continual improvement processes.' },
  { id: 'REG-007', name: 'CFPB Fair Lending AI Rule', jurisdiction: 'United States', effectiveDate: '2026-06-15', daysUntil: 64, status: 'Gap Identified', obligationCount: 28, mappedCount: 16, unmappedCount: 12, aiImpact: 'Critical', owner: 'Sarah Chen', source: 'CFPB 2026-FAIR-AI', summary: 'CFPB rule requiring financial institutions to test AI models for disparate impact, maintain adverse action explanation records, and conduct quarterly bias audits for credit decisioning.' },
  { id: 'REG-008', name: 'Canada AIDA', jurisdiction: 'Canada', effectiveDate: '2027-01-01', daysUntil: 265, status: 'Not Assessed', obligationCount: 22, mappedCount: 0, unmappedCount: 22, aiImpact: 'Medium', owner: 'Raj Gupta', source: 'Bill C-27', summary: 'Canada\'s Artificial Intelligence and Data Act establishing impact assessments for high-impact AI systems and a new AI and Data Commissioner office.' },
]

const OBLIGATIONS: Obligation[] = [
  { id: 'OBL-001', regId: 'REG-001', regName: 'EU AI Act', article: 'Art. 9', text: 'High-risk AI systems shall be subject to a risk management system throughout their entire lifecycle', status: 'Mapped', mappedControls: ['CTRL-034', 'CTRL-088', 'CTRL-112'], dueDate: '2026-08-02', urgency: 'Critical', automatable: true },
  { id: 'OBL-002', regId: 'REG-001', regName: 'EU AI Act', article: 'Art. 10', text: 'Training, validation and testing data shall meet quality criteria and be relevant, sufficiently representative, and free of errors', status: 'Partial', mappedControls: ['CTRL-045'], dueDate: '2026-08-02', urgency: 'Critical', automatable: true },
  { id: 'OBL-003', regId: 'REG-001', regName: 'EU AI Act', article: 'Art. 13', text: 'High-risk AI systems shall be designed and developed with transparency to allow deployers to interpret output and use it appropriately', status: 'Unmapped', mappedControls: [], dueDate: '2026-08-02', urgency: 'Critical', automatable: false },
  { id: 'OBL-004', regId: 'REG-001', regName: 'EU AI Act', article: 'Art. 14', text: 'Human oversight measures must enable natural persons to oversee functioning, understand capabilities and limitations, intervene, and override', status: 'Mapped', mappedControls: ['CTRL-067', 'CTRL-089'], dueDate: '2026-08-02', urgency: 'High', automatable: false },
  { id: 'OBL-005', regId: 'REG-002', regName: 'SEC AI Guidance', article: 'Sec. 4.2', text: 'AI-assisted investment recommendations must include explainability records sufficient for regulatory examination', status: 'Unmapped', mappedControls: [], dueDate: '2026-07-01', urgency: 'High', automatable: true },
  { id: 'OBL-006', regId: 'REG-007', regName: 'CFPB Fair Lending', article: 'Sec. 1002.6', text: 'Adverse action notices must include specific AI-generated reasons in plain language understandable to applicants', status: 'Partial', mappedControls: ['CTRL-023'], dueDate: '2026-06-15', urgency: 'Critical', automatable: true },
  { id: 'OBL-007', regId: 'REG-003', regName: 'NIST AI RMF 2.0', article: 'GOVERN 1.1', text: 'Policies, processes, procedures and practices across the organization related to AI risk are in place', status: 'Mapped', mappedControls: ['CTRL-001', 'CTRL-002', 'CTRL-003'], dueDate: '2026-04-15', urgency: 'High', automatable: false },
  { id: 'OBL-008', regId: 'REG-007', regName: 'CFPB Fair Lending', article: 'Sec. 1002.9', text: 'Quarterly disparate impact testing required for all credit-decisioning AI models serving consumer markets', status: 'Mapped', mappedControls: ['CTRL-078', 'CTRL-079'], dueDate: '2026-06-15', urgency: 'Critical', automatable: true },
]

const PREDICTED_GAPS: PredictedGap[] = [
  { id: 'GAP-001', probability: 89, title: 'EU AI Act Art.13 Transparency — High-Risk Systems', regulation: 'EU AI Act', basis: '11 high-risk models lack explainability documentation. 89% of organizations with similar profile failed Art.13 at conformity assessment.', daysToDeadline: 112, urgency: 'Critical', remediationEstimate: '6-8 weeks', actions: [{ label: 'Open Explainability Center', to: '/explainability' }, { label: 'Generate Docs', to: '/documents' }] },
  { id: 'GAP-002', probability: 74, title: 'CFPB ECOA Adverse Action Explanation Gap', regulation: 'CFPB Fair Lending AI Rule', basis: 'Loan Approval Model v3.0 cannot generate ECOA-compliant adverse action reasons. CFPB enforcement data: 74% chance of exam finding.', daysToDeadline: 64, urgency: 'Critical', remediationEstimate: '3-4 weeks', actions: [{ label: 'Model Explainability', to: '/explainability' }, { label: 'Run Bias Audit', to: '/bias-audits' }] },
  { id: 'GAP-003', probability: 61, title: 'SEC AI Guidance — Missing Explainability Records', regulation: 'SEC AI Guidance 2026', basis: 'No audit trail for AI-assisted credit recommendations. SEC examination cycle begins Q3 2026 with 61% of similar firms receiving findings.', daysToDeadline: 80, urgency: 'High', remediationEstimate: '4-5 weeks', actions: [{ label: 'Audit Chain', to: '/evidence-chain' }, { label: 'Compliance Evidence', to: '/evidence-vault' }] },
  { id: 'GAP-004', probability: 48, title: 'UK AI Bill — Extraterritorial Assessment Not Started', regulation: 'UK AI Regulation Bill', basis: '3 AI systems serve UK market with no UK-specific assessment. Early assessment critical: 90-day minimum preparation window.', daysToDeadline: 172, urgency: 'Medium', remediationEstimate: '8-10 weeks', actions: [{ label: 'AI Impact Assessment', to: '/aiia' }, { label: 'View Reg Radar', to: '/reg-radar' }] },
]

const RADAR_DATA = [
  { axis: 'EU AI Act', score: 66 },
  { axis: 'NIST AI RMF', score: 79 },
  { axis: 'ISO 42001', score: 93 },
  { axis: 'GDPR', score: 100 },
  { axis: 'CFPB', score: 57 },
  { axis: 'SEC AI', score: 61 },
]

const TIMELINE_DATA = [
  { month: 'Jan', obligations: 82, controls: 68, coverage: 83 },
  { month: 'Feb', obligations: 95, controls: 76, coverage: 80 },
  { month: 'Mar', obligations: 118, controls: 89, coverage: 75 },
  { month: 'Apr', obligations: 156, controls: 112, coverage: 72 },
  { month: 'May (proj)', obligations: 180, controls: 138, coverage: 77 },
  { month: 'Jun (proj)', obligations: 195, controls: 158, coverage: 81 },
]

const STATUS_STYLE: Record<RegStatus, React.CSSProperties> = {
  Compliant:      { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  'Gap Identified':{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  'Under Review': { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  'Not Assessed': { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
}

const OB_STYLE: Record<ObStatus, React.CSSProperties> = {
  Mapped:   { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Unmapped: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  Partial:  { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  Exempt:   { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
}

const URGENCY_DOT: Record<Urgency, string> = {
  Critical: 'hsl(var(--destructive))',
  High:     'hsl(var(--s-wn-tx))',
  Medium:   'hsl(var(--s-in-tx))',
  Low:      'hsl(var(--s-ok-tx))',
}

export default function RegulatoryIntelligenceEngine() {
  const [tab, setTab] = useState<'feed' | 'obligations' | 'gaps' | 'coverage'>('feed')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [selected, setSelected] = useState<Regulation | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'obligations' | 'mapping'>('overview')

  const filteredRegs = useMemo(() => REGULATIONS.filter(r => {
    const ms = r.name.toLowerCase().includes(search.toLowerCase()) || r.jurisdiction.toLowerCase().includes(search.toLowerCase())
    const ss = statusFilter === 'All' || r.status === statusFilter
    return ms && ss
  }), [search, statusFilter])

  const totalObs = REGULATIONS.reduce((s, r) => s + r.obligationCount, 0)
  const mappedObs = REGULATIONS.reduce((s, r) => s + r.mappedCount, 0)
  const unmappedObs = REGULATIONS.reduce((s, r) => s + r.unmappedCount, 0)
  const criticalGaps = PREDICTED_GAPS.filter(g => g.urgency === 'Critical').length

  const regObligations = selected ? OBLIGATIONS.filter(o => o.regId === selected.id) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Globe size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Regulatory Intelligence Engine
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">
            Live monitoring of 200+ regulatory sources — auto-extracted obligations, AI impact scoring, control mapping
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Regulatory brief exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
            <Download size={14} /> Export Brief
          </button>
          <button onClick={() => toast.success('Alert subscription updated')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm hover:opacity-90">
            <Bell size={14} /> Subscribe to Alerts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Regulations Monitored', value: REGULATIONS.length, sub: '200+ sources tracked', color: 'hsl(var(--brand))' },
          { label: 'Total Obligations', value: totalObs, sub: `${mappedObs} mapped`, color: 'hsl(var(--text-1))' },
          { label: 'Unmapped Obligations', value: unmappedObs, sub: 'Require control mapping', color: 'hsl(var(--destructive))' },
          { label: 'Predicted Gaps', value: criticalGaps, sub: 'Critical — action required', color: 'hsl(var(--destructive))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex border-b border-[hsl(var(--border))]">
        {([['feed', 'Regulatory Feed'], ['obligations', 'Obligation Matrix'], ['gaps', 'Predicted Gaps'], ['coverage', 'Coverage Map']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-sm font-medium transition-colors" style={tab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regulations…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                {['All', 'Compliant', 'Gap Identified', 'Under Review', 'Not Assessed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredRegs.map(reg => {
              const pct = Math.round((reg.mappedCount / reg.obligationCount) * 100)
              const isUrgent = reg.daysUntil > 0 && reg.daysUntil <= 90
              return (
                <div key={reg.id} onClick={() => { setSelected(reg); setDrawerTab('overview') }} className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{reg.id}</span>
                        <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[reg.status] || { background: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{reg.status}</span>
                        <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{reg.jurisdiction}</span>
                        <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: URGENCY_DOT[reg.aiImpact] + '20', color: URGENCY_DOT[reg.aiImpact] }}>AI Impact: {reg.aiImpact}</span>
                        {isUrgent && <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--destructive))] font-semibold animate-pulse">{reg.daysUntil}d</span>}
                        {reg.daysUntil < 0 && <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]">Effective</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{reg.name}</h3>
                      <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 line-clamp-2">{reg.summary}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-xs text-[hsl(var(--text-4))]">Effective: {reg.effectiveDate}</p>
                      <p className="text-xs text-[hsl(var(--text-3))]">{reg.obligationCount} obligations</p>
                      <p className="text-xs font-semibold" style={{ color: pct >= 80 ? 'hsl(var(--s-ok-tx))' : pct >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>{pct}% mapped</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-[hsl(var(--text-4))]">{reg.mappedCount}/{reg.obligationCount} obligations mapped to controls</p>
                      <p className="text-[10px] text-[hsl(var(--text-4))]">{reg.unmappedCount} gaps</p>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? 'hsl(var(--s-ok-tx))' : pct >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[hsl(var(--border))]">
                    <span className="text-[10px] text-[hsl(var(--text-4))]">Owner: {reg.owner}</span>
                    <span className="text-[10px] text-[hsl(var(--text-4))]">Source: {reg.source}</span>
                    <button className="ml-auto text-[10px] text-[hsl(var(--brand))] hover:underline flex items-center gap-1">
                      View obligations <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'obligations' && (
        <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-raised">
                {['ID', 'Regulation', 'Article', 'Obligation', 'Status', 'Controls Mapped', 'Due Date', 'Auto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OBLIGATIONS.map(ob => (
                <tr key={ob.id} className="border-b border-[hsl(var(--border))] hover:bg-raised">
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{ob.id}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))] font-medium max-w-[120px] truncate">{ob.regName}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{ob.article}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))] max-w-[300px]">
                    <p className="line-clamp-2">{ob.text}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={OB_STYLE[ob.status] || { background: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{ob.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {ob.mappedControls.length > 0
                        ? ob.mappedControls.slice(0, 2).map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.2)]">{c}</span>)
                        : <span className="text-[10px] text-[hsl(var(--destructive))]">None — map now</span>}
                      {ob.mappedControls.length > 2 && <span className="text-[10px] text-[hsl(var(--text-4))]">+{ob.mappedControls.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{ob.dueDate}</td>
                  <td className="px-4 py-3">
                    {ob.automatable
                      ? <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] font-medium">Auto</span>
                      : <span className="text-[10px] text-[hsl(var(--text-4))]">Manual</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 flex items-center justify-between border-t border-[hsl(var(--border))] bg-raised">
            <p className="text-xs text-[hsl(var(--text-4))]">{OBLIGATIONS.length} obligations shown · {OBLIGATIONS.filter(o => o.status === 'Unmapped').length} unmapped</p>
            <button onClick={() => toast.success('Auto-mapping initiated for all automatable obligations')} className="text-xs px-3 py-1.5 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] hover:opacity-90">
              Auto-Map All Automatable
            </button>
          </div>
        </div>
      )}

      {tab === 'gaps' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded border border-[hsl(var(--s-er-bg))] bg-[hsl(var(--s-er-bg))]">
            <Warning size={16} className="text-[hsl(var(--destructive))] flex-shrink-0" />
            <p className="text-sm text-[hsl(var(--text-2))]">
              <span className="font-semibold text-[hsl(var(--destructive))]">{PREDICTED_GAPS.filter(g => g.urgency === 'Critical').length} Critical</span> compliance gaps predicted with high confidence based on your current posture vs. regulatory requirements and industry enforcement data.
            </p>
          </div>
          {PREDICTED_GAPS.map(gap => (
            <div key={gap.id} className="rounded border bg-surface p-5" style={{ borderColor: gap.urgency === 'Critical' ? 'hsl(var(--destructive) / 0.35)' : gap.urgency === 'High' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--border))' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-bold" style={{ color: gap.urgency === 'Critical' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))' }}>{gap.probability}%</div>
                      <div className="text-xs text-[hsl(var(--text-4))]">probability</div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 font-semibold" style={{ background: URGENCY_DOT[gap.urgency] + '20', color: URGENCY_DOT[gap.urgency] }}>{gap.urgency}</span>
                    <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{gap.regulation}</span>
                    <span className="text-[10px] text-[hsl(var(--text-4))]">{gap.daysToDeadline}d to deadline</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-1">{gap.title}</h3>
                  <p className="text-xs text-[hsl(var(--text-3))] leading-relaxed mb-3">{gap.basis}</p>
                  <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-4))]">
                    <span>Remediation estimate: <span className="text-[hsl(var(--text-2))] font-medium">{gap.remediationEstimate}</span></span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-24 text-center">
                  <div className="relative w-16 h-16 mx-auto">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeDasharray={`${gap.probability} ${100 - gap.probability}`}
                        stroke={gap.urgency === 'Critical' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))'} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold" style={{ color: gap.urgency === 'Critical' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))' }}>{gap.probability}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">Gap probability</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                {gap.actions.map(a => (
                  <a key={a.label} href={a.to} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">
                    {a.label} <ArrowRight size={11} />
                  </a>
                ))}
                <button onClick={() => toast.success('Gap remediation task created')} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] hover:opacity-90">
                  <Plus size={11} /> Create Remediation Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'coverage' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Regulatory Coverage Radar</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: 'hsl(var(--text-3))', fontSize: 11 }} />
                <Radar name="Coverage %" dataKey="score" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Obligation Coverage Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={TIMELINE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--text-4))', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(var(--text-4))', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', borderRadius: 4, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="obligations" name="Total Obligations" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="controls" name="Mapped Controls" stroke="hsl(var(--brand))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="col-span-2 rounded border border-[hsl(var(--border))] bg-surface p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Framework Coverage Summary</h3>
            <div className="space-y-3">
              {REGULATIONS.map(r => {
                const pct = Math.round((r.mappedCount / r.obligationCount) * 100)
                return (
                  <div key={r.id} className="flex items-center gap-4">
                    <div className="w-36 flex-shrink-0">
                      <p className="text-xs font-medium text-[hsl(var(--text-2))] truncate">{r.name}</p>
                      <p className="text-[10px] text-[hsl(var(--text-4))]">{r.jurisdiction}</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? 'hsl(var(--s-ok-tx))' : pct >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }} />
                      </div>
                    </div>
                    <div className="w-24 text-right flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: pct >= 80 ? 'hsl(var(--s-ok-tx))' : pct >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>{pct}%</span>
                      <span className="text-[10px] text-[hsl(var(--text-4))] ml-1">({r.mappedCount}/{r.obligationCount})</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 font-medium flex-shrink-0 w-28 text-center" style={STATUS_STYLE[r.status] || { background: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{r.status}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.name}</h2>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{selected.jurisdiction} · {selected.source}</p>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="flex border-b border-[hsl(var(--border))]">
              {([['overview', 'Overview'], ['obligations', 'Obligations'], ['mapping', 'Control Mapping']] as const).map(([t, l]) => (
                <button key={t} onClick={() => setDrawerTab(t)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors" style={drawerTab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>{l}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'overview' && (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status] || { background: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{selected.status}</span>
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={{ background: URGENCY_DOT[selected.aiImpact] + '20', color: URGENCY_DOT[selected.aiImpact] }}>AI Impact: {selected.aiImpact}</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.summary}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Effective Date', value: selected.effectiveDate },
                      { label: 'Days Until', value: selected.daysUntil > 0 ? `${selected.daysUntil} days` : 'Already effective' },
                      { label: 'Obligations', value: `${selected.obligationCount} total` },
                      { label: 'Coverage', value: `${Math.round((selected.mappedCount / selected.obligationCount) * 100)}% mapped` },
                      { label: 'Owner', value: selected.owner },
                      { label: 'Unmapped', value: `${selected.unmappedCount} gaps` },
                    ].map(f => (
                      <div key={f.label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{f.label}</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  {selected.daysUntil > 0 && selected.daysUntil <= 120 && (
                    <div className="p-3 bg-[hsl(var(--s-er-bg))] border border-[hsl(var(--destructive)/0.3)]">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[hsl(var(--destructive))]" />
                        <p className="text-xs font-semibold text-[hsl(var(--destructive))]">{selected.daysUntil} days until effective — action required</p>
                      </div>
                      <p className="text-xs text-[hsl(var(--text-3))] mt-1">{selected.unmappedCount} obligations still unmapped. Map to controls or create remediation tasks immediately.</p>
                    </div>
                  )}
                </>
              )}
              {drawerTab === 'obligations' && (
                <>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">{regObligations.length} Obligations extracted</p>
                  <div className="space-y-2">
                    {regObligations.length > 0 ? regObligations.map(ob => (
                      <div key={ob.id} className="p-3 bg-raised border border-[hsl(var(--border))]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{ob.article}</span>
                          <span className="text-[10px] px-1.5 py-0.5 font-medium" style={OB_STYLE[ob.status] || { background: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{ob.status}</span>
                          {ob.automatable && <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]">Automatable</span>}
                        </div>
                        <p className="text-xs text-[hsl(var(--text-2))] leading-relaxed">{ob.text}</p>
                        {ob.mappedControls.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {ob.mappedControls.map(c => <span key={c} className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))]">{c}</span>)}
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="p-4 text-center text-sm text-[hsl(var(--text-4))]">No obligations extracted yet for this regulation</div>
                    )}
                  </div>
                </>
              )}
              {drawerTab === 'mapping' && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">Control Coverage</p>
                    <button onClick={() => toast.success('Auto-mapping initiated')} className="text-xs px-3 py-1.5 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] hover:opacity-90">Auto-Map</button>
                  </div>
                  <div className="p-4 bg-raised border border-[hsl(var(--border))] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--text-2))]">Mapped obligations</span>
                      <span className="text-xs font-bold text-[hsl(var(--s-ok-tx))]">{selected.mappedCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[hsl(var(--text-2))]">Unmapped obligations</span>
                      <span className="text-xs font-bold text-[hsl(var(--destructive))]">{selected.unmappedCount}</span>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                      <div className="h-full bg-[hsl(var(--s-ok-tx))]" style={{ width: `${Math.round((selected.mappedCount / selected.obligationCount) * 100)}%` }} />
                    </div>
                  </div>
                  <button onClick={() => toast.success('Gap analysis report generated')} className="w-full py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">
                    Generate Gap Analysis Report
                  </button>
                </>
              )}
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => toast.success('Obligation mapping task created')} className="flex-1 py-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] text-sm font-medium hover:opacity-90">Map Obligations</button>
              <button onClick={() => toast.success('Regulatory brief exported')} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised">Export Brief</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
