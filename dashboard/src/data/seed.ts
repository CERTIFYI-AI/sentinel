// ─────────────────────────────────────────────────
// Sentinel AI GRC Platform — Canonical Seed Data
// Single source of truth for all modules
// ─────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';
export type ModelStatus = 'production' | 'staging' | 'development' | 'retired';
export type AgentStatus = 'confirmed' | 'shadow' | 'quarantined' | 'decommissioned';
export type VendorStatus = 'approved' | 'in_review' | 'high_risk' | 'blocked';
export type EvidenceStatus = 'synced' | 'pending' | 'expired' | 'failed';
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';
export type BiasResult = 'passed' | 'failed' | 'warning';
export type ControlStatus = 'implemented' | 'partial' | 'planned' | 'not_applicable';
export type ScanStatus = 'completed' | 'running' | 'scheduled' | 'failed';
export type ThreatStatus = 'active' | 'investigating' | 'mitigated' | 'resolved';

// ── Users ──────────────────────────────────────
export interface User {
  id: string; name: string; email: string; role: string; department: string; avatar: string;
}
export const USERS: User[] = [
  { id: 'U-001', name: 'Sarah Chen', email: 'sarah.chen@sentinel-grc.com', role: 'CISO', department: 'Security', avatar: 'SC' },
  { id: 'U-002', name: 'James Patel', email: 'james.patel@sentinel-grc.com', role: 'VP Compliance', department: 'Compliance', avatar: 'JP' },
  { id: 'U-003', name: 'Maria Santos', email: 'maria.santos@sentinel-grc.com', role: 'ML Engineer', department: 'AI/ML', avatar: 'MS' },
  { id: 'U-004', name: 'David Kim', email: 'david.kim@sentinel-grc.com', role: 'Risk Analyst', department: 'Risk', avatar: 'DK' },
  { id: 'U-005', name: 'Emma Wilson', email: 'emma.wilson@sentinel-grc.com', role: 'Auditor', department: 'Audit', avatar: 'EW' },
  { id: 'U-006', name: 'Raj Gupta', email: 'raj.gupta@sentinel-grc.com', role: 'Model Risk Mgr', department: 'AI/ML', avatar: 'RG' },
];

// ── Models ─────────────────────────────────────
export interface Model {
  id: string; name: string; version: string; type: string; owner: string; status: ModelStatus;
  riskTier: 'high' | 'limited' | 'minimal' | 'unacceptable'; fairnessScore: number;
  driftStatus: 'stable' | 'warning' | 'critical'; lastValidated: string; framework: string;
  department: string; description: string; accuracy: number; latencyMs: number;
  monthlyInferences: string; euAiActArticle: string;
  biasMetrics: { metric: string; value: number; threshold: number; status: 'Pass' | 'Fail' }[];
  performanceHistory: { month: string; accuracy: number; latency: number }[];
  guardrails: { name: string; enabled: boolean; threshold: string }[];
  complianceMapping: { framework: string; clause: string; status: string }[];
  incidents: { id: string; date: string; type: string; severity: Severity; resolved: boolean }[];
  lifecyclePhase: string; daysInPhase: number; lifecycleProgress: number;
}
export const MODELS: Model[] = [
  {
    id: 'MDL-001', name: 'Credit Risk Scorer', version: 'v3.2.1', type: 'ML — Classification',
    owner: 'Maria Santos', status: 'production', riskTier: 'high', fairnessScore: 74,
    driftStatus: 'warning', lastValidated: '2026-03-15', framework: 'EU AI Act',
    department: 'Lending', description: 'Consumer credit risk scoring for loan applications. Subject to ECOA and EU AI Act Annex III, 5(b).',
    accuracy: 91.5, latencyMs: 45, monthlyInferences: '890K', euAiActArticle: 'Annex III, 5(b) — Creditworthiness',
    biasMetrics: [
      { metric: 'Gender Parity', value: 0.84, threshold: 0.85, status: 'Fail' },
      { metric: 'Age Group Fairness', value: 0.81, threshold: 0.85, status: 'Fail' },
      { metric: 'Ethnic Disparity Index', value: 0.76, threshold: 0.85, status: 'Fail' },
      { metric: 'Geographic Proxy', value: 0.79, threshold: 0.85, status: 'Fail' },
    ],
    performanceHistory: [
      { month: 'Oct', accuracy: 92.0, latency: 42 }, { month: 'Nov', accuracy: 91.8, latency: 44 },
      { month: 'Dec', accuracy: 91.6, latency: 43 }, { month: 'Jan', accuracy: 91.4, latency: 45 },
      { month: 'Feb', accuracy: 91.3, latency: 46 }, { month: 'Mar', accuracy: 91.5, latency: 45 },
    ],
    guardrails: [
      { name: 'Adverse Action Explainer', enabled: true, threshold: 'SHAP > 0.01' },
      { name: 'Protected Class Monitor', enabled: true, threshold: 'DI Ratio > 0.8' },
      { name: 'Score Band Validator', enabled: true, threshold: '300–850 range' },
    ],
    complianceMapping: [
      { framework: 'EU AI Act', clause: 'Annex III, 5(b) — Credit', status: 'Review' },
      { framework: 'NIST AI RMF', clause: 'MEASURE 2.6 — Bias', status: 'Partial' },
      { framework: 'SOC 2', clause: 'CC6.1 — Logical Access', status: 'Compliant' },
    ],
    incidents: [{ id: 'INC-001', date: '2026-01-08', type: 'Bias Violation', severity: 'critical', resolved: false }],
    lifecyclePhase: 'Monitoring', daysInPhase: 45, lifecycleProgress: 95,
  },
  {
    id: 'MDL-002', name: 'Fraud Detection Engine', version: 'v2.1.0', type: 'ML — Anomaly Detection',
    owner: 'David Kim', status: 'production', riskTier: 'high', fairnessScore: 91,
    driftStatus: 'stable', lastValidated: '2026-03-10', framework: 'SOC 2',
    department: 'Fraud Prevention', description: 'Real-time transaction fraud detection for payment processing.',
    accuracy: 97.8, latencyMs: 12, monthlyInferences: '15.2M', euAiActArticle: 'Annex III, 5(a) — Credit Institutions',
    biasMetrics: [
      { metric: 'Gender Parity', value: 0.95, threshold: 0.85, status: 'Pass' },
      { metric: 'Age Group Fairness', value: 0.93, threshold: 0.85, status: 'Pass' },
      { metric: 'Geographic Fairness', value: 0.89, threshold: 0.85, status: 'Pass' },
      { metric: 'Transaction Size Bias', value: 0.91, threshold: 0.85, status: 'Pass' },
    ],
    performanceHistory: [
      { month: 'Oct', accuracy: 98.1, latency: 11 }, { month: 'Nov', accuracy: 98.0, latency: 12 },
      { month: 'Dec', accuracy: 97.9, latency: 12 }, { month: 'Jan', accuracy: 97.8, latency: 13 },
      { month: 'Feb', accuracy: 97.6, latency: 14 }, { month: 'Mar', accuracy: 97.8, latency: 12 },
    ],
    guardrails: [
      { name: 'False Positive Limiter', enabled: true, threshold: 'FPR < 2%' },
      { name: 'Amount Threshold', enabled: true, threshold: '> $50 transactions' },
    ],
    complianceMapping: [
      { framework: 'SOC 2', clause: 'CC6.6 — System Operations', status: 'Compliant' },
      { framework: 'NIST AI RMF', clause: 'MEASURE 1.1 — Accuracy', status: 'Compliant' },
    ],
    incidents: [{ id: 'INC-002', date: '2026-01-10', type: 'Latency Spike', severity: 'medium', resolved: true }],
    lifecyclePhase: 'Production', daysInPhase: 120, lifecycleProgress: 90,
  },
  {
    id: 'MDL-003', name: 'Churn Predictor', version: 'v1.1.0', type: 'ML — Classification',
    owner: 'Maria Santos', status: 'staging', riskTier: 'limited', fairnessScore: 88,
    driftStatus: 'stable', lastValidated: '2026-03-01', framework: 'NIST AI RMF',
    department: 'Customer Success', description: 'Customer churn prediction for proactive retention campaigns.',
    accuracy: 89.2, latencyMs: 65, monthlyInferences: '340K', euAiActArticle: 'Article 52 — Transparency',
    biasMetrics: [
      { metric: 'Gender Parity', value: 0.91, threshold: 0.85, status: 'Pass' },
      { metric: 'Age Group Fairness', value: 0.87, threshold: 0.85, status: 'Pass' },
      { metric: 'Income Bracket Fairness', value: 0.86, threshold: 0.85, status: 'Pass' },
    ],
    performanceHistory: [
      { month: 'Oct', accuracy: 88.0, latency: 70 }, { month: 'Nov', accuracy: 88.5, latency: 68 },
      { month: 'Dec', accuracy: 89.0, latency: 66 }, { month: 'Jan', accuracy: 89.1, latency: 65 },
      { month: 'Feb', accuracy: 89.2, latency: 65 }, { month: 'Mar', accuracy: 89.2, latency: 65 },
    ],
    guardrails: [
      { name: 'Fairness Monitor', enabled: true, threshold: 'DI > 0.85' },
      { name: 'Data Freshness Check', enabled: true, threshold: '< 30 day lag' },
    ],
    complianceMapping: [
      { framework: 'NIST AI RMF', clause: 'MAP 1.1 — Context', status: 'Compliant' },
      { framework: 'EU AI Act', clause: 'Art. 52 — Transparency', status: 'Partial' },
    ],
    incidents: [],
    lifecyclePhase: 'Validation', daysInPhase: 18, lifecycleProgress: 55,
  },
  {
    id: 'MDL-004', name: 'Loan Approval Assistant', version: 'GPT-4o', type: 'LLM — Generative',
    owner: 'Raj Gupta', status: 'staging', riskTier: 'high', fairnessScore: 62,
    driftStatus: 'critical', lastValidated: '2026-02-20', framework: 'EU AI Act',
    department: 'Lending', description: 'LLM-based loan approval reasoning assistant. High-risk under EU AI Act.',
    accuracy: 86.4, latencyMs: 320, monthlyInferences: '45K', euAiActArticle: 'Annex III, 5(b) — Creditworthiness',
    biasMetrics: [
      { metric: 'Gender Parity', value: 0.72, threshold: 0.85, status: 'Fail' },
      { metric: 'Age Group Fairness', value: 0.65, threshold: 0.85, status: 'Fail' },
      { metric: 'Ethnic Disparity Index', value: 0.68, threshold: 0.85, status: 'Fail' },
      { metric: 'Disability Bias', value: 0.58, threshold: 0.85, status: 'Fail' },
    ],
    performanceHistory: [
      { month: 'Oct', accuracy: 85.0, latency: 340 }, { month: 'Nov', accuracy: 85.5, latency: 335 },
      { month: 'Dec', accuracy: 86.0, latency: 330 }, { month: 'Jan', accuracy: 86.2, latency: 325 },
      { month: 'Feb', accuracy: 86.4, latency: 320 }, { month: 'Mar', accuracy: 86.4, latency: 320 },
    ],
    guardrails: [
      { name: 'PII Detection', enabled: true, threshold: '99.5% recall' },
      { name: 'Hallucination Guard', enabled: true, threshold: 'Confidence > 0.8' },
      { name: 'Protected Class Monitor', enabled: true, threshold: 'DI Ratio > 0.8' },
    ],
    complianceMapping: [
      { framework: 'EU AI Act', clause: 'Annex III, 5(b) — Credit', status: 'Non-Compliant' },
      { framework: 'GDPR', clause: 'Art. 22 — Automated Decisions', status: 'Partial' },
      { framework: 'EEOC', clause: 'Title VII — Employment', status: 'Non-Compliant' },
    ],
    incidents: [
      { id: 'INC-004', date: '2026-02-03', type: 'Gender Bias Flag', severity: 'critical', resolved: false },
      { id: 'INC-005', date: '2026-03-01', type: 'LLM Hallucination', severity: 'high', resolved: false },
    ],
    lifecyclePhase: 'Validation', daysInPhase: 34, lifecycleProgress: 40,
  },
  {
    id: 'MDL-005', name: 'AML Transaction Monitor', version: 'v1.5', type: 'ML — Classification',
    owner: 'David Kim', status: 'production', riskTier: 'high', fairnessScore: 85,
    driftStatus: 'stable', lastValidated: '2026-03-12', framework: 'ISO 27001',
    department: 'Compliance', description: 'Anti-money laundering transaction monitoring and suspicious activity detection.',
    accuracy: 94.1, latencyMs: 28, monthlyInferences: '8.4M', euAiActArticle: 'Annex III, 5(a) — Credit Institutions',
    biasMetrics: [
      { metric: 'Gender Parity', value: 0.92, threshold: 0.85, status: 'Pass' },
      { metric: 'Geographic Fairness', value: 0.87, threshold: 0.85, status: 'Pass' },
      { metric: 'Transaction Type Fairness', value: 0.85, threshold: 0.85, status: 'Pass' },
    ],
    performanceHistory: [
      { month: 'Oct', accuracy: 93.5, latency: 30 }, { month: 'Nov', accuracy: 93.8, latency: 29 },
      { month: 'Dec', accuracy: 94.0, latency: 28 }, { month: 'Jan', accuracy: 94.0, latency: 28 },
      { month: 'Feb', accuracy: 94.1, latency: 28 }, { month: 'Mar', accuracy: 94.1, latency: 28 },
    ],
    guardrails: [
      { name: 'SAR Threshold Monitor', enabled: true, threshold: '> $10K trigger' },
      { name: 'False Positive Limiter', enabled: true, threshold: 'FPR < 5%' },
    ],
    complianceMapping: [
      { framework: 'ISO 27001', clause: 'A.8.1 — Asset Management', status: 'Compliant' },
      { framework: 'BSA/AML', clause: 'SAR Filing Requirements', status: 'Compliant' },
    ],
    incidents: [],
    lifecyclePhase: 'Production', daysInPhase: 90, lifecycleProgress: 88,
  },
  {
    id: 'MDL-006', name: 'Customer Sentiment Analyzer', version: 'v2.0', type: 'ML — NLP',
    owner: 'Maria Santos', status: 'production', riskTier: 'limited', fairnessScore: 93,
    driftStatus: 'stable', lastValidated: '2026-03-18', framework: 'NIST AI RMF',
    department: 'Customer Service', description: 'Real-time customer sentiment analysis for service quality monitoring.',
    accuracy: 92.3, latencyMs: 35, monthlyInferences: '1.2M', euAiActArticle: 'Article 52 — Transparency',
    biasMetrics: [
      { metric: 'Gender Parity', value: 0.96, threshold: 0.85, status: 'Pass' },
      { metric: 'Age Group Fairness', value: 0.94, threshold: 0.85, status: 'Pass' },
      { metric: 'Language Fairness', value: 0.91, threshold: 0.85, status: 'Pass' },
    ],
    performanceHistory: [
      { month: 'Oct', accuracy: 91.5, latency: 38 }, { month: 'Nov', accuracy: 91.8, latency: 37 },
      { month: 'Dec', accuracy: 92.0, latency: 36 }, { month: 'Jan', accuracy: 92.1, latency: 35 },
      { month: 'Feb', accuracy: 92.3, latency: 35 }, { month: 'Mar', accuracy: 92.3, latency: 35 },
    ],
    guardrails: [
      { name: 'Toxicity Filter', enabled: true, threshold: 'Score < 0.15' },
      { name: 'PII Redactor', enabled: true, threshold: '99% recall' },
    ],
    complianceMapping: [
      { framework: 'NIST AI RMF', clause: 'MAP 1.1 — Context', status: 'Compliant' },
      { framework: 'EU AI Act', clause: 'Art. 52 — Transparency', status: 'Compliant' },
    ],
    incidents: [],
    lifecyclePhase: 'Monitoring', daysInPhase: 60, lifecycleProgress: 92,
  },
];

// ── Agents ─────────────────────────────────────
export interface Agent {
  id: string; name: string; type: string; model: string; risk: Severity; status: AgentStatus;
  apiCalls7d: number; owner: string; department: string; description: string;
  firstSeen: string; lastActive: string; dataAccess: string[];
}
export const AGENTS: Agent[] = [
  { id: 'AGT-001', name: 'ModelMonitor-Prod', type: 'monitoring', model: 'Internal', risk: 'low', status: 'confirmed', apiCalls7d: 12400, owner: 'Maria Santos', department: 'AI/ML', description: 'Production model health monitoring and drift detection agent.', firstSeen: '2025-09-15', lastActive: '2026-03-31', dataAccess: ['model_metrics', 'performance_logs'] },
  { id: 'AGT-002', name: 'DataPipeline-Orchestrator', type: 'orchestrator', model: 'Internal', risk: 'medium', status: 'confirmed', apiCalls7d: 8200, owner: 'David Kim', department: 'Data Engineering', description: 'Orchestrates ETL pipelines for model training data.', firstSeen: '2025-10-01', lastActive: '2026-03-31', dataAccess: ['raw_data', 'processed_features'] },
  { id: 'AGT-003', name: 'OpenAI-API-Connector', type: 'external_api', model: 'GPT-4o', risk: 'high', status: 'confirmed', apiCalls7d: 24500, owner: 'Raj Gupta', department: 'AI/ML', description: 'External API connector for LLM-powered features.', firstSeen: '2025-11-20', lastActive: '2026-03-31', dataAccess: ['customer_queries', 'loan_applications'] },
  { id: 'AGT-004', name: 'FraudAlert-Watcher', type: 'monitoring', model: 'Internal', risk: 'medium', status: 'confirmed', apiCalls7d: 45200, owner: 'David Kim', department: 'Fraud Prevention', description: 'Real-time fraud alert monitoring and escalation.', firstSeen: '2025-08-10', lastActive: '2026-03-31', dataAccess: ['transaction_logs', 'fraud_labels'] },
  { id: 'AGT-005', name: 'ComplianceChecker-Bot', type: 'workflow', model: 'Internal', risk: 'low', status: 'confirmed', apiCalls7d: 3200, owner: 'James Patel', department: 'Compliance', description: 'Automated compliance policy checking workflow.', firstSeen: '2025-12-01', lastActive: '2026-03-30', dataAccess: ['policy_docs', 'control_mappings'] },
  { id: 'AGT-006', name: 'DataLabeler-v2', type: 'processing', model: 'Claude-3', risk: 'medium', status: 'confirmed', apiCalls7d: 15800, owner: 'Maria Santos', department: 'AI/ML', description: 'Automated data labeling for training datasets.', firstSeen: '2026-01-10', lastActive: '2026-03-31', dataAccess: ['training_data', 'label_store'] },
  { id: 'AGT-007', name: 'AuditLog-Streamer', type: 'monitoring', model: 'Internal', risk: 'low', status: 'confirmed', apiCalls7d: 2100, owner: 'Emma Wilson', department: 'Audit', description: 'Streams audit events to SIEM and compliance dashboards.', firstSeen: '2025-07-15', lastActive: '2026-03-31', dataAccess: ['audit_events'] },
  { id: 'AGT-008', name: 'VendorRisk-Scanner', type: 'workflow', model: 'Internal', risk: 'medium', status: 'confirmed', apiCalls7d: 890, owner: 'David Kim', department: 'Risk', description: 'Automated vendor risk assessment scanning.', firstSeen: '2026-02-01', lastActive: '2026-03-28', dataAccess: ['vendor_data', 'risk_scores'] },
  { id: 'AGT-009', name: 'HRScreener-Agent', type: 'decision', model: 'GPT-4o', risk: 'high', status: 'confirmed', apiCalls7d: 1200, owner: 'Raj Gupta', department: 'HR', description: 'Resume screening and candidate ranking. HIGH RISK — uses protected attributes.', firstSeen: '2026-01-20', lastActive: '2026-03-31', dataAccess: ['resumes', 'hr_records'] },
  // Shadow agents
  { id: 'AGT-010', name: 'LangChain-Marketing', type: 'unknown', model: 'GPT-4', risk: 'critical', status: 'shadow', apiCalls7d: 3400, owner: 'Unknown', department: 'Marketing', description: 'Unauthorized LangChain deployment detected in marketing department.', firstSeen: '2026-03-05', lastActive: '2026-03-31', dataAccess: ['customer_data', 'marketing_campaigns'] },
  { id: 'AGT-011', name: 'GPT-Wrapper-DevTeam', type: 'unknown', model: 'GPT-3.5', risk: 'high', status: 'shadow', apiCalls7d: 8900, owner: 'Unknown', department: 'Engineering', description: 'Unapproved GPT wrapper tool used by dev team for code generation.', firstSeen: '2026-02-18', lastActive: '2026-03-31', dataAccess: ['source_code', 'internal_docs'] },
  { id: 'AGT-012', name: 'AutoGPT-Experiment', type: 'unknown', model: 'GPT-4', risk: 'critical', status: 'shadow', apiCalls7d: 560, owner: 'Unknown', department: 'Research', description: 'Autonomous agent experiment with uncontrolled internet access.', firstSeen: '2026-03-20', lastActive: '2026-03-29', dataAccess: ['internet', 'internal_apis'] },
];

// ── Datasets ───────────────────────────────────
export interface Dataset {
  id: string; name: string; sensitivity: string; classification: string; risk: Severity;
  linkedModel: string; records: number; status: string; lastAudit: string;
  owner: string; encryption: string; retentionPolicy: string; description: string;
}
export const DATASETS: Dataset[] = [
  { id: 'DS-001', name: 'Consumer Credit History v4', sensitivity: 'PII', classification: 'restricted', risk: 'critical', linkedModel: 'MDL-001', records: 2450000, status: 'active', lastAudit: '2026-02-15', owner: 'David Kim', encryption: 'AES-256', retentionPolicy: '7 years', description: 'Consumer credit bureau data for loan underwriting models.' },
  { id: 'DS-002', name: 'Transaction Fraud Labels v2', sensitivity: 'PII', classification: 'confidential', risk: 'high', linkedModel: 'MDL-002', records: 8900000, status: 'active', lastAudit: '2026-03-01', owner: 'David Kim', encryption: 'AES-256', retentionPolicy: '5 years', description: 'Labeled fraud/not-fraud transaction records for model training.' },
  { id: 'DS-003', name: 'Customer Behavioral Features', sensitivity: 'internal', classification: 'internal', risk: 'medium', linkedModel: 'MDL-003', records: 1200000, status: 'active', lastAudit: '2026-01-20', owner: 'Maria Santos', encryption: 'AES-256', retentionPolicy: '3 years', description: 'Aggregated customer behavior features for churn prediction.' },
  { id: 'DS-004', name: 'Policy Document Corpus', sensitivity: 'internal', classification: 'internal', risk: 'low', linkedModel: 'MDL-004', records: 34500, status: 'active', lastAudit: '2026-02-28', owner: 'James Patel', encryption: 'AES-128', retentionPolicy: '10 years', description: 'Internal policy and regulatory documents for LLM fine-tuning.' },
  { id: 'DS-005', name: 'AML Transaction History', sensitivity: 'PII', classification: 'restricted', risk: 'critical', linkedModel: 'MDL-005', records: 15600000, status: 'active', lastAudit: '2026-03-10', owner: 'David Kim', encryption: 'AES-256', retentionPolicy: '10 years', description: 'Full transaction history with SAR labels for AML monitoring.' },
  { id: 'DS-006', name: 'Customer Sentiment Corpus', sensitivity: 'internal', classification: 'internal', risk: 'low', linkedModel: 'MDL-006', records: 890000, status: 'active', lastAudit: '2026-02-10', owner: 'Maria Santos', encryption: 'AES-128', retentionPolicy: '2 years', description: 'Customer feedback and support tickets with sentiment labels.' },
  { id: 'DS-007', name: 'Employee HR Records 2023', sensitivity: 'PII', classification: 'restricted', risk: 'high', linkedModel: 'MDL-004', records: 4200, status: 'under_review', lastAudit: '2026-01-05', owner: 'Raj Gupta', encryption: 'AES-256', retentionPolicy: '7 years', description: 'Employee records used for HR screening model training. Under ethical review.' },
  { id: 'DS-008', name: 'Vendor Contracts Archive', sensitivity: 'confidential', classification: 'confidential', risk: 'medium', linkedModel: '', records: 1250, status: 'active', lastAudit: '2026-03-05', owner: 'James Patel', encryption: 'AES-128', retentionPolicy: '10 years', description: 'Digitized vendor contracts and service agreements.' },
];

// ── Vendors ────────────────────────────────────
export interface Vendor {
  id: string; name: string; category: string; risk: Severity; score: number;
  status: VendorStatus; lastReview: string; contact: string; website: string;
  dpaStatus: string; description: string; linkedModels: string[];
  scoreBreakdown: { security: number; compliance: number; reliability: number; dataPrivacy: number };
}
export const VENDORS: Vendor[] = [
  { id: 'V-001', name: 'OpenAI', category: 'Foundation Model', risk: 'medium', score: 87, status: 'approved', lastReview: '2026-02-15', contact: 'enterprise@openai.com', website: 'openai.com', dpaStatus: 'signed', description: 'Provider of GPT-4o and embedding APIs.', linkedModels: ['MDL-004'], scoreBreakdown: { security: 85, compliance: 82, reliability: 94, dataPrivacy: 87 } },
  { id: 'V-002', name: 'AWS SageMaker', category: 'Infrastructure', risk: 'low', score: 94, status: 'approved', lastReview: '2026-01-20', contact: 'aws-enterprise@amazon.com', website: 'aws.amazon.com/sagemaker', dpaStatus: 'signed', description: 'ML infrastructure and model hosting platform.', linkedModels: ['MDL-001', 'MDL-002', 'MDL-005'], scoreBreakdown: { security: 96, compliance: 95, reliability: 98, dataPrivacy: 87 } },
  { id: 'V-003', name: 'Anthropic', category: 'Foundation Model', risk: 'low', score: 96, status: 'approved', lastReview: '2026-03-01', contact: 'sales@anthropic.com', website: 'anthropic.com', dpaStatus: 'signed', description: 'Provider of Claude models for data labeling and analysis.', linkedModels: ['MDL-006'], scoreBreakdown: { security: 97, compliance: 95, reliability: 96, dataPrivacy: 96 } },
  { id: 'V-004', name: 'Pinecone', category: 'Data Provider', risk: 'medium', score: 72, status: 'in_review', lastReview: '2026-02-28', contact: 'enterprise@pinecone.io', website: 'pinecone.io', dpaStatus: 'pending', description: 'Vector database for RAG and semantic search.', linkedModels: ['MDL-004'], scoreBreakdown: { security: 70, compliance: 65, reliability: 82, dataPrivacy: 71 } },
  { id: 'V-005', name: 'Giskard', category: 'Tool Provider', risk: 'low', score: 79, status: 'approved', lastReview: '2026-03-10', contact: 'hello@giskard.ai', website: 'giskard.ai', dpaStatus: 'signed', description: 'AI testing and bias audit tooling.', linkedModels: [], scoreBreakdown: { security: 78, compliance: 82, reliability: 76, dataPrivacy: 80 } },
  { id: 'V-006', name: 'Palantir', category: 'Analytics Platform', risk: 'high', score: 61, status: 'in_review', lastReview: '2026-01-15', contact: 'sales@palantir.com', website: 'palantir.com', dpaStatus: 'pending', description: 'Enterprise analytics and AI platform. Under enhanced due diligence.', linkedModels: [], scoreBreakdown: { security: 72, compliance: 55, reliability: 68, dataPrivacy: 49 } },
  { id: 'V-007', name: 'C3.ai', category: 'AI Platform', risk: 'high', score: 55, status: 'high_risk', lastReview: '2026-02-01', contact: 'enterprise@c3.ai', website: 'c3.ai', dpaStatus: 'not_signed', description: 'Enterprise AI platform. HIGH RISK — DPA not signed, data residency concerns.', linkedModels: [], scoreBreakdown: { security: 58, compliance: 45, reliability: 62, dataPrivacy: 55 } },
];

// ── Risks ──────────────────────────────────────
export interface Risk {
  id: string; title: string; description: string; category: string; severity: Severity;
  status: RiskStatus; likelihood: number; impact: number; score: number;
  owner: string; linkedModel: string; mitigations: string[]; createdDate: string;
  lastUpdated: string; trending: 'up' | 'down' | 'stable';
}
export const RISKS: Risk[] = [
  { id: 'RSK-001', title: 'Geographic proxy bias in Credit Scorer', description: 'ZIP code features acting as proxy for protected class in credit scoring model.', category: 'AI/ML', severity: 'critical', status: 'open', likelihood: 4, impact: 5, score: 20, owner: 'Maria Santos', linkedModel: 'MDL-001', mitigations: ['Remove ZIP code features', 'Add fairness constraints', 'Retrain with debiased data'], createdDate: '2025-11-15', lastUpdated: '2026-03-20', trending: 'stable' },
  { id: 'RSK-002', title: 'LLM hallucination in Loan Assistant', description: 'GPT-4o generating fabricated loan terms and conditions in approval reasoning.', category: 'AI/ML', severity: 'high', status: 'open', likelihood: 3, impact: 4, score: 12, owner: 'Raj Gupta', linkedModel: 'MDL-004', mitigations: ['Add hallucination guardrail', 'Implement RAG pipeline', 'Human review for all approvals'], createdDate: '2026-01-05', lastUpdated: '2026-03-15', trending: 'up' },
  { id: 'RSK-003', title: 'PII consent gap across 2 datasets', description: 'Consumer credit and HR datasets lack explicit AI processing consent under GDPR Art. 6.', category: 'Compliance', severity: 'critical', status: 'open', likelihood: 3, impact: 5, score: 15, owner: 'James Patel', linkedModel: '', mitigations: ['Obtain retroactive consent', 'Implement data anonymization', 'Legal review of processing basis'], createdDate: '2026-01-18', lastUpdated: '2026-03-10', trending: 'stable' },
  { id: 'RSK-004', title: 'OpenAI DPA gap for EU data', description: 'Data Processing Agreement with OpenAI does not cover EU citizen data adequately.', category: 'Compliance', severity: 'critical', status: 'open', likelihood: 4, impact: 5, score: 20, owner: 'James Patel', linkedModel: 'MDL-004', mitigations: ['Negotiate DPA amendment', 'Implement data residency controls', 'Consider EU-hosted alternative'], createdDate: '2026-02-01', lastUpdated: '2026-03-18', trending: 'up' },
  { id: 'RSK-005', title: 'Fraud model latency under peak load', description: 'Fraud Detection Engine response time exceeds 100ms SLA during peak transaction periods.', category: 'Operational', severity: 'medium', status: 'mitigated', likelihood: 3, impact: 3, score: 9, owner: 'David Kim', linkedModel: 'MDL-002', mitigations: ['Auto-scaling configured', 'Cache layer added', 'Peak load testing completed'], createdDate: '2025-10-20', lastUpdated: '2026-02-28', trending: 'down' },
  { id: 'RSK-006', title: 'Shadow AI data exfiltration risk', description: 'Unregistered LangChain agent in marketing accessing customer PII without authorization.', category: 'Security', severity: 'high', status: 'open', likelihood: 4, impact: 4, score: 16, owner: 'Sarah Chen', linkedModel: '', mitigations: ['Quarantine shadow agents', 'Implement API gateway controls', 'Network segmentation'], createdDate: '2026-03-05', lastUpdated: '2026-03-25', trending: 'up' },
  { id: 'RSK-007', title: 'EU AI Act Article 11 documentation gap', description: 'Technical documentation requirements not met for high-risk AI systems.', category: 'Governance', severity: 'medium', status: 'accepted', likelihood: 4, impact: 3, score: 12, owner: 'Emma Wilson', linkedModel: '', mitigations: ['Document all high-risk models', 'Implement model cards', 'Automate documentation generation'], createdDate: '2026-01-10', lastUpdated: '2026-03-12', trending: 'stable' },
  { id: 'RSK-008', title: 'HR screening age/gender bias', description: 'Loan Approval Assistant showing significant bias on age and gender dimensions in HR screening mode.', category: 'AI/ML', severity: 'critical', status: 'open', likelihood: 4, impact: 5, score: 20, owner: 'Raj Gupta', linkedModel: 'MDL-004', mitigations: ['Suspend HR screening feature', 'Conduct full bias audit', 'Retrain with balanced data'], createdDate: '2026-02-03', lastUpdated: '2026-03-28', trending: 'up' },
  { id: 'RSK-009', title: 'Churn model distribution shift', description: 'Input feature distributions shifting due to product changes, degrading prediction quality.', category: 'AI/ML', severity: 'medium', status: 'accepted', likelihood: 3, impact: 2, score: 6, owner: 'Maria Santos', linkedModel: 'MDL-003', mitigations: ['Implement drift monitoring', 'Schedule quarterly retraining', 'Feature importance review'], createdDate: '2026-02-15', lastUpdated: '2026-03-20', trending: 'stable' },
  { id: 'RSK-010', title: 'Vendor lock-in with OpenAI', description: 'Over-reliance on OpenAI for LLM capabilities without viable fallback provider.', category: 'Third-Party', severity: 'low', status: 'accepted', likelihood: 2, impact: 2, score: 4, owner: 'David Kim', linkedModel: 'MDL-004', mitigations: ['Maintain Anthropic as backup', 'Abstract LLM interface layer', 'Regular vendor review'], createdDate: '2025-12-01', lastUpdated: '2026-01-15', trending: 'stable' },
  { id: 'RSK-011', title: 'AML false positive rate elevation', description: 'AML Transaction Monitor false positive rate trending upward, causing analyst fatigue.', category: 'Operational', severity: 'high', status: 'open', likelihood: 3, impact: 4, score: 12, owner: 'David Kim', linkedModel: 'MDL-005', mitigations: ['Tune detection thresholds', 'Add secondary scoring layer', 'Analyst feedback loop'], createdDate: '2026-02-20', lastUpdated: '2026-03-22', trending: 'up' },
  { id: 'RSK-012', title: 'Model explainability gap — GDPR Art. 22', description: 'Automated decision-making systems lack sufficient explainability for GDPR compliance.', category: 'Governance', severity: 'high', status: 'open', likelihood: 3, impact: 4, score: 12, owner: 'Raj Gupta', linkedModel: '', mitigations: ['Implement SHAP explanations', 'Add model cards', 'Create explanation API endpoint'], createdDate: '2026-01-25', lastUpdated: '2026-03-15', trending: 'stable' },
];

// ── Bias Audits ────────────────────────────────
export interface BiasAudit {
  id: string; modelId: string; modelName: string; dataset: string; framework: string;
  overallScore: number; result: BiasResult; protectedAttributes: string[];
  severity: Severity; date: string; auditor: string; status: string;
  dimensions: { attribute: string; score: number; threshold: number; pass: boolean }[];
  recommendations: string[];
}
export const BIAS_AUDITS: BiasAudit[] = [
  { id: 'BA-001', modelId: 'MDL-001', modelName: 'Credit Risk Scorer', dataset: 'DS-001', framework: 'EU AI Act', overallScore: 0.79, result: 'failed', protectedAttributes: ['Race/Ethnicity', 'Geography'], severity: 'critical', date: '2026-01-22', auditor: 'Maria Santos', status: 'remediation_required', dimensions: [{ attribute: 'Race/Ethnicity', score: 0.76, threshold: 0.85, pass: false }, { attribute: 'Geography', score: 0.79, threshold: 0.85, pass: false }, { attribute: 'Gender', score: 0.87, threshold: 0.85, pass: true }, { attribute: 'Age', score: 0.84, threshold: 0.85, pass: false }], recommendations: ['Remove geographic proxy features', 'Apply adversarial debiasing', 'Retrain with balanced sampling'] },
  { id: 'BA-002', modelId: 'MDL-002', modelName: 'Fraud Detection Engine', dataset: 'DS-002', framework: 'NIST AI RMF', overallScore: 0.93, result: 'passed', protectedAttributes: ['Gender', 'Age'], severity: 'low', date: '2026-02-10', auditor: 'Emma Wilson', status: 'compliant', dimensions: [{ attribute: 'Gender', score: 0.95, threshold: 0.85, pass: true }, { attribute: 'Age', score: 0.93, threshold: 0.85, pass: true }, { attribute: 'Geography', score: 0.89, threshold: 0.85, pass: true }], recommendations: ['Continue quarterly monitoring', 'Document bias testing methodology'] },
  { id: 'BA-003', modelId: 'MDL-004', modelName: 'Loan Approval Assistant', dataset: 'DS-007', framework: 'EEOC', overallScore: 0.82, result: 'failed', protectedAttributes: ['Race/Ethnicity'], severity: 'high', date: '2026-02-20', auditor: 'Raj Gupta', status: 'remediation_required', dimensions: [{ attribute: 'Race/Ethnicity', score: 0.68, threshold: 0.85, pass: false }, { attribute: 'Gender', score: 0.72, threshold: 0.85, pass: false }, { attribute: 'Age', score: 0.85, threshold: 0.85, pass: true }], recommendations: ['Suspend decision-making use', 'Conduct disparate impact analysis', 'Engage external auditor'] },
  { id: 'BA-004', modelId: 'MDL-005', modelName: 'AML Transaction Monitor', dataset: 'DS-005', framework: 'EU AI Act', overallScore: 0.88, result: 'passed', protectedAttributes: ['All dimensions'], severity: 'low', date: '2026-03-05', auditor: 'Emma Wilson', status: 'compliant', dimensions: [{ attribute: 'Gender', score: 0.92, threshold: 0.85, pass: true }, { attribute: 'Geography', score: 0.87, threshold: 0.85, pass: true }, { attribute: 'Transaction Type', score: 0.85, threshold: 0.85, pass: true }], recommendations: ['Maintain monitoring cadence', 'Add socioeconomic dimension to next audit'] },
  { id: 'BA-005', modelId: 'MDL-004', modelName: 'Loan Approval Assistant', dataset: 'DS-001', framework: 'GDPR', overallScore: 0.67, result: 'failed', protectedAttributes: ['Gender', 'Age', 'Disability'], severity: 'critical', date: '2026-03-15', auditor: 'Maria Santos', status: 'blocked', dimensions: [{ attribute: 'Gender', score: 0.72, threshold: 0.85, pass: false }, { attribute: 'Age', score: 0.65, threshold: 0.85, pass: false }, { attribute: 'Disability', score: 0.58, threshold: 0.85, pass: false }, { attribute: 'Race/Ethnicity', score: 0.68, threshold: 0.85, pass: false }], recommendations: ['BLOCK deployment to production', 'Full model retraining required', 'External audit mandatory before release'] },
];

// ── Evidence ───────────────────────────────────
export interface Evidence {
  id: string; title: string; source: string; framework: string; control: string;
  type: string; status: EvidenceStatus; lastSync: string; owner: string;
  description: string; fileSize: string;
}
export const EVIDENCE: Evidence[] = [
  { id: 'EV-001', title: 'Bias Monitoring Report — Jan 2026', source: 'Drata', framework: 'EU AI Act', control: 'Art. 10 — Data Governance', type: 'Report', status: 'synced', lastSync: '2026-03-15', owner: 'Maria Santos', description: 'Monthly bias monitoring report covering all production models.', fileSize: '2.4 MB' },
  { id: 'EV-002', title: 'SHAP Explainability Report', source: 'Cobalt.io', framework: 'EU AI Act', control: 'Art. 13 — Transparency', type: 'Report', status: 'synced', lastSync: '2026-03-10', owner: 'Raj Gupta', description: 'SHAP-based model explainability analysis for high-risk systems.', fileSize: '1.8 MB' },
  { id: 'EV-003', title: 'Human Oversight Log Q1 2026', source: 'Okta', framework: 'EU AI Act', control: 'Art. 14 — Human Oversight', type: 'Log', status: 'synced', lastSync: '2026-03-01', owner: 'James Patel', description: 'Quarterly human-in-the-loop review records for automated decisions.', fileSize: '890 KB' },
  { id: 'EV-004', title: 'Fraud Model Validation v2.1', source: 'Internal', framework: 'NIST AI RMF', control: 'MEASURE 2.6 — Bias', type: 'Validation', status: 'synced', lastSync: '2026-02-28', owner: 'David Kim', description: 'Independent validation report for Fraud Detection Engine v2.1.', fileSize: '3.1 MB' },
  { id: 'EV-005', title: 'GDPR DPA Agreement — OpenAI', source: 'Legal', framework: 'GDPR', control: 'Art. 28 — Processor', type: 'Agreement', status: 'expired', lastSync: '2025-12-01', owner: 'James Patel', description: 'Data Processing Agreement with OpenAI. EXPIRED — renewal required.', fileSize: '456 KB' },
  { id: 'EV-006', title: 'SOC 2 Type II — AWS 2025', source: 'AWS', framework: 'ISO 27001', control: 'A.15.2 — Supplier Delivery', type: 'Certificate', status: 'pending', lastSync: '2026-01-15', owner: 'Sarah Chen', description: 'AWS SOC 2 Type II attestation report. Pending annual renewal.', fileSize: '5.2 MB' },
];

// ── Incidents ──────────────────────────────────
export interface Incident {
  id: string; title: string; severity: Severity; status: IncidentStatus; category: string;
  reportedDate: string; reporter: string; assignee: string; description: string;
  linkedModel: string; rootCause: string; correctiveActions: string[];
  timeline: { date: string; action: string; actor: string }[];
}
export const INCIDENTS: Incident[] = [
  { id: 'INC-001', title: 'Bias in Credit Scoring Output', severity: 'critical', status: 'investigating', category: 'Bias/Fairness', reportedDate: '2026-01-08', reporter: 'Maria Santos', assignee: 'Raj Gupta', description: 'Credit Risk Scorer showing statistically significant disparate impact on protected class.', linkedModel: 'MDL-001', rootCause: 'Geographic proxy features correlating with protected attributes.', correctiveActions: ['Feature audit initiated', 'Model suspended from auto-decisions', 'Bias audit BA-001 scheduled'], timeline: [{ date: '2026-01-08', action: 'Incident reported', actor: 'Maria Santos' }, { date: '2026-01-09', action: 'Severity escalated to Critical', actor: 'Sarah Chen' }, { date: '2026-01-10', action: 'Model placed in human-review mode', actor: 'Raj Gupta' }] },
  { id: 'INC-002', title: 'Fraud Model Latency Spike', severity: 'medium', status: 'resolved', category: 'Performance', reportedDate: '2026-01-10', reporter: 'David Kim', assignee: 'Maria Santos', description: 'Fraud Detection Engine response time exceeded 500ms during peak hours.', linkedModel: 'MDL-002', rootCause: 'Auto-scaling policy not configured for burst traffic pattern.', correctiveActions: ['Auto-scaling policy updated', 'Cache layer implemented', 'Load testing completed'], timeline: [{ date: '2026-01-10', action: 'Incident reported', actor: 'David Kim' }, { date: '2026-01-11', action: 'Root cause identified', actor: 'Maria Santos' }, { date: '2026-01-15', action: 'Fix deployed and verified', actor: 'Maria Santos' }] },
  { id: 'INC-003', title: 'Shadow AI Unauthorized Data Access', severity: 'high', status: 'open', category: 'Security', reportedDate: '2026-01-15', reporter: 'Sarah Chen', assignee: 'Sarah Chen', description: 'Unauthorized LangChain agent detected accessing customer PII in marketing department.', linkedModel: '', rootCause: 'Marketing team deployed unapproved LLM agent without IT review.', correctiveActions: ['Agent quarantined', 'Data access revoked', 'Department audit initiated'], timeline: [{ date: '2026-01-15', action: 'Shadow agent detected by network scan', actor: 'System' }, { date: '2026-01-15', action: 'Incident opened', actor: 'Sarah Chen' }] },
  { id: 'INC-004', title: 'HR Model Gender Bias Flag', severity: 'critical', status: 'investigating', category: 'Bias/Fairness', reportedDate: '2026-02-03', reporter: 'Raj Gupta', assignee: 'Maria Santos', description: 'Loan Approval Assistant in HR screening mode showing significant gender and age bias.', linkedModel: 'MDL-004', rootCause: 'Training data contains historical hiring bias patterns.', correctiveActions: ['HR screening feature suspended', 'Bias audit BA-003 and BA-005 initiated', 'Legal review requested'], timeline: [{ date: '2026-02-03', action: 'Bias detected in production monitoring', actor: 'Raj Gupta' }, { date: '2026-02-03', action: 'HR screening suspended', actor: 'Sarah Chen' }, { date: '2026-02-05', action: 'Bias audit scheduled', actor: 'Emma Wilson' }] },
  { id: 'INC-005', title: 'LLM Hallucination in Loan Approval', severity: 'high', status: 'mitigating', category: 'AI Safety', reportedDate: '2026-03-01', reporter: 'James Patel', assignee: 'Raj Gupta', description: 'Loan Approval Assistant fabricated non-existent regulatory requirements in approval reasoning.', linkedModel: 'MDL-004', rootCause: 'LLM generating plausible but false regulatory citations.', correctiveActions: ['RAG pipeline implementation in progress', 'Human review mandatory for all outputs', 'Citation verification system planned'], timeline: [{ date: '2026-03-01', action: 'Hallucination detected in audit sample', actor: 'James Patel' }, { date: '2026-03-02', action: 'Human review gate enabled', actor: 'Raj Gupta' }, { date: '2026-03-10', action: 'RAG pipeline design approved', actor: 'Maria Santos' }] },
];

// ── Audit Log ──────────────────────────────────
export interface AuditEntry {
  id: string; action: string; entity: string; entityId: string; actor: string;
  timestamp: string; category: string; details: string;
}
export const AUDIT_LOG: AuditEntry[] = [
  { id: 'AL-001', action: 'Model updated', entity: 'Credit Risk Scorer', entityId: 'MDL-001', actor: 'Sarah Chen', timestamp: '2026-01-15T15:15:00Z', category: 'model', details: 'Updated risk tier from Limited to High after EU AI Act reclassification.' },
  { id: 'AL-002', action: 'Risk created', entity: 'PII consent gap', entityId: 'RSK-003', actor: 'James Patel', timestamp: '2026-01-18T10:30:00Z', category: 'risk', details: 'New compliance risk identified during GDPR audit.' },
  { id: 'AL-003', action: 'Policy approved', entity: 'AI Acceptable Use Policy', entityId: 'POL-001', actor: 'Emma Wilson', timestamp: '2026-01-20T14:00:00Z', category: 'policy', details: 'Policy approved after 3-reviewer workflow completion.' },
  { id: 'AL-004', action: 'Bias audit completed', entity: 'Credit Risk Scorer', entityId: 'BA-001', actor: 'Maria Santos', timestamp: '2026-01-22T11:45:00Z', category: 'bias_audit', details: 'Bias audit BA-001 completed. Result: FAILED. Remediation required.' },
  { id: 'AL-005', action: 'Vendor added', entity: 'C3.ai', entityId: 'V-007', actor: 'David Kim', timestamp: '2026-02-01T09:20:00Z', category: 'vendor', details: 'New vendor registered. Flagged as HIGH RISK — DPA not signed.' },
  { id: 'AL-006', action: 'Incident reported', entity: 'HR Model Gender Bias Flag', entityId: 'INC-004', actor: 'Raj Gupta', timestamp: '2026-02-03T08:15:00Z', category: 'incident', details: 'Critical bias incident in Loan Approval Assistant HR screening mode.' },
  { id: 'AL-007', action: 'Control updated', entity: 'CTRL-004 Risk Assessment', entityId: 'CTRL-004', actor: 'James Patel', timestamp: '2026-02-15T16:30:00Z', category: 'control', details: 'Control status changed from Planned to Partial. Evidence uploaded.' },
  { id: 'AL-008', action: 'Evidence synced', entity: 'Human Oversight Log Q1 2026', entityId: 'EV-003', actor: 'System', timestamp: '2026-03-01T00:00:00Z', category: 'evidence', details: 'Automated sync from Okta completed successfully.' },
];

// ── Security Data ──────────────────────────────
export interface Threat {
  id: string; name: string; category: string; severity: Severity; status: ThreatStatus;
  source: string; detected: string; description: string; affectedModels: string[];
  cve?: string; remediation: string[];
}
export const THREATS: Threat[] = [
  { id: 'THR-001', name: 'SQL Injection on Model API', category: 'Injection', severity: 'critical', status: 'mitigated', source: 'Internal Scan', detected: '2026-01-20', description: 'SQL injection vulnerability found in model prediction API endpoint.', affectedModels: ['MDL-001', 'MDL-002'], cve: 'CVE-2026-1234', remediation: ['Input sanitization implemented', 'WAF rules updated', 'Parameterized queries enforced'] },
  { id: 'THR-002', name: 'API Key Exposure in Logs', category: 'Data Exposure', severity: 'high', status: 'resolved', source: 'Vendor Advisory', detected: '2026-02-05', description: 'OpenAI API keys found in application debug logs.', affectedModels: ['MDL-004'], remediation: ['Keys rotated', 'Log scrubbing enabled', 'Secret scanning added to CI'] },
  { id: 'THR-003', name: 'Prompt Injection Attack — Loan Assistant', category: 'Prompt Injection', severity: 'critical', status: 'active', source: 'MITRE ATLAS', detected: '2026-02-15', description: 'Sophisticated prompt injection attempts targeting Loan Approval Assistant to bypass safety guardrails.', affectedModels: ['MDL-004'], remediation: ['Enhanced prompt validation', 'Layered guardrail architecture', 'Input/output monitoring'] },
  { id: 'THR-004', name: 'Unauthorized Model Access Attempt', category: 'Unauthorized Access', severity: 'high', status: 'investigating', source: 'Internal Scan', detected: '2026-03-01', description: 'Multiple failed authentication attempts against model inference endpoints from unknown IP range.', affectedModels: ['MDL-001', 'MDL-005'], remediation: ['IP blocking applied', 'Rate limiting enhanced', 'SOC alerted'] },
  { id: 'THR-005', name: 'Data Exfiltration via Shadow Agent', category: 'Data Exfiltration', severity: 'critical', status: 'active', source: 'OWASP', detected: '2026-03-05', description: 'Shadow AI agent (AGT-010) found sending customer data to external API endpoint.', affectedModels: [], remediation: ['Agent quarantined', 'Egress filtering enabled', 'Data loss assessment in progress'] },
  { id: 'THR-006', name: 'SSRF via Model Loading Endpoint', category: 'SSRF', severity: 'medium', status: 'mitigated', source: 'Internal Scan', detected: '2026-03-10', description: 'Server-Side Request Forgery vulnerability in model artifact loading endpoint.', affectedModels: [], remediation: ['URL validation added', 'Internal network ACLs updated', 'Endpoint hardened'] },
];

export interface Vulnerability {
  id: string; cve: string; title: string; cvss: number; severity: Severity;
  component: string; status: string; discovered: string; patchDate: string;
  assignee: string; description: string;
}
export const VULNERABILITIES: Vulnerability[] = [
  { id: 'VULN-001', cve: 'CVE-2026-1234', title: 'SQL Injection in Model API', cvss: 9.1, severity: 'critical', component: 'model-api v2.3.1', status: 'patched', discovered: '2026-01-20', patchDate: '2026-01-22', assignee: 'Maria Santos', description: 'Critical SQL injection in prediction endpoint allowing arbitrary query execution.' },
  { id: 'VULN-002', cve: 'CVE-2026-5678', title: 'Tokenizer Buffer Overflow', cvss: 7.3, severity: 'high', component: 'transformers v4.38.1', status: 'in_progress', discovered: '2026-02-10', patchDate: '', assignee: 'David Kim', description: 'Buffer overflow in tokenizer library allowing denial of service.' },
  { id: 'VULN-003', cve: 'CVE-2026-9012', title: 'LangChain RCE via Template', cvss: 6.5, severity: 'medium', component: 'langchain v0.1.12', status: 'open', discovered: '2026-02-28', patchDate: '', assignee: 'Maria Santos', description: 'Remote code execution via malicious prompt templates in LangChain.' },
  { id: 'VULN-004', cve: 'SENT-V-004', title: 'Insecure Model Deserialization', cvss: 8.2, severity: 'high', component: 'model-loader v1.0', status: 'in_progress', discovered: '2026-03-01', patchDate: '', assignee: 'Raj Gupta', description: 'Pickle deserialization vulnerability in custom model loading pipeline.' },
  { id: 'VULN-005', cve: 'SENT-V-005', title: 'Missing Rate Limiting on Inference', cvss: 5.8, severity: 'medium', component: 'inference-gateway v3.1', status: 'open', discovered: '2026-03-05', patchDate: '', assignee: 'David Kim', description: 'No rate limiting on model inference API allowing resource exhaustion.' },
  { id: 'VULN-006', cve: 'CVE-2026-6103', title: 'Vector DB Injection in ChromaDB', cvss: 7.8, severity: 'high', component: 'chromadb v0.4.22', status: 'open', discovered: '2026-03-12', patchDate: '', assignee: 'Maria Santos', description: 'Metadata injection vulnerability in ChromaDB vector store queries.' },
];

export interface RedTeamExercise {
  id: string; name: string; attackVector: string; status: string; findings: number;
  criticalFindings: number; lead: string; startDate: string; endDate: string;
  targetModel: string; description: string; score: number;
}
export const RED_TEAM_EXERCISES: RedTeamExercise[] = [
  { id: 'RT-001', name: 'LLM Jailbreak Test — Jan 2026', attackVector: 'Prompt Injection / Jailbreak', status: 'completed', findings: 12, criticalFindings: 3, lead: 'Sarah Chen', startDate: '2026-01-15', endDate: '2026-01-25', targetModel: 'MDL-004', description: 'Comprehensive jailbreak testing of Loan Approval Assistant using DAN, AIM, and custom bypass prompts.', score: 45 },
  { id: 'RT-002', name: 'API Auth Bypass — Feb 2026', attackVector: 'Authentication Bypass', status: 'completed', findings: 5, criticalFindings: 1, lead: 'David Kim', startDate: '2026-02-01', endDate: '2026-02-10', targetModel: 'MDL-001', description: 'Penetration testing of model API authentication and authorization controls.', score: 78 },
  { id: 'RT-003', name: 'Data Exfil Simulation — Mar 2026', attackVector: 'Data Exfiltration', status: 'completed', findings: 8, criticalFindings: 2, lead: 'Sarah Chen', startDate: '2026-03-01', endDate: '2026-03-15', targetModel: '', description: 'Simulated data exfiltration scenarios testing DLP and network controls.', score: 62 },
  { id: 'RT-004', name: 'Prompt Injection Campaign — Mar 2026', attackVector: 'Prompt Injection', status: 'active', findings: 9, criticalFindings: 4, lead: 'Raj Gupta', startDate: '2026-03-20', endDate: '', targetModel: 'MDL-004', description: 'Ongoing adversarial prompt injection campaign against all LLM-based systems.', score: 38 },
];

export interface AttackSurfaceAsset {
  id: string; name: string; type: string; exposure: string; risk: Severity;
  protocol: string; lastScanned: string; status: string; owner: string;
  description: string; openPorts: number;
}
export const ATTACK_SURFACE: AttackSurfaceAsset[] = [
  { id: 'AS-001', name: 'app.sentinel-grc.com', type: 'Web Application', exposure: 'public', risk: 'medium', protocol: 'HTTPS', lastScanned: '2026-03-28', status: 'monitored', owner: 'Sarah Chen', description: 'Primary GRC platform web application.', openPorts: 2 },
  { id: 'AS-002', name: 'api.sentinel-grc.com', type: 'API Gateway', exposure: 'public', risk: 'high', protocol: 'HTTPS/REST', lastScanned: '2026-03-28', status: 'monitored', owner: 'Maria Santos', description: 'Model inference and platform API gateway.', openPorts: 1 },
  { id: 'AS-003', name: 'mlops-prod.internal', type: 'ML Pipeline', exposure: 'internal', risk: 'high', protocol: 'gRPC', lastScanned: '2026-03-25', status: 'monitored', owner: 'Maria Santos', description: 'Production ML operations pipeline and model registry.', openPorts: 3 },
  { id: 'AS-004', name: 'data-warehouse.internal', type: 'Data Store', exposure: 'internal', risk: 'critical', protocol: 'PostgreSQL', lastScanned: '2026-03-28', status: 'monitored', owner: 'David Kim', description: 'Primary data warehouse with PII datasets.', openPorts: 1 },
  { id: 'AS-005', name: 'vendor-portal.sentinel-grc.com', type: 'Web Application', exposure: 'public', risk: 'medium', protocol: 'HTTPS', lastScanned: '2026-03-20', status: 'monitored', owner: 'James Patel', description: 'Vendor self-service portal for questionnaire responses.', openPorts: 2 },
  { id: 'AS-006', name: 'admin.sentinel-grc.com', type: 'Admin Panel', exposure: 'restricted', risk: 'critical', protocol: 'HTTPS', lastScanned: '2026-03-28', status: 'monitored', owner: 'Sarah Chen', description: 'Administrative control panel with elevated privileges.', openPorts: 1 },
  { id: 'AS-007', name: 'cdn.sentinel-grc.com', type: 'CDN', exposure: 'public', risk: 'low', protocol: 'HTTPS', lastScanned: '2026-03-15', status: 'monitored', owner: 'Maria Santos', description: 'Content delivery network for static assets.', openPorts: 1 },
  { id: 'AS-008', name: 'monitoring.sentinel-grc.com', type: 'Monitoring', exposure: 'internal', risk: 'medium', protocol: 'HTTPS', lastScanned: '2026-03-28', status: 'monitored', owner: 'Sarah Chen', description: 'Observability and monitoring dashboard.', openPorts: 2 },
];

// ── Trust Engine Data ──────────────────────────
export interface GuardrailEvent {
  id: string; timestamp: string; agent: string; rule: string; severity: Severity;
  action: 'blocked' | 'warned' | 'allowed' | 'flagged'; latencyMs: number;
  input: string; output: string;
}
export const GUARDRAIL_EVENTS: GuardrailEvent[] = [
  { id: 'GE-001', timestamp: '2026-03-31T14:23:01.234Z', agent: 'ComplianceBot', rule: 'PII Detection', severity: 'high', action: 'blocked', latencyMs: 12, input: 'Customer SSN: 123-45-...', output: '[PII BLOCKED]' },
  { id: 'GE-002', timestamp: '2026-03-31T14:22:58.891Z', agent: 'SupportBot', rule: 'Toxicity Filter', severity: 'medium', action: 'warned', latencyMs: 8, input: 'User complaint with profanity', output: '[FLAGGED — Toxic content]' },
  { id: 'GE-003', timestamp: '2026-03-31T14:22:55.100Z', agent: 'LoanAssistant', rule: 'Hallucination Guard', severity: 'high', action: 'blocked', latencyMs: 22, input: 'Loan terms query', output: '[BLOCKED — Low confidence]' },
  { id: 'GE-004', timestamp: '2026-03-31T14:22:50.445Z', agent: 'DataGuard', rule: 'Data Boundary', severity: 'critical', action: 'blocked', latencyMs: 5, input: 'Export customer records', output: '[DATA BOUNDARY VIOLATION]' },
  { id: 'GE-005', timestamp: '2026-03-31T14:22:45.200Z', agent: 'AnalyticsAI', rule: 'Rate Limiter', severity: 'low', action: 'flagged', latencyMs: 3, input: 'Burst of 50 requests', output: '[RATE LIMIT APPROACHING]' },
  { id: 'GE-006', timestamp: '2026-03-31T14:22:40.100Z', agent: 'RiskAnalyzer', rule: 'Cost Threshold', severity: 'medium', action: 'allowed', latencyMs: 4, input: 'Large context window query', output: '[ALLOWED — within budget]' },
];

export interface TrustPolicy {
  id: string; name: string; type: string; target: string; status: 'active' | 'disabled' | 'testing';
  evaluations: number; trustScore: number; lastEvaluated: string; description: string;
}
export const TRUST_POLICIES: TrustPolicy[] = [
  { id: 'TP-001', name: 'PII Detection & Redaction', type: 'Privacy', target: 'All Agents', status: 'active', evaluations: 12400, trustScore: 98, lastEvaluated: '2026-03-31', description: 'Detect and redact PII in all agent inputs and outputs.' },
  { id: 'TP-002', name: 'Toxicity & Safety Filter', type: 'Safety', target: 'Customer-facing', status: 'active', evaluations: 8900, trustScore: 96, lastEvaluated: '2026-03-31', description: 'Filter toxic, harmful, or inappropriate content.' },
  { id: 'TP-003', name: 'Hallucination Guard', type: 'Accuracy', target: 'LLM Agents', status: 'active', evaluations: 3200, trustScore: 89, lastEvaluated: '2026-03-31', description: 'Confidence-based hallucination detection for LLM outputs.' },
  { id: 'TP-004', name: 'Data Boundary Enforcement', type: 'Security', target: 'All Agents', status: 'active', evaluations: 45200, trustScore: 99, lastEvaluated: '2026-03-31', description: 'Enforce data access boundaries and prevent unauthorized exfiltration.' },
  { id: 'TP-005', name: 'Cost & Rate Limiter', type: 'Governance', target: 'External APIs', status: 'active', evaluations: 24500, trustScore: 94, lastEvaluated: '2026-03-31', description: 'Monitor and limit API costs and request rates per agent.' },
];

// ── Controls ───────────────────────────────────
export interface Control {
  id: string; title: string; framework: string; clause: string; status: ControlStatus;
  score: number; owner: string; evidenceCount: number; lastTested: string;
  description: string; testResult: 'pass' | 'fail' | 'pending';
}
export const CONTROLS: Control[] = [
  { id: 'CTRL-001', title: 'AI System Risk Classification', framework: 'EU AI Act', clause: 'Art. 6', status: 'implemented', score: 95, owner: 'James Patel', evidenceCount: 22, lastTested: '2026-03-15', description: 'Classify all AI systems by risk level per EU AI Act categories.', testResult: 'pass' },
  { id: 'CTRL-002', title: 'Data Governance for AI Training', framework: 'EU AI Act', clause: 'Art. 10', status: 'implemented', score: 88, owner: 'David Kim', evidenceCount: 18, lastTested: '2026-03-10', description: 'Ensure training data quality, relevance, and representativeness.', testResult: 'pass' },
  { id: 'CTRL-003', title: 'Transparency & Documentation', framework: 'EU AI Act', clause: 'Art. 13', status: 'partial', score: 72, owner: 'Raj Gupta', evidenceCount: 15, lastTested: '2026-03-08', description: 'Provide transparent information about AI system capabilities and limitations.', testResult: 'fail' },
  { id: 'CTRL-004', title: 'Human Oversight Mechanisms', framework: 'EU AI Act', clause: 'Art. 14', status: 'implemented', score: 91, owner: 'James Patel', evidenceCount: 31, lastTested: '2026-03-12', description: 'Enable human oversight and intervention in AI-assisted decisions.', testResult: 'pass' },
  { id: 'CTRL-005', title: 'Accuracy & Robustness Testing', framework: 'NIST AI RMF', clause: 'MEASURE 1.1', status: 'implemented', score: 94, owner: 'Maria Santos', evidenceCount: 28, lastTested: '2026-03-20', description: 'Regular accuracy, robustness, and reliability testing of AI models.', testResult: 'pass' },
  { id: 'CTRL-006', title: 'Bias & Fairness Monitoring', framework: 'NIST AI RMF', clause: 'MEASURE 2.6', status: 'partial', score: 68, owner: 'Maria Santos', evidenceCount: 14, lastTested: '2026-03-18', description: 'Continuous monitoring of bias metrics across protected attributes.', testResult: 'fail' },
  { id: 'CTRL-007', title: 'Information Security Controls', framework: 'ISO 27001', clause: 'A.8.1', status: 'implemented', score: 96, owner: 'Sarah Chen', evidenceCount: 42, lastTested: '2026-03-25', description: 'Asset management and information security controls for AI systems.', testResult: 'pass' },
  { id: 'CTRL-008', title: 'Access Control & Authentication', framework: 'ISO 27001', clause: 'A.9.1', status: 'implemented', score: 92, owner: 'Sarah Chen', evidenceCount: 35, lastTested: '2026-03-22', description: 'Role-based access control for AI systems and data.', testResult: 'pass' },
  { id: 'CTRL-009', title: 'Supplier Relationships', framework: 'ISO 27001', clause: 'A.15.2', status: 'partial', score: 74, owner: 'James Patel', evidenceCount: 12, lastTested: '2026-03-05', description: 'Manage security aspects of vendor and supplier relationships.', testResult: 'fail' },
  { id: 'CTRL-010', title: 'Security Operations', framework: 'SOC 2', clause: 'CC6.6', status: 'implemented', score: 90, owner: 'Sarah Chen', evidenceCount: 38, lastTested: '2026-03-28', description: 'Security operations and monitoring for trust service criteria.', testResult: 'pass' },
  { id: 'CTRL-011', title: 'Change Management', framework: 'SOC 2', clause: 'CC8.1', status: 'implemented', score: 87, owner: 'Emma Wilson', evidenceCount: 22, lastTested: '2026-03-15', description: 'Change management procedures for AI system updates.', testResult: 'pass' },
  { id: 'CTRL-012', title: 'Prompt Injection Prevention', framework: 'OWASP LLM', clause: 'LLM01', status: 'partial', score: 65, owner: 'Maria Santos', evidenceCount: 8, lastTested: '2026-03-20', description: 'Prevent prompt injection attacks on LLM-based systems.', testResult: 'fail' },
  { id: 'CTRL-013', title: 'Sensitive Information Disclosure', framework: 'OWASP LLM', clause: 'LLM06', status: 'planned', score: 40, owner: 'Raj Gupta', evidenceCount: 3, lastTested: '', description: 'Prevent LLMs from disclosing sensitive information in outputs.', testResult: 'pending' },
  { id: 'CTRL-014', title: 'Model Inventory & Lifecycle', framework: 'NIST AI RMF', clause: 'GOVERN 1.2', status: 'implemented', score: 93, owner: 'Raj Gupta', evidenceCount: 25, lastTested: '2026-03-18', description: 'Maintain comprehensive inventory of all AI models and lifecycle tracking.', testResult: 'pass' },
  { id: 'CTRL-015', title: 'Automated Decision Rights', framework: 'GDPR', clause: 'Art. 22', status: 'partial', score: 58, owner: 'James Patel', evidenceCount: 9, lastTested: '2026-02-28', description: 'Ensure individual rights around automated decision-making.', testResult: 'fail' },
];

// ── Frameworks ─────────────────────────────────
export interface Framework {
  id: string; name: string; description: string; controlsTotal: number;
  controlsImplemented: number; complianceScore: number; status: string;
  nextAudit: string; category: string;
}
export const FRAMEWORKS: Framework[] = [
  { id: 'FW-001', name: 'ISO/IEC 42001', description: 'AI management system standard for responsible AI development and deployment.', controlsTotal: 58, controlsImplemented: 42, complianceScore: 78, status: 'Partial', nextAudit: '2026-06-15', category: 'AI Governance' },
  { id: 'FW-002', name: 'ISO 27001', description: 'Information security management system standard.', controlsTotal: 93, controlsImplemented: 89, complianceScore: 92, status: 'Compliant', nextAudit: '2026-08-20', category: 'Security' },
  { id: 'FW-003', name: 'SOC 2 Type II', description: 'Trust service criteria for security, availability, processing integrity, confidentiality, and privacy.', controlsTotal: 74, controlsImplemented: 64, complianceScore: 85, status: 'Compliant', nextAudit: '2026-07-10', category: 'Trust' },
  { id: 'FW-004', name: 'EU AI Act', description: 'European Union regulation on artificial intelligence systems.', controlsTotal: 45, controlsImplemented: 29, complianceScore: 65, status: 'Partial', nextAudit: '2026-06-01', category: 'AI Regulation' },
  { id: 'FW-005', name: 'NIST AI RMF', description: 'NIST AI Risk Management Framework for trustworthy AI.', controlsTotal: 48, controlsImplemented: 34, complianceScore: 71, status: 'Partial', nextAudit: '2026-05-15', category: 'Risk Management' },
  { id: 'FW-006', name: 'OWASP LLM Top 10', description: 'Security risks specific to Large Language Model applications.', controlsTotal: 35, controlsImplemented: 20, complianceScore: 58, status: 'Non-Compliant', nextAudit: '2026-04-20', category: 'LLM Security' },
];

// ── Policies ───────────────────────────────────
export interface Policy {
  id: string; title: string; category: string; status: string; version: string;
  owner: string; framework: string; lastReview: string; nextReview: string;
  approver: string; description: string;
}
export const POLICIES: Policy[] = [
  { id: 'POL-001', title: 'AI Acceptable Use Policy', category: 'AI Usage', status: 'published', version: 'v2.1', owner: 'James Patel', framework: 'ISO/IEC 42001', lastReview: '2026-01-20', nextReview: '2026-07-20', approver: 'Sarah Chen', description: 'Defines acceptable use of AI systems across the organization.' },
  { id: 'POL-002', title: 'Model Risk Management Policy', category: 'Risk', status: 'published', version: 'v1.3', owner: 'Raj Gupta', framework: 'NIST AI RMF', lastReview: '2026-02-15', nextReview: '2026-08-15', approver: 'Sarah Chen', description: 'Policy governing AI/ML model risk assessment, validation, and monitoring.' },
  { id: 'POL-003', title: 'Data Privacy for AI Policy', category: 'Data Privacy', status: 'published', version: 'v2.0', owner: 'James Patel', framework: 'GDPR', lastReview: '2026-01-10', nextReview: '2026-07-10', approver: 'Emma Wilson', description: 'Data privacy requirements for AI training data and model outputs.' },
  { id: 'POL-004', title: 'Bias & Fairness Policy', category: 'AI Ethics', status: 'published', version: 'v1.1', owner: 'Maria Santos', framework: 'EU AI Act', lastReview: '2026-03-01', nextReview: '2026-09-01', approver: 'James Patel', description: 'Standards for bias testing, fairness metrics, and remediation procedures.' },
  { id: 'POL-005', title: 'EU AI Act Compliance Framework', category: 'Regulatory', status: 'in_review', version: 'v0.9', owner: 'Emma Wilson', framework: 'EU AI Act', lastReview: '2026-03-15', nextReview: '2026-06-15', approver: '', description: 'Comprehensive framework for EU AI Act compliance. Under review.' },
  { id: 'POL-006', title: 'Third-Party AI Vendor Policy', category: 'Vendor', status: 'published', version: 'v1.0', owner: 'David Kim', framework: 'ISO 27001', lastReview: '2026-02-01', nextReview: '2026-08-01', approver: 'Sarah Chen', description: 'Requirements for third-party AI vendor assessment and ongoing monitoring.' },
  { id: 'POL-007', title: 'AI Incident Response Procedure', category: 'Incident', status: 'published', version: 'v1.2', owner: 'Sarah Chen', framework: 'SOC 2', lastReview: '2026-01-25', nextReview: '2026-07-25', approver: 'James Patel', description: 'Incident response procedures for AI system failures and bias incidents.' },
  { id: 'POL-008', title: 'LLM Security Policy', category: 'Security', status: 'draft', version: 'v0.5', owner: 'Sarah Chen', framework: 'OWASP LLM', lastReview: '', nextReview: '2026-05-01', approver: '', description: 'Security requirements for LLM deployment. Draft in progress.' },
  { id: 'POL-009', title: 'Human Oversight Policy', category: 'AI Governance', status: 'published', version: 'v1.0', owner: 'James Patel', framework: 'EU AI Act', lastReview: '2026-02-20', nextReview: '2026-08-20', approver: 'Emma Wilson', description: 'Requirements for human oversight of high-risk AI systems.' },
  { id: 'POL-010', title: 'AI Model Documentation Standard', category: 'Documentation', status: 'in_review', version: 'v0.8', owner: 'Raj Gupta', framework: 'EU AI Act', lastReview: '2026-03-10', nextReview: '2026-06-10', approver: '', description: 'Model card and technical documentation standards. Under review.' },
  { id: 'POL-011', title: 'Shadow AI Prevention Policy', category: 'Security', status: 'published', version: 'v1.0', owner: 'Sarah Chen', framework: 'ISO 27001', lastReview: '2026-03-05', nextReview: '2026-09-05', approver: 'James Patel', description: 'Controls to detect and prevent unauthorized AI system deployments.' },
  { id: 'POL-012', title: 'AI Data Retention Policy', category: 'Data Privacy', status: 'draft', version: 'v0.3', owner: 'James Patel', framework: 'GDPR', lastReview: '', nextReview: '2026-05-15', approver: '', description: 'Data retention and deletion requirements for AI training data. Early draft.' },
];

// ── HITL Reviews ───────────────────────────────
export interface HITLReview {
  id: string; modelId: string; modelName: string; type: string; trigger: string;
  priority: Severity; status: string; assignee: string; sla: string;
  riskScore: number; createdDate: string; description: string;
}
export const HITL_REVIEWS: HITLReview[] = [
  { id: 'HITL-001', modelId: 'MDL-004', modelName: 'Loan Approval Assistant', type: 'Bias Review', trigger: 'Automated bias detection', priority: 'critical', status: 'pending', assignee: 'Maria Santos', sla: '4h remaining', riskScore: 94, createdDate: '2026-03-31', description: 'Critical bias threshold exceeded on gender dimension.' },
  { id: 'HITL-002', modelId: 'MDL-001', modelName: 'Credit Risk Scorer', type: 'Fairness Audit', trigger: 'Quarterly scheduled', priority: 'high', status: 'in_review', assignee: 'Raj Gupta', sla: '12h remaining', riskScore: 82, createdDate: '2026-03-30', description: 'Quarterly fairness audit review for high-risk credit model.' },
  { id: 'HITL-003', modelId: 'MDL-002', modelName: 'Fraud Detection Engine', type: 'False Positive', trigger: 'Alert threshold', priority: 'medium', status: 'in_review', assignee: 'David Kim', sla: '24h remaining', riskScore: 65, createdDate: '2026-03-29', description: 'False positive rate exceeded 5% threshold for 3 consecutive days.' },
  { id: 'HITL-004', modelId: 'MDL-002', modelName: 'Fraud Detection Engine', type: 'Model Update', trigger: 'Version deployment', priority: 'medium', status: 'approved', assignee: 'Emma Wilson', sla: 'Completed', riskScore: 45, createdDate: '2026-03-28', description: 'Pre-deployment review for Fraud Detection Engine v2.1 update.' },
  { id: 'HITL-005', modelId: 'MDL-003', modelName: 'Churn Predictor', type: 'Drift Review', trigger: 'Drift monitor alert', priority: 'low', status: 'pending', assignee: 'Maria Santos', sla: '48h remaining', riskScore: 38, createdDate: '2026-03-27', description: 'Minor input distribution drift detected in customer features.' },
  { id: 'HITL-006', modelId: 'MDL-004', modelName: 'Loan Approval Assistant', type: 'Regulatory', trigger: 'Compliance flag', priority: 'critical', status: 'escalated', assignee: 'James Patel', sla: 'Overdue', riskScore: 91, createdDate: '2026-03-26', description: 'EU AI Act compliance gap requires immediate human review.' },
  { id: 'HITL-007', modelId: 'MDL-005', modelName: 'AML Transaction Monitor', type: 'Threshold Review', trigger: 'Performance alert', priority: 'high', status: 'pending', assignee: 'David Kim', sla: '8h remaining', riskScore: 71, createdDate: '2026-03-25', description: 'SAR filing threshold review requested by compliance.' },
  { id: 'HITL-008', modelId: 'MDL-006', modelName: 'Customer Sentiment Analyzer', type: 'Quality Check', trigger: 'Scheduled QA', priority: 'low', status: 'approved', assignee: 'Emma Wilson', sla: 'Completed', riskScore: 22, createdDate: '2026-03-24', description: 'Routine quality assurance check. All metrics within bounds.' },
];

// ── Regulatory Radar ───────────────────────────
export interface Regulation {
  id: string; name: string; jurisdiction: string; impact: Severity;
  effectiveDate: string; status: string; description: string;
  actionItems: string[]; daysUntilEffective: number;
}
export const REGULATIONS: Regulation[] = [
  { id: 'REG-001', name: 'EU AI Act — Full Enforcement', jurisdiction: 'EU', impact: 'critical', effectiveDate: '2026-08-01', status: 'preparing', description: 'Full enforcement of EU AI Act including high-risk AI system requirements.', actionItems: ['Complete Article 11 documentation', 'Implement Article 14 human oversight', 'Register high-risk systems'], daysUntilEffective: 118 },
  { id: 'REG-002', name: 'Colorado AI Act SB 205', jurisdiction: 'US-CO', impact: 'high', effectiveDate: '2026-02-01', status: 'effective', description: 'Colorado law requiring algorithmic impact assessments for consequential AI decisions.', actionItems: ['Complete impact assessment for MDL-001', 'File required disclosures', 'Update consumer notification'], daysUntilEffective: -63 },
  { id: 'REG-003', name: 'Singapore AI Verify Framework', jurisdiction: 'SG', impact: 'medium', effectiveDate: '2026-03-01', status: 'effective', description: 'Voluntary AI governance testing framework by IMDA.', actionItems: ['Complete AI Verify assessment', 'Submit governance report'], daysUntilEffective: -35 },
  { id: 'REG-004', name: 'ISO/IEC 42001 Certification Deadline', jurisdiction: 'International', impact: 'high', effectiveDate: '2026-06-15', status: 'preparing', description: 'Internal deadline for ISO/IEC 42001 AI Management System certification.', actionItems: ['Complete gap analysis', 'Remediate open findings', 'Schedule certification audit'], daysUntilEffective: 71 },
  { id: 'REG-005', name: 'NIST AI RMF 2.0 Update', jurisdiction: 'US', impact: 'medium', effectiveDate: '2026-07-01', status: 'monitoring', description: 'Updated NIST AI Risk Management Framework with new measurement guidance.', actionItems: ['Review updated framework', 'Map to existing controls', 'Update risk assessment methodology'], daysUntilEffective: 87 },
];

// ── Gap Analysis ───────────────────────────────
export interface Gap {
  id: string; title: string; framework: string; controlRef: string; severity: Severity;
  progress: number; dueDate: string; owner: string; description: string;
}
export const GAPS: Gap[] = [
  { id: 'GAP-001', title: 'Risk assessment not updated for LLM deployment scenarios', framework: 'EU AI Act', controlRef: 'Art. 9', severity: 'critical', progress: 25, dueDate: '2026-04-30', owner: 'Raj Gupta', description: 'Current risk assessment methodology does not adequately cover LLM-specific risks.' },
  { id: 'GAP-002', title: 'Model transparency documentation incomplete for high-risk systems', framework: 'EU AI Act', controlRef: 'Art. 13', severity: 'critical', progress: 40, dueDate: '2026-05-15', owner: 'Raj Gupta', description: 'Technical documentation does not meet Article 13 transparency requirements.' },
  { id: 'GAP-003', title: 'Automated decision explainability gap — GDPR Art. 22', framework: 'GDPR', controlRef: 'Art. 22', severity: 'high', progress: 15, dueDate: '2026-04-20', owner: 'James Patel', description: 'No meaningful explanation provided for automated credit decisions.' },
  { id: 'GAP-004', title: 'Training data governance for bias prevention', framework: 'EU AI Act', controlRef: 'Art. 10', severity: 'high', progress: 55, dueDate: '2026-05-01', owner: 'David Kim', description: 'Data governance procedures do not adequately address representativeness requirements.' },
  { id: 'GAP-005', title: 'Vendor AI processing agreements need DPA updates', framework: 'GDPR', controlRef: 'Art. 28', severity: 'critical', progress: 10, dueDate: '2026-04-15', owner: 'James Patel', description: 'DPA with OpenAI expired. Other vendor DPAs need AI-specific clauses.' },
  { id: 'GAP-006', title: 'Incident response procedure lacks AI-specific playbooks', framework: 'SOC 2', controlRef: 'CC7.3', severity: 'high', progress: 60, dueDate: '2026-05-10', owner: 'Sarah Chen', description: 'Incident response does not cover AI-specific scenarios like bias incidents.' },
  { id: 'GAP-007', title: 'LLM prompt injection testing not formalized', framework: 'OWASP LLM', controlRef: 'LLM01', severity: 'high', progress: 30, dueDate: '2026-04-25', owner: 'Maria Santos', description: 'No formal process for regular prompt injection testing of LLM systems.' },
  { id: 'GAP-008', title: 'Human oversight mechanisms need expansion', framework: 'EU AI Act', controlRef: 'Art. 14', severity: 'medium', progress: 70, dueDate: '2026-05-20', owner: 'James Patel', description: 'Human oversight currently only covers credit decisions. Needs expansion to all high-risk uses.' },
  { id: 'GAP-009', title: 'Model inventory lacks lifecycle tracking', framework: 'NIST AI RMF', controlRef: 'GOVERN 1.2', severity: 'medium', progress: 45, dueDate: '2026-05-01', owner: 'Raj Gupta', description: 'Model lifecycle phases not systematically tracked from development to retirement.' },
  { id: 'GAP-010', title: 'Shadow AI detection needs automated monitoring', framework: 'ISO 27001', controlRef: 'A.8.1', severity: 'high', progress: 20, dueDate: '2026-04-30', owner: 'Sarah Chen', description: 'Current shadow AI detection is manual. Need automated network scanning.' },
];

// ── Helpers ────────────────────────────────────
export const severityColor = (s: Severity) => ({
  critical: { bg: 'hsl(var(--r-cr-bg))', text: 'hsl(var(--r-cr-tx))', border: 'hsl(var(--r-cr-br))' },
  high:     { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', border: 'hsl(var(--r-hi-br))' },
  medium:   { bg: 'hsl(var(--r-md-bg))', text: 'hsl(var(--r-md-tx))', border: 'hsl(var(--r-md-br))' },
  low:      { bg: 'hsl(var(--r-lo-bg))', text: 'hsl(var(--r-lo-tx))', border: 'hsl(var(--r-lo-br))' },
}[s]);

export const statusColor = (s: string) => {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    production: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    staging: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    development: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    retired: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    active: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    approved: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    compliant: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    open: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    in_review: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    in_progress: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    investigating: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    mitigating: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    mitigated: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    resolved: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    pending: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    synced: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    expired: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    failed: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    passed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    blocked: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    high_risk: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    shadow: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    confirmed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    draft: { bg: 'hsl(var(--s-nt-bg))', text: 'hsl(var(--s-nt-tx))', border: 'hsl(var(--s-nt-br))' },
    published: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    implemented: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    partial: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    planned: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    completed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    scheduled: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    running: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    quarantined: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    disabled: { bg: 'hsl(var(--s-nt-bg))', text: 'hsl(var(--s-nt-tx))', border: 'hsl(var(--s-nt-br))' },
    testing: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
    escalated: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    patched: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    not_signed: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    signed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    remediation_required: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    accepted: { bg: 'hsl(var(--s-nt-bg))', text: 'hsl(var(--s-nt-tx))', border: 'hsl(var(--s-nt-br))' },
  };
  const key = s.toLowerCase().replace(/ /g, '_');
  return map[key] || { bg: 'hsl(var(--s-nt-bg))', text: 'hsl(var(--s-nt-tx))', border: 'hsl(var(--s-nt-br))' };
};

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return n.toString();
};

export const formatDate = (d: string): string => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const timeAgo = (isoDate: string): string => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── HITL Items (HT-IDs for Review Center) ──────
export type HITLStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'info_requested';
export interface HITLItem {
  id: string; entityType: 'model' | 'agent' | 'dataset' | 'vendor' | 'incident';
  entityId: string; entityName: string; triggerReason: string;
  assignedTo: string; slaDeadline: string; priority: Severity;
  status: HITLStatus; remarks: string; overdue: boolean;
  createdDate: string; history: { date: string; action: string; by: string }[];
}
export const HITL_ITEMS: HITLItem[] = [
  { id: 'HT-001', entityType: 'model', entityId: 'MDL-004', entityName: 'Loan Approval Assistant', triggerReason: 'Critical bias threshold exceeded — Gender Parity 0.72 < 0.85', assignedTo: 'Maria Santos', slaDeadline: '2026-04-06T18:00:00Z', priority: 'critical', status: 'pending', remarks: '', overdue: false, createdDate: '2026-04-06T08:00:00Z', history: [{ date: '2026-04-06T08:00:00Z', action: 'Review queued — automated bias detection trigger', by: 'System' }] },
  { id: 'HT-002', entityType: 'model', entityId: 'MDL-001', entityName: 'Credit Risk Scorer', triggerReason: 'Quarterly fairness audit — scheduled review', assignedTo: 'Raj Gupta', slaDeadline: '2026-04-05T12:00:00Z', priority: 'high', status: 'pending', remarks: '', overdue: true, createdDate: '2026-04-04T09:00:00Z', history: [{ date: '2026-04-04T09:00:00Z', action: 'Quarterly audit scheduled', by: 'System' }] },
  { id: 'HT-003', entityType: 'agent', entityId: 'AGT-010', entityName: 'LangChain-Marketing', triggerReason: 'Shadow AI detected — unauthorized agent accessing customer PII', assignedTo: 'Sarah Chen', slaDeadline: '2026-04-06T20:00:00Z', priority: 'critical', status: 'pending', remarks: '', overdue: false, createdDate: '2026-04-06T10:00:00Z', history: [{ date: '2026-04-06T10:00:00Z', action: 'Shadow AI flagged for review', by: 'System' }] },
  { id: 'HT-004', entityType: 'incident', entityId: 'INC-005', entityName: 'LLM Hallucination — Loan Terms', triggerReason: 'Open hallucination incident requires HITL validation', assignedTo: 'James Patel', slaDeadline: '2026-04-04T10:00:00Z', priority: 'high', status: 'pending', remarks: '', overdue: true, createdDate: '2026-04-03T14:00:00Z', history: [{ date: '2026-04-03T14:00:00Z', action: 'Incident escalated to HITL queue', by: 'David Kim' }] },
  { id: 'HT-005', entityType: 'model', entityId: 'MDL-002', entityName: 'Fraud Detection Engine', triggerReason: 'Pre-deployment review for v2.1 update', assignedTo: 'Emma Wilson', slaDeadline: '2026-04-07T16:00:00Z', priority: 'medium', status: 'approved', remarks: 'All metrics within bounds. Approved for production deployment.', overdue: false, createdDate: '2026-04-05T11:00:00Z', history: [{ date: '2026-04-05T11:00:00Z', action: 'Deployment review requested', by: 'Maria Santos' }, { date: '2026-04-06T09:00:00Z', action: 'Approved — all checks passed', by: 'Emma Wilson' }] },
  { id: 'HT-006', entityType: 'dataset', entityId: 'DS-007', entityName: 'Employee HR Records 2023', triggerReason: 'PII dataset used in model training — ethical review required', assignedTo: 'David Kim', slaDeadline: '2026-04-08T12:00:00Z', priority: 'medium', status: 'pending', remarks: '', overdue: false, createdDate: '2026-04-05T16:00:00Z', history: [{ date: '2026-04-05T16:00:00Z', action: 'Ethical review requested for PII training data', by: 'Raj Gupta' }] },
];

// ── Fallback Log ───────────────────────────────
export interface FallbackEntry {
  id: string; agent: string; trigger: string; modelChain: string;
  latencyMs: number; tokens: number; status: 'success' | 'failed'; timestamp: string;
}
export const FALLBACK_LOG: FallbackEntry[] = [
  { id: 'FB-001', agent: 'RiskAnalyzer', trigger: 'Rate limit exceeded', modelChain: 'GPT-4o → Claude-3-Haiku', latencyMs: 1200, tokens: 2400, status: 'success', timestamp: '2026-04-05T14:10:00Z' },
  { id: 'FB-002', agent: 'LoanAssistant', trigger: '30s timeout', modelChain: 'GPT-4o → GPT-3.5-Turbo', latencyMs: 31200, tokens: 1800, status: 'success', timestamp: '2026-04-05T13:45:00Z' },
  { id: 'FB-003', agent: 'ComplianceBot', trigger: '503 API error', modelChain: 'Claude-3-Opus → Claude-3-Sonnet', latencyMs: 892, tokens: 3100, status: 'success', timestamp: '2026-04-05T12:30:00Z' },
  { id: 'FB-004', agent: 'DataLabeler-v2', trigger: 'Cost limit exceeded', modelChain: 'GPT-4o → Mistral-7B', latencyMs: 445, tokens: 0, status: 'failed', timestamp: '2026-04-05T11:20:00Z' },
  { id: 'FB-005', agent: 'SupportBot', trigger: 'Context window exceeded', modelChain: 'Claude-3-Opus → GPT-4o-Mini', latencyMs: 678, tokens: 4200, status: 'success', timestamp: '2026-04-05T10:05:00Z' },
];

// ── Traces ─────────────────────────────────────
export interface Trace {
  id: string; timestamp: string; agent: string; model: string;
  status: 'success' | 'blocked' | 'fallback'; action: string;
  latencyMs: number; tokens: number; policyEvaluated: string;
}
export const TRACES: Trace[] = [
  { id: 'TR-001', timestamp: '2026-04-05T14:23:01Z', agent: 'ComplianceBot', model: 'Internal', status: 'blocked', action: 'PII Redaction', latencyMs: 12, tokens: 0, policyEvaluated: 'TP-001' },
  { id: 'TR-002', timestamp: '2026-04-05T14:22:58Z', agent: 'LoanAssistant', model: 'GPT-4o', status: 'blocked', action: 'PII Redaction', latencyMs: 8, tokens: 0, policyEvaluated: 'TP-001' },
  { id: 'TR-003', timestamp: '2026-04-05T14:22:55Z', agent: 'SupportBot', model: 'Claude-3', status: 'success', action: 'Toxicity Filter', latencyMs: 245, tokens: 1200, policyEvaluated: 'TP-002' },
  { id: 'TR-004', timestamp: '2026-04-05T14:22:50Z', agent: 'RiskAnalyzer', model: 'GPT-4o', status: 'success', action: 'Cost Check', latencyMs: 1240, tokens: 3400, policyEvaluated: 'TP-005' },
  { id: 'TR-005', timestamp: '2026-04-05T14:22:45Z', agent: 'LoanAssistant', model: 'GPT-4o', status: 'blocked', action: 'Hallucination Guard', latencyMs: 22, tokens: 0, policyEvaluated: 'TP-003' },
  { id: 'TR-006', timestamp: '2026-04-05T14:22:40Z', agent: 'DataLabeler-v2', model: 'Claude-3', status: 'success', action: 'Data Boundary', latencyMs: 890, tokens: 5200, policyEvaluated: 'TP-004' },
  { id: 'TR-007', timestamp: '2026-04-05T14:22:35Z', agent: 'FraudAlert-Watcher', model: 'N/A', status: 'blocked', action: 'Data Boundary', latencyMs: 5, tokens: 0, policyEvaluated: 'TP-004' },
  { id: 'TR-008', timestamp: '2026-04-05T14:22:30Z', agent: 'AnalyticsAI', model: 'GPT-4o', status: 'success', action: 'Rate Limiter', latencyMs: 430, tokens: 2100, policyEvaluated: 'TP-005' },
  { id: 'TR-009', timestamp: '2026-04-05T14:22:25Z', agent: 'ComplianceBot', model: 'Internal', status: 'success', action: 'Policy Check', latencyMs: 142, tokens: 800, policyEvaluated: 'TP-004' },
  { id: 'TR-010', timestamp: '2026-04-05T14:22:20Z', agent: 'SupportBot', model: 'Claude-3', status: 'fallback', action: 'Context Overflow', latencyMs: 678, tokens: 4200, policyEvaluated: 'TP-005' },
];
