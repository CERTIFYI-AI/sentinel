import { useState, useMemo } from 'react';
import {
  MagnifyingGlass, Eye, ShieldWarning, ClockCountdown, Warning,
  CheckCircle, Export, Plus, ArrowsClockwise,
  UserCircle, CalendarBlank, Prohibit, HourglassMedium,
  X, Trash, ArrowRight, Buildings, ArrowSquareOut,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Types ────────────────────────────────────────────────────────────────────
type ExceptionStatus = 'Pending' | 'Approved' | 'Denied' | 'Expired' | 'Under Review';
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

interface CompensatingControl {
  control: string;
  description: string;
  effectiveness: 'High' | 'Medium' | 'Low';
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
  likelihood: number;
  impact: number;
  riskScore: number;
  expiryDate: string;
  compensatingControls: string;
  description: string;
  justification: string;
  riskAnalysis: string;
  impactScope: string;
  affectedSystems: string[];
  frameworkMapping: string[];
  regulatoryRef: string;
  controlDetails: CompensatingControl[];
  approvalChain: ApprovalStep[];
  renewalHistory: RenewalRecord[];
  tags: string[];
}

// ── Seed Data ────────────────────────────────────────────────────────────────
const SEED_EXCEPTIONS: Exception[] = [
  {
    id: 'EXC-001',
    policy: 'Data Retention Policy',
    policyRef: 'DRP-4.2',
    requestedBy: 'Sarah Chen',
    requestedDate: '2026-01-10',
    approver: 'James Rodriguez',
    status: 'Approved',
    riskAccepted: 'Medium',
    likelihood: 2,
    impact: 4,
    riskScore: 8,
    expiryDate: '2026-09-30',
    compensatingControls: 'Enhanced encryption + access logging',
    description: 'PII retention extension — 18-month retention for model retraining. Standard policy limits PII retention to 6 months, but the credit scoring model retraining pipeline requires 18 months of historical PII data to maintain accuracy above the 95% threshold mandated by the model validation team.',
    justification: 'Model performance degrades below acceptable thresholds without 18 months of historical PII data. The credit scoring model v3.1 requires this extended window for feature engineering across seasonal financial patterns. Reducing retention to 6 months caused a 12% increase in false positive rates during Q4 2025 testing.',
    riskAnalysis: 'Extended PII retention increases data breach exposure surface. If compromised, up to 2.4M customer records spanning 18 months would be at risk versus 800K under standard 6-month retention. Regulatory penalty exposure under GDPR Art. 5(1)(e) estimated at EUR 2–4M. Probability of breach assessed at Low given compensating controls.',
    impactScope: 'Credit Scoring Division — 2.4M customer records',
    affectedSystems: ['Credit Scoring Model v3.1', 'Customer Data Lake', 'Feature Engineering Pipeline'],
    frameworkMapping: ['GDPR Art. 5(1)(e)', 'ISO 42001 A.8.4', 'NIST AI RMF 2.3'],
    regulatoryRef: 'GDPR Art. 5(1)(e) — Storage limitation',
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
    tags: ['PII', 'GDPR', 'Data Retention'],
  },
  {
    id: 'EXC-002',
    policy: 'Model Validation & Bias Audit Policy',
    policyRef: 'MVBA-2.1',
    requestedBy: 'David Park',
    requestedDate: '2026-03-20',
    approver: 'Elena Vasquez',
    status: 'Under Review',
    riskAccepted: 'Medium',
    likelihood: 3,
    impact: 4,
    riskScore: 12,
    expiryDate: '2026-06-20',
    compensatingControls: 'Post-deployment monitoring + 30-day audit deadline',
    description: 'Model deployment without full bias audit — credit scoring v2.1 expedited deployment. Regulatory deadline requires deployment by April 1, but the full bias audit cycle takes 45 days. Requesting exception to deploy with partial audit and complete the full audit within 30 days post-deployment.',
    justification: 'OCC regulatory guidance effective April 1, 2026 requires updated credit scoring methodology. Failure to deploy by deadline exposes Acme Financial Corp to regulatory action and potential enforcement. Partial bias audit covering 4 of 7 protected classes has been completed with satisfactory results.',
    riskAnalysis: 'Deploying without full bias audit creates risk of discriminatory outcomes in the 3 uncovered protected classes (age, disability, veteran status). Historical data shows these classes represent 18% of applicant pool. Potential fair lending violations could result in CFPB enforcement action estimated at $5–15M.',
    impactScope: 'Consumer Lending — 850K credit applications/month',
    affectedSystems: ['Credit Scoring v2.1', 'Underwriting Engine', 'Fair Lending Dashboard'],
    frameworkMapping: ['EU AI Act Art. 10', 'NIST AI RMF GOVERN 1.2', 'ISO 42001 A.9.4', 'SR 11-7'],
    regulatoryRef: 'EU AI Act Art. 10 — Data and data governance',
    controlDetails: [
      { control: 'Real-time Bias Monitoring', description: 'Automated disparate impact ratio monitoring across all 7 protected classes with 4-hour alerting threshold.', effectiveness: 'High' },
      { control: '30-Day Full Audit Deadline', description: 'Hard deadline of April 30, 2026 for completion of remaining 3 protected class audits. Auto-rollback triggered if deadline missed.', effectiveness: 'Medium' },
      { control: 'Shadow Model Comparison', description: 'v1.9 model maintained in shadow mode for A/B comparison. Any statistically significant divergence triggers review.', effectiveness: 'High' },
    ],
    approvalChain: [
      { role: 'Model Risk Manager', name: 'Lisa Chang', decision: 'Approved', date: '2026-03-22', notes: 'Partial audit results satisfactory. 30-day completion is achievable.' },
      { role: 'Chief Compliance Officer', name: 'Elena Vasquez', decision: 'Pending', date: '', notes: '' },
      { role: 'Chief Risk Officer', name: 'Michael Torres', decision: 'N/A', date: '', notes: '' },
    ],
    renewalHistory: [],
    tags: ['Bias Audit', 'EU AI Act', 'Credit'],
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
    likelihood: 3,
    impact: 5,
    riskScore: 15,
    expiryDate: '2026-06-15',
    compensatingControls: 'Data anonymization pre-flight + DLP gateway',
    description: 'Third-party API without DPA — using OpenAI API before DPA signed. The NLP team needs to integrate OpenAI GPT-4 for customer query classification, but the Data Processing Agreement negotiation with OpenAI is still in legal review.',
    justification: 'Customer service response time SLA is being breached at 34% rate. The GPT-4 integration is projected to reduce average response time by 60% and is a Board-level priority for Q1 2026. Legal review of the DPA is expected to complete by May 2026.',
    riskAnalysis: 'Processing data through OpenAI API without a signed DPA creates GDPR Art. 28 compliance risk. If non-anonymized data is inadvertently transmitted, regulatory exposure under GDPR is estimated at EUR 10–20M (2–4% of annual turnover).',
    impactScope: 'Customer Service Division — 120K queries/month',
    affectedSystems: ['Customer Query Classifier', 'Support Ticket Router', 'OpenAI API Gateway'],
    frameworkMapping: ['GDPR Art. 28', 'ISO 27001 A.15.1', 'NIST AI RMF MAP 5.2'],
    regulatoryRef: 'GDPR Art. 28 — Processor obligations',
    controlDetails: [
      { control: 'Data Anonymization Pre-flight', description: 'All PII stripped and replaced with synthetic tokens before API transmission. Named entity recognition removes 23 PII categories. k-anonymity threshold of k=5 enforced.', effectiveness: 'High' },
      { control: 'API Gateway DLP Inspection', description: 'All outbound API calls inspected by DLP gateway. Any payload containing detected PII patterns is blocked and logged.', effectiveness: 'High' },
      { control: 'Data Residency Verification', description: 'Weekly verification that OpenAI API endpoints resolve to approved regions.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Data Protection Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-02-10', notes: 'Anonymization controls reviewed and tested. Acceptable for temporary use.' },
      { role: 'CISO', name: 'James Rodriguez', decision: 'Approved', date: '2026-02-12', notes: 'DLP gateway inspection mandatory. Weekly PII leakage reports required.' },
      { role: 'General Counsel', name: 'Robert Kim', decision: 'Approved', date: '2026-02-14', notes: 'Temporary approval only. DPA must be signed by June 15 or integration must cease.' },
    ],
    renewalHistory: [
      { version: 'v1.0', requestedDate: '2026-02-05', status: 'Active', expiryDate: '2026-06-15', notes: 'Initial exception. Hard deadline tied to DPA signature.' },
    ],
    tags: ['Third-Party', 'GDPR', 'OpenAI'],
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
    likelihood: 2,
    impact: 3,
    riskScore: 6,
    expiryDate: '2026-07-31',
    compensatingControls: 'Sampling at 10% + anomaly alerting',
    description: 'Reduced logging for performance — high-frequency trading model. The HFT model executes 50,000 predictions per second and full logging creates unacceptable latency (>2ms added per prediction).',
    justification: 'Full logging adds 2.3ms latency per prediction, which translates to $4.2M estimated annual revenue loss in high-frequency trading scenarios. 10% sampling provides statistically valid audit coverage (99.9% CI).',
    riskAnalysis: 'Reduced logging creates gaps in audit trail for 90% of predictions. In a regulatory investigation, inability to reproduce specific trading decisions could result in enforcement action. SEC/FINRA examination risk assessed as Medium.',
    impactScope: 'Quantitative Trading Division — 50K predictions/second',
    affectedSystems: ['HFT Prediction Engine v4.0', 'Trade Execution Platform', 'Market Risk Dashboard'],
    frameworkMapping: ['SR 11-7 Model Risk Management', 'SEC Regulation SCI', 'ISO 42001 A.9.6'],
    regulatoryRef: 'SR 11-7 — Supervisory Guidance on Model Risk Management',
    controlDetails: [
      { control: '10% Statistical Sampling', description: 'Uniform random sampling of 10% of all predictions with full feature vector, model output, and confidence score logging.', effectiveness: 'High' },
      { control: 'Anomaly-Triggered Full Capture', description: 'When anomaly detection flags unusual prediction patterns, logging automatically escalates to 100% capture for 60 seconds.', effectiveness: 'High' },
      { control: 'Daily Reconciliation Report', description: 'Automated daily reconciliation comparing sampled predictions against actual trading outcomes.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Head of Model Risk', name: 'Lisa Chang', decision: 'Approved', date: '2026-01-28', notes: 'Statistical sampling methodology reviewed. 10% rate provides adequate coverage.' },
      { role: 'Chief Compliance Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-01-30', notes: 'Anomaly trigger mechanism must be tested monthly.' },
      { role: 'Head of Trading Technology', name: 'Andrew Wells', decision: 'Approved', date: '2026-02-01', notes: 'Performance impact verified. 10% sampling adds <0.1ms latency.' },
    ],
    renewalHistory: [
      { version: 'v1.0', requestedDate: '2025-08-01', status: 'Expired', expiryDate: '2026-01-31', notes: 'Initial exception at 5% sampling rate.' },
      { version: 'v2.0', requestedDate: '2026-01-25', status: 'Active', expiryDate: '2026-07-31', notes: 'Renewed with increased sampling rate (5% → 10%) and anomaly trigger.' },
    ],
    tags: ['Logging', 'HFT', 'SR 11-7'],
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
    likelihood: 3,
    impact: 4,
    riskScore: 12,
    expiryDate: '2026-01-15',
    compensatingControls: 'Monthly manual review + escalation protocol',
    description: 'Legacy model grandfathered — fraud detection v1.2. The fraud detection model v1.2 has been in production for 4 years without undergoing the new model validation framework introduced in 2025.',
    justification: 'Fraud detection v1.2 processes $2.8B in transactions monthly with a 97.3% accuracy rate. Taking the model offline for validation would leave a coverage gap of 2–3 months, increasing fraud losses by an estimated $12M.',
    riskAnalysis: 'Operating an unvalidated legacy model creates regulatory risk under SR 11-7. Concept drift analysis shows a 3.2% degradation in precision over the past 12 months. Estimated incremental fraud losses: $1.8M annually.',
    impactScope: 'Fraud Operations — $2.8B monthly transaction volume',
    affectedSystems: ['Fraud Detection v1.2', 'Transaction Monitoring Platform', 'Case Management System'],
    frameworkMapping: ['SR 11-7', 'OCC 2011-12', 'ISO 42001 A.9.3'],
    regulatoryRef: 'SR 11-7 — Model Validation requirements',
    controlDetails: [
      { control: 'Monthly Manual Review', description: 'Dedicated fraud analyst team reviews 500 random flagged and unflagged transactions monthly.', effectiveness: 'Medium' },
      { control: 'Escalation Protocol', description: 'Any detected accuracy degradation >1% triggers immediate escalation to Model Risk Committee with 48-hour response SLA.', effectiveness: 'Medium' },
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
    tags: ['Legacy Model', 'Fraud', 'SR 11-7'],
  },
  {
    id: 'EXC-006',
    policy: 'Cross-Border Data Transfer Policy',
    policyRef: 'CBDT-2.2',
    requestedBy: 'Anna Kowalski',
    requestedDate: '2026-03-28',
    approver: 'Robert Kim',
    status: 'Under Review',
    riskAccepted: 'High',
    likelihood: 3,
    impact: 5,
    riskScore: 15,
    expiryDate: '2026-09-28',
    compensatingControls: 'SCCs + encryption in transit + TIA',
    description: 'Cross-border transfer temporary approval — EU to US model training. The ML team needs to transfer anonymized EU customer behavioral data to US-based GPU training infrastructure for the next-generation recommendation engine.',
    justification: 'US-based GPU cluster provides 8× training throughput compared to available EU infrastructure. The recommendation engine v3.0 is a strategic Board priority with a Q2 2026 launch deadline. Estimated revenue impact of delay: $8M in Q3 2026.',
    riskAnalysis: 'EU-to-US data transfer without adequacy decision creates GDPR Chapter V compliance risk. Post-Schrems II, SCCs alone may be insufficient. Potential penalties of EUR 10–20M. Transfer Impact Assessment identifies US surveillance risk as Medium.',
    impactScope: 'EU Operations — 1.2M customer behavioral profiles',
    affectedSystems: ['EU Data Lake', 'US Training Cluster', 'Recommendation Engine v3.0', 'Data Transfer Gateway'],
    frameworkMapping: ['GDPR Chapter V', 'EDPB Recommendations 01/2020', 'ISO 27001 A.18.1'],
    regulatoryRef: 'GDPR Chapter V — Transfers of personal data to third countries',
    controlDetails: [
      { control: 'Standard Contractual Clauses (SCCs)', description: 'EU Commission 2021 SCCs executed between EU entity (data exporter) and US entity (data importer). Module 4 applied with supplementary measures per EDPB Recommendations.', effectiveness: 'Medium' },
      { control: 'End-to-End Encryption in Transit', description: 'TLS 1.3 with AES-256-GCM for all data transfers. Dedicated VPN tunnel between EU and US data centers.', effectiveness: 'High' },
      { control: 'Transfer Impact Assessment', description: 'Documented TIA per EDPB guidance covering US legal framework analysis, supplementary technical measures, and data minimization verification.', effectiveness: 'Medium' },
    ],
    approvalChain: [
      { role: 'Data Protection Officer', name: 'Elena Vasquez', decision: 'Approved', date: '2026-03-30', notes: 'TIA completed. SCCs and encryption provide adequate supplementary measures.' },
      { role: 'General Counsel', name: 'Robert Kim', decision: 'Pending', date: '', notes: '' },
      { role: 'Chief Risk Officer', name: 'Michael Torres', decision: 'N/A', date: '', notes: '' },
    ],
    renewalHistory: [],
    tags: ['Cross-Border', 'GDPR', 'Schrems II'],
  },
];

const FRAMEWORK_OPTIONS = ['GDPR', 'EU AI Act', 'ISO 42001', 'ISO 27001', 'NIST AI RMF', 'SOC 2', 'SR 11-7', 'CCPA', 'DORA', 'MAS TRM', 'PCI DSS', 'HIPAA'];
const APPROVER_OPTIONS = ['Chief Risk Officer', 'CISO', 'Data Protection Officer', 'Chief Compliance Officer', 'General Counsel', 'Head of Model Risk', 'Board Risk Committee'];

const EFFECTIVENESS_COLOR: Record<string, { bg: string; text: string }> = {
  High: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' },
  Low: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return '--';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpiringSoon(expiryDate: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry > now && expiry - now <= thirtyDays;
}

function riskScoreColor(score: number) {
  if (score >= 15) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
  if (score >= 8) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
}

function statusStyle(status: ExceptionStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'Approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
    case 'Pending': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
    case 'Under Review': return { bg: 'hsl(220 80% 56% / 0.12)', text: 'hsl(220 80% 50%)', border: 'hsl(220 80% 56% / 0.3)' };
    case 'Denied': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
    case 'Expired': return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))', border: 'hsl(var(--border))' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))', border: 'hsl(var(--border))' };
  }
}

function riskLevelStyle(r: RiskLevel) {
  switch (r) {
    case 'Critical': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'High': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'Medium': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    default: return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
  }
}

function approvalStepStyle(decision: ApprovalStep['decision']) {
  switch (decision) {
    case 'Approved': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' };
    case 'Denied': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' };
    case 'Pending': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))' };
  }
}

// ── Mini toast ────────────────────────────────────────────────────────────────
function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  const colors = {
    success: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    info: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
  };
  const c = colors[type];
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
    background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    padding: '10px 20px', fontSize: '13px', fontFamily: 'Outfit, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCsv(data: Exception[]) {
  const headers = ['ID', 'Policy', 'Policy Ref', 'Requested By', 'Approver', 'Status', 'Risk Level', 'Risk Score', 'Expiry Date', 'Impact Scope', 'Frameworks', 'Regulatory Ref'];
  const rows = data.map(e => [
    e.id, e.policy, e.policyRef, e.requestedBy, e.approver, e.status, e.riskAccepted,
    e.riskScore, e.expiryDate, e.impactScope, e.frameworkMapping.join('; '), e.regulatoryRef,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exceptions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exceptions exported to CSV');
}

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
          <div style={{ color }}>{icon}</div>
        </div>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ExceptionStatus }) {
  const s = statusStyle(status);
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  );
}

// ── RiskBadge ─────────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: RiskLevel }) {
  const s = riskLevelStyle(level);
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5" style={{ background: s.bg, color: s.text }}>
      {level}
    </span>
  );
}

// ── ScorePill ─────────────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number }) {
  const c = riskScoreColor(score);
  return (
    <span className="font-mono font-bold text-xs px-2 py-0.5" style={{ background: c.bg, color: c.text }}>{score}</span>
  );
}

// ── ApprovalTimeline ──────────────────────────────────────────────────────────
function ApprovalTimeline({ chain }: { chain: ApprovalStep[] }) {
  return (
    <div className="space-y-3">
      {chain.map((step, i) => {
        const s = approvalStepStyle(step.decision);
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}30` }}>
                {i + 1}
              </div>
              {i < chain.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'hsl(var(--border))' }} />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{step.name}</span>
                <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{step.role}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5" style={{ background: s.bg, color: s.text }}>{step.decision}</span>
                {step.date && <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{fmt(step.date)}</span>}
              </div>
              {step.notes && (
                <p className="text-xs italic" style={{ color: 'hsl(var(--text-3))' }}>"{step.notes}"</p>
              )}
              {!step.notes && step.decision === 'Pending' && (
                <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Awaiting review</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const EMPTY_FORM = {
  policy: '', policyRef: '', requestedBy: '', approver: 'Chief Risk Officer', department: '',
  riskAccepted: 'Medium' as RiskLevel, likelihood: 2, impact: 3,
  expiryDate: '', description: '', justification: '', riskAnalysis: '',
  impactScope: '', regulatoryRef: '', frameworkMapping: [] as string[],
  affectedSystems: [] as string[], compensatingControls: '', tags: [] as string[],
};

export default function ExceptionManagement() {
  const { orgName } = useSettingsStore();
  const [exceptions, setExceptions] = useState<Exception[]>(SEED_EXCEPTIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // Detail drawer
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Exception | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [systemInput, setSystemInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Approve/Deny dialog
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState<'Approved' | 'Denied'>('Approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<Exception | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Exception | null>(null);

  // Renewal dialog
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalDate, setRenewalDate] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return exceptions.filter(exc => {
      if (search) {
        const q = search.toLowerCase();
        const match = exc.id.toLowerCase().includes(q) || exc.policy.toLowerCase().includes(q) ||
          exc.requestedBy.toLowerCase().includes(q) || exc.description.toLowerCase().includes(q) ||
          exc.impactScope.toLowerCase().includes(q) || exc.tags.some(t => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (filterStatus !== 'all' && exc.status !== filterStatus) return false;
      if (filterRisk !== 'all' && exc.riskAccepted !== filterRisk) return false;
      return true;
    });
  }, [exceptions, search, filterStatus, filterRisk]);

  const activeCount = exceptions.filter(e => e.status === 'Approved').length;
  const pendingCount = exceptions.filter(e => e.status === 'Pending' || e.status === 'Under Review').length;
  const expiringSoon = exceptions.filter(e => e.status === 'Approved' && isExpiringSoon(e.expiryDate)).length;
  const expiredCount = exceptions.filter(e => e.status === 'Expired').length;
  const highRiskCount = exceptions.filter(e => (e.riskAccepted === 'High' || e.riskAccepted === 'Critical') && e.status === 'Approved').length;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openDetail = (exc: Exception) => { setSelected(exc); setSheetOpen(true); };

  const handleCreate = () => {
    if (!form.policy.trim() || !form.description.trim() || !form.justification.trim()) {
      showToast('Please fill in all required fields', 'error'); return;
    }
    const id = `EXC-${String(exceptions.length + 1).padStart(3, '0')}`;
    const riskScore = form.likelihood * form.impact;
    const newExc: Exception = {
      id,
      policy: form.policy,
      policyRef: form.policyRef || `POL-${String(exceptions.length + 1).padStart(3, '0')}`,
      requestedBy: form.requestedBy || 'Current User',
      requestedDate: new Date().toISOString().split('T')[0],
      approver: form.approver,
      status: 'Pending',
      riskAccepted: form.riskAccepted,
      likelihood: form.likelihood,
      impact: form.impact,
      riskScore,
      expiryDate: form.expiryDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      compensatingControls: form.compensatingControls || 'To be defined',
      description: form.description,
      justification: form.justification,
      riskAnalysis: form.riskAnalysis || 'Risk analysis pending.',
      impactScope: form.impactScope || 'Scope to be assessed',
      affectedSystems: form.affectedSystems,
      frameworkMapping: form.frameworkMapping,
      regulatoryRef: form.regulatoryRef,
      controlDetails: [],
      approvalChain: [
        { role: form.approver, name: form.approver, decision: 'Pending', date: '', notes: '' },
      ],
      renewalHistory: [],
      tags: form.tags,
    };
    setExceptions(prev => [newExc, ...prev]);
    setCreateOpen(false);
    setForm({ ...EMPTY_FORM });
    setSystemInput(''); setTagInput('');
    showToast(`Exception request ${id} submitted for approval`);
  };

  const openDecision = (exc: Exception, d: 'Approved' | 'Denied') => {
    setDecisionTarget(exc);
    setDecision(d);
    setDecisionNotes('');
    setDecisionOpen(true);
  };

  const handleDecision = () => {
    if (!decisionTarget) return;
    setExceptions(prev => prev.map(e => {
      if (e.id !== decisionTarget.id) return e;
      const updatedChain = e.approvalChain.map((step, idx) => {
        if (step.decision === 'Pending' && idx === e.approvalChain.findIndex(s => s.decision === 'Pending')) {
          return { ...step, decision, date: new Date().toISOString().split('T')[0], notes: decisionNotes };
        }
        return step;
      });
      const allApproved = updatedChain.every(s => s.decision === 'Approved' || s.decision === 'N/A');
      const anyDenied = updatedChain.some(s => s.decision === 'Denied');
      const newStatus: ExceptionStatus = anyDenied ? 'Denied' : allApproved ? 'Approved' : 'Under Review';
      return { ...e, status: newStatus, approvalChain: updatedChain };
    }));
    if (selected?.id === decisionTarget.id) {
      setSelected(prev => {
        if (!prev) return prev;
        const updatedChain = prev.approvalChain.map((step, idx) => {
          if (step.decision === 'Pending' && idx === prev.approvalChain.findIndex(s => s.decision === 'Pending')) {
            return { ...step, decision, date: new Date().toISOString().split('T')[0], notes: decisionNotes };
          }
          return step;
        });
        const allApproved = updatedChain.every(s => s.decision === 'Approved' || s.decision === 'N/A');
        const anyDenied = updatedChain.some(s => s.decision === 'Denied');
        return { ...prev, status: anyDenied ? 'Denied' : allApproved ? 'Approved' : 'Under Review', approvalChain: updatedChain };
      });
    }
    setDecisionOpen(false);
    showToast(`Exception ${decisionTarget.id} ${decision.toLowerCase()} with notes recorded`, decision === 'Approved' ? 'success' : 'info');
  };

  const handleDelete = (exc: Exception) => {
    setExceptions(prev => prev.filter(e => e.id !== exc.id));
    if (selected?.id === exc.id) setSheetOpen(false);
    setDeleteTarget(null);
    showToast(`Exception ${exc.id} deleted`);
  };

  const handleRenewal = () => {
    if (!selected) return;
    const newVersion = `v${selected.renewalHistory.length + 1 + 1}.0`;
    const renewal: RenewalRecord = {
      version: newVersion,
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      expiryDate: renewalDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      notes: renewalNotes,
    };
    setExceptions(prev => prev.map(e =>
      e.id === selected.id ? { ...e, status: 'Pending', expiryDate: renewal.expiryDate, renewalHistory: [...e.renewalHistory, renewal] } : e
    ));
    setSelected(prev => prev ? { ...prev, status: 'Pending', expiryDate: renewal.expiryDate, renewalHistory: [...prev.renewalHistory, renewal] } : prev);
    setRenewalOpen(false);
    setRenewalDate(''); setRenewalNotes('');
    showToast(`Renewal request for ${selected.id} submitted`);
  };

  const addSystem = () => {
    if (systemInput.trim()) {
      setForm(f => ({ ...f, affectedSystems: [...f.affectedSystems, systemInput.trim()] }));
      setSystemInput('');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const toggleFramework = (fw: string) => {
    setForm(f => ({
      ...f,
      frameworkMapping: f.frameworkMapping.includes(fw)
        ? f.frameworkMapping.filter(x => x !== fw)
        : [...f.frameworkMapping, fw],
    }));
  };

  // ── Current user can make decision if there's a pending step ─────────────
  const canDecide = (exc: Exception) => exc.status === 'Pending' || exc.status === 'Under Review';

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Exception Management</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} · Policy exception requests, approval chains & compensating controls
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => exportCsv(filtered)}>
            <Export size={14} className="mr-1.5" />Export CSV
          </Button>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1.5" />Request Exception
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        <MetricTile label="Active Exceptions" value={activeCount}
          sub="Currently approved" icon={<ShieldWarning size={16} weight="duotone" />} color="hsl(220 80% 56%)" />
        <MetricTile label="Pending Review" value={pendingCount}
          sub="Awaiting decision" icon={<HourglassMedium size={16} weight="duotone" />} color="hsl(var(--s-wn-tx))" />
        <MetricTile label="Expiring ≤30d" value={expiringSoon}
          sub="Renewal required" icon={<ClockCountdown size={16} weight="duotone" />} color="hsl(var(--s-er-tx))" />
        <MetricTile label="Expired" value={expiredCount}
          sub="Past expiry date" icon={<Prohibit size={16} weight="duotone" />} color="hsl(var(--text-4))" />
        <MetricTile label="High/Critical Risk" value={highRiskCount}
          sub="Active approved" icon={<Warning size={16} weight="duotone" />} color="hsl(var(--s-er-tx))" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input placeholder="Search exceptions, policies, tags…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm" style={{ borderRadius: 0 }} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['all', 'Approved', 'Pending', 'Under Review', 'Denied', 'Expired'].map(s => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-36 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {['all', 'Low', 'Medium', 'High', 'Critical'].map(r => (
              <SelectItem key={r} value={r}>{r === 'all' ? 'All Risk Levels' : r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {exceptions.length} exceptions
        </span>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['ID', 'Policy', 'Requested By', 'Status', 'Risk Level', 'Score', 'Expiry', 'Frameworks', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'hsl(var(--text-4))', background: 'hsl(var(--bg-raised))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(exc => {
                  const expiring = exc.status === 'Approved' && isExpiringSoon(exc.expiryDate);
                  const isExp = exc.status === 'Expired';
                  const leftColor = isExp ? 'hsl(var(--s-er-tx))' : expiring ? 'hsl(var(--s-wn-tx))' : 'transparent';
                  return (
                    <tr key={exc.id}
                      className="hover:bg-muted/30 cursor-pointer group transition-colors"
                      style={{ borderBottom: '1px solid hsl(var(--border))', borderLeft: `3px solid ${leftColor}` }}
                      onClick={() => openDetail(exc)}>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{exc.id}</span>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--text-1))' }}>{exc.policy}</p>
                        <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{exc.policyRef}</p>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <UserCircle size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{exc.requestedBy}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2"><StatusBadge status={exc.status} /></td>
                      <td className="px-3 py-2"><RiskBadge level={exc.riskAccepted} /></td>
                      <td className="px-3 py-2"><ScorePill score={exc.riskScore} /></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs" style={{ color: isExp ? 'hsl(var(--s-er-tx))' : expiring ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-2))' }}>
                            {fmt(exc.expiryDate)}
                          </span>
                          {expiring && <ClockCountdown size={11} style={{ color: 'hsl(var(--s-wn-tx))' }} />}
                          {isExp && <Warning size={11} style={{ color: 'hsl(var(--s-er-tx))' }} />}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {exc.frameworkMapping.slice(0, 2).map(fw => (
                            <span key={fw} className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }}>
                              {fw.split(' ')[0]}
                            </span>
                          ))}
                          {exc.frameworkMapping.length > 2 && (
                            <span className="text-[9px] px-1 py-0.5" style={{ color: 'hsl(var(--text-4))' }}>+{exc.frameworkMapping.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => openDetail(exc)}>
                            <Eye size={12} />
                          </Button>
                          {canDecide(exc) && (
                            <>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                                style={{ color: 'hsl(var(--s-ok-tx))' }}
                                onClick={() => openDecision(exc, 'Approved')}>
                                <CheckCircle size={12} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                                style={{ color: 'hsl(var(--s-er-tx))' }}
                                onClick={() => openDecision(exc, 'Denied')}>
                                <Prohibit size={12} />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]"
                            style={{ color: 'hsl(var(--s-er-tx))' }}
                            onClick={() => setDeleteTarget(exc)}>
                            <Trash size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No exceptions match your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail Drawer ─────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[640px] sm:max-w-[640px] overflow-y-auto p-0" style={{ borderRadius: 0 }}>
          {selected && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selected.id}</span>
                  <StatusBadge status={selected.status} />
                  <RiskBadge level={selected.riskAccepted} />
                  <ScorePill score={selected.riskScore} />
                </div>
                <SheetTitle className="text-base font-bold leading-snug" style={{ color: 'hsl(var(--text-1))' }}>
                  {selected.policy}
                </SheetTitle>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                  {selected.policyRef} · Requested {fmt(selected.requestedDate)} by {selected.requestedBy}
                </p>
                {selected.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {selected.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand)/0.2)' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-6 py-3 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: 'hsl(var(--border))' }}>
                {canDecide(selected) && (
                  <>
                    <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: '#fff', height: 30 }}
                      onClick={() => openDecision(selected, 'Approved')}>
                      <CheckCircle size={12} className="mr-1.5" />Approve
                    </Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0, color: 'hsl(var(--s-er-tx))', borderColor: 'hsl(var(--s-er-tx))', height: 30 }}
                      onClick={() => openDecision(selected, 'Denied')}>
                      <Prohibit size={12} className="mr-1.5" />Deny
                    </Button>
                  </>
                )}
                {selected.status === 'Expired' && (
                  <Button size="sm" variant="outline" style={{ borderRadius: 0, height: 30 }}
                    onClick={() => { setRenewalDate(''); setRenewalNotes(''); setRenewalOpen(true); }}>
                    <ArrowsClockwise size={12} className="mr-1.5" />Request Renewal
                  </Button>
                )}
                <Button size="sm" variant="outline" style={{ borderRadius: 0, height: 30 }}
                  onClick={() => setDeleteTarget(selected)}>
                  <Trash size={12} className="mr-1.5" />Delete
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue="overview" className="h-full">
                  <div className="px-6 pt-3">
                    <TabsList className="w-full h-8" style={{ borderRadius: 0 }}>
                      {['overview', 'risk', 'controls', 'approval', 'renewal'].map(t => (
                        <TabsTrigger key={t} value={t} style={{ borderRadius: 0, fontSize: 11, textTransform: 'capitalize' }}>{t}</TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* Overview */}
                  <TabsContent value="overview" className="px-6 pb-6 space-y-5 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Requested By', value: selected.requestedBy, icon: <UserCircle size={12} /> },
                        { label: 'Approver', value: selected.approver, icon: <UserCircle size={12} /> },
                        { label: 'Requested Date', value: fmt(selected.requestedDate), icon: <CalendarBlank size={12} /> },
                        { label: 'Expiry Date', value: fmt(selected.expiryDate), icon: <CalendarBlank size={12} /> },
                      ].map(({ label, value, icon }) => (
                        <div key={label} className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: 'hsl(var(--text-4))' }}>{icon}</span>
                            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Business Justification</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.justification}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Impact Scope</p>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selected.impactScope}</p>
                    </div>

                    {selected.affectedSystems.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Affected Systems</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.affectedSystems.map(s => (
                            <span key={s} className="text-[11px] px-2 py-1 flex items-center gap-1"
                              style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                              <Buildings size={10} />{s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selected.frameworkMapping.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Framework Mapping</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.frameworkMapping.map(fw => (
                            <span key={fw} className="text-[11px] px-2 py-1"
                              style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand)/0.2)' }}>
                              {fw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selected.regulatoryRef && (
                      <div className="p-3 flex items-start gap-2"
                        style={{ background: 'hsl(220 80% 56% / 0.07)', border: '1px solid hsl(220 80% 56% / 0.2)' }}>
                        <ArrowSquareOut size={14} style={{ color: 'hsl(220 80% 56%)' }} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(220 80% 56%)' }}>Regulatory Reference</p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{selected.regulatoryRef}</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Risk */}
                  <TabsContent value="risk" className="px-6 pb-6 space-y-5 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Likelihood', value: `${selected.likelihood} / 5`, color: 'hsl(var(--s-wn-tx))' },
                        { label: 'Impact', value: `${selected.impact} / 5`, color: 'hsl(var(--s-er-tx))' },
                        { label: 'Risk Score', value: selected.riskScore, color: riskScoreColor(selected.riskScore).text },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="p-3 text-center" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
                          <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'hsl(var(--text-4))' }}>Risk Analysis</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.riskAnalysis}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>Residual Risk Accepted</p>
                      <RiskBadge level={selected.riskAccepted} />
                    </div>
                  </TabsContent>

                  {/* Controls */}
                  <TabsContent value="controls" className="px-6 pb-6 space-y-4 mt-4">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'hsl(var(--text-4))' }}>Summary</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{selected.compensatingControls}</p>
                    </div>
                    {selected.controlDetails.map((ctrl, i) => (
                      <div key={i} className="p-4 space-y-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{ctrl.control}</p>
                          <span className="text-[10px] px-2 py-0.5 font-semibold"
                            style={{ background: EFFECTIVENESS_COLOR[ctrl.effectiveness].bg, color: EFFECTIVENESS_COLOR[ctrl.effectiveness].text }}>
                            {ctrl.effectiveness} Effectiveness
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-3))' }}>{ctrl.description}</p>
                      </div>
                    ))}
                    {selected.controlDetails.length === 0 && (
                      <p className="text-xs text-center py-8" style={{ color: 'hsl(var(--text-4))' }}>No detailed controls documented yet.</p>
                    )}
                  </TabsContent>

                  {/* Approval */}
                  <TabsContent value="approval" className="px-6 pb-6 mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'hsl(var(--text-4))' }}>
                      Approval Chain · {selected.approvalChain.filter(s => s.decision === 'Approved').length}/{selected.approvalChain.length} Approved
                    </p>
                    <ApprovalTimeline chain={selected.approvalChain} />
                  </TabsContent>

                  {/* Renewal */}
                  <TabsContent value="renewal" className="px-6 pb-6 mt-4">
                    {selected.renewalHistory.length === 0 ? (
                      <p className="text-xs text-center py-8" style={{ color: 'hsl(var(--text-4))' }}>No renewal history for this exception.</p>
                    ) : (
                      <div className="space-y-3">
                        {selected.renewalHistory.map((r, i) => (
                          <div key={i} className="p-4" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{r.version}</span>
                              <span className="text-[10px] px-1.5 py-0.5" style={{
                                background: r.status === 'Active' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-raised))',
                                color: r.status === 'Active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                                border: '1px solid hsl(var(--border))',
                              }}>{r.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span style={{ color: 'hsl(var(--text-4))' }}>Requested: </span><span style={{ color: 'hsl(var(--text-2))' }}>{fmt(r.requestedDate)}</span></div>
                              <div><span style={{ color: 'hsl(var(--text-4))' }}>Expiry: </span><span style={{ color: 'hsl(var(--text-2))' }}>{fmt(r.expiryDate)}</span></div>
                            </div>
                            {r.notes && <p className="text-xs mt-2 italic" style={{ color: 'hsl(var(--text-3))' }}>{r.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Create Exception Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Request Policy Exception</DialogTitle>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Complete all required fields. Submission triggers the approval chain.
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Policy */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Policy Name <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
                <Input placeholder="e.g., Data Retention Policy" value={form.policy}
                  onChange={e => setForm(f => ({ ...f, policy: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Policy Reference</Label>
                <Input placeholder="e.g., DRP-4.2" value={form.policyRef}
                  onChange={e => setForm(f => ({ ...f, policyRef: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Requested By</Label>
                <Input placeholder="Your name" value={form.requestedBy}
                  onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department / Division</Label>
                <Input placeholder="e.g., Credit Risk Division" value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Approving Authority <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
                <Select value={form.approver} onValueChange={v => setForm(f => ({ ...f, approver: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {APPROVER_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Expiry Date</Label>
                <Input type="date" value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="p-4 space-y-3" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Risk Assessment</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Residual Risk Level</Label>
                  <Select value={form.riskAccepted} onValueChange={v => setForm(f => ({ ...f, riskAccepted: v as RiskLevel }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {(['Low', 'Medium', 'High', 'Critical'] as RiskLevel[]).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Likelihood (1–5)</Label>
                  <Select value={String(form.likelihood)} onValueChange={v => setForm(f => ({ ...f, likelihood: Number(v) }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['Rare','Unlikely','Possible','Likely','Almost Certain'][n-1]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Impact (1–5)</Label>
                  <Select value={String(form.impact)} onValueChange={v => setForm(f => ({ ...f, impact: Number(v) }))}>
                    <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                    <SelectContent style={{ borderRadius: 0 }}>
                      {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} — {['Insignificant','Minor','Moderate','Major','Catastrophic'][n-1]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Calculated Risk Score:</span>
                <ScorePill score={form.likelihood * form.impact} />
              </div>
            </div>

            {/* Description & Justification */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Exception Description <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Textarea placeholder="Describe the specific policy requirement being excepted and the context…" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business Justification <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Textarea placeholder="Why is this exception necessary? What is the business impact of not granting it?" rows={3}
                value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Risk Analysis</Label>
              <Textarea placeholder="What risks does this exception introduce? What is the potential regulatory or financial exposure?" rows={3}
                value={form.riskAnalysis} onChange={e => setForm(f => ({ ...f, riskAnalysis: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Compensating Controls</Label>
              <Textarea placeholder="What controls will mitigate the additional risk introduced by this exception?" rows={2}
                value={form.compensatingControls} onChange={e => setForm(f => ({ ...f, compensatingControls: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Impact Scope</Label>
              <Input placeholder="e.g., Credit Scoring Division — 2.4M customer records" value={form.impactScope}
                onChange={e => setForm(f => ({ ...f, impactScope: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Regulatory Reference</Label>
              <Input placeholder="e.g., GDPR Art. 5(1)(e) — Storage limitation" value={form.regulatoryRef}
                onChange={e => setForm(f => ({ ...f, regulatoryRef: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            {/* Affected Systems */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Affected Systems</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g., Credit Scoring Model v3.1" value={systemInput}
                  onChange={e => setSystemInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSystem())}
                  style={{ borderRadius: 0 }} />
                <Button type="button" variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={addSystem}><Plus size={13} /></Button>
              </div>
              {form.affectedSystems.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.affectedSystems.map(s => (
                    <span key={s} className="flex items-center gap-1 text-[11px] px-2 py-0.5"
                      style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                      {s}
                      <button onClick={() => setForm(f => ({ ...f, affectedSystems: f.affectedSystems.filter(x => x !== s) }))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Framework Mapping */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Applicable Frameworks</Label>
              <div className="flex flex-wrap gap-1.5">
                {FRAMEWORK_OPTIONS.map(fw => (
                  <button key={fw} type="button"
                    onClick={() => toggleFramework(fw)}
                    className="text-[11px] px-2 py-1 transition-colors"
                    style={{
                      background: form.frameworkMapping.includes(fw) ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-raised))',
                      color: form.frameworkMapping.includes(fw) ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                      border: `1px solid ${form.frameworkMapping.includes(fw) ? 'hsl(var(--brand)/0.3)' : 'hsl(var(--border))'}`,
                    }}>
                    {fw}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tags</Label>
              <div className="flex gap-2">
                <Input placeholder="Add tag…" value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  style={{ borderRadius: 0 }} />
                <Button type="button" variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={addTag}><Plus size={13} /></Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5"
                      style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand)/0.2)' }}>
                      {t}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={handleCreate}>
              Submit Exception Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve / Deny Dialog ──────────────────────────────────────────────── */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
              {decision === 'Approved' ? '✓ Approve Exception' : '✕ Deny Exception'}
            </DialogTitle>
            {decisionTarget && (
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {decisionTarget.id} — {decisionTarget.policy}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3" style={{
              background: decision === 'Approved' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-er-bg))',
              border: `1px solid ${decision === 'Approved' ? 'hsl(var(--s-ok-br))' : 'hsl(var(--s-er-br))'}`,
            }}>
              <p className="text-xs font-semibold" style={{ color: decision === 'Approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))' }}>
                {decision === 'Approved'
                  ? 'You are approving this exception. The status will advance in the approval chain.'
                  : 'You are denying this exception. The requester will be notified. A denial is final.'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reviewer Notes <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Textarea
                placeholder={decision === 'Approved'
                  ? 'State any conditions or requirements attached to this approval…'
                  : 'State the reason for denial and any remediation path…'}
                rows={4} value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button
              style={{
                borderRadius: 0,
                background: decision === 'Approved' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-er-tx))',
                color: '#fff',
              }}
              onClick={handleDecision}
              disabled={!decisionNotes.trim()}>
              {decision === 'Approved' ? 'Confirm Approval' : 'Confirm Denial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Renewal Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Request Renewal</DialogTitle>
            {selected && <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selected.id} — {selected.policy}</p>}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">New Expiry Date</Label>
              <Input type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} style={{ borderRadius: 0 }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Renewal Justification</Label>
              <Textarea placeholder="Why is renewal required? Have compensating controls changed?" rows={3}
                value={renewalNotes} onChange={e => setRenewalNotes(e.target.value)} style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setRenewalOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={handleRenewal}>
              Submit Renewal Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exception?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.id}</strong> — {deleteTarget?.policy}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: '#fff' }}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
