import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { TooltipProvider } from '../components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Buildings, FileText, Clock, Warning, CheckCircle, User, Calendar,
  ArrowRight, MagnifyingGlass, FolderOpen, ShieldCheck, Gavel,
  DownloadSimple, Upload, Plus, Eye, Siren,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';


type ExamStatus = 'scheduled' | 'active' | 'response_due' | 'closed' | 'findings_open';

interface Examination {
  id: string;
  regulator: string;
  regulatorLogo: string;
  type: string;
  scope: string;
  startDate: string;
  endDate: string;
  status: ExamStatus;
  lead: string;
  openFindings: number;
  docRequests: number;
  docFulfilled: number;
  riskRating?: 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
}

const EXAMINATIONS: Examination[] = [
  {
    id: 'EXM-2026-001',
    regulator: 'Federal Reserve',
    regulatorLogo: 'FED',
    type: 'SR 11-7 Model Risk Review',
    scope: 'CreditRisk-XGB, FraudDetect-LSTM — model validation, governance, and documentation',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    status: 'active',
    lead: 'James Patel',
    openFindings: 2,
    docRequests: 18,
    docFulfilled: 14,
    riskRating: undefined,
  },
  {
    id: 'EXM-2026-002',
    regulator: 'OCC',
    regulatorLogo: 'OCC',
    type: 'AI/ML Risk Management Examination',
    scope: 'AI strategy, governance framework, bias testing practices, and consumer harm controls',
    startDate: '2026-05-01',
    endDate: '2026-07-31',
    status: 'scheduled',
    lead: 'Sarah Chen',
    openFindings: 0,
    docRequests: 0,
    docFulfilled: 0,
  },
  {
    id: 'EXM-2025-003',
    regulator: 'FCA (UK)',
    regulatorLogo: 'FCA',
    type: 'Consumer Duty AI Fair Treatment Review',
    scope: 'AI-driven customer decisions, explainability, complaint analysis, vulnerable customer protections',
    startDate: '2025-09-01',
    endDate: '2025-12-15',
    status: 'findings_open',
    lead: 'James Patel',
    openFindings: 1,
    docRequests: 24,
    docFulfilled: 24,
    riskRating: 'needs_improvement',
  },
  {
    id: 'EXM-2025-001',
    regulator: 'FFIEC',
    regulatorLogo: 'FFC',
    type: 'Cybersecurity and Technology Risk',
    scope: 'AI system security controls, access management, vendor oversight, incident response',
    startDate: '2025-04-01',
    endDate: '2025-06-30',
    status: 'closed',
    lead: 'Sarah Chen',
    openFindings: 0,
    docRequests: 31,
    docFulfilled: 31,
    riskRating: 'satisfactory',
  },
];

interface DocRequest {
  id: string;
  examId: string;
  title: string;
  description: string;
  requestedDate: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'submitted' | 'accepted' | 'rejected';
  category: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
}

const DOC_REQUESTS: DocRequest[] = [
  { id: 'DR-001', examId: 'EXM-2026-001', title: 'Model validation reports for CreditRisk-XGB v3.2', description: 'Full validation documentation including backtesting, stress testing, and bias analysis', requestedDate: '2026-03-05', dueDate: '2026-04-01', status: 'submitted', category: 'Validation', assignee: 'Raj Gupta', priority: 'high' },
  { id: 'DR-002', examId: 'EXM-2026-001', title: 'Model Risk Committee meeting minutes (2025–2026)', description: 'All MRC meeting minutes, voting records, and model approval documentation', requestedDate: '2026-03-05', dueDate: '2026-04-01', status: 'accepted', category: 'Governance', assignee: 'James Patel', priority: 'high' },
  { id: 'DR-003', examId: 'EXM-2026-001', title: 'Bias and fairness audit results — FraudDetect-LSTM', description: 'Statistical parity, equalized odds, and disparate impact analysis', requestedDate: '2026-03-10', dueDate: '2026-04-15', status: 'in_progress', category: 'Fairness', assignee: 'Maria Santos', priority: 'high' },
  { id: 'DR-004', examId: 'EXM-2026-001', title: 'Model explainability methodology documentation', description: 'SHAP/LIME documentation, adverse action notice procedures, challenge process', requestedDate: '2026-03-15', dueDate: '2026-04-20', status: 'in_progress', category: 'Explainability', assignee: 'Maria Santos', priority: 'medium' },
  { id: 'DR-005', examId: 'EXM-2026-001', title: 'Data governance policy and lineage records', description: 'Training data documentation, lineage, consent records, and data quality reports', requestedDate: '2026-03-20', dueDate: '2026-04-30', status: 'open', category: 'Data Governance', assignee: 'Raj Gupta', priority: 'medium' },
  { id: 'DR-006', examId: 'EXM-2026-001', title: 'Vendor AI risk assessments — OpenAI, Anthropic APIs', description: 'Third-party AI vendor risk assessments and contract terms', requestedDate: '2026-03-25', dueDate: '2026-05-01', status: 'open', category: 'Vendor Risk', assignee: 'David Kim', priority: 'low' },
];

const FINDINGS = [
  { id: 'FND-001', examId: 'EXM-2026-001', title: 'Inadequate model monitoring frequency for high-risk models', severity: 'significant', status: 'in_remediation', dueDate: '2026-05-15', owner: 'Raj Gupta', regulatoryRef: 'SR 11-7 Section IV.D' },
  { id: 'FND-002', examId: 'EXM-2026-001', title: 'Missing adverse action explainability for borderline credit decisions', severity: 'significant', status: 'open', dueDate: '2026-05-30', owner: 'Maria Santos', regulatoryRef: 'ECOA Reg B § 202.9' },
  { id: 'FND-003', examId: 'EXM-2025-003', title: 'Consumer vulnerability identification model lacks adequate testing', severity: 'moderate', status: 'in_remediation', dueDate: '2026-04-30', owner: 'James Patel', regulatoryRef: 'FCA Consumer Duty PS22/9' },
];

function examStatusStyle(s: ExamStatus) {
  const map: Record<ExamStatus, { bg: string; tx: string; label: string }> = {
    scheduled: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-3))', label: 'SCHEDULED' },
    active: { bg: 'hsl(var(--brand) / 0.1)', tx: 'hsl(var(--brand))', label: 'ACTIVE' },
    response_due: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))', label: 'RESPONSE DUE' },
    closed: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', label: 'CLOSED' },
    findings_open: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', label: 'FINDINGS OPEN' },
  };
  return map[s];
}

function docStatusStyle(s: DocRequest['status']) {
  const map: Record<DocRequest['status'], { bg: string; tx: string }> = {
    open: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-3))' },
    in_progress: { bg: 'hsl(var(--brand) / 0.1)', tx: 'hsl(var(--brand))' },
    submitted: { bg: 'hsl(45 90% 50% / 0.1)', tx: '#d97706' },
    accepted: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' },
    rejected: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' },
  };
  return map[s];
}

export default function ExaminationManager() {
  const { orgName } = useSettingsStore();
  const [tab, setTab] = useState('examinations');
  const [search, setSearch] = useState('');
  const [responseDialog, setResponseDialog] = useState<DocRequest | null>(null);
  const [responseText, setResponseText] = useState('');

  const activeExams = EXAMINATIONS.filter(e => e.status === 'active').length;
  const openDocRequests = DOC_REQUESTS.filter(d => d.status === 'open' || d.status === 'in_progress').length;
  const openFindings = FINDINGS.filter(f => f.status !== 'resolved').length;

  function submitResponse() {
    if (!responseText.trim()) { toast.error('Response text required'); return; }
    toast.success(`Response submitted for ${responseDialog?.title}`);
    setResponseDialog(null);
    setResponseText('');
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Examination Manager</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                FINANCIAL SERVICES
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Fed, OCC, FCA, FFIEC examination tracking · Document request workflows · Findings management
            </p>
          </div>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
            onClick={() => toast.success('New examination registered')}>
            <Plus size={13} className="mr-1.5" />Register Examination
          </Button>
        </div>

        {/* Status Strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Active Examinations', value: activeExams, alert: activeExams > 0 },
            { label: 'Open Document Requests', value: openDocRequests, alert: openDocRequests > 0, sub: `${DOC_REQUESTS.length} total requests` },
            { label: 'Open Findings', value: openFindings, alert: openFindings > 0, sub: 'Require remediation' },
            { label: 'Next Examination', value: 'OCC · May 2026', sub: 'AI/ML Risk Management' },
          ].map((tile, i) => (
            <div key={i} className="p-3" style={{ border: `1px solid ${tile.alert ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}`, background: tile.alert ? 'hsl(var(--s-wn-bg) / 0.4)' : 'hsl(var(--bg-surface))' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: tile.alert ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>{tile.value}</p>
              {tile.sub && <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>}
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="examinations" style={{ borderRadius: 0 }}>Examinations</TabsTrigger>
            <TabsTrigger value="requests" style={{ borderRadius: 0 }}>
              Document Requests
              {openDocRequests > 0 && <span className="ml-1.5 text-[9px] px-1 py-0.5 font-bold" style={{ background: 'hsl(var(--brand))', color: '#fff' }}>{openDocRequests}</span>}
            </TabsTrigger>
            <TabsTrigger value="findings" style={{ borderRadius: 0 }}>
              Findings
              {openFindings > 0 && <span className="ml-1.5 text-[9px] px-1 py-0.5 font-bold" style={{ background: 'hsl(var(--destructive))', color: '#fff' }}>{openFindings}</span>}
            </TabsTrigger>
            <TabsTrigger value="readiness" style={{ borderRadius: 0 }}>Pre-Exam Readiness</TabsTrigger>
          </TabsList>

          {/* ── Examinations ── */}
          <TabsContent value="examinations" className="mt-4 space-y-3">
            {EXAMINATIONS.map(exam => {
              const ss = examStatusStyle(exam.status);
              const docPct = exam.docRequests > 0 ? Math.round((exam.docFulfilled / exam.docRequests) * 100) : 100;
              const daysLeft = exam.status === 'active' ? Math.ceil((new Date(exam.endDate).getTime() - Date.now()) / 86400000) : null;
              return (
                <Card key={exam.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${exam.status === 'active' ? 'hsl(var(--brand) / 0.3)' : exam.status === 'findings_open' ? 'hsl(var(--destructive) / 0.3)' : 'hsl(var(--border))'}` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))' }}>
                          {exam.regulatorLogo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{exam.regulator} — {exam.type}</p>
                            <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</span>
                            {exam.riskRating && (
                              <span className="text-[9px] px-1.5 py-0.5" style={{ background: exam.riskRating === 'satisfactory' ? 'hsl(var(--s-ok-bg))' : exam.riskRating === 'needs_improvement' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-er-bg))', color: exam.riskRating === 'satisfactory' ? 'hsl(var(--s-ok-tx))' : exam.riskRating === 'needs_improvement' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))' }}>
                                {exam.riskRating.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{exam.scope}</p>
                          <div className="flex items-center gap-4 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                            <span className="flex items-center gap-1"><Calendar size={9} />{exam.startDate} → {exam.endDate}</span>
                            <span className="flex items-center gap-1"><User size={9} />Lead: {exam.lead}</span>
                            <span className="font-mono">{exam.id}</span>
                            {daysLeft !== null && (
                              <span className="flex items-center gap-1" style={{ color: daysLeft < 30 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}>
                                <Clock size={9} />{daysLeft} days remaining
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        {exam.docRequests > 0 && (
                          <div className="mb-2">
                            <p className="text-[9px] mb-1" style={{ color: 'hsl(var(--text-4))' }}>Doc requests: {exam.docFulfilled}/{exam.docRequests}</p>
                            <div className="h-1.5 w-24 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                              <div style={{ width: `${docPct}%`, height: '100%', background: docPct === 100 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--brand))' }} />
                            </div>
                          </div>
                        )}
                        {exam.openFindings > 0 && (
                          <p className="text-[9px] font-bold" style={{ color: 'hsl(var(--destructive))' }}>{exam.openFindings} open finding{exam.openFindings > 1 ? 's' : ''}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Document Requests ── */}
          <TabsContent value="requests" className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <MagnifyingGlass size={12} className="absolute left-2.5 top-2.5" style={{ color: 'hsl(var(--text-4))' }} />
                <Input placeholder="Search document requests…" className="pl-7 text-xs h-8" style={{ borderRadius: 0 }} value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      {['ID', 'Document Requested', 'Category', 'Due Date', 'Assignee', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DOC_REQUESTS.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase())).map((dr, i) => {
                      const ds = docStatusStyle(dr.status);
                      const overdue = new Date(dr.dueDate) < new Date() && dr.status !== 'accepted';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-[10px]" style={{ color: 'hsl(var(--brand))' }}>{dr.id}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{dr.title}</p>
                            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'hsl(var(--text-4))' }}>{dr.description}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-3))' }}>{dr.category}</span>
                          </td>
                          <td className="px-4 py-3" style={{ color: overdue ? 'hsl(var(--destructive))' : 'hsl(var(--text-3))' }}>
                            {overdue && <Warning size={10} className="inline mr-1" style={{ color: 'hsl(var(--destructive))' }} />}
                            {dr.dueDate}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'hsl(var(--text-3))' }}>{dr.assignee}</td>
                          <td className="px-4 py-3">
                            <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: ds.bg, color: ds.tx }}>{dr.status.replace('_', ' ').toUpperCase()}</span>
                          </td>
                          <td className="px-4 py-3">
                            {(dr.status === 'open' || dr.status === 'in_progress') && (
                              <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" style={{ borderRadius: 0 }}
                                onClick={() => setResponseDialog(dr)}>
                                <Upload size={9} className="mr-1" />Submit
                              </Button>
                            )}
                            {dr.status === 'accepted' && <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Findings ── */}
          <TabsContent value="findings" className="mt-4 space-y-3">
            {FINDINGS.map(finding => (
              <Card key={finding.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${finding.severity === 'significant' ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}` }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{finding.id}</span>
                        <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: finding.severity === 'significant' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-nt-bg))', color: finding.severity === 'significant' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>
                          {finding.severity}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5" style={{ background: finding.status === 'in_remediation' ? 'hsl(var(--brand) / 0.1)' : 'hsl(var(--s-er-bg))', color: finding.status === 'in_remediation' ? 'hsl(var(--brand))' : 'hsl(var(--s-er-tx))' }}>
                          {finding.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'hsl(var(--text-1))' }}>{finding.title}</p>
                      <div className="flex items-center gap-4 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                        <span className="flex items-center gap-1"><Gavel size={9} />Ref: {finding.regulatoryRef}</span>
                        <span className="flex items-center gap-1"><User size={9} />Owner: {finding.owner}</span>
                        <span className="flex items-center gap-1"><Clock size={9} />Due: {finding.dueDate}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" style={{ borderRadius: 0 }}
                        onClick={() => toast.success('Remediation plan updated')}>
                        Update Remediation
                      </Button>
                      <Button size="sm" className="h-7 text-[10px] px-2" style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: '#fff' }}
                        onClick={() => toast.success(`Finding ${finding.id} marked resolved`)}>
                        <CheckCircle size={10} className="mr-1" />Mark Resolved
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── Pre-Exam Readiness ── */}
          <TabsContent value="readiness" className="mt-4">
            <div className="space-y-4">
              <div className="p-3 text-xs flex items-start gap-2" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
                <ShieldCheck size={14} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p className="font-semibold mb-0.5" style={{ color: 'hsl(var(--brand))' }}>OCC Examination Pre-Readiness Checklist — May 2026</p>
                  <p style={{ color: 'hsl(var(--text-3))' }}>Preparation required before OCC AI/ML Risk Management Examination begins. Assigned to Sarah Chen (Lead). Complete all critical items by April 30, 2026.</p>
                </div>
              </div>
              {([
                { category: 'Model Inventory & Documentation', items: [
                  { task: 'Complete model inventory — all AI/ML models in scope with risk ratings', owner: 'Raj Gupta', status: 'done', critical: true },
                  { task: 'Ensure model cards / factsheets current for CreditRisk-XGB and FraudDetect-LSTM', owner: 'Maria Santos', status: 'in_progress', critical: true },
                  { task: 'Update model version history and change logs for past 12 months', owner: 'Raj Gupta', status: 'done', critical: false },
                ]},
                { category: 'Governance & MRC Documentation', items: [
                  { task: 'Compile MRC meeting minutes for last 4 quarters (2025–2026)', owner: 'James Patel', status: 'done', critical: true },
                  { task: 'Prepare SR 11-7 governance self-assessment — board-approved model risk policy', owner: 'Sarah Chen', status: 'in_progress', critical: true },
                  { task: 'Confirm quorum records and voting documentation are audit-ready', owner: 'James Patel', status: 'not_started', critical: false },
                ]},
                { category: 'Bias & Fairness Evidence', items: [
                  { task: 'Complete bias audit for CreditRisk-XGB (ECOA Reg B DI ≥ 0.85)', owner: 'Maria Santos', status: 'not_started', critical: true },
                  { task: 'Compile statistical parity and equalized odds test results for all high-risk models', owner: 'Maria Santos', status: 'in_progress', critical: true },
                  { task: 'Prepare adverse action notice sampling and review evidence', owner: 'Raj Gupta', status: 'not_started', critical: false },
                ]},
                { category: 'Consumer Harm & Explainability', items: [
                  { task: 'Document SHAP/LIME methodology and output review process', owner: 'Maria Santos', status: 'done', critical: true },
                  { task: 'Test adverse action notice accuracy for borderline credit decision cases', owner: 'Raj Gupta', status: 'not_started', critical: true },
                  { task: 'Prepare human oversight escalation workflow documentation', owner: 'David Kim', status: 'done', critical: false },
                ]},
                { category: 'Vendor & Third-Party AI Oversight', items: [
                  { task: 'Complete OpenAI and Anthropic API risk assessments', owner: 'David Kim', status: 'not_started', critical: true },
                  { task: 'Ensure vendor contracts include AI governance terms and right-to-audit', owner: 'James Patel', status: 'in_progress', critical: false },
                ]},
              ] as const).map((section, si) => {
                const done = section.items.filter(i => i.status === 'done').length;
                const pct = Math.round((done / section.items.length) * 100);
                return (
                  <Card key={si} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{section.category}</p>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'hsl(var(--s-ok-tx))' : pct >= 50 ? 'hsl(var(--brand))' : '#f59e0b' }} />
                          </div>
                          <span className="text-xs font-bold" style={{ color: pct === 100 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))' }}>{done}/{section.items.length}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {section.items.map((item, ii) => (
                          <div key={ii} className="flex items-start gap-3 p-2"
                            style={{ background: item.status === 'done' ? 'hsl(var(--s-ok-bg) / 0.5)' : item.status === 'not_started' && item.critical ? 'hsl(var(--s-er-bg) / 0.3)' : 'hsl(var(--bg-raised))', border: `1px solid ${item.status === 'done' ? 'hsl(var(--s-ok-br))' : item.status === 'not_started' && item.critical ? 'hsl(var(--s-er-br) / 0.4)' : 'hsl(var(--border))'}` }}>
                            <div className="mt-0.5 flex-shrink-0">
                              {item.status === 'done'
                                ? <CheckCircle size={13} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
                                : item.status === 'in_progress'
                                ? <Clock size={13} style={{ color: 'hsl(var(--brand))' }} />
                                : <Warning size={13} weight="fill" style={{ color: item.critical ? 'hsl(var(--destructive))' : '#f59e0b' }} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-xs" style={{ color: item.status === 'done' ? 'hsl(var(--text-3))' : 'hsl(var(--text-1))', textDecoration: item.status === 'done' ? 'line-through' : 'none' }}>{item.task}</p>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {item.critical && item.status !== 'done' && <span className="text-[8px] px-1 py-0.5 font-bold" style={{ background: 'hsl(var(--destructive))', color: '#fff' }}>CRITICAL</span>}
                                  <span className="text-[9px] px-1.5 py-0.5" style={{ background: item.status === 'done' ? 'hsl(var(--s-ok-bg))' : item.status === 'in_progress' ? 'hsl(var(--brand) / 0.1)' : 'hsl(var(--s-nt-bg))', color: item.status === 'done' ? 'hsl(var(--s-ok-tx))' : item.status === 'in_progress' ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                                    {item.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[9px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Owner: {item.owner}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Response Dialog */}
      <Dialog open={!!responseDialog} onOpenChange={() => setResponseDialog(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520, background: 'hsl(var(--bg-surface))' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
              <div className="flex items-center gap-2">
                <Upload size={15} style={{ color: 'hsl(var(--brand))' }} />
                Submit Document Response
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 text-xs" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
              <p className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{responseDialog?.title}</p>
              <p className="mt-1" style={{ color: 'hsl(var(--text-4))' }}>{responseDialog?.description}</p>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-3))' }}>Response Notes</label>
              <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Describe what documents are being submitted, any caveats or limitations…" className="text-xs" style={{ borderRadius: 0, minHeight: 80 }} />
            </div>
            <Button variant="outline" className="w-full h-16 border-dashed text-xs" style={{ borderRadius: 0 }} onClick={() => toast.info('File upload — connect to document management system')}>
              <Upload size={16} className="mr-2" style={{ color: 'hsl(var(--brand))' }} />Click to attach documents (PDF, XLSX, DOCX)
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setResponseDialog(null)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={submitResponse}>
              <Upload size={12} className="mr-1.5" />Submit to Regulator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
