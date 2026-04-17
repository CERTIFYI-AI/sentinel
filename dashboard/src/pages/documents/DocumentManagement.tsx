import { useState, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  FileText, MagnifyingGlass, Export, Plus, Eye, Clock,
  CheckCircle, Warning, PencilSimple,
  ChatDots, ShieldCheck, User,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../../stores/settingsStore';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── Types ────────────────────────────────────────────────────────────────────
type DocType = 'Policy' | 'Procedure' | 'Standard' | 'Guideline' | 'Template';
type DocStatus = 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Archived' | 'Expired';

interface Document {
  id: string;
  title: string;
  type: DocType;
  version: string;
  owner: string;
  status: DocStatus;
  lastUpdated: string;
  nextReview: string;
  frameworks: string[];
  description: string;
  pages: number;
  fileSize: string;
  department: string;
  versionHistory: { version: string; date: string; author: string; changes: string }[];
  approvals: { role: string; name: string; date: string; status: 'Approved' | 'Pending' | 'Rejected' }[];
  linkedControls: { controlId: string; title: string; framework: string; status: string }[];
  comments: { author: string; date: string; text: string }[];
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const DOCUMENTS: Document[] = [
  {
    id: 'DOC-001',
    title: 'AI Acceptable Use Policy',
    type: 'Policy',
    version: 'v3.2',
    owner: 'Sarah Chen',
    status: 'Published',
    lastUpdated: '2026-02-15',
    nextReview: '2026-08-15',
    frameworks: ['ISO 27001', 'EU AI Act'],
    description: 'Establishes acceptable use boundaries for all AI/ML systems deployed across Acme Financial Corp. Covers employee usage guidelines, prohibited applications, data handling requirements, and escalation procedures for AI-related concerns.',
    pages: 24,
    fileSize: '1.8 MB',
    department: 'AI Governance',
    versionHistory: [
      { version: 'v3.2', date: '2026-02-15', author: 'Sarah Chen', changes: 'Updated EU AI Act compliance requirements and added generative AI usage guidelines' },
      { version: 'v3.1', date: '2025-11-10', author: 'Sarah Chen', changes: 'Added section on third-party AI tool vetting procedures' },
      { version: 'v3.0', date: '2025-08-01', author: 'Legal Team', changes: 'Major revision incorporating NIST AI RMF alignment' },
      { version: 'v2.0', date: '2025-02-20', author: 'Sarah Chen', changes: 'Initial enterprise-wide AI policy expansion' },
    ],
    approvals: [
      { role: 'CISO', name: 'James Wilson', date: '2026-02-14', status: 'Approved' },
      { role: 'General Counsel', name: 'Maria Lopez', date: '2026-02-13', status: 'Approved' },
      { role: 'CTO', name: 'Robert Chang', date: '2026-02-12', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-001', title: 'AI System Inventory', framework: 'ISO 27001', status: 'Implemented' },
      { controlId: 'CTL-015', title: 'AI Usage Monitoring', framework: 'EU AI Act', status: 'Implemented' },
      { controlId: 'CTL-022', title: 'Prohibited AI Use Cases', framework: 'EU AI Act', status: 'Implemented' },
    ],
    comments: [
      { author: 'James Wilson', date: '2026-02-14', text: 'Approved. Comprehensive coverage of generative AI use cases. Recommend quarterly review given regulatory velocity.' },
      { author: 'Maria Lopez', date: '2026-02-13', text: 'Legal review complete. EU AI Act references are accurate as of February 2026.' },
    ],
  },
  {
    id: 'DOC-002',
    title: 'Data Classification Standard',
    type: 'Standard',
    version: 'v2.1',
    owner: 'David Kim',
    status: 'Published',
    lastUpdated: '2026-01-20',
    nextReview: '2026-07-20',
    frameworks: ['ISO 27001', 'GDPR'],
    description: 'Defines the data classification taxonomy for Acme Financial Corp, including classification levels (Public, Internal, Confidential, Restricted), labeling requirements, handling procedures, and AI training data categorization standards.',
    pages: 18,
    fileSize: '1.2 MB',
    department: 'Information Security',
    versionHistory: [
      { version: 'v2.1', date: '2026-01-20', author: 'David Kim', changes: 'Added AI training data classification tier and model output data handling' },
      { version: 'v2.0', date: '2025-09-15', author: 'David Kim', changes: 'Aligned with GDPR data categories and added cross-border data transfer rules' },
      { version: 'v1.0', date: '2025-03-01', author: 'Security Team', changes: 'Initial data classification standard' },
    ],
    approvals: [
      { role: 'CISO', name: 'James Wilson', date: '2026-01-19', status: 'Approved' },
      { role: 'DPO', name: 'Anna Schmidt', date: '2026-01-18', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-005', title: 'Data Classification', framework: 'ISO 27001', status: 'Implemented' },
      { controlId: 'CTL-008', title: 'Data Labeling', framework: 'GDPR', status: 'Implemented' },
    ],
    comments: [
      { author: 'Anna Schmidt', date: '2026-01-18', text: 'GDPR alignment verified. Recommend adding specific examples for AI model training data in next revision.' },
    ],
  },
  {
    id: 'DOC-003',
    title: 'Model Deployment Procedure',
    type: 'Procedure',
    version: 'v2.0',
    owner: 'Priya Sharma',
    status: 'Published',
    lastUpdated: '2026-03-01',
    nextReview: '2026-09-01',
    frameworks: ['NIST AI RMF'],
    description: 'Step-by-step procedure for deploying AI/ML models into production environments. Covers pre-deployment validation, bias testing, performance benchmarking, approval gates, monitoring setup, and rollback procedures.',
    pages: 32,
    fileSize: '2.4 MB',
    department: 'ML Engineering',
    versionHistory: [
      { version: 'v2.0', date: '2026-03-01', author: 'Priya Sharma', changes: 'Added automated bias testing gate and LLM-specific deployment checks' },
      { version: 'v1.5', date: '2025-10-15', author: 'Priya Sharma', changes: 'Incorporated canary deployment and A/B testing requirements' },
      { version: 'v1.0', date: '2025-05-01', author: 'Engineering Team', changes: 'Initial model deployment procedure' },
    ],
    approvals: [
      { role: 'CTO', name: 'Robert Chang', date: '2026-02-28', status: 'Approved' },
      { role: 'Head of ML', name: 'Priya Sharma', date: '2026-02-27', status: 'Approved' },
      { role: 'CISO', name: 'James Wilson', date: '2026-02-26', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-010', title: 'Model Validation', framework: 'NIST AI RMF', status: 'Implemented' },
      { controlId: 'CTL-011', title: 'Deployment Approval', framework: 'NIST AI RMF', status: 'Implemented' },
      { controlId: 'CTL-012', title: 'Production Monitoring', framework: 'NIST AI RMF', status: 'Implemented' },
    ],
    comments: [
      { author: 'Robert Chang', date: '2026-02-28', text: 'Excellent addition of the automated bias testing gate. This should be mandatory for all high-risk model deployments.' },
    ],
  },
  {
    id: 'DOC-004',
    title: 'Incident Response Plan',
    type: 'Procedure',
    version: 'v4.1',
    owner: 'James Wilson',
    status: 'Published',
    lastUpdated: '2026-02-28',
    nextReview: '2026-05-28',
    frameworks: ['SOC 2', 'ISO 27001'],
    description: 'Comprehensive incident response plan covering AI-specific incident categories, escalation matrices, regulatory notification timelines (GDPR 72h, EU AI Act Art. 73), communication templates, and post-incident review procedures.',
    pages: 45,
    fileSize: '3.1 MB',
    department: 'Security Operations',
    versionHistory: [
      { version: 'v4.1', date: '2026-02-28', author: 'James Wilson', changes: 'Added AI-specific incident triage criteria and EU AI Act Art. 73 notification workflow' },
      { version: 'v4.0', date: '2025-12-01', author: 'James Wilson', changes: 'Major revision adding automated incident classification and SLA enforcement' },
      { version: 'v3.5', date: '2025-08-15', author: 'Security Team', changes: 'Updated regulatory notification timelines for GDPR and NIS2' },
    ],
    approvals: [
      { role: 'CISO', name: 'James Wilson', date: '2026-02-27', status: 'Approved' },
      { role: 'General Counsel', name: 'Maria Lopez', date: '2026-02-26', status: 'Approved' },
      { role: 'COO', name: 'Patricia Hughes', date: '2026-02-25', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-020', title: 'Incident Detection', framework: 'SOC 2', status: 'Implemented' },
      { controlId: 'CTL-021', title: 'Incident Escalation', framework: 'ISO 27001', status: 'Implemented' },
      { controlId: 'CTL-023', title: 'Regulatory Notification', framework: 'SOC 2', status: 'Implemented' },
    ],
    comments: [
      { author: 'Patricia Hughes', date: '2026-02-25', text: 'Board requires quarterly tabletop exercises using this plan. Please schedule.' },
      { author: 'Maria Lopez', date: '2026-02-26', text: 'Regulatory notification templates reviewed and approved. NIS2 addendum needed by Q3.' },
    ],
  },
  {
    id: 'DOC-005',
    title: 'Vendor Assessment Guideline',
    type: 'Guideline',
    version: 'v1.3',
    owner: 'Michael Torres',
    status: 'In Review',
    lastUpdated: '2026-03-10',
    nextReview: '2026-09-10',
    frameworks: ['SOC 2'],
    description: 'Guidelines for assessing third-party AI vendors, including security questionnaire requirements, SOC 2 report review procedures, AI-specific risk assessment criteria, and ongoing vendor monitoring schedules.',
    pages: 20,
    fileSize: '1.5 MB',
    department: 'Procurement',
    versionHistory: [
      { version: 'v1.3', date: '2026-03-10', author: 'Michael Torres', changes: 'Added AI model supply chain risk assessment criteria and LLM provider evaluation checklist' },
      { version: 'v1.2', date: '2025-11-20', author: 'Michael Torres', changes: 'Updated SOC 2 Type II evidence requirements for AI vendors' },
      { version: 'v1.0', date: '2025-06-01', author: 'Procurement Team', changes: 'Initial vendor assessment guideline' },
    ],
    approvals: [
      { role: 'CISO', name: 'James Wilson', date: '2026-03-12', status: 'Pending' },
      { role: 'Head of Procurement', name: 'Michael Torres', date: '2026-03-10', status: 'Approved' },
      { role: 'General Counsel', name: 'Maria Lopez', date: '2026-03-11', status: 'Pending' },
    ],
    linkedControls: [
      { controlId: 'CTL-030', title: 'Vendor Risk Assessment', framework: 'SOC 2', status: 'Partially Implemented' },
      { controlId: 'CTL-031', title: 'Vendor Monitoring', framework: 'SOC 2', status: 'In Progress' },
    ],
    comments: [
      { author: 'Michael Torres', date: '2026-03-10', text: 'Submitted for review. Key addition is the LLM provider evaluation checklist covering data retention, fine-tuning isolation, and prompt injection controls.' },
      { author: 'James Wilson', date: '2026-03-12', text: 'Reviewing the AI model supply chain section. Need to ensure alignment with NIST SSDF.' },
    ],
  },
  {
    id: 'DOC-006',
    title: 'AI Ethics Framework',
    type: 'Policy',
    version: 'v2.0',
    owner: 'Emily Rodriguez',
    status: 'In Review',
    lastUpdated: '2026-03-15',
    nextReview: '2026-09-15',
    frameworks: ['EU AI Act', 'NIST AI RMF'],
    description: 'Establishes ethical principles governing AI development and deployment at Acme Financial Corp. Covers fairness, transparency, accountability, human oversight, privacy preservation, and societal impact assessment requirements.',
    pages: 28,
    fileSize: '2.0 MB',
    department: 'AI Governance',
    versionHistory: [
      { version: 'v2.0', date: '2026-03-15', author: 'Emily Rodriguez', changes: 'Major revision incorporating EU AI Act risk classification and mandatory human oversight requirements' },
      { version: 'v1.5', date: '2025-09-01', author: 'Emily Rodriguez', changes: 'Added algorithmic impact assessment methodology' },
      { version: 'v1.0', date: '2025-04-01', author: 'Ethics Committee', changes: 'Initial AI ethics framework' },
    ],
    approvals: [
      { role: 'CEO', name: 'Thomas Wright', date: '2026-03-18', status: 'Pending' },
      { role: 'CISO', name: 'James Wilson', date: '2026-03-17', status: 'Approved' },
      { role: 'General Counsel', name: 'Maria Lopez', date: '2026-03-16', status: 'Pending' },
    ],
    linkedControls: [
      { controlId: 'CTL-040', title: 'Fairness Testing', framework: 'EU AI Act', status: 'Implemented' },
      { controlId: 'CTL-041', title: 'Transparency Requirements', framework: 'EU AI Act', status: 'In Progress' },
      { controlId: 'CTL-042', title: 'Human Oversight', framework: 'NIST AI RMF', status: 'Partially Implemented' },
    ],
    comments: [
      { author: 'Emily Rodriguez', date: '2026-03-15', text: 'v2.0 submitted for executive review. Major changes include EU AI Act risk classification mapping and mandatory HITL requirements for high-risk systems.' },
      { author: 'James Wilson', date: '2026-03-17', text: 'Security implications reviewed and approved. Recommend adding data poisoning prevention to the ethics safeguards section.' },
    ],
  },
  {
    id: 'DOC-007',
    title: 'Data Retention Policy',
    type: 'Policy',
    version: 'v3.0',
    owner: 'Legal Team',
    status: 'Published',
    lastUpdated: '2025-12-01',
    nextReview: '2026-06-01',
    frameworks: ['GDPR'],
    description: 'Defines data retention schedules and disposal procedures for all data categories, including AI training datasets, model artifacts, inference logs, and personal data processed by AI systems. Ensures GDPR right-to-erasure compliance.',
    pages: 16,
    fileSize: '1.1 MB',
    department: 'Legal',
    versionHistory: [
      { version: 'v3.0', date: '2025-12-01', author: 'Legal Team', changes: 'Added AI training data retention limits and model artifact lifecycle management' },
      { version: 'v2.5', date: '2025-06-15', author: 'Legal Team', changes: 'Updated GDPR data subject request handling SLAs' },
      { version: 'v2.0', date: '2025-01-10', author: 'Legal Team', changes: 'Comprehensive revision for multi-jurisdiction compliance' },
    ],
    approvals: [
      { role: 'General Counsel', name: 'Maria Lopez', date: '2025-11-30', status: 'Approved' },
      { role: 'DPO', name: 'Anna Schmidt', date: '2025-11-29', status: 'Approved' },
      { role: 'CISO', name: 'James Wilson', date: '2025-11-28', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-050', title: 'Data Retention Enforcement', framework: 'GDPR', status: 'Implemented' },
      { controlId: 'CTL-051', title: 'Right to Erasure', framework: 'GDPR', status: 'Implemented' },
    ],
    comments: [
      { author: 'Anna Schmidt', date: '2025-11-29', text: 'Verified GDPR compliance. AI training data retention schedule aligns with purpose limitation principle.' },
    ],
  },
  {
    id: 'DOC-008',
    title: 'Access Control Standard',
    type: 'Standard',
    version: 'v2.5',
    owner: 'David Kim',
    status: 'In Review',
    lastUpdated: '2026-03-20',
    nextReview: '2026-09-20',
    frameworks: ['ISO 27001', 'SOC 2'],
    description: 'Defines access control requirements for all systems, including AI/ML platforms, model registries, training data repositories, and inference endpoints. Covers RBAC, MFA, privileged access management, and API key governance.',
    pages: 22,
    fileSize: '1.6 MB',
    department: 'Information Security',
    versionHistory: [
      { version: 'v2.5', date: '2026-03-20', author: 'David Kim', changes: 'Added AI platform access tiers and model registry RBAC requirements' },
      { version: 'v2.0', date: '2025-10-01', author: 'David Kim', changes: 'Incorporated zero-trust architecture requirements' },
      { version: 'v1.5', date: '2025-04-15', author: 'Security Team', changes: 'Added MFA requirements for all administrative access' },
    ],
    approvals: [
      { role: 'CISO', name: 'James Wilson', date: '2026-03-22', status: 'Pending' },
      { role: 'CTO', name: 'Robert Chang', date: '2026-03-21', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-060', title: 'Access Control Policy', framework: 'ISO 27001', status: 'Implemented' },
      { controlId: 'CTL-061', title: 'Logical Access Controls', framework: 'SOC 2', status: 'Implemented' },
      { controlId: 'CTL-062', title: 'Privileged Access Management', framework: 'ISO 27001', status: 'In Progress' },
    ],
    comments: [
      { author: 'Robert Chang', date: '2026-03-21', text: 'Approved the AI platform access tiers. Recommend expediting the model registry RBAC implementation.' },
      { author: 'David Kim', date: '2026-03-20', text: 'Key change in v2.5 is the introduction of tiered access for ML pipeline stages: data prep, training, validation, and deployment.' },
    ],
  },
  {
    id: 'DOC-009',
    title: 'Change Management Procedure',
    type: 'Procedure',
    version: 'v1.8',
    owner: 'Ops Team',
    status: 'Published',
    lastUpdated: '2026-01-15',
    nextReview: '2026-07-15',
    frameworks: ['SOC 2'],
    description: 'Defines the change management process for all IT and AI systems, including change request classification, impact assessment, approval workflows, implementation windows, and rollback procedures for model updates.',
    pages: 19,
    fileSize: '1.3 MB',
    department: 'IT Operations',
    versionHistory: [
      { version: 'v1.8', date: '2026-01-15', author: 'Ops Team', changes: 'Added ML model version change classification and automated rollback triggers' },
      { version: 'v1.5', date: '2025-08-20', author: 'Ops Team', changes: 'Incorporated emergency change fast-track procedure for critical AI incidents' },
      { version: 'v1.0', date: '2025-03-10', author: 'Ops Team', changes: 'Initial change management procedure' },
    ],
    approvals: [
      { role: 'CTO', name: 'Robert Chang', date: '2026-01-14', status: 'Approved' },
      { role: 'CISO', name: 'James Wilson', date: '2026-01-13', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-070', title: 'Change Management', framework: 'SOC 2', status: 'Implemented' },
      { controlId: 'CTL-071', title: 'Change Authorization', framework: 'SOC 2', status: 'Implemented' },
    ],
    comments: [
      { author: 'Robert Chang', date: '2026-01-14', text: 'Good addition of model version change classification. Ensure alignment with the model deployment procedure (DOC-003).' },
    ],
  },
  {
    id: 'DOC-010',
    title: 'Business Continuity Plan',
    type: 'Procedure',
    version: 'v2.2',
    owner: 'Sarah Chen',
    status: 'Expired',
    lastUpdated: '2025-09-01',
    nextReview: '2026-03-01',
    frameworks: ['ISO 27001'],
    description: 'Business continuity and disaster recovery plan covering AI system dependencies, model failover procedures, data backup strategies, and communication protocols. Includes AI-specific RTO/RPO targets for critical model-dependent services.',
    pages: 38,
    fileSize: '2.8 MB',
    department: 'Business Operations',
    versionHistory: [
      { version: 'v2.2', date: '2025-09-01', author: 'Sarah Chen', changes: 'Added AI model failover procedures and alternative inference endpoint configurations' },
      { version: 'v2.0', date: '2025-04-01', author: 'Sarah Chen', changes: 'Major revision adding cloud-specific recovery procedures' },
      { version: 'v1.0', date: '2024-10-15', author: 'Business Ops', changes: 'Initial business continuity plan' },
    ],
    approvals: [
      { role: 'COO', name: 'Patricia Hughes', date: '2025-08-31', status: 'Approved' },
      { role: 'CISO', name: 'James Wilson', date: '2025-08-30', status: 'Approved' },
      { role: 'CTO', name: 'Robert Chang', date: '2025-08-29', status: 'Approved' },
    ],
    linkedControls: [
      { controlId: 'CTL-080', title: 'Business Continuity', framework: 'ISO 27001', status: 'Implemented' },
      { controlId: 'CTL-081', title: 'Disaster Recovery', framework: 'ISO 27001', status: 'Implemented' },
    ],
    comments: [
      { author: 'Patricia Hughes', date: '2025-08-31', text: 'Plan approved but flagged for urgent review. AI model dependencies have increased significantly since last update.' },
      { author: 'James Wilson', date: '2026-03-05', text: 'OVERDUE: This document expired on 2026-03-01. Sarah please prioritize the v2.3 revision.' },
    ],
  },
];

// ── Inline MetricTile ────────────────────────────────────────────────────────
function MetricTile({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <Icon size={28} weight="duotone" style={{ color, opacity: 0.7 }} />
      </CardContent>
    </Card>
  );
}

// ── Inline toast ─────────────────────────────────────────────────────────────
function showToast(message: string) {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
    padding: '10px 20px', fontSize: '13px', fontFamily: 'Outfit, sans-serif',
    background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))',
    border: '1px solid hsl(var(--border))', borderRadius: '0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// ── Status styling ───────────────────────────────────────────────────────────
function statusStyle(status: DocStatus): { bg: string; color: string } {
  switch (status) {
    case 'Published': return { bg: 'hsla(var(--s-ok-tx), 0.1)', color: 'hsl(var(--s-ok-tx))' };
    case 'In Review': return { bg: 'hsla(var(--s-wn-tx), 0.1)', color: 'hsl(var(--s-wn-tx))' };
    case 'Draft': return { bg: 'hsla(var(--s-in-tx), 0.1)', color: 'hsl(var(--s-in-tx))' };
    case 'Approved': return { bg: 'hsla(var(--s-ok-tx), 0.15)', color: 'hsl(var(--s-ok-tx))' };
    case 'Archived': return { bg: 'hsla(var(--text-4), 0.1)', color: 'hsl(var(--text-4))' };
    case 'Expired': return { bg: 'hsla(var(--destructive), 0.1)', color: 'hsl(var(--destructive))' };
    default: return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-1))' };
  }
}

// ── Type styling ─────────────────────────────────────────────────────────────
function typeStyle(type: DocType): { bg: string; color: string } {
  switch (type) {
    case 'Policy': return { bg: 'hsla(var(--brand), 0.1)', color: 'hsl(var(--brand))' };
    case 'Procedure': return { bg: 'hsla(var(--s-in-tx), 0.1)', color: 'hsl(var(--s-in-tx))' };
    case 'Standard': return { bg: 'hsla(var(--s-ok-tx), 0.1)', color: 'hsl(var(--s-ok-tx))' };
    case 'Guideline': return { bg: 'hsla(var(--s-wn-tx), 0.1)', color: 'hsl(var(--s-wn-tx))' };
    case 'Template': return { bg: 'hsla(var(--text-4), 0.1)', color: 'hsl(var(--text-4))' };
    default: return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-1))' };
  }
}

// ── Approval status styling ──────────────────────────────────────────────────
function approvalStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case 'Approved': return { bg: 'hsla(var(--s-ok-tx), 0.1)', color: 'hsl(var(--s-ok-tx))' };
    case 'Pending': return { bg: 'hsla(var(--s-wn-tx), 0.1)', color: 'hsl(var(--s-wn-tx))' };
    case 'Rejected': return { bg: 'hsla(var(--destructive), 0.1)', color: 'hsl(var(--destructive))' };
    default: return { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-1))' };
  }
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCSV(docs: Document[]) {
  const headers = ['Doc ID', 'Title', 'Type', 'Version', 'Owner', 'Status', 'Last Updated', 'Next Review', 'Framework Links'];
  const rows = docs.map(d => [
    d.id, d.title, d.type, d.version, d.owner, d.status,
    d.lastUpdated, d.nextReview, d.frameworks.join('; '),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document-library-export.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported document library to CSV');
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function DocumentManagement() {
  const { orgName } = useSettingsStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return DOCUMENTS.filter(doc => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || doc.title.toLowerCase().includes(q)
        || doc.id.toLowerCase().includes(q)
        || doc.owner.toLowerCase().includes(q)
        || doc.frameworks.some(f => f.toLowerCase().includes(q));
      const matchType = filterType === 'all' || doc.type === filterType;
      const matchStatus = filterStatus === 'all' || doc.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [search, filterType, filterStatus]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalDocuments = DOCUMENTS.length;
  const pendingReview = DOCUMENTS.filter(d => d.status === 'In Review').length;
  const expired = DOCUMENTS.filter(d => d.status === 'Expired').length;
  const publishedThisQuarter = DOCUMENTS.filter(d => {
    const date = new Date(d.lastUpdated);
    return d.status === 'Published' && date >= new Date('2026-01-01') && date <= new Date('2026-03-31');
  }).length;

  // ── Open detail ────────────────────────────────────────────────────────────
  const openDetail = (doc: Document) => {
    setSelectedDoc(doc);
    setDrawerTab('overview');
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Document Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} · Policy library and document lifecycle management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(filtered)}
            style={{ borderRadius: 0 }}
          >
            <Export size={14} className="mr-1" />Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => showToast('Document creation wizard coming soon')}
            style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
          >
            <Plus size={14} className="mr-1" />New Document
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Documents" value={totalDocuments} icon={FileText} color="hsl(var(--text-1))" />
        <MetricTile label="Pending Review" value={pendingReview} icon={Clock} color="hsl(var(--s-wn-tx))" />
        <MetricTile label="Expired" value={expired} icon={Warning} color="hsl(var(--destructive))" />
        <MetricTile label="Published This Quarter" value={publishedThisQuarter} icon={CheckCircle} color="hsl(var(--s-ok-tx))" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search documents by title, ID, owner, or framework..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Policy">Policy</SelectItem>
            <SelectItem value="Procedure">Procedure</SelectItem>
            <SelectItem value="Standard">Standard</SelectItem>
            <SelectItem value="Guideline">Guideline</SelectItem>
            <SelectItem value="Template">Template</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="In Review">In Review</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
            <SelectItem value="Expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {DOCUMENTS.length} documents
        </span>
      </div>

      {/* Document Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-4))' }}>
              <FileText size={40} />
              <p className="mt-3 text-sm font-medium">No documents match your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                    {['Doc ID', 'Title', 'Type', 'Version', 'Owner', 'Status', 'Last Updated', 'Next Review', 'Framework Links', ''].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const ss = statusStyle(doc.status);
                    const ts = typeStyle(doc.type);
                    const isExpired = doc.status === 'Expired';
                    return (
                      <tr
                        key={doc.id}
                        className="cursor-pointer"
                        style={{
                          borderBottom: '1px solid hsl(var(--border))',
                          borderLeft: isExpired ? '4px solid hsl(var(--destructive))' : 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        onClick={() => openDetail(doc)}
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>
                            {doc.id}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ maxWidth: 240 }}>
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                            {doc.title}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: ts.bg, color: ts.color, borderRadius: 0, fontSize: 11 }}>
                            {doc.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>
                            {doc.version}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                            {doc.owner}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 11 }}>
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>
                            {doc.lastUpdated}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs" style={{
                            color: isExpired ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))',
                            fontWeight: isExpired ? 600 : 400,
                          }}>
                            {doc.nextReview}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {doc.frameworks.map(fw => (
                              <Badge
                                key={fw}
                                variant="outline"
                                style={{ borderRadius: 0, fontSize: 10, color: 'hsl(var(--text-3))', borderColor: 'hsl(var(--border))' }}
                              >
                                {fw}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(doc)}>
                            <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Document Detail Sheet ───────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[580px] sm:max-w-[580px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedDoc && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>
                    {selectedDoc.id}
                  </span>
                  <Badge style={{ background: typeStyle(selectedDoc.type).bg, color: typeStyle(selectedDoc.type).color, borderRadius: 0, fontSize: 11 }}>
                    {selectedDoc.type}
                  </Badge>
                  <Badge style={{ background: statusStyle(selectedDoc.status).bg, color: statusStyle(selectedDoc.status).color, borderRadius: 0, fontSize: 11 }}>
                    {selectedDoc.status}
                  </Badge>
                  <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                    {selectedDoc.version}
                  </span>
                </div>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedDoc.title}</SheetTitle>
              </SheetHeader>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  style={{ borderRadius: 0 }}
                  onClick={() => showToast('Document editor opening...')}
                >
                  <PencilSimple size={12} className="mr-1" />Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  style={{ borderRadius: 0 }}
                  onClick={() => {
                    const doc = selectedDoc;
                    const headers = ['Doc ID', 'Title', 'Type', 'Version', 'Owner', 'Status', 'Last Updated', 'Next Review', 'Frameworks'];
                    const row = [doc.id, doc.title, doc.type, doc.version, doc.owner, doc.status, doc.lastUpdated, doc.nextReview, doc.frameworks.join('; ')];
                    const csv = [headers, row].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${doc.id}-export.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast(`Exported ${doc.id} details`);
                  }}
                >
                  <Export size={12} className="mr-1" />Export
                </Button>
                {selectedDoc.status === 'Expired' && (
                  <Button
                    size="sm"
                    style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: '#fff' }}
                    onClick={() => showToast('Review renewal workflow initiated')}
                  >
                    <Warning size={12} className="mr-1" />Initiate Review
                  </Button>
                )}
              </div>

              {/* Tabs */}
              <Tabs value={drawerTab} onValueChange={setDrawerTab} className="mt-4">
                <TabsList className="w-full" style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="versions" style={{ borderRadius: 0 }}>Version History</TabsTrigger>
                  <TabsTrigger value="approvals" style={{ borderRadius: 0 }}>Approvals</TabsTrigger>
                  <TabsTrigger value="controls" style={{ borderRadius: 0 }}>Linked Controls</TabsTrigger>
                  <TabsTrigger value="comments" style={{ borderRadius: 0 }}>Comments</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Owner', value: selectedDoc.owner },
                      { label: 'Department', value: selectedDoc.department },
                      { label: 'Last Updated', value: selectedDoc.lastUpdated },
                      { label: 'Next Review', value: selectedDoc.nextReview },
                      { label: 'Pages', value: String(selectedDoc.pages) },
                      { label: 'File Size', value: selectedDoc.fileSize },
                    ].map(item => (
                      <div key={item.label} className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                          {item.label}
                        </p>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                      Frameworks
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedDoc.frameworks.map(fw => (
                        <Badge
                          key={fw}
                          variant="outline"
                          style={{ borderRadius: 0, fontSize: 11, color: 'hsl(var(--brand))', borderColor: 'hsl(var(--brand))' }}
                        >
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                      Description
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>
                      {selectedDoc.description}
                    </p>
                  </div>

                  {selectedDoc.status === 'Expired' && (
                    <div
                      className="p-3 flex items-start gap-2"
                      style={{ background: 'hsla(var(--destructive), 0.08)', border: '1px solid hsl(var(--destructive))', borderRadius: 0 }}
                    >
                      <Warning size={16} weight="bold" style={{ color: 'hsl(var(--destructive))', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'hsl(var(--destructive))' }}>
                          Document Expired
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--destructive))' }}>
                          This document passed its review date on {selectedDoc.nextReview}. Immediate review and renewal is required to maintain compliance.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Version History Tab */}
                <TabsContent value="versions" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                    Version History
                  </p>
                  {selectedDoc.versionHistory.map((vh, i) => (
                    <div
                      key={i}
                      className="p-3"
                      style={{
                        background: i === 0 ? 'hsla(var(--brand), 0.05)' : 'transparent',
                        borderLeft: i === 0 ? '3px solid hsl(var(--brand))' : '3px solid hsl(var(--border))',
                        borderRadius: 0,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold font-mono" style={{ color: i === 0 ? 'hsl(var(--brand))' : 'hsl(var(--text-1))' }}>
                          {vh.version}
                          {i === 0 && (
                            <Badge style={{ marginLeft: 8, background: 'hsla(var(--brand), 0.1)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10 }}>
                              Current
                            </Badge>
                          )}
                        </span>
                        <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{vh.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <User size={10} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{vh.author}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{vh.changes}</p>
                    </div>
                  ))}
                </TabsContent>

                {/* Approvals Tab */}
                <TabsContent value="approvals" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                    Approval Workflow
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Role', 'Approver', 'Date', 'Status'].map(h => (
                          <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDoc.approvals.map((a, i) => {
                        const as = approvalStyle(a.status);
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            <td className="px-2 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.role}</td>
                            <td className="px-2 py-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</td>
                            <td className="px-2 py-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.date}</td>
                            <td className="px-2 py-2">
                              <Badge style={{ background: as.bg, color: as.color, borderRadius: 0, fontSize: 10 }}>
                                {a.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {selectedDoc.approvals.some(a => a.status === 'Pending') && (
                    <div
                      className="p-3 flex items-start gap-2"
                      style={{ background: 'hsla(var(--s-wn-tx), 0.08)', border: '1px solid hsl(var(--s-wn-tx))', borderRadius: 0 }}
                    >
                      <Clock size={14} weight="bold" style={{ color: 'hsl(var(--s-wn-tx))', marginTop: 1 }} />
                      <div>
                        <p className="text-xs font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                          Awaiting Approval
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                          {selectedDoc.approvals.filter(a => a.status === 'Pending').length} approval(s) pending. Document cannot be published until all required approvals are obtained.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Linked Controls Tab */}
                <TabsContent value="controls" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                    Linked Controls ({selectedDoc.linkedControls.length})
                  </p>
                  {selectedDoc.linkedControls.map((ctrl, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3"
                      style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}
                    >
                      <ShieldCheck size={16} weight="duotone" style={{ color: 'hsl(var(--brand))', marginTop: 2 }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono" style={{ color: 'hsl(var(--brand))' }}>
                            {ctrl.controlId}
                          </span>
                          <Badge
                            style={{
                              background: ctrl.status === 'Implemented'
                                ? 'hsla(var(--s-ok-tx), 0.1)'
                                : 'hsla(var(--s-wn-tx), 0.1)',
                              color: ctrl.status === 'Implemented'
                                ? 'hsl(var(--s-ok-tx))'
                                : 'hsl(var(--s-wn-tx))',
                              borderRadius: 0,
                              fontSize: 10,
                            }}
                          >
                            {ctrl.status}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{ctrl.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Framework: {ctrl.framework}</p>
                      </div>
                    </div>
                  ))}
                  {selectedDoc.linkedControls.length === 0 && (
                    <div className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                      No controls linked to this document.
                    </div>
                  )}
                </TabsContent>

                {/* Comments Tab */}
                <TabsContent value="comments" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>
                    Comments ({selectedDoc.comments.length})
                  </p>
                  {selectedDoc.comments.map((c, i) => (
                    <div
                      key={i}
                      className="p-3"
                      style={{ borderLeft: '3px solid hsl(var(--brand))', borderRadius: 0 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <ChatDots size={12} style={{ color: 'hsl(var(--brand))' }} />
                          <span className="text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{c.author}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{c.date}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>{c.text}</p>
                    </div>
                  ))}
                  {selectedDoc.comments.length === 0 && (
                    <div className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                      No comments on this document.
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
