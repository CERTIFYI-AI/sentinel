import React, { useState, useMemo } from 'react';
import {
  ClockCounterClockwise, MagnifyingGlass, Export, Eye, X,
  User, Robot, ShieldCheck, Warning, FileText, Database, Lock,
  CheckCircle, XCircle, ArrowsClockwise, Download,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { toast } from 'sonner';

type ActionType = 'Created' | 'Updated' | 'Modified' | 'Approved' | 'Rejected' | 'Deleted' | 'Triggered' | 'Uploaded' | 'Escalated' | 'Deployed' | 'Revoked' | 'Accessed' | 'Exported' | 'Signed';
type CategoryType = 'model' | 'bias_audit' | 'policy' | 'risk' | 'evidence' | 'control' | 'vendor' | 'incident' | 'access' | 'data' | 'security' | 'audit';
type OutcomeType = 'Success' | 'Failure' | 'Partial' | 'Pending';

interface TrailEntry {
  id: number;
  timestamp: string;
  user: string;
  userId: string;
  action: ActionType;
  resource: string;
  category: CategoryType;
  details: string;
  outcome: OutcomeType;
  ipAddress: string;
  sessionId: string;
  changes?: { field: string; from: string; to: string }[];
  affectedEntities?: string[];
}

const TRAIL_ENTRIES: TrailEntry[] = [
  {
    id: 1, timestamp: '2026-04-12 11:47:03 UTC', user: 'Sarah Chen', userId: 'USR-001',
    action: 'Updated', resource: 'Model: Credit Scoring v2.1 — Guardrail Config', category: 'model',
    details: 'Injection block threshold changed from 0.78 to 0.85. Previous value logged. Change triggered redeployment of guardrail layer.',
    outcome: 'Success', ipAddress: '10.0.1.45', sessionId: 'SID-a4f2c',
    changes: [
      { field: 'injection_threshold', from: '0.78', to: '0.85' },
      { field: 'guardrail_version', from: 'v2.4', to: 'v2.5' },
    ],
    affectedEntities: ['MDL-001', 'GUARD-012'],
  },
  {
    id: 2, timestamp: '2026-04-12 11:02:14 UTC', user: 'System', userId: 'SYS-monitor',
    action: 'Escalated', resource: 'Incident: INC-058', category: 'incident',
    details: 'Auto-classified INC-058 as Critical; HITL playbook PB-003 activated. On-call CISO paged.',
    outcome: 'Success', ipAddress: '10.0.0.1', sessionId: 'SID-sys-003',
    affectedEntities: ['INC-058', 'PB-003', 'USR-001'],
  },
  {
    id: 3, timestamp: '2026-04-12 10:33:22 UTC', user: 'James Liu', userId: 'USR-002',
    action: 'Exported', resource: 'Model Registry / All Records (47 items)', category: 'data',
    details: 'Bulk export of 47 model records to CSV. Includes training metadata and performance metrics. Export flagged for DLP review.',
    outcome: 'Success', ipAddress: '10.0.2.88', sessionId: 'SID-b7e1a',
    affectedEntities: ['EXPORT-2026-089'],
  },
  {
    id: 4, timestamp: '2026-04-12 09:55:41 UTC', user: 'Maria Santos', userId: 'USR-004',
    action: 'Approved', resource: 'Policy: AI Risk Policy v3.1', category: 'policy',
    details: 'AI Risk Policy v3.1 final approval granted. Supersedes v3.0. Notification sent to 42 stakeholders. Effective: 2026-05-01.',
    outcome: 'Success', ipAddress: '10.0.1.155', sessionId: 'SID-d2b8e',
    changes: [
      { field: 'status', from: 'Under Review', to: 'Approved' },
      { field: 'effective_date', from: 'N/A', to: '2026-05-01' },
      { field: 'version', from: '3.0', to: '3.1' },
    ],
    affectedEntities: ['POL-007', 'CTL-014', 'CTL-019'],
  },
  {
    id: 5, timestamp: '2026-04-12 09:15:08 UTC', user: 'System', userId: 'SYS-scheduler',
    action: 'Triggered', resource: 'Bias Audit Engine / Loan Approval Model v3.0', category: 'bias_audit',
    details: 'Scheduled bias audit completed with warnings. Demographic parity gap: 18.3% (threshold: 10%). Flagged for human review.',
    outcome: 'Partial', ipAddress: '10.0.0.1', sessionId: 'SID-sys-001',
    affectedEntities: ['MDL-003', 'BA-2026-049'],
  },
  {
    id: 6, timestamp: '2026-04-12 08:44:19 UTC', user: 'Marcus Johnson', userId: 'USR-003',
    action: 'Modified', resource: 'Risk Register / RSK-001 Score Override', category: 'risk',
    details: 'Risk score manually overridden from 20/25 (Critical) to 15/25 (High). Override reason: "Interim controls reduce immediate impact". Approved by Sarah Chen.',
    outcome: 'Success', ipAddress: '10.0.1.201', sessionId: 'SID-c9d4f',
    changes: [
      { field: 'risk_score', from: '20 (Critical)', to: '15 (High)' },
      { field: 'override_reason', from: '', to: 'Interim controls reduce immediate impact' },
      { field: 'approved_by', from: '', to: 'Sarah Chen' },
    ],
    affectedEntities: ['RSK-001'],
  },
  {
    id: 7, timestamp: '2026-04-12 08:31:55 UTC', user: 'Maria Santos', userId: 'USR-004',
    action: 'Updated', resource: 'RBAC / USR-008 (David Kim) — Role Change', category: 'access',
    details: 'User David Kim role changed from "Analyst" to "Senior Compliance Officer". Access to Audit Trail and Evidence Vault modules granted.',
    outcome: 'Success', ipAddress: '10.0.1.155', sessionId: 'SID-d2b8e',
    changes: [
      { field: 'role', from: 'Analyst', to: 'Senior Compliance Officer' },
      { field: 'permissions_added', from: '', to: 'audit_trail:read, evidence_vault:write' },
    ],
    affectedEntities: ['USR-008'],
  },
  {
    id: 8, timestamp: '2026-04-12 07:58:33 UTC', user: 'Priya Gupta', userId: 'USR-005',
    action: 'Uploaded', resource: 'Evidence Vault / SOC2-CC6.2 — Q1 Authentication Control', category: 'evidence',
    details: 'Evidence artifact uploaded: "Authentication_Control_Evidence_Q1_2026.pdf" (2.4 MB). Tagged to SOC 2 CC6.2. SHA-256 verified.',
    outcome: 'Success', ipAddress: '10.0.3.12', sessionId: 'SID-e9f3b',
    affectedEntities: ['EVD-2026-034', 'CTL-CC6.2'],
  },
  {
    id: 9, timestamp: '2026-04-11 17:22:01 UTC', user: 'System', userId: 'SYS-deploy',
    action: 'Deployed', resource: 'Credit Scoring Model v2.2-beta — Staging', category: 'model',
    details: 'Model v2.2-beta deployed to staging. Deployment gate checks passed. Bias evaluation pending. Production blocked until bias audit complete.',
    outcome: 'Partial', ipAddress: '10.0.0.5', sessionId: 'SID-sys-004',
    affectedEntities: ['MDL-001-beta', 'ENV-staging'],
  },
  {
    id: 10, timestamp: '2026-04-11 16:55:44 UTC', user: 'Anika Patel', userId: 'USR-006',
    action: 'Modified', resource: 'Control: CTL-029 Access Review — Frequency', category: 'control',
    details: 'Updated control test frequency from quarterly to monthly following audit finding. Next review: 2026-05-01.',
    outcome: 'Success', ipAddress: '10.0.4.77', sessionId: 'SID-f1a2d',
    changes: [
      { field: 'test_frequency', from: 'Quarterly', to: 'Monthly' },
      { field: 'next_review_date', from: '2026-06-01', to: '2026-05-01' },
    ],
    affectedEntities: ['CTL-029'],
  },
  {
    id: 11, timestamp: '2026-04-11 15:33:09 UTC', user: 'External API', userId: 'SVC-api-gateway',
    action: 'Accessed', resource: '/api/v1/models/predict — Repeated Auth Failures', category: 'security',
    details: 'Invalid API key — 23 consecutive failures from IP 185.220.101.47. IP added to blocklist. SOC alerted. Possible credential stuffing attack.',
    outcome: 'Failure', ipAddress: '185.220.101.47', sessionId: 'N/A',
    affectedEntities: ['API-GATEWAY', 'IP-BLOCKLIST'],
  },
  {
    id: 12, timestamp: '2026-04-11 14:10:22 UTC', user: 'David Kim', userId: 'USR-008',
    action: 'Deleted', resource: 'Vendor: Legacy Analytics Corp', category: 'vendor',
    details: 'Vendor decommissioned after contract expiry. All vendor-linked evidence archived. Risk register entries transitioned to "Closed".',
    outcome: 'Success', ipAddress: '10.0.2.144', sessionId: 'SID-g3c4e',
    changes: [
      { field: 'status', from: 'Active', to: 'Decommissioned' },
    ],
    affectedEntities: ['VND-014', 'RSK-009', 'EVD-2025-088'],
  },
  {
    id: 13, timestamp: '2026-04-11 13:05:58 UTC', user: 'Sarah Chen', userId: 'USR-001',
    action: 'Created', resource: 'Risk: AI Supply Chain Dependency on OpenAI', category: 'risk',
    details: 'New risk RSK-018 created. Category: Third-Party. Likelihood: 3, Impact: 4, Score: 12 (High). Owner: James Liu. Treatment: Mitigate.',
    outcome: 'Success', ipAddress: '10.0.1.45', sessionId: 'SID-a4f2c',
    affectedEntities: ['RSK-018', 'VND-001'],
  },
  {
    id: 14, timestamp: '2026-04-11 11:42:37 UTC', user: 'System', userId: 'SYS-monitor',
    action: 'Triggered', resource: 'Performance Alert / Customer Churn Predictor v2.3', category: 'model',
    details: 'CRITICAL: Model accuracy dropped below 75% threshold (current: 71.2%). INC-2026-034 auto-created. On-call ML Engineer paged via PagerDuty.',
    outcome: 'Success', ipAddress: '10.0.0.1', sessionId: 'SID-sys-002',
    affectedEntities: ['MDL-004', 'INC-2026-034'],
  },
  {
    id: 15, timestamp: '2026-04-11 10:19:14 UTC', user: 'James Liu', userId: 'USR-002',
    action: 'Revoked', resource: 'API Key: Production Read Access — svc-analytics-prod', category: 'access',
    details: 'API key revoked due to suspected compromise. Key had not been rotated in 90+ days. Replacement key issued to authorized service account.',
    outcome: 'Success', ipAddress: '10.0.2.88', sessionId: 'SID-b7e1a',
    affectedEntities: ['KEY-svc-analytics-prod'],
  },
  {
    id: 16, timestamp: '2026-04-10 16:47:29 UTC', user: 'Priya Gupta', userId: 'USR-005',
    action: 'Rejected', resource: 'Model Deployment Request / CreditScoreNLP-v2.2', category: 'model',
    details: 'Production deployment request rejected. Reason: Bias audit not completed. Model returned to staging. Owner notified.',
    outcome: 'Success', ipAddress: '10.0.3.12', sessionId: 'SID-e9f3b',
    changes: [
      { field: 'deployment_status', from: 'Pending Approval', to: 'Rejected' },
      { field: 'rejection_reason', from: '', to: 'Bias audit incomplete' },
    ],
    affectedEntities: ['MDL-005-v2.2'],
  },
  {
    id: 17, timestamp: '2026-04-10 15:22:08 UTC', user: 'Anika Patel', userId: 'USR-006',
    action: 'Signed', resource: 'Vendor Agreement: DataPartner Inc — Data Processing Addendum', category: 'vendor',
    details: 'DPA signed electronically. Covers 3 data categories: behavioral, financial, demographic. Expiry: 2027-04-10. Legal review: complete.',
    outcome: 'Success', ipAddress: '10.0.4.77', sessionId: 'SID-f1a2d',
    affectedEntities: ['VND-007', 'DOC-DPA-2026-04'],
  },
  {
    id: 18, timestamp: '2026-04-10 14:05:51 UTC', user: 'Marcus Johnson', userId: 'USR-003',
    action: 'Approved', resource: 'HITL Review / HITL-2026-087 — Credit Decision Override', category: 'audit',
    details: 'Human reviewer approved HITL decision override. AI recommendation: Denied. Human outcome: Approved with conditions. Explanation logged.',
    outcome: 'Success', ipAddress: '10.0.1.201', sessionId: 'SID-c9d4f',
    affectedEntities: ['HITL-2026-087', 'MDL-001'],
  },
  {
    id: 19, timestamp: '2026-04-10 12:31:04 UTC', user: 'System', userId: 'SYS-scheduler',
    action: 'Triggered', resource: 'Compliance Calendar / EU AI Act — Article 13 Evidence Collection', category: 'audit',
    details: 'Automated evidence collection initiated for EU AI Act Article 13 (Transparency) deadline. 14 evidence items queued. Owner: Anika Patel.',
    outcome: 'Success', ipAddress: '10.0.0.1', sessionId: 'SID-sys-005',
    affectedEntities: ['CAL-2026-Q2-003', 'EVD-batch-013'],
  },
  {
    id: 20, timestamp: '2026-04-09 17:14:33 UTC', user: 'David Kim', userId: 'USR-008',
    action: 'Updated', resource: 'Control: CTL-055 Model Explainability — Evidence Link', category: 'control',
    details: 'Linked 3 new evidence artifacts to CTL-055. Control effectiveness score updated from 62% to 78%. Gap reduced from Critical to Medium.',
    outcome: 'Success', ipAddress: '10.0.2.144', sessionId: 'SID-g3c4e',
    changes: [
      { field: 'effectiveness_score', from: '62%', to: '78%' },
      { field: 'gap_severity', from: 'Critical', to: 'Medium' },
      { field: 'evidence_count', from: '4', to: '7' },
    ],
    affectedEntities: ['CTL-055', 'EVD-2026-028', 'EVD-2026-029', 'EVD-2026-030'],
  },
  {
    id: 21, timestamp: '2026-04-09 14:55:17 UTC', user: 'Sarah Chen', userId: 'USR-001',
    action: 'Created', resource: 'Bias Audit Wizard / LoanDecisionAI v3.0 — Full Audit', category: 'bias_audit',
    details: 'Full bias audit initiated. Metrics: Demographic Parity, Equal Opportunity, Counterfactual Fairness. Dataset: 14,000 records. ETA: 4 hours.',
    outcome: 'Success', ipAddress: '10.0.1.45', sessionId: 'SID-a4f2c',
    affectedEntities: ['BA-2026-050', 'MDL-003'],
  },
  {
    id: 22, timestamp: '2026-04-09 11:22:44 UTC', user: 'James Liu', userId: 'USR-002',
    action: 'Accessed', resource: 'Evidence Vault / SOC2 Type II Report 2025 — Unauthorized Attempt', category: 'security',
    details: 'Access attempt from USR-002 to restricted evidence artifact blocked. User role "Analyst" lacks evidence:read:confidential permission. Access logged.',
    outcome: 'Failure', ipAddress: '10.0.2.88', sessionId: 'SID-b7e1a',
    affectedEntities: ['EVD-SOC2-2025'],
  },
  {
    id: 23, timestamp: '2026-04-08 16:38:29 UTC', user: 'Priya Gupta', userId: 'USR-005',
    action: 'Uploaded', resource: 'Evidence Vault / ISO 42001 — Clause 8.4 Lifecycle Documentation', category: 'evidence',
    details: 'AI lifecycle documentation uploaded for ISO 42001 Clause 8.4 mapping. File: "ModelLifecycle_ISO42001_Q1_2026.pdf" (4.1 MB). Auto-linked to 6 controls.',
    outcome: 'Success', ipAddress: '10.0.3.12', sessionId: 'SID-e9f3b',
    affectedEntities: ['EVD-2026-035', 'CTL-031', 'CTL-032', 'CTL-033', 'CTL-034', 'CTL-035', 'CTL-036'],
  },
  {
    id: 24, timestamp: '2026-04-08 09:15:23 UTC', user: 'Sarah Chen', userId: 'USR-001',
    action: 'Updated', resource: 'Model: Credit Scoring v2 — Risk Classification', category: 'model',
    details: 'Risk classification changed from Medium to High following Q1 bias audit results. Classification triggers additional monitoring obligations.',
    outcome: 'Success', ipAddress: '10.0.1.45', sessionId: 'SID-a4f2c',
    changes: [
      { field: 'risk_classification', from: 'Medium', to: 'High' },
      { field: 'monitoring_frequency', from: 'Monthly', to: 'Weekly' },
    ],
    affectedEntities: ['MDL-001'],
  },
  {
    id: 25, timestamp: '2026-04-07 17:30:05 UTC', user: 'Michael Torres', userId: 'USR-007',
    action: 'Approved', resource: 'Policy: Data Retention v3 — Final Approval', category: 'policy',
    details: 'Final approval granted after legal review. Policy published to all employees via compliance portal. Training completion tracked.',
    outcome: 'Success', ipAddress: '10.0.5.33', sessionId: 'SID-h5d6f',
    changes: [
      { field: 'status', from: 'Legal Review', to: 'Published' },
      { field: 'version', from: '3.0-rc', to: '3.0' },
    ],
    affectedEntities: ['POL-003'],
  },
];

const ACTION_STYLES: Record<ActionType, string> = {
  Created: 'bg-emerald-500/15 text-emerald-400',
  Updated: 'bg-blue-500/15 text-blue-400',
  Modified: 'bg-blue-500/15 text-blue-400',
  Approved: 'bg-emerald-500/15 text-emerald-400',
  Rejected: 'bg-red-500/15 text-red-400',
  Deleted: 'bg-red-500/15 text-red-400',
  Triggered: 'bg-purple-500/15 text-purple-400',
  Uploaded: 'bg-cyan-500/15 text-cyan-400',
  Escalated: 'bg-orange-500/15 text-orange-400',
  Deployed: 'bg-indigo-500/15 text-indigo-400',
  Revoked: 'bg-red-500/15 text-red-400',
  Accessed: 'bg-yellow-500/15 text-yellow-500',
  Exported: 'bg-cyan-500/15 text-cyan-400',
  Signed: 'bg-teal-500/15 text-teal-400',
};

const CATEGORY_STYLES: Record<CategoryType, string> = {
  model: 'bg-blue-500/15 text-blue-400',
  bias_audit: 'bg-purple-500/15 text-purple-400',
  policy: 'bg-emerald-500/15 text-emerald-400',
  risk: 'bg-red-500/15 text-red-400',
  evidence: 'bg-cyan-500/15 text-cyan-400',
  control: 'bg-amber-500/15 text-amber-400',
  vendor: 'bg-orange-500/15 text-orange-400',
  incident: 'bg-red-500/15 text-red-400',
  access: 'bg-violet-500/15 text-violet-400',
  data: 'bg-sky-500/15 text-sky-400',
  security: 'bg-rose-500/15 text-rose-400',
  audit: 'bg-teal-500/15 text-teal-400',
};

const OUTCOME_STYLES: Record<OutcomeType, { bg: string; text: string; icon: React.ElementType }> = {
  Success: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: CheckCircle },
  Failure: { bg: 'bg-red-500/15', text: 'text-red-400', icon: XCircle },
  Partial: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: ArrowsClockwise },
  Pending: { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: ArrowsClockwise },
};

const CATEGORY_ICON: Record<CategoryType, React.ElementType> = {
  model: Robot,
  bias_audit: Database,
  policy: FileText,
  risk: Warning,
  evidence: FileText,
  control: ShieldCheck,
  vendor: User,
  incident: Warning,
  access: Lock,
  data: Database,
  security: ShieldCheck,
  audit: ClockCounterClockwise,
};

const PAGE_SIZE = 10;

export default function AuditTrail() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TrailEntry | null>(null);

  const allCategories = Array.from(new Set(TRAIL_ENTRIES.map(e => e.category))).sort();
  const allActions = Array.from(new Set(TRAIL_ENTRIES.map(e => e.action))).sort();

  const filtered = useMemo(() => {
    return TRAIL_ENTRIES.filter(e => {
      const matchesSearch =
        e.resource.toLowerCase().includes(search.toLowerCase()) ||
        e.user.toLowerCase().includes(search.toLowerCase()) ||
        e.action.toLowerCase().includes(search.toLowerCase()) ||
        e.details.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesAction = actionFilter === 'all' || e.action === actionFilter;
      const matchesOutcome = outcomeFilter === 'all' || e.outcome === outcomeFilter;
      return matchesSearch && matchesCategory && matchesAction && matchesOutcome;
    });
  }, [search, categoryFilter, actionFilter, outcomeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    toast.success('Audit log exported as CSV');
  };

  const stats = {
    total: TRAIL_ENTRIES.length,
    today: TRAIL_ENTRIES.filter(e => e.timestamp.startsWith('2026-04-12')).length,
    failures: TRAIL_ENTRIES.filter(e => e.outcome === 'Failure').length,
    users: new Set(TRAIL_ENTRIES.filter(e => e.userId !== 'SYS-monitor' && e.userId !== 'SYS-scheduler' && e.userId !== 'SYS-deploy' && e.userId !== 'SYS-sys').map(e => e.user)).size,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClockCounterClockwise className="w-7 h-7 text-emerald-400" />
            Audit Trail
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-1">
            Immutable log of all platform actions — tamper-evident, cryptographically signed
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" /> Export Log
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Total Events</p>
            <p className="text-3xl font-bold mt-1">{stats.total}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Today</p>
            <p className="text-3xl font-bold mt-1 text-blue-400">{stats.today}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">Apr 12, 2026</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Active Users</p>
            <p className="text-3xl font-bold mt-1 text-emerald-400">{stats.users}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">Human actors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Failures</p>
            <p className="text-3xl font-bold mt-1 text-red-400">{stats.failures}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">Require review</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle>Event Log</CardTitle>
              <span className="text-xs text-[hsl(var(--text-4))]">
                {filtered.length} of {TRAIL_ENTRIES.length} events
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-4))]" />
                <Input
                  placeholder="Search events, users, resources…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(c => (
                    <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {allActions.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={outcomeFilter} onValueChange={(v) => { setOutcomeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="Success">Success</SelectItem>
                  <SelectItem value="Failure">Failure</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              {(categoryFilter !== 'all' || actionFilter !== 'all' || outcomeFilter !== 'all' || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(''); setCategoryFilter('all'); setActionFilter('all'); setOutcomeFilter('all'); setPage(1); }}
                  className="gap-1 text-[hsl(var(--text-4))]"
                >
                  <X className="w-3 h-3" /> Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--text-4))]">
                  <th className="text-left py-3 pr-4 font-medium whitespace-nowrap">Timestamp</th>
                  <th className="text-left py-3 pr-4 font-medium">User</th>
                  <th className="text-left py-3 pr-4 font-medium">Action</th>
                  <th className="text-left py-3 pr-4 font-medium">Resource</th>
                  <th className="text-left py-3 pr-4 font-medium">Category</th>
                  <th className="text-left py-3 pr-4 font-medium">Outcome</th>
                  <th className="text-left py-3 pr-4 font-medium">IP Address</th>
                  <th className="text-left py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((e) => {
                  const OutcomeIcon = OUTCOME_STYLES[e.outcome].icon;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] transition-colors cursor-pointer"
                      onClick={() => setSelected(e)}
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-[hsl(var(--text-4))] whitespace-nowrap">{e.timestamp}</td>
                      <td className="py-3 pr-4 font-medium whitespace-nowrap">{e.user}</td>
                      <td className="py-3 pr-4">
                        <Badge className={`text-xs ${ACTION_STYLES[e.action]}`}>{e.action}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-[hsl(var(--text-2))] max-w-xs">
                        <span className="block truncate" title={e.resource}>{e.resource}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={`text-xs ${CATEGORY_STYLES[e.category]}`}>{e.category.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`flex items-center gap-1 text-xs font-medium ${OUTCOME_STYLES[e.outcome].text}`}>
                          <OutcomeIcon className="w-3.5 h-3.5" />
                          {e.outcome}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-[hsl(var(--text-4))]">{e.ipAddress}</td>
                      <td className="py-3">
                        <Eye className="w-4 h-4 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] transition-colors" />
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[hsl(var(--text-4))]">
                      No events match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[hsl(var(--border))]">
              <span className="text-xs text-[hsl(var(--text-4))]">
                Page {page} of {totalPages} ({filtered.length} events)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <SheetHeader className="mb-6">
            <SheetTitle className="text-base">Event Detail</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-6 text-sm">
              <div className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--brand) / 0.1)' }}>
                  {React.createElement(CATEGORY_ICON[selected.category], { size: 16, style: { color: 'hsl(var(--brand))' } })}
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--text-1))]">{selected.resource}</p>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{selected.timestamp}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'User', value: selected.user },
                  { label: 'User ID', value: selected.userId },
                  { label: 'Action', value: selected.action },
                  { label: 'Category', value: selected.category.replace('_', ' ') },
                  { label: 'Outcome', value: selected.outcome },
                  { label: 'IP Address', value: selected.ipAddress },
                  { label: 'Session ID', value: selected.sessionId },
                ].map(({ label, value }) => (
                  <div key={label} className="p-2.5" style={{ border: '1px solid hsl(var(--border))' }}>
                    <p className="text-xs text-[hsl(var(--text-4))] uppercase tracking-wider font-medium">{label}</p>
                    <p className="font-medium text-[hsl(var(--text-1))] mt-0.5 font-mono text-xs break-all">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-2">Event Details</p>
                <p className="text-[hsl(var(--text-2))] leading-relaxed p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                  {selected.details}
                </p>
              </div>

              {selected.changes && selected.changes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-2">Field Changes</p>
                  <div className="space-y-2">
                    {selected.changes.map((c, i) => (
                      <div key={i} className="p-2.5 text-xs" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                        <p className="font-mono font-semibold text-[hsl(var(--text-3))] mb-1">{c.field}</p>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 font-mono text-red-400 bg-red-500/10">{c.from || '—'}</span>
                          <span className="text-[hsl(var(--text-4))]">→</span>
                          <span className="px-1.5 py-0.5 font-mono text-emerald-400 bg-emerald-500/10">{c.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.affectedEntities && selected.affectedEntities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))] mb-2">Affected Entities</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.affectedEntities.map(entity => (
                      <span key={entity} className="text-xs px-2 py-1 font-mono" style={{ background: 'hsl(var(--brand) / 0.08)', border: '1px solid hsl(var(--brand) / 0.2)', color: 'hsl(var(--brand))' }}>
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-[hsl(var(--border))] flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('Event report exported')}>
                  <Export className="w-3.5 h-3.5" /> Export Event
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-[hsl(var(--text-4))]" onClick={() => setSelected(null)}>
                  <X className="w-3.5 h-3.5" /> Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
