import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  ClipboardText, MagnifyingGlass, Export, Plus, Eye, Warning, CheckCircle,
  Clock, CalendarCheck, User, Flag, ArrowRight, CaretDown, ListChecks,
  PencilSimple, Trash,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';


/* ── Types ──────────────────────────────────────────────────────────────────── */

interface AuditFinding {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Accepted';
  description: string;
  owner: string;
  dueDate: string;
}

interface AuditActionItem {
  id: string;
  title: string;
  assignee: string;
  status: 'Pending' | 'In Progress' | 'Complete' | 'Overdue';
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface AuditEvidence {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  date: string;
  status: 'Accepted' | 'Pending Review' | 'Rejected';
}

interface AuditTimeline {
  id: string;
  date: string;
  event: string;
  user: string;
}

interface Audit {
  id: string;
  framework: string;
  scope: string;
  auditor: string;
  status: 'Planning' | 'In Progress' | 'Review' | 'Closed';
  startDate: string;
  endDate: string;
  findingsCount: number;
  riskRating: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  findings: AuditFinding[];
  actionItems: AuditActionItem[];
  evidence: AuditEvidence[];
  timeline: AuditTimeline[];
}

/* ── Seed Data ──────────────────────────────────────────────────────────────── */

const AUDITS: Audit[] = [
  {
    id: 'AUD-001', framework: 'ISO 27001', scope: 'Information Security Management System — All AI Systems',
    auditor: 'Deloitte LLP', status: 'In Progress', startDate: '2026-01-15', endDate: '2026-04-30',
    findingsCount: 8, riskRating: 'Medium',
    description: 'Annual ISO 27001 recertification audit covering ISMS for all AI-powered systems at Acme Financial Corp, including model training infrastructure and data pipelines.',
    findings: [
      { id: 'F-001', title: 'Incomplete access review logs for model training servers', severity: 'High', status: 'In Progress', description: 'Access reviews for GPU cluster nodes not performed quarterly as required by A.9.2.5.', owner: 'David Kim', dueDate: '2026-03-15' },
      { id: 'F-002', title: 'Missing encryption at rest for staging model artifacts', severity: 'Medium', status: 'Open', description: 'Model checkpoints in staging environment stored without AES-256 encryption.', owner: 'Priya Sharma', dueDate: '2026-04-01' },
      { id: 'F-003', title: 'Outdated incident response procedures for AI-specific threats', severity: 'High', status: 'Resolved', description: 'IR playbook does not include adversarial attack or model poisoning scenarios.', owner: 'James Wilson', dueDate: '2026-02-28' },
    ],
    actionItems: [
      { id: 'ACT-001', title: 'Implement quarterly access review automation', assignee: 'David Kim', status: 'In Progress', dueDate: '2026-03-15', priority: 'High' },
      { id: 'ACT-002', title: 'Enable encryption for staging model artifacts', assignee: 'Priya Sharma', status: 'Pending', dueDate: '2026-04-01', priority: 'Medium' },
      { id: 'ACT-003', title: 'Update IR playbook with AI threat scenarios', assignee: 'James Wilson', status: 'Complete', dueDate: '2026-02-28', priority: 'High' },
    ],
    evidence: [
      { id: 'EV-001', name: 'Access Review Report Q4 2025', type: 'PDF', uploadedBy: 'David Kim', date: '2026-01-20', status: 'Accepted' },
      { id: 'EV-002', name: 'Encryption Configuration Screenshot', type: 'PNG', uploadedBy: 'Priya Sharma', date: '2026-02-10', status: 'Pending Review' },
    ],
    timeline: [
      { id: 'TL-001', date: '2026-01-15', event: 'Audit kickoff meeting held', user: 'Sarah Chen' },
      { id: 'TL-002', date: '2026-01-22', event: 'Document request list sent to teams', user: 'Deloitte LLP' },
      { id: 'TL-003', date: '2026-02-05', event: 'Fieldwork phase started', user: 'Deloitte LLP' },
      { id: 'TL-004', date: '2026-03-01', event: 'Draft findings shared for management response', user: 'Deloitte LLP' },
    ],
  },
  {
    id: 'AUD-002', framework: 'SOC 2 Type II', scope: 'AI Platform Trust Services Criteria',
    auditor: 'PwC', status: 'Planning', startDate: '2026-05-01', endDate: '2026-08-31',
    findingsCount: 0, riskRating: 'Low',
    description: 'SOC 2 Type II examination covering Security, Availability, and Confidentiality trust services criteria for Acme Financial Corp AI platform.',
    findings: [],
    actionItems: [
      { id: 'ACT-004', title: 'Prepare SOC 2 evidence package', assignee: 'Sarah Chen', status: 'Pending', dueDate: '2026-04-15', priority: 'High' },
      { id: 'ACT-005', title: 'Complete vendor risk assessments', assignee: 'Michael Torres', status: 'Pending', dueDate: '2026-04-20', priority: 'Medium' },
    ],
    evidence: [],
    timeline: [
      { id: 'TL-005', date: '2026-03-10', event: 'Engagement letter signed with PwC', user: 'Sarah Chen' },
      { id: 'TL-006', date: '2026-03-25', event: 'Pre-audit readiness assessment scheduled', user: 'PwC' },
    ],
  },
  {
    id: 'AUD-003', framework: 'EU AI Act', scope: 'High-Risk AI System Conformity Assessment',
    auditor: 'BSI Group', status: 'In Progress', startDate: '2026-02-01', endDate: '2026-05-15',
    findingsCount: 5, riskRating: 'High',
    description: 'Conformity assessment for Acme Financial Corp high-risk AI systems under EU AI Act Article 43, covering credit scoring, fraud detection, and AML models.',
    findings: [
      { id: 'F-004', title: 'Insufficient documentation of training data provenance', severity: 'Critical', status: 'Open', description: 'Article 10 requires detailed data governance. Credit scoring model lacks complete lineage for 3 of 12 training data sources.', owner: 'Emily Rodriguez', dueDate: '2026-03-30' },
      { id: 'F-005', title: 'Bias testing coverage gaps for protected characteristics', severity: 'High', status: 'In Progress', description: 'Article 10(2)(f) bias testing incomplete — age and disability not tested for fraud detection model.', owner: 'Amir Hassan', dueDate: '2026-04-15' },
    ],
    actionItems: [
      { id: 'ACT-006', title: 'Complete data provenance documentation', assignee: 'Emily Rodriguez', status: 'In Progress', dueDate: '2026-03-30', priority: 'High' },
      { id: 'ACT-007', title: 'Extend bias testing to all protected characteristics', assignee: 'Amir Hassan', status: 'In Progress', dueDate: '2026-04-15', priority: 'High' },
    ],
    evidence: [
      { id: 'EV-003', name: 'Credit Scoring Model Card v2.1', type: 'PDF', uploadedBy: 'Emily Rodriguez', date: '2026-02-20', status: 'Accepted' },
      { id: 'EV-004', name: 'Bias Audit Report — Fraud Detection', type: 'PDF', uploadedBy: 'Amir Hassan', date: '2026-03-05', status: 'Pending Review' },
    ],
    timeline: [
      { id: 'TL-007', date: '2026-02-01', event: 'Conformity assessment initiated', user: 'BSI Group' },
      { id: 'TL-008', date: '2026-02-15', event: 'High-risk AI system inventory verified', user: 'Sarah Chen' },
      { id: 'TL-009', date: '2026-03-01', event: 'Technical documentation review started', user: 'BSI Group' },
    ],
  },
  {
    id: 'AUD-004', framework: 'NIST AI RMF', scope: 'AI Risk Management Framework Gap Analysis',
    auditor: 'Internal Audit', status: 'Review', startDate: '2026-01-05', endDate: '2026-03-31',
    findingsCount: 12, riskRating: 'Medium',
    description: 'Internal gap analysis against NIST AI RMF functions: Govern, Map, Measure, Manage. Assessing Acme Financial Corp readiness for NIST AI RMF adoption.',
    findings: [
      { id: 'F-006', title: 'No formal AI risk appetite statement', severity: 'Medium', status: 'Open', description: 'GOVERN 1.1 — Organization lacks a formal AI risk appetite statement approved by the board.', owner: 'Sarah Chen', dueDate: '2026-04-15' },
      { id: 'F-007', title: 'Incomplete model impact assessments', severity: 'Medium', status: 'In Progress', description: 'MAP 1.1 — Impact assessments not performed for 4 of 18 production models.', owner: 'Michael Torres', dueDate: '2026-04-01' },
    ],
    actionItems: [
      { id: 'ACT-008', title: 'Draft AI risk appetite statement for board approval', assignee: 'Sarah Chen', status: 'In Progress', dueDate: '2026-04-15', priority: 'High' },
      { id: 'ACT-009', title: 'Complete remaining model impact assessments', assignee: 'Michael Torres', status: 'In Progress', dueDate: '2026-04-01', priority: 'Medium' },
    ],
    evidence: [
      { id: 'EV-005', name: 'NIST AI RMF Self-Assessment Workbook', type: 'XLSX', uploadedBy: 'Sarah Chen', date: '2026-01-10', status: 'Accepted' },
    ],
    timeline: [
      { id: 'TL-010', date: '2026-01-05', event: 'Gap analysis project initiated', user: 'Sarah Chen' },
      { id: 'TL-011', date: '2026-02-01', event: 'Function-level assessment completed', user: 'Internal Audit' },
      { id: 'TL-012', date: '2026-03-15', event: 'Draft report submitted for review', user: 'Internal Audit' },
    ],
  },
  {
    id: 'AUD-005', framework: 'GDPR', scope: 'Data Protection Assessment — AI Data Processing',
    auditor: 'Internal DPO', status: 'Closed', startDate: '2025-10-01', endDate: '2025-12-20',
    findingsCount: 6, riskRating: 'Medium',
    description: 'GDPR Data Protection Impact Assessment for AI systems processing personal data at Acme Financial Corp, covering consent management, data minimization, and cross-border transfers.',
    findings: [
      { id: 'F-008', title: 'Consent records not linked to specific AI processing purposes', severity: 'High', status: 'Resolved', description: 'Article 6/7 — Consent management system does not map consent to individual AI model training purposes.', owner: 'Legal Team', dueDate: '2025-12-01' },
      { id: 'F-009', title: 'Data retention policy not enforced for model training datasets', severity: 'Medium', status: 'Resolved', description: 'Article 5(1)(e) — Training data retained beyond stated 24-month retention period.', owner: 'Data Engineering', dueDate: '2025-12-15' },
    ],
    actionItems: [
      { id: 'ACT-010', title: 'Implement consent-purpose mapping', assignee: 'Legal Team', status: 'Complete', dueDate: '2025-12-01', priority: 'High' },
      { id: 'ACT-011', title: 'Enforce data retention automation', assignee: 'Data Engineering', status: 'Complete', dueDate: '2025-12-15', priority: 'Medium' },
    ],
    evidence: [
      { id: 'EV-006', name: 'DPIA Report — AI Processing Activities', type: 'PDF', uploadedBy: 'DPO Office', date: '2025-10-15', status: 'Accepted' },
      { id: 'EV-007', name: 'Updated Consent Management Screenshots', type: 'PDF', uploadedBy: 'Legal Team', date: '2025-11-20', status: 'Accepted' },
    ],
    timeline: [
      { id: 'TL-013', date: '2025-10-01', event: 'DPIA initiated for AI processing activities', user: 'DPO Office' },
      { id: 'TL-014', date: '2025-11-15', event: 'All findings remediated', user: 'Internal DPO' },
      { id: 'TL-015', date: '2025-12-20', event: 'Audit closed — all items resolved', user: 'Sarah Chen' },
    ],
  },
  {
    id: 'AUD-006', framework: 'Internal AI Ethics', scope: 'AI Ethics & Responsible AI Program Review',
    auditor: 'Ethics Committee', status: 'In Progress', startDate: '2026-03-01', endDate: '2026-06-30',
    findingsCount: 3, riskRating: 'Low',
    description: 'Annual review of Acme Financial Corp AI Ethics Program, covering fairness metrics, transparency commitments, human oversight mechanisms, and stakeholder engagement.',
    findings: [
      { id: 'F-010', title: 'Fairness dashboards not accessible to all stakeholders', severity: 'Low', status: 'Open', description: 'Fairness metrics dashboards restricted to ML engineers — product managers and compliance lack access.', owner: 'Platform Team', dueDate: '2026-05-01' },
    ],
    actionItems: [
      { id: 'ACT-012', title: 'Extend fairness dashboard access to compliance and product teams', assignee: 'Platform Team', status: 'Pending', dueDate: '2026-05-01', priority: 'Low' },
    ],
    evidence: [
      { id: 'EV-008', name: 'AI Ethics Program Annual Report 2025', type: 'PDF', uploadedBy: 'Ethics Committee', date: '2026-03-05', status: 'Accepted' },
    ],
    timeline: [
      { id: 'TL-016', date: '2026-03-01', event: 'Ethics review commenced', user: 'Ethics Committee' },
      { id: 'TL-017', date: '2026-03-20', event: 'Stakeholder interviews completed', user: 'Ethics Committee' },
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function statusStyle(s: string) {
  const map: Record<string, { bg: string; text: string }> = {
    Planning: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))' },
    'In Progress': { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    Review: { bg: 'hsl(280 60% 50% / 0.12)', text: 'hsl(280 60% 40%)' },
    Closed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
  };
  return map[s] || map.Planning;
}

function riskStyle(r: string) {
  const map: Record<string, { bg: string; text: string }> = {
    Critical: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--destructive))' },
    High: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(25 95% 45%)' },
    Medium: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
    Low: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
  };
  return map[r] || map.Low;
}

function findingSeverityStyle(s: string) {
  return riskStyle(s);
}

function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Metric Tile ─────────────────────────────────────────────────────────────── */

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info';
  icon: React.ReactNode; sub?: string;
}) {
  const vs: Record<string, { bg: string; color: string }> = {
    ok: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Toast ────────────────────────────────────────────────────────────────────── */

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

/* ── Component ────────────────────────────────────────────────────────────────── */

export default function AuditManagement() {
  const { orgName } = useSettingsStore();
  const [audits, setAudits] = useState<Audit[]>(AUDITS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<Audit | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // CRUD state
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Audit | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ framework: '', scope: '', auditor: '', startDate: '', endDate: '', riskRating: 'Medium' as Audit['riskRating'], status: 'Planning' as Audit['status'], description: '' });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleAdd = () => {
    if (!form.framework || !form.scope || !form.auditor || !form.startDate || !form.endDate) { toast('Please fill all required fields.', 'error'); return; }
    const newAudit: Audit = {
      id: `AUD-${String(audits.length + 1).padStart(3, '0')}`,
      ...form,
      findingsCount: 0,
      findings: [],
      actionItems: [],
      evidence: [],
      timeline: [{ id: `TL-${Date.now()}`, date: new Date().toISOString().split('T')[0], event: 'Audit created', user: 'Sarah Chen' }],
    };
    setAudits(prev => [newAudit, ...prev]);
    setAddOpen(false);
    setForm({ framework: '', scope: '', auditor: '', startDate: '', endDate: '', riskRating: 'Medium', status: 'Planning', description: '' });
    toast(`Audit ${newAudit.id} created successfully`);
  };

  const handleEdit = () => {
    if (!editTarget) return;
    setAudits(prev => prev.map(a => a.id === editTarget.id ? { ...a, ...form } : a));
    setEditTarget(null);
    toast('Audit updated successfully');
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setAudits(prev => prev.filter(a => a.id !== deleteId));
    if (selected?.id === deleteId) setSelected(null);
    toast('Audit deleted', 'info');
    setDeleteId(null);
  };

  const openEdit = (audit: Audit, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ framework: audit.framework, scope: audit.scope, auditor: audit.auditor, startDate: audit.startDate, endDate: audit.endDate, riskRating: audit.riskRating, status: audit.status, description: audit.description });
    setEditTarget(audit);
  };

  const filtered = useMemo(() => audits.filter(a => {
    if (search) {
      const q = search.toLowerCase();
      if (!a.id.toLowerCase().includes(q) && !a.framework.toLowerCase().includes(q) && !a.scope.toLowerCase().includes(q) && !a.auditor.toLowerCase().includes(q)) return false;
    }
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  }), [audits, search, filterStatus]);

  const activeAudits = audits.filter(a => a.status !== 'Closed').length;
  const findingsOpen = audits.reduce((sum, a) => sum + a.findings.filter(f => f.status !== 'Resolved').length, 0);
  const overdueActions = audits.reduce((sum, a) => sum + a.actionItems.filter(ai => ai.status === 'Overdue' || (ai.status !== 'Complete' && new Date(ai.dueDate) < new Date())).length, 0);
  const avgScore = audits.length > 0 ? Math.round(audits.filter(a => a.status === 'Closed').reduce((s, a) => s + (100 - a.findingsCount * 3), 0) / Math.max(audits.filter(a => a.status === 'Closed').length, 1)) : 0;

  const handleExport = () => {
    const csv = ['Audit ID,Framework,Scope,Auditor,Status,Start Date,End Date,Findings,Risk Rating']
      .concat(filtered.map(a => `${a.id},${a.framework},"${a.scope}",${a.auditor},${a.status},${a.startDate},${a.endDate},${a.findingsCount},${a.riskRating}`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'audits.csv'; link.click();
    URL.revokeObjectURL(url);
    toast('Exported audits to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto"
            style={{ background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))', color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300 }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Audit Management</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{orgName} · {audits.length} audits tracked</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} style={{ borderRadius: 0 }}>
            <Export size={14} /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus size={14} /> Start Audit
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Active Audits" value={String(activeAudits)} variant="info" icon={<ClipboardText size={16} weight="fill" className="text-[hsl(var(--s-in-tx))]" />} sub="Currently in progress" />
        <MetricTile label="Findings Open" value={String(findingsOpen)} variant="warn" icon={<Warning size={16} weight="fill" className="text-[hsl(var(--s-wn-tx))]" />} sub="Across all active audits" />
        <MetricTile label="Overdue Actions" value={String(overdueActions)} variant="error" icon={<Clock size={16} weight="fill" className="text-[hsl(var(--s-er-tx))]" />} sub="Require immediate attention" />
        <MetricTile label="Audit Score" value={avgScore > 0 ? `${avgScore}%` : '—'} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-[hsl(var(--s-ok-tx))]" />} sub="Average closed audit score" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search audits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" style={{ borderRadius: 0 }} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-36 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Planning">Planning</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Review">Review</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Audit ID', 'Framework', 'Scope', 'Auditor', 'Status', 'Start Date', 'End Date', 'Findings', 'Risk Rating', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const ss = statusStyle(a.status);
                  const rs = riskStyle(a.riskRating);
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(a)}>
                      <td className="px-3 py-2.5 text-xs font-mono font-medium" style={{ color: 'hsl(var(--brand))' }}>{a.id}</td>
                      <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.framework}</td>
                      <td className="px-3 py-2.5 text-xs max-w-[200px] truncate" style={{ color: 'hsl(var(--text-2))' }}>{a.scope}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.auditor}</td>
                      <td className="px-3 py-2.5">
                        <Badge style={{ background: ss.bg, color: ss.text, borderRadius: 0, fontSize: 10 }}>{a.status}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(a.startDate)}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(a.endDate)}</td>
                      <td className="px-3 py-2.5 text-xs font-medium" style={{ color: a.findingsCount > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-3))' }}>{a.findingsCount}</td>
                      <td className="px-3 py-2.5">
                        <Badge style={{ background: rs.bg, color: rs.text, borderRadius: 0, fontSize: 10 }}>{a.riskRating}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={e => { e.stopPropagation(); setSelected(a); }}>
                            <Eye size={13} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={e => openEdit(a, e)}>
                            <PencilSimple size={13} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: 'hsl(var(--destructive))' }} onClick={e => { e.stopPropagation(); setDeleteId(a.id); }}>
                            <Trash size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={addOpen || !!editTarget} onOpenChange={o => { if (!o) { setAddOpen(false); setEditTarget(null); } }}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle>{editTarget ? `Edit Audit — ${editTarget.id}` : 'Start New Audit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { label: 'Framework *', key: 'framework', placeholder: 'e.g. ISO 27001, SOC 2, EU AI Act' },
              { label: 'Scope *', key: 'scope', placeholder: 'Audit scope and coverage area' },
              { label: 'Lead Auditor *', key: 'auditor', placeholder: 'e.g. Deloitte LLP, PwC, Internal' },
              { label: 'Description', key: 'description', placeholder: 'Audit objective and background' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-[hsl(var(--text-3))] block mb-1">{f.label}</label>
                <Input style={{ borderRadius: 0 }} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--text-3))] block mb-1">Start Date *</label>
                <Input type="date" style={{ borderRadius: 0 }} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--text-3))] block mb-1">End Date *</label>
                <Input type="date" style={{ borderRadius: 0 }} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--text-3))] block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as Audit['status'] }))}>
                  <SelectTrigger style={{ borderRadius: 0, height: 36 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Planning', 'In Progress', 'Review', 'Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--text-3))] block mb-1">Risk Rating</label>
                <Select value={form.riskRating} onValueChange={v => setForm(p => ({ ...p, riskRating: v as Audit['riskRating'] }))}>
                  <SelectTrigger style={{ borderRadius: 0, height: 36 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Critical', 'High', 'Medium', 'Low'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => { setAddOpen(false); setEditTarget(null); }}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={editTarget ? handleEdit : handleAdd}>
              {editTarget ? 'Save Changes' : 'Create Audit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audit {deleteId}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. All findings, evidence and action items for this audit will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }} onClick={handleDelete}>Delete Audit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent side="right" className="w-[560px] sm:max-w-[560px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selected.framework} — {selected.id}</SheetTitle>
                <div className="flex gap-2 mt-1">
                  <Badge style={{ ...statusStyle(selected.status), borderRadius: 0, fontSize: 10 }}>{selected.status}</Badge>
                  <Badge style={{ ...riskStyle(selected.riskRating), borderRadius: 0, fontSize: 10 }}>{selected.riskRating} Risk</Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="findings" style={{ borderRadius: 0 }}>Findings ({selected.findings.length})</TabsTrigger>
                  <TabsTrigger value="evidence" style={{ borderRadius: 0 }}>Evidence</TabsTrigger>
                  <TabsTrigger value="actions" style={{ borderRadius: 0 }}>Actions</TabsTrigger>
                  <TabsTrigger value="timeline" style={{ borderRadius: 0 }}>Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-3">
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>
                  {[
                    { label: 'Audit ID', value: selected.id },
                    { label: 'Framework', value: selected.framework },
                    { label: 'Scope', value: selected.scope },
                    { label: 'Auditor', value: selected.auditor },
                    { label: 'Period', value: `${formatDate(selected.startDate)} — ${formatDate(selected.endDate)}` },
                    { label: 'Total Findings', value: String(selected.findingsCount) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="findings" className="mt-4 space-y-2">
                  {selected.findings.length === 0 ? (
                    <p className="text-sm py-8 text-center" style={{ color: 'hsl(var(--text-3))' }}>No findings recorded yet.</p>
                  ) : selected.findings.map(f => {
                    const fs = findingSeverityStyle(f.severity);
                    return (
                      <div key={f.id} className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.title}</p>
                          <Badge style={{ background: fs.bg, color: fs.text, borderRadius: 0, fontSize: 10 }}>{f.severity}</Badge>
                        </div>
                        <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{f.description}</p>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          <span><User size={10} className="inline mr-1" />{f.owner}</span>
                          <span><CalendarCheck size={10} className="inline mr-1" />Due {formatDate(f.dueDate)}</span>
                          <Badge variant="outline" style={{ borderRadius: 0, fontSize: 9 }}>{f.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="evidence" className="mt-4 space-y-2">
                  {selected.evidence.length === 0 ? (
                    <p className="text-sm py-8 text-center" style={{ color: 'hsl(var(--text-3))' }}>No evidence uploaded yet.</p>
                  ) : selected.evidence.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ev.name}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{ev.type} · Uploaded by {ev.uploadedBy} · {formatDate(ev.date)}</p>
                      </div>
                      <Badge style={{ background: ev.status === 'Accepted' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-wn-bg))', color: ev.status === 'Accepted' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>{ev.status}</Badge>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="actions" className="mt-4 space-y-2">
                  {selected.actionItems.length === 0 ? (
                    <p className="text-sm py-8 text-center" style={{ color: 'hsl(var(--text-3))' }}>No action items.</p>
                  ) : selected.actionItems.map(ai => (
                    <div key={ai.id} className="flex items-center justify-between p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{ai.title}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          <User size={10} className="inline mr-1" />{ai.assignee} · Due {formatDate(ai.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge style={{ background: ai.priority === 'High' ? 'hsl(var(--s-er-bg))' : ai.priority === 'Medium' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))', color: ai.priority === 'High' ? 'hsl(var(--destructive))' : ai.priority === 'Medium' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))', borderRadius: 0, fontSize: 10 }}>{ai.priority}</Badge>
                        <Badge variant="outline" style={{ borderRadius: 0, fontSize: 9 }}>{ai.status}</Badge>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-0">
                    {selected.timeline.map((tl, i) => (
                      <div key={tl.id} className="flex gap-3 pb-4">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 mt-1" style={{ background: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--text-4))', borderRadius: 0 }} />
                          {i < selected.timeline.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--border))' }} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{tl.event}</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(tl.date)} · {tl.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
