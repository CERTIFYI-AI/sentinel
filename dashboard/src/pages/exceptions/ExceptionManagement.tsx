import { useState, useMemo } from 'react';
import {
  MagnifyingGlass, Eye, ShieldWarning, ClockCountdown, Warning,
  CheckCircle, Export, Plus, ArrowsClockwise, Scales, ListChecks,
  UserCircle, CalendarBlank, CaretRight, Prohibit, HourglassMedium,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Types ────────────────────────────────────────────────────────────────────
type ExceptionStatus = 'Pending' | 'Approved' | 'Denied' | 'Expired';
type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

interface ApprovalStep {
  role: string;
  name: string;
  decision: 'Approved' | 'Pending' | 'Denied' | 'N/A';
  date: string;
  notes: string;
}

interface RenewalRecord {
  version: string;
  requestedDate: string;
  status: string;
  expiryDate: string;
  notes: string;
}

interface Exception {
  id: string;
  policy: string;
  policyRef: string;
  requestedBy: string;
  requestedDate: string;
  approver: string;
  status: ExceptionStatus;
  riskAccepted: RiskLevel;
  expiryDate: string;
  compensatingControls: string;
  description: string;
  justification: string;
  riskAnalysis: string;
  impactScope: string;
  affectedSystems: string[];
  controlDetails: { control: string; description: string; effectiveness: string }[];
  approvalChain: ApprovalStep[];
  renewalHistory: RenewalRecord[];
}

// ── Seed Data ────────────────────────────────────────────────────────────────
const EXCEPTIONS: Exception[] = [
  {
    id: 'EXC-001',
    policy: 'Data Retention Policy',
    policyRef: 'DRP-4.2',
    requestedBy: 'Sarah Chen',
    requestedDate: '2026-01-10',
    approver: 'James Rodriguez',
    status: 'Approved',
    riskAccepted: 'Medium',
    expiryDate: '2026-09-30',
    compensatingControls: 'Enhanced encryption + access logging',
    description: 'PII retention extension — 18-month retention for model retraining. Standard policy limits PII retention to 6 months, but the credit scoring model retraining pipeline requires 18 months of historical PII data to maintain accuracy above the 95% threshold mandated by the model validation team.',
    justification: 'Model performance degrades below acceptable thresholds without 18 months of historical PII data. The credit scoring model v3.1 requires this extended window for feature engineering across seasonal financial patterns. Reducing retention to 6 months caused a 12% increase in false positive rates during Q4 2025 testing.',
    riskAnalysis: 'Extended PII retention increases data breach exposure surface. If compromised, up to 2.4M customer records spanning 18 months would be at risk versus 800K under standard 6-month retention. Regulatory penalty exposure under GDPR Art. 5(1)(e) estimated at EUR 2-4M. Probability of breach assessed at Low given compensating controls.',
    impactScope: 'Credit Scoring Division — 2.4M customer records',
    affectedSystems: ['Credit Scoring Model v3.1', 'Customer Data Lake', 'Feature Engineering Pipeline'],
    controlDetails: [
      { control: 'Enhanced AES-256 Encryption', description: 'All PII fields encrypted at rest with dedicated key rotation every 30 days managed by HSM. Column-level encryption applied to all 47 PII fields.', effectiveness: 'High' },
      { control: 'Comprehensive Access Logging', description: 'All read/write operations on extended-retention PII logged to immutable audit trail with real-time SIEM alerting on anomalous access patterns.', effectiveness: 'High' },
    ],
    approvalChain: [
      { role: 'Data Protection Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-01-15', notes: 'Compensating controls adequate. Review in 6 months.' },
      { role: 'CISO', name: 'James Rodriguez', decision: 'Approved', date: '2026-01-18', notes: 'Approved with quarterly access audit requirement.' },
      { role: 'Chief Risk Officer', name: 'Michael Torres', decision: 'Approved', date: '2026-01-20', notes: 'Residual risk acceptable given business justification.' },
    ],
    renewalHistory: [
      { version: 'v1.0', requestedDate: '2025-07-15', status: 'Expired', expiryDate: '2026-01-15', notes: 'Initial exception for 12-month retention.' },
      { version: 'v2.0', requestedDate: '2026-01-10', status: 'Active', expiryDate: '2026-09-30', notes: 'Renewed with extended 18-month window and additional controls.' },
    ],
  },
  {
    id: 'EXC-002',
    policy: 'Model Validation & Bias Audit Policy',
    policyRef: 'MVBA-2.1',
    requestedBy: 'David Park',
    requestedDate: '2026-03-20',
    approver: 'Elena Vasquez',
    status: 'Pending',
    riskAccepted: 'Medium',
    expiryDate: '2026-06-20',
    compensatingControls: 'Post-deployment monitoring + 30-day audit deadline',
    description: 'Model deployment without full bias audit — credit scoring v2.1 expedited deployment. Regulatory deadline requires deployment by April 1, but the full bias audit cycle takes 45 days. Requesting exception to deploy with partial audit and complete the full audit within 30 days post-deployment.',
    justification: 'OCC regulatory guidance effective April 1, 2026 requires updated credit scoring methodology. Failure to deploy by deadline exposes Acme Financial Corp to regulatory action and potential enforcement. Partial bias audit covering 4 of 7 protected classes has been completed with satisfactory results.',
    riskAnalysis: 'Deploying without full bias audit creates risk of discriminatory outcomes in the 3 uncovered protected classes (age, disability, veteran status). Historical data shows these classes represent 18% of applicant pool. Potential fair lending violations could result in CFPB enforcement action estimated at $5-15M. Monitoring controls will detect disparate impact within 72 hours.',
    impactScope: 'Consumer Lending — 850K credit applications/month',
    affectedSystems: ['Credit Scoring v2.1', 'Underwriting Engine', 'Fair Lending Dashboard'],
    controlDetails: [
      { control: 'Real-time Bias Monitoring', description: 'Automated disparate impact ratio monitoring across all 7 protected classes with 4-hour alerting threshold. Dashboard visible to compliance and model risk teams.', effectiveness: 'High' },
      { control: '30-Day Full Audit Deadline', description: 'Hard deadline of April 30, 2026 for completion of remaining 3 protected class audits. Auto-rollback triggered if deadline missed.', effectiveness: 'Medium' },
      { control: 'Shadow Model Comparison', description: 'v1.9 model maintained in shadow mode for A/B comparison. Any statistically significant divergence in approval rates triggers review.', effectiveness: 'High' },
    ],
    approvalChain: [
      { role: 'Model Risk Manager', name: 'Lisa Chang', decision: 'Approved', date: '2026-03-22', notes: 'Partial audit results satisfactory. 30-day completion is achievable.' },
      { role: 'Chief Compliance Officer', name: 'Elena Vasquez', decision: 'Pending', date: '', notes: '' },
      { role: 'Chief Risk Officer', name: 'Michael Torres', decision: 'N/A', date: '', notes: '' },
    ],
    renewalHistory: [],
  },
  {
    id: 'EXC-003',
    policy: 'Third-Party Data Processing Agreement Policy',
    policyRef: 'TPDP-1.4',
    requestedBy: 'Priya Sharma',
    requestedDate: '2026-02-05',
    approver: 'James Rodriguez',
    status: 'Approved',
    riskAccepted: 'High',
    expiryDate: '2026-06-15',
    compensatingControls: 'Data anonymization pre-flight',
    description: 'Third-party API without DPA — using OpenAI API before DPA signed. The NLP team needs to integrate OpenAI GPT-4 for customer query classification, but the Data Processing Agreement negotiation with OpenAI is still in legal review. Requesting temporary exception to begin integration with anonymized data.',
    justification: 'Customer service response time SLA is being breached at 34% rate. The GPT-4 integration is projected to reduce average response time by 60% and is a Board-level priority for Q1 2026. Legal review of the DPA is expected to complete by May 2026, but the integration timeline cannot wait without significant business impact.',
    riskAnalysis: 'Processing data through OpenAI API without a signed DPA creates GDPR Art. 28 compliance risk. If non-anonymized data is inadvertently transmitted, regulatory exposure under GDPR is estimated at EUR 10-20M (2-4% of annual turnover). Reputational risk is High given recent industry scrutiny of AI vendor relationships. Anonymization pre-flight reduces but does not eliminate risk of re-identification.',
    impactScope: 'Customer Service Division — 120K queries/month',
    affectedSystems: ['Customer Query Classifier', 'Support Ticket Router', 'OpenAI API Gateway'],
    controlDetails: [
      { control: 'Data Anonymization Pre-flight', description: 'All PII stripped and replaced with synthetic tokens before API transmission. Named entity recognition removes 23 PII categories. k-anonymity threshold of k=5 enforced.', effectiveness: 'High' },
      { control: 'API Gateway Inspection', description: 'All outbound API calls inspected by DLP gateway. Any payload containing detected PII patterns is blocked and logged for review.', effectiveness: 'High' },
      { control: 'Data Residency Verification', description: 'Weekly verification that OpenAI API endpoints resolve to approved regions. Contract clause requiring 48-hour notice of endpoint changes.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Data Protection Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-02-10', notes: 'Anonymization controls reviewed and tested. Acceptable for temporary use.' },
      { role: 'CISO', name: 'James Rodriguez', decision: 'Approved', date: '2026-02-12', notes: 'DLP gateway inspection mandatory. Weekly PII leakage reports required.' },
      { role: 'General Counsel', name: 'Robert Kim', decision: 'Approved', date: '2026-02-14', notes: 'Temporary approval only. DPA must be signed by June 15 or integration must cease.' },
    ],
    renewalHistory: [
      { version: 'v1.0', requestedDate: '2026-02-05', status: 'Active', expiryDate: '2026-06-15', notes: 'Initial exception. Hard deadline tied to DPA signature.' },
    ],
  },
  {
    id: 'EXC-004',
    policy: 'AI System Logging & Auditability Policy',
    policyRef: 'ASLA-3.1',
    requestedBy: 'Marcus Johnson',
    requestedDate: '2026-01-25',
    approver: 'Elena Vasquez',
    status: 'Approved',
    riskAccepted: 'Medium',
    expiryDate: '2026-07-31',
    compensatingControls: 'Sampling at 10% + anomaly alerting',
    description: 'Reduced logging for performance — high-frequency trading model. The HFT model executes 50,000 predictions per second and full logging creates unacceptable latency (>2ms added per prediction). Requesting exception to reduce logging from 100% to 10% statistical sampling with anomaly-triggered full capture.',
    justification: 'Full logging adds 2.3ms latency per prediction, which translates to $4.2M estimated annual revenue loss in high-frequency trading scenarios. The model operates within tight latency budgets where every microsecond matters. 10% sampling provides statistically valid audit coverage (99.9% confidence interval for anomaly detection) while maintaining performance SLA.',
    riskAnalysis: 'Reduced logging creates gaps in audit trail for 90% of predictions. In a regulatory investigation, inability to reproduce specific trading decisions could result in enforcement action. SEC/FINRA examination risk assessed as Medium. If an anomalous prediction occurs in the unlogged 90%, detection delay of up to 10 seconds before anomaly-triggered full capture activates.',
    impactScope: 'Quantitative Trading Division — 50K predictions/second',
    affectedSystems: ['HFT Prediction Engine v4.0', 'Trade Execution Platform', 'Market Risk Dashboard'],
    controlDetails: [
      { control: '10% Statistical Sampling', description: 'Uniform random sampling of 10% of all predictions with full feature vector, model output, and confidence score logging. Sample rate validated weekly for statistical sufficiency.', effectiveness: 'High' },
      { control: 'Anomaly-Triggered Full Capture', description: 'When anomaly detection system flags unusual prediction patterns, logging automatically escalates to 100% capture for minimum 60 seconds. Trigger thresholds: >2 sigma deviation from rolling mean.', effectiveness: 'High' },
      { control: 'Daily Reconciliation Report', description: 'Automated daily reconciliation comparing sampled predictions against actual trading outcomes. Discrepancies >0.5% trigger full investigation.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Head of Model Risk', name: 'Lisa Chang', decision: 'Approved', date: '2026-01-28', notes: 'Statistical sampling methodology reviewed. 10% rate provides adequate coverage.' },
      { role: 'Chief Compliance Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-01-30', notes: 'Anomaly trigger mechanism must be tested monthly.' },
      { role: 'Head of Trading Technology', name: 'Andrew Wells', decision: 'Approved', date: '2026-02-01', notes: 'Performance impact verified. 10% sampling adds <0.1ms latency.' },
    ],
    renewalHistory: [
      { version: 'v1.0', requestedDate: '2025-08-01', status: 'Expired', expiryDate: '2026-01-31', notes: 'Initial exception at 5% sampling rate.' },
      { version: 'v2.0', requestedDate: '2026-01-25', status: 'Active', expiryDate: '2026-07-31', notes: 'Renewed with increased sampling rate (5% to 10%) and anomaly trigger.' },
    ],
  },
  {
    id: 'EXC-005',
    policy: 'Model Lifecycle Management Policy',
    policyRef: 'MLM-5.3',
    requestedBy: 'Tom Nakamura',
    requestedDate: '2025-07-10',
    approver: 'James Rodriguez',
    status: 'Expired',
    riskAccepted: 'High',
    expiryDate: '2026-01-15',
    compensatingControls: 'Monthly manual review + escalation protocol',
    description: 'Legacy model grandfathered — fraud detection v1.2. The fraud detection model v1.2 has been in production for 4 years without undergoing the new model validation framework introduced in 2025. Requesting exception to continue operating while the replacement model v2.0 is developed.',
    justification: 'Fraud detection v1.2 processes $2.8B in transactions monthly with a 97.3% accuracy rate. Taking the model offline for validation would leave a coverage gap of 2-3 months during which manual fraud review would be required, increasing fraud losses by an estimated $12M. Replacement model v2.0 is in development with projected completion in Q1 2026.',
    riskAnalysis: 'Operating an unvalidated legacy model creates regulatory risk under SR 11-7 (OCC Model Risk Management guidance). The model has not been tested against current adversarial fraud patterns, and concept drift analysis shows a 3.2% degradation in precision over the past 12 months. Estimated incremental fraud losses due to model degradation: $1.8M annually. Regulatory penalty risk: Medium.',
    impactScope: 'Fraud Operations — $2.8B monthly transaction volume',
    affectedSystems: ['Fraud Detection v1.2', 'Transaction Monitoring Platform', 'Case Management System'],
    controlDetails: [
      { control: 'Monthly Manual Review', description: 'Dedicated fraud analyst team reviews 500 random flagged and unflagged transactions monthly. Results compared against model predictions to identify drift.', effectiveness: 'Medium' },
      { control: 'Escalation Protocol', description: 'Any detected accuracy degradation >1% triggers immediate escalation to Model Risk Committee with 48-hour response SLA. Fallback to rule-based system pre-authorized.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Head of Fraud Operations', name: 'Karen Mitchell', decision: 'Approved', date: '2025-07-15', notes: 'Business continuity requires continued operation.' },
      { role: 'CISO', name: 'James Rodriguez', decision: 'Approved', date: '2025-07-18', notes: 'Approved for 6 months. Must not be renewed without v2.0 timeline.' },
      { role: 'Chief Risk Officer', name: 'Michael Torres', decision: 'Approved', date: '2025-07-20', notes: 'Conditional on monthly review cadence. No further extensions.' },
    ],
    renewalHistory: [
      { version: 'v1.0', requestedDate: '2025-01-10', status: 'Expired', expiryDate: '2025-07-10', notes: 'Initial grandfathering exception.' },
      { version: 'v2.0', requestedDate: '2025-07-10', status: 'Expired', expiryDate: '2026-01-15', notes: 'Final renewal. CRO mandated no further extensions.' },
    ],
  },
  {
    id: 'EXC-006',
    policy: 'Cross-Border Data Transfer Policy',
    policyRef: 'CBDT-2.2',
    requestedBy: 'Anna Kowalski',
    requestedDate: '2026-03-28',
    approver: 'Robert Kim',
    status: 'Pending',
    riskAccepted: 'High',
    expiryDate: '2026-09-28',
    compensatingControls: 'SCCs + encryption in transit',
    description: 'Cross-border transfer temporary approval — EU to US model training. The ML team needs to transfer anonymized EU customer behavioral data to US-based GPU training infrastructure for the next-generation recommendation engine. Standard policy requires adequacy decision or binding corporate rules, neither of which are in place for this use case.',
    justification: 'US-based GPU cluster provides 8x training throughput compared to available EU infrastructure, reducing model training time from 6 weeks to 5 days. The recommendation engine v3.0 is a strategic Board priority with a Q2 2026 launch deadline. EU GPU capacity cannot be scaled in time due to supply chain constraints. Estimated revenue impact of delay: $8M in Q3 2026.',
    riskAnalysis: 'EU-to-US data transfer without adequacy decision creates GDPR Chapter V compliance risk. Post-Schrems II, Standard Contractual Clauses alone may be insufficient. If the EDPB challenges the transfer, potential penalties of EUR 10-20M. Transfer Impact Assessment identifies US surveillance risk as Medium given FISA 702 provisions. Data is anonymized but re-identification risk exists with auxiliary data.',
    impactScope: 'EU Operations — 1.2M customer behavioral profiles',
    affectedSystems: ['EU Data Lake', 'US Training Cluster', 'Recommendation Engine v3.0', 'Data Transfer Gateway'],
    controlDetails: [
      { control: 'Standard Contractual Clauses (SCCs)', description: 'EU Commission 2021 SCCs executed between EU entity (data exporter) and US entity (data importer). Module 4 (processor to controller) applied with supplementary measures per EDPB Recommendations 01/2020.', effectiveness: 'Medium' },
      { control: 'End-to-End Encryption in Transit', description: 'TLS 1.3 with AES-256-GCM for all data transfers. Dedicated VPN tunnel between EU and US data centers. Encryption keys held exclusively by EU entity — US personnel have no access to decryption keys.', effectiveness: 'High' },
      { control: 'Transfer Impact Assessment', description: 'Documented TIA per EDPB guidance covering US legal framework analysis, supplementary technical measures, and data minimization verification. Updated quarterly.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Data Protection Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-03-30', notes: 'TIA completed. SCCs and encryption provide adequate supplementary measures.' },
      { role: 'General Counsel', name: 'Robert Kim', decision: 'Pending', date: '', notes: '' },
      { role: 'Chief Risk Officer', name: 'Michael Torres', decision: 'N/A', date: '', notes: '' },
    ],
    renewalHistory: [],
  },
];

// ── MetricTile ───────────────────────────────────────────────────────────────
function MetricTile({ label, value, icon, variant }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant: 'default' | 'error' | 'warn' | 'ok' | 'info';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error:   { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--destructive))', border: 'hsl(var(--border))' },
    warn:    { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--border))' },
    ok:      { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--border))' },
    info:    { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--border))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))', fontFamily: 'Outfit, sans-serif' }}>{label}</p>
          <div style={{ color: c.text }}>{icon}</div>
        </div>
        <p className="text-2xl font-bold" style={{ color: c.text, fontFamily: 'Outfit, sans-serif' }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(message: string) {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
    background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))',
    border: '1px solid hsl(var(--border))', padding: '10px 20px',
    fontSize: '13px', fontFamily: 'Outfit, sans-serif', borderRadius: '0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Status helpers ───────────────────────────────────────────────────────────
function statusBadgeVariant(status: ExceptionStatus): string {
  switch (status) {
    case 'Approved': return 'success';
    case 'Pending': return 'warning';
    case 'Denied': return 'destructive';
    case 'Expired': return 'secondary';
    default: return 'default';
  }
}

function riskBadgeVariant(risk: RiskLevel): string {
  switch (risk) {
    case 'Low': return 'low';
    case 'Medium': return 'medium';
    case 'High': return 'high';
    case 'Critical': return 'destructive';
    default: return 'default';
  }
}

function formatDate(d: string): string {
  if (!d) return '--';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry > now && expiry - now <= thirtyDays;
}

// ── CSV Export ───────────────────────────────────────────────────────────────
function exportCsv(data: Exception[]) {
  const headers = ['Exception ID', 'Policy', 'Requested By', 'Approver', 'Status', 'Risk Accepted', 'Expiry Date', 'Compensating Controls'];
  const rows = data.map(e => [
    e.id, e.policy, e.requestedBy, e.approver, e.status, e.riskAccepted, e.expiryDate, e.compensatingControls,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exception-management-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exceptions exported to CSV');
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function ExceptionManagement() {
  const { orgName } = useSettingsStore();
  const [exceptions] = useState<Exception[]>(EXCEPTIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Detail drawer
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Exception | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return exceptions.filter(exc => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !exc.id.toLowerCase().includes(q) &&
          !exc.policy.toLowerCase().includes(q) &&
          !exc.requestedBy.toLowerCase().includes(q) &&
          !exc.description.toLowerCase().includes(q) &&
          !exc.compensatingControls.toLowerCase().includes(q)
        ) return false;
      }
      if (filterStatus !== 'all' && exc.status !== filterStatus) return false;
      return true;
    });
  }, [exceptions, search, filterStatus]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const activeCount = exceptions.filter(e => e.status === 'Approved').length;
  const pendingCount = exceptions.filter(e => e.status === 'Pending').length;
  const expiringSoonCount = exceptions.filter(e => e.status === 'Approved' && isExpiringSoon(e.expiryDate)).length;
  const expiredCount = exceptions.filter(e => e.status === 'Expired').length;

  // ── Open detail ────────────────────────────────────────────────────────────
  const openDetail = (exc: Exception) => {
    setSelected(exc);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Exception Management</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} &middot; Policy exception requests, approvals & compensating controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => exportCsv(filtered)}
          >
            <Export size={14} className="mr-1" />Export CSV
          </Button>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus size={14} className="mr-1" />Request Exception
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile
          label="Active Exceptions"
          value={activeCount}
          icon={<ShieldWarning size={18} weight="duotone" />}
          variant="info"
        />
        <MetricTile
          label="Pending Approval"
          value={pendingCount}
          icon={<HourglassMedium size={18} weight="duotone" />}
          variant="warn"
        />
        <MetricTile
          label="Expiring Soon (30d)"
          value={expiringSoonCount}
          icon={<ClockCountdown size={18} weight="duotone" />}
          variant="error"
        />
        <MetricTile
          label="Expired"
          value={expiredCount}
          icon={<Prohibit size={18} weight="duotone" />}
          variant="default"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search exceptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Denied">Denied</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Exceptions Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Exception ID', 'Policy', 'Requested By', 'Approver', 'Status', 'Risk Accepted', 'Expiry Date', 'Compensating Controls', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))', fontFamily: 'Outfit, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(exc => {
                  const expiring = exc.status === 'Approved' && isExpiringSoon(exc.expiryDate);
                  const isExpired = exc.status === 'Expired';
                  return (
                    <tr
                      key={exc.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        borderLeft: isExpired ? '4px solid hsl(var(--destructive))' : expiring ? '4px solid hsl(var(--s-wn-tx))' : 'none',
                      }}
                      onClick={() => openDetail(exc)}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{exc.id}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{exc.policy}</span>
                          <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{exc.policyRef}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{exc.requestedBy}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{exc.approver}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={statusBadgeVariant(exc.status) as any} style={{ borderRadius: 0, fontSize: 11 }}>
                          {exc.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={riskBadgeVariant(exc.riskAccepted) as any} style={{ borderRadius: 0, fontSize: 11 }}>
                          {exc.riskAccepted}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: isExpired ? 'hsl(var(--destructive))' : expiring ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>
                            {formatDate(exc.expiryDate)}
                          </span>
                          {expiring && <ClockCountdown size={12} style={{ color: 'hsl(var(--s-wn-tx))' }} />}
                          {isExpired && <Warning size={12} style={{ color: 'hsl(var(--destructive))' }} />}
                        </div>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="text-xs truncate block" style={{ color: 'hsl(var(--text-3))' }}>{exc.compensatingControls}</span>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(exc)}>
                          <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No exceptions match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Drawer ───────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  <Badge variant={statusBadgeVariant(selected.status) as any} style={{ borderRadius: 0, fontSize: 11 }}>
                    {selected.status}
                  </Badge>
                  <Badge variant={riskBadgeVariant(selected.riskAccepted) as any} style={{ borderRadius: 0, fontSize: 11 }}>
                    Risk: {selected.riskAccepted}
                  </Badge>
                </div>
                <SheetTitle style={{ color: 'hsl(var(--text-1))', fontFamily: 'Outfit, sans-serif' }}>{selected.policy}</SheetTitle>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selected.policyRef} &middot; Requested {formatDate(selected.requestedDate)}</p>
              </SheetHeader>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-3">
                {selected.status === 'Expired' && (
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => toast('Renewal request initiated for ' + selected.id)}>
                    <ArrowsClockwise size={12} className="mr-1" />Request Renewal
                  </Button>
                )}
                {selected.status === 'Pending' && (
                  <>
                    <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: '#fff' }} onClick={() => toast('Approval workflow triggered for ' + selected.id)}>
                      <CheckCircle size={12} className="mr-1" />Approve
                    </Button>
                    <Button variant="outline" size="sm" style={{ borderRadius: 0, color: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive))' }} onClick={() => toast('Denial recorded for ' + selected.id)}>
                      <Prohibit size={12} className="mr-1" />Deny
                    </Button>
                  </>
                )}
              </div>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="w-full" style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="risk" style={{ borderRadius: 0 }}>Risk Justification</TabsTrigger>
                  <TabsTrigger value="controls" style={{ borderRadius: 0 }}>Compensating Controls</TabsTrigger>
                  <TabsTrigger value="approval" style={{ borderRadius: 0 }}>Approval Chain</TabsTrigger>
                  <TabsTrigger value="renewal" style={{ borderRadius: 0 }}>Renewal History</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Requested By</p>
                      <div className="flex items-center gap-1">
                        <UserCircle size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selected.requestedBy}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Approver</p>
                      <div className="flex items-center gap-1">
                        <UserCircle size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selected.approver}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Requested Date</p>
                      <div className="flex items-center gap-1">
                        <CalendarBlank size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selected.requestedDate)}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Expiry Date</p>
                      <div className="flex items-center gap-1">
                        <CalendarBlank size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{
                          color: selected.status === 'Expired' ? 'hsl(var(--destructive))' :
                            isExpiringSoon(selected.expiryDate) ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))'
                        }}>
                          {formatDate(selected.expiryDate)}
                          {selected.status === 'Expired' && ' (Expired)'}
                          {selected.status === 'Approved' && isExpiringSoon(selected.expiryDate) && ' (Expiring Soon)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Impact Scope</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selected.impactScope}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Affected Systems</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.affectedSystems.map(sys => (
                        <Badge key={sys} variant="outline" style={{ borderRadius: 0, fontSize: 11 }}>{sys}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>{selected.description}</p>
                  </div>
                </TabsContent>

                {/* Risk Justification Tab */}
                <TabsContent value="risk" className="space-y-4 mt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Business Justification</p>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>{selected.justification}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Risk Analysis</p>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>{selected.riskAnalysis}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'hsl(var(--text-4))' }}>Risk Level Accepted</p>
                      <Badge variant={riskBadgeVariant(selected.riskAccepted) as any} style={{ borderRadius: 0 }}>
                        {selected.riskAccepted}
                      </Badge>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'hsl(var(--text-4))' }}>Exception Status</p>
                      <Badge variant={statusBadgeVariant(selected.status) as any} style={{ borderRadius: 0 }}>
                        {selected.status}
                      </Badge>
                    </div>
                  </div>
                </TabsContent>

                {/* Compensating Controls Tab */}
                <TabsContent value="controls" className="space-y-4 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Compensating Controls ({selected.controlDetails.length})</p>
                  {selected.controlDetails.map((ctrl, i) => (
                    <div key={i} className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, borderLeft: '3px solid hsl(var(--brand))' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ListChecks size={14} style={{ color: 'hsl(var(--brand))' }} />
                          <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{ctrl.control}</span>
                        </div>
                        <Badge
                          variant={ctrl.effectiveness === 'High' ? 'success' : ctrl.effectiveness === 'Medium' ? 'warning' : 'destructive'}
                          style={{ borderRadius: 0, fontSize: 10 }}
                        >
                          {ctrl.effectiveness} Effectiveness
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>{ctrl.description}</p>
                    </div>
                  ))}
                </TabsContent>

                {/* Approval Chain Tab */}
                <TabsContent value="approval" className="space-y-4 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Approval Workflow</p>
                  <div className="space-y-0">
                    {selected.approvalChain.map((step, i) => {
                      const isLast = i === selected.approvalChain.length - 1;
                      const decisionColor =
                        step.decision === 'Approved' ? 'hsl(var(--s-ok-tx))' :
                        step.decision === 'Pending' ? 'hsl(var(--s-wn-tx))' :
                        step.decision === 'Denied' ? 'hsl(var(--destructive))' :
                        'hsl(var(--text-4))';
                      return (
                        <div key={i} className="flex gap-3">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div
                              className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                              style={{
                                background: step.decision === 'Approved' ? 'hsl(var(--s-ok-tx))' :
                                  step.decision === 'Pending' ? 'hsl(var(--s-wn-tx))' :
                                  step.decision === 'Denied' ? 'hsl(var(--destructive))' : 'hsl(var(--bg-muted))',
                                borderRadius: '50%',
                              }}
                            >
                              {step.decision === 'Approved' && <CheckCircle size={14} weight="bold" style={{ color: '#fff' }} />}
                              {step.decision === 'Pending' && <HourglassMedium size={14} weight="bold" style={{ color: '#fff' }} />}
                              {step.decision === 'Denied' && <Prohibit size={14} weight="bold" style={{ color: '#fff' }} />}
                              {step.decision === 'N/A' && <span className="text-[10px] font-bold" style={{ color: 'hsl(var(--text-4))' }}>--</span>}
                            </div>
                            {!isLast && (
                              <div className="w-0.5 flex-1 min-h-[24px]" style={{ background: 'hsl(var(--border))' }} />
                            )}
                          </div>
                          {/* Content */}
                          <div className="pb-4 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{step.role}</span>
                              <Badge
                                style={{
                                  borderRadius: 0,
                                  fontSize: 10,
                                  background: step.decision === 'Approved' ? 'hsla(var(--s-ok-tx), 0.1)' : 'transparent',
                                  color: decisionColor,
                                  border: `1px solid ${decisionColor}`,
                                }}
                              >
                                {step.decision}
                              </Badge>
                            </div>
                            <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{step.name}</p>
                            {step.date && (
                              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(step.date)}</p>
                            )}
                            {step.notes && (
                              <div className="mt-1 p-2" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                                <p className="text-xs italic" style={{ color: 'hsl(var(--text-3))' }}>"{step.notes}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Renewal History Tab */}
                <TabsContent value="renewal" className="space-y-4 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Renewal History</p>
                  {selected.renewalHistory.length === 0 ? (
                    <div className="text-center py-6">
                      <ArrowsClockwise size={24} style={{ color: 'hsl(var(--text-4))', margin: '0 auto 8px' }} />
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No renewal history. This is the initial exception request.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            {['Version', 'Requested', 'Status', 'Expiry', 'Notes'].map(h => (
                              <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selected.renewalHistory.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                              <td className="px-2 py-2">
                                <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{r.version}</span>
                              </td>
                              <td className="px-2 py-2">
                                <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(r.requestedDate)}</span>
                              </td>
                              <td className="px-2 py-2">
                                <Badge
                                  variant={r.status === 'Active' ? 'success' : r.status === 'Expired' ? 'secondary' : 'warning'}
                                  style={{ borderRadius: 0, fontSize: 10 }}
                                >
                                  {r.status}
                                </Badge>
                              </td>
                              <td className="px-2 py-2">
                                <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(r.expiryDate)}</span>
                              </td>
                              <td className="px-2 py-2">
                                <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.notes}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selected.status === 'Expired' && (
                    <div className="p-3 flex items-start gap-2" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--destructive))', borderRadius: 0 }}>
                      <Warning size={16} weight="bold" style={{ color: 'hsl(var(--destructive))', marginTop: 1, flexShrink: 0 }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'hsl(var(--destructive))' }}>Exception Expired — Renewal Required</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                          This exception expired on {formatDate(selected.expiryDate)}. The associated system must either comply with the standard policy or submit a new exception request with updated justification and compensating controls.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
