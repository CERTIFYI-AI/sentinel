// ─────────────────────────────────────────────────────────────────────────────
// Sentinel AI GRC Platform — Extended Seed Data
// Enterprise-grade data for Import Sample Data, fallback mock, and demo mode
// Covers all snake_case table modules not in seed.ts
// Company: Acme Financial Corp (Fortune 500 Financial Services)
// All IDs are deterministic for consistent cross-references
// ─────────────────────────────────────────────────────────────────────────────

// ── Additional Users ──────────────────────────────────────────────────────────

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  created_at: string;
}

export const SEED_USERS: SeedUser[] = [
  {
    id: 'U-007',
    name: 'Priya Patel',
    email: 'priya.patel@sentinel-grc.com',
    role: 'Security Engineer',
    department: 'Security',
    avatar: 'PP',
    created_at: '2025-06-15T09:00:00Z',
  },
  {
    id: 'U-008',
    name: 'Mike Johnson',
    email: 'mike.johnson@sentinel-grc.com',
    role: 'DevOps Lead',
    department: 'Engineering',
    avatar: 'MJ',
    created_at: '2025-07-01T09:00:00Z',
  },
];

// ── Audits ────────────────────────────────────────────────────────────────────

export interface SeedAudit {
  id: string;
  title: string;
  type: string;
  framework: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  lead_auditor: string;
  start_date: string;
  end_date: string;
  scope: string;
  findings_count: number;
  critical_findings: number;
  created_at: string;
  updated_at: string;
}

export const SEED_AUDITS: SeedAudit[] = [
  {
    id: 'AUD-001',
    title: 'ISO 27001 Annual Surveillance Audit',
    type: 'External',
    framework: 'ISO 27001',
    status: 'completed',
    lead_auditor: 'U-005',
    start_date: '2025-10-01',
    end_date: '2025-10-15',
    scope: 'Full ISMS scope including AI system controls, data center operations, and vendor management processes.',
    findings_count: 4,
    critical_findings: 0,
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2025-10-16T14:00:00Z',
  },
  {
    id: 'AUD-002',
    title: 'SOC 2 Type II Readiness Assessment',
    type: 'Internal',
    framework: 'SOC 2',
    status: 'in_progress',
    lead_auditor: 'U-005',
    start_date: '2026-01-15',
    end_date: '2026-03-30',
    scope: 'Readiness assessment for SOC 2 Type II covering Security, Availability, and Confidentiality trust service criteria.',
    findings_count: 6,
    critical_findings: 1,
    created_at: '2025-12-20T09:00:00Z',
    updated_at: '2026-03-15T11:30:00Z',
  },
  {
    id: 'AUD-003',
    title: 'EU AI Act Conformity Pre-Assessment',
    type: 'External',
    framework: 'EU AI Act',
    status: 'in_progress',
    lead_auditor: 'U-002',
    start_date: '2026-02-01',
    end_date: '2026-04-30',
    scope: 'Conformity assessment for all high-risk AI systems under Annex III classification including credit scoring, fraud detection, and AML monitoring.',
    findings_count: 8,
    critical_findings: 3,
    created_at: '2026-01-10T08:00:00Z',
    updated_at: '2026-03-28T16:00:00Z',
  },
  {
    id: 'AUD-004',
    title: 'NIST AI RMF Gap Analysis',
    type: 'Internal',
    framework: 'NIST AI RMF',
    status: 'completed',
    lead_auditor: 'U-006',
    start_date: '2025-11-01',
    end_date: '2025-12-15',
    scope: 'Gap analysis against NIST AI Risk Management Framework covering Govern, Map, Measure, and Manage functions.',
    findings_count: 10,
    critical_findings: 2,
    created_at: '2025-10-15T10:00:00Z',
    updated_at: '2025-12-16T09:00:00Z',
  },
  {
    id: 'AUD-005',
    title: 'GDPR Data Protection Assessment',
    type: 'External',
    framework: 'GDPR',
    status: 'completed',
    lead_auditor: 'U-002',
    start_date: '2025-08-01',
    end_date: '2025-09-15',
    scope: 'Assessment of GDPR compliance for AI-driven automated decision-making, data processing agreements, and cross-border data transfers.',
    findings_count: 5,
    critical_findings: 1,
    created_at: '2025-07-15T08:00:00Z',
    updated_at: '2025-09-16T14:00:00Z',
  },
  {
    id: 'AUD-006',
    title: 'Internal AI Ethics Audit',
    type: 'Internal',
    framework: 'ISO/IEC 42001',
    status: 'planned',
    lead_auditor: 'U-005',
    start_date: '2026-05-01',
    end_date: '2026-06-15',
    scope: 'Internal audit of AI ethics practices, fairness testing procedures, bias remediation, and human oversight implementation across all production AI systems.',
    findings_count: 0,
    critical_findings: 0,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
];

// ── Audit Findings ────────────────────────────────────────────────────────────

export interface SeedAuditFinding {
  id: string;
  audit_id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_remediation' | 'remediated' | 'accepted' | 'closed';
  control_ref: string;
  description: string;
  recommendation: string;
  owner: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export const SEED_AUDIT_FINDINGS: SeedAuditFinding[] = [
  {
    id: 'AF-001',
    audit_id: 'AUD-001',
    title: 'Incomplete asset inventory for AI model endpoints',
    severity: 'medium',
    status: 'remediated',
    control_ref: 'ISO 27001 A.8.1',
    description: 'The AI system asset inventory does not include all model inference endpoints and associated data stores. Three production endpoints were discovered outside the CMDB.',
    recommendation: 'Extend CMDB to include all model inference endpoints. Implement automated discovery scanning for ML infrastructure.',
    owner: 'U-001',
    due_date: '2025-11-30',
    created_at: '2025-10-10T09:00:00Z',
    updated_at: '2025-11-25T14:00:00Z',
  },
  {
    id: 'AF-002',
    audit_id: 'AUD-001',
    title: 'Insufficient logging of model prediction requests',
    severity: 'medium',
    status: 'remediated',
    control_ref: 'ISO 27001 A.12.4',
    description: 'Model inference logs do not capture sufficient detail for forensic analysis. Missing fields include input feature hashes, model version, and confidence scores.',
    recommendation: 'Enhance inference logging to include all fields required by the AI Audit Trail Policy. Minimum 12-month retention.',
    owner: 'U-008',
    due_date: '2025-12-15',
    created_at: '2025-10-10T09:30:00Z',
    updated_at: '2025-12-10T16:00:00Z',
  },
  {
    id: 'AF-003',
    audit_id: 'AUD-001',
    title: 'Access reviews for model training data not performed quarterly',
    severity: 'low',
    status: 'closed',
    control_ref: 'ISO 27001 A.9.2',
    description: 'Access reviews for restricted training datasets (DS-001, DS-005, DS-007) were conducted semi-annually rather than quarterly as required by policy.',
    recommendation: 'Implement automated quarterly access review workflow for all restricted datasets. Integrate with IAM tooling.',
    owner: 'U-001',
    due_date: '2025-11-15',
    created_at: '2025-10-12T10:00:00Z',
    updated_at: '2025-11-10T11:00:00Z',
  },
  {
    id: 'AF-004',
    audit_id: 'AUD-001',
    title: 'Vendor risk assessment for Pinecone incomplete',
    severity: 'low',
    status: 'closed',
    control_ref: 'ISO 27001 A.15.2',
    description: 'Vendor risk assessment for Pinecone (V-004) is missing data residency verification and sub-processor audit documentation.',
    recommendation: 'Complete vendor risk assessment with data residency confirmation. Obtain sub-processor list and audit reports.',
    owner: 'U-002',
    due_date: '2025-12-01',
    created_at: '2025-10-13T08:00:00Z',
    updated_at: '2025-11-28T15:00:00Z',
  },
  {
    id: 'AF-005',
    audit_id: 'AUD-002',
    title: 'Change management process lacks AI model-specific gates',
    severity: 'high',
    status: 'in_remediation',
    control_ref: 'SOC 2 CC8.1',
    description: 'The change management process does not include AI-specific gates for bias testing, fairness validation, and explainability review before model promotion to production.',
    recommendation: 'Add mandatory pre-production gates: bias audit sign-off, fairness threshold validation, and explainability report generation.',
    owner: 'U-006',
    due_date: '2026-04-15',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'AF-006',
    audit_id: 'AUD-002',
    title: 'Critical: DPA with OpenAI expired for 3 months',
    severity: 'critical',
    status: 'in_remediation',
    control_ref: 'SOC 2 CC6.1',
    description: 'Data Processing Agreement with OpenAI (V-001) expired on 2025-12-01 and has not been renewed. EU citizen data continues to be processed without valid DPA.',
    recommendation: 'Immediately suspend EU data processing via OpenAI APIs. Negotiate and execute renewed DPA with EU AI Act-compliant clauses.',
    owner: 'U-002',
    due_date: '2026-03-31',
    created_at: '2026-02-05T09:00:00Z',
    updated_at: '2026-03-25T11:00:00Z',
  },
  {
    id: 'AF-007',
    audit_id: 'AUD-003',
    title: 'Article 10 data governance non-compliance for Credit Risk Scorer',
    severity: 'critical',
    status: 'open',
    control_ref: 'EU AI Act Art. 10',
    description: 'Credit Risk Scorer (MDL-001) training data does not meet Article 10 requirements for representativeness, completeness, and bias examination.',
    recommendation: 'Conduct comprehensive data quality assessment. Document statistical properties, known biases, and representativeness gaps per Art. 10(2).',
    owner: 'U-003',
    due_date: '2026-05-15',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
  },
  {
    id: 'AF-008',
    audit_id: 'AUD-003',
    title: 'Article 13 transparency documentation missing for 3 high-risk models',
    severity: 'critical',
    status: 'open',
    control_ref: 'EU AI Act Art. 13',
    description: 'Models MDL-001, MDL-004, and MDL-005 lack the transparency documentation required by Article 13, including user-facing instructions and known limitations.',
    recommendation: 'Create conformity documentation packages for each high-risk model covering capabilities, limitations, and intended use per Art. 13(3).',
    owner: 'U-006',
    due_date: '2026-05-30',
    created_at: '2026-02-20T11:00:00Z',
    updated_at: '2026-03-28T10:00:00Z',
  },
  {
    id: 'AF-009',
    audit_id: 'AUD-003',
    title: 'Article 14 human oversight mechanisms insufficient for Loan Assistant',
    severity: 'high',
    status: 'in_remediation',
    control_ref: 'EU AI Act Art. 14',
    description: 'Loan Approval Assistant (MDL-004) human oversight mechanisms do not provide operators with sufficient tools to understand, monitor, and intervene in automated decisions.',
    recommendation: 'Implement real-time decision explanation interface, operator override controls, and mandatory human review for decisions exceeding risk thresholds.',
    owner: 'U-002',
    due_date: '2026-05-01',
    created_at: '2026-02-25T09:00:00Z',
    updated_at: '2026-03-25T15:00:00Z',
  },
  {
    id: 'AF-010',
    audit_id: 'AUD-004',
    title: 'GOVERN function: AI governance roles not formally defined',
    severity: 'high',
    status: 'remediated',
    control_ref: 'NIST AI RMF GOVERN 1.2',
    description: 'Organizational roles and responsibilities for AI risk management are not formally defined in governance documentation. RACI matrix is outdated.',
    recommendation: 'Update RACI matrix for AI governance. Define clear accountability for model risk owners, validators, and oversight committees.',
    owner: 'U-002',
    due_date: '2026-01-31',
    created_at: '2025-11-15T10:00:00Z',
    updated_at: '2026-01-28T14:00:00Z',
  },
  {
    id: 'AF-011',
    audit_id: 'AUD-004',
    title: 'MEASURE function: Bias measurement methodology not standardized',
    severity: 'critical',
    status: 'in_remediation',
    control_ref: 'NIST AI RMF MEASURE 2.6',
    description: 'Different teams use inconsistent bias measurement methodologies. No standardized thresholds, metrics, or reporting formats across models.',
    recommendation: 'Establish organization-wide bias measurement standard. Define minimum metrics (DI ratio, SPD, EOpp), thresholds, and reporting templates.',
    owner: 'U-003',
    due_date: '2026-03-31',
    created_at: '2025-11-20T09:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'AF-012',
    audit_id: 'AUD-005',
    title: 'GDPR Art. 22 automated decision-making rights not communicated',
    severity: 'high',
    status: 'in_remediation',
    control_ref: 'GDPR Art. 22',
    description: 'Customers subject to automated credit decisions by MDL-001 are not informed of their right to contest the decision and request human review per GDPR Art. 22(3).',
    recommendation: 'Implement mandatory disclosure in credit decision notifications. Add mechanism for customers to request human review within 30 days.',
    owner: 'U-002',
    due_date: '2026-02-28',
    created_at: '2025-08-20T10:00:00Z',
    updated_at: '2026-02-15T09:00:00Z',
  },
];

// ── AI Impact Assessments ─────────────────────────────────────────────────────

export interface SeedAIIA {
  id: string;
  title: string;
  type: 'AIIA' | 'DPIA' | 'Combined';
  model_id: string;
  status: 'draft' | 'in_review' | 'approved' | 'requires_update' | 'completed';
  risk_level: 'high' | 'limited' | 'minimal' | 'unacceptable';
  assessor: string;
  reviewer: string;
  framework: string;
  scope: string;
  impact_summary: string;
  mitigation_measures: string[];
  start_date: string;
  completion_date: string;
  next_review: string;
  created_at: string;
  updated_at: string;
}

export const SEED_AI_IMPACT_ASSESSMENTS: SeedAIIA[] = [
  {
    id: 'AIIA-001',
    title: 'Credit Risk Scorer High-Risk AIIA',
    type: 'Combined',
    model_id: 'MDL-001',
    status: 'requires_update',
    risk_level: 'high',
    assessor: 'U-006',
    reviewer: 'U-002',
    framework: 'EU AI Act',
    scope: 'Comprehensive impact assessment for consumer credit scoring model deployed across retail banking division. Covers bias, fairness, transparency, and human oversight requirements.',
    impact_summary: 'High impact on individuals due to automated credit decisions affecting financial access. Geographic proxy bias identified as primary concern. Disproportionate impact on lower-income postal codes.',
    mitigation_measures: [
      'Remove geographic proxy features from model input',
      'Implement adversarial debiasing in training pipeline',
      'Mandate human review for all adverse decisions',
      'Quarterly bias audit with external validator',
    ],
    start_date: '2025-09-01',
    completion_date: '2025-11-15',
    next_review: '2026-05-15',
    created_at: '2025-09-01T08:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'AIIA-002',
    title: 'Fraud Detection Engine Impact Assessment',
    type: 'AIIA',
    model_id: 'MDL-002',
    status: 'completed',
    risk_level: 'high',
    assessor: 'U-004',
    reviewer: 'U-005',
    framework: 'NIST AI RMF',
    scope: 'Assessment of fraud detection system impact on transaction processing, customer experience, and potential for false positive discrimination.',
    impact_summary: 'Moderate impact on individuals through false positive transaction blocks. No significant fairness concerns identified. Latency impact during peak periods documented.',
    mitigation_measures: [
      'Maintain false positive rate below 2% threshold',
      'Implement real-time customer notification for blocked transactions',
      'Provide instant appeal mechanism via mobile app',
      'Monthly false positive disparity analysis by demographic segment',
    ],
    start_date: '2025-07-01',
    completion_date: '2025-08-30',
    next_review: '2026-08-30',
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2025-08-30T16:00:00Z',
  },
  {
    id: 'AIIA-003',
    title: 'Loan Approval Assistant DPIA',
    type: 'DPIA',
    model_id: 'MDL-004',
    status: 'in_review',
    risk_level: 'high',
    assessor: 'U-006',
    reviewer: 'U-002',
    framework: 'GDPR',
    scope: 'Data Protection Impact Assessment for LLM-based loan approval reasoning system processing personal financial data, employment history, and credit bureau records.',
    impact_summary: 'Very high impact due to automated processing of sensitive financial data for credit decisions. LLM hallucination risk creates additional concern for accuracy of decision reasoning. Multiple bias dimensions failing thresholds.',
    mitigation_measures: [
      'Implement mandatory human review for all LLM-generated decisions',
      'Deploy hallucination detection guardrails with 0.8 confidence threshold',
      'Add GDPR Art. 22 rights notification to all decision outputs',
      'Conduct quarterly bias audit across all protected attributes',
      'Maintain decision audit trail with full explainability',
    ],
    start_date: '2026-01-15',
    completion_date: '',
    next_review: '2026-07-15',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-03-25T11:00:00Z',
  },
  {
    id: 'AIIA-004',
    title: 'AML Transaction Monitor Regulatory AIIA',
    type: 'Combined',
    model_id: 'MDL-005',
    status: 'completed',
    risk_level: 'high',
    assessor: 'U-004',
    reviewer: 'U-002',
    framework: 'EU AI Act',
    scope: 'Assessment of AML monitoring system under EU AI Act Annex III classification. Includes data governance, bias testing, and regulatory reporting impact.',
    impact_summary: 'High risk classification under Annex III 5(a). System operates within acceptable fairness thresholds. Primary concern is false positive rate impact on legitimate customer transactions.',
    mitigation_measures: [
      'Implement two-tier review process for suspicious activity reports',
      'Maintain geographic fairness metrics above 0.85 threshold',
      'Quarterly model recalibration based on false positive feedback',
      'Annual independent validation by external auditor',
    ],
    start_date: '2025-10-01',
    completion_date: '2025-12-01',
    next_review: '2026-06-01',
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2025-12-01T14:00:00Z',
  },
  {
    id: 'AIIA-005',
    title: 'Churn Predictor Limited Risk Assessment',
    type: 'AIIA',
    model_id: 'MDL-003',
    status: 'approved',
    risk_level: 'limited',
    assessor: 'U-003',
    reviewer: 'U-006',
    framework: 'NIST AI RMF',
    scope: 'Impact assessment for customer churn prediction model used for proactive retention campaigns. Limited risk classification under EU AI Act transparency obligations.',
    impact_summary: 'Limited impact on individuals. Model outputs used for marketing campaign targeting, not for decisions affecting individual rights. Transparency obligations under Art. 52 apply.',
    mitigation_measures: [
      'Disclose AI-driven targeting to customers in marketing communications',
      'Implement opt-out mechanism for AI-based retention campaigns',
      'Monitor for income bracket bias in churn predictions',
    ],
    start_date: '2025-11-15',
    completion_date: '2025-12-20',
    next_review: '2026-12-20',
    created_at: '2025-11-15T09:00:00Z',
    updated_at: '2025-12-20T15:00:00Z',
  },
  {
    id: 'AIIA-006',
    title: 'Customer Sentiment Analyzer Transparency Assessment',
    type: 'AIIA',
    model_id: 'MDL-006',
    status: 'approved',
    risk_level: 'limited',
    assessor: 'U-003',
    reviewer: 'U-005',
    framework: 'EU AI Act',
    scope: 'Assessment of customer sentiment analysis system for EU AI Act Art. 52 transparency obligations and employee monitoring implications.',
    impact_summary: 'Limited risk. System processes customer feedback text for quality monitoring. No emotion recognition component. Staff performance evaluation use case requires additional controls.',
    mitigation_measures: [
      'Add transparency notice in customer interaction channels',
      'Prohibit use for individual employee performance scoring',
      'Implement data minimization for sentiment processing',
    ],
    start_date: '2025-12-01',
    completion_date: '2026-01-15',
    next_review: '2027-01-15',
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2026-01-15T14:00:00Z',
  },
  {
    id: 'AIIA-007',
    title: 'Resume Screener High-Risk AIIA',
    type: 'Combined',
    model_id: 'MDL-007',
    status: 'draft',
    risk_level: 'high',
    assessor: 'U-006',
    reviewer: 'U-002',
    framework: 'EU AI Act',
    scope: 'Comprehensive impact assessment for AI-based resume screening system. Classified as high-risk under EU AI Act Annex III 4(a) employment, workers management. Covers bias in hiring decisions, EEOC compliance, and GDPR implications.',
    impact_summary: 'Very high impact on individuals. System directly affects employment opportunities. Historical training data contains known demographic biases. Potential for disparate impact on protected classes.',
    mitigation_measures: [
      'Mandatory human review for all screening decisions',
      'Blind resume processing removing name, gender, and age indicators',
      'Four-fifths rule compliance monitoring for all protected groups',
      'External annual bias audit by certified third party',
      'Candidate right to contest and request human-only review',
    ],
    start_date: '2026-03-01',
    completion_date: '',
    next_review: '2026-09-01',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-28T16:00:00Z',
  },
  {
    id: 'AIIA-008',
    title: 'Claims Processor Insurance DPIA',
    type: 'DPIA',
    model_id: 'MDL-008',
    status: 'in_review',
    risk_level: 'high',
    assessor: 'U-004',
    reviewer: 'U-005',
    framework: 'GDPR',
    scope: 'Data Protection Impact Assessment for AI-driven insurance claims processing system. Processes medical records, accident reports, and policyholder personal data.',
    impact_summary: 'High impact due to processing of special category data (health records) under GDPR Art. 9. Automated claims decisions affect policyholder financial outcomes. Risk of systematic underpayment bias.',
    mitigation_measures: [
      'Implement GDPR Art. 9(2)(a) explicit consent for health data processing',
      'Human review mandatory for claims exceeding $10,000 or involving medical data',
      'Quarterly fairness audit across policyholder demographics',
      'Right to explanation for all automated claims decisions',
    ],
    start_date: '2026-02-15',
    completion_date: '',
    next_review: '2026-08-15',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-20T11:00:00Z',
  },
];

// ── Exceptions ────────────────────────────────────────────────────────────────

export interface SeedException {
  id: string;
  title: string;
  policy_id: string;
  control_ref: string;
  status: 'requested' | 'approved' | 'denied' | 'expired' | 'under_review';
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  requestor: string;
  approver: string;
  justification: string;
  compensating_controls: string[];
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export const SEED_EXCEPTIONS: SeedException[] = [
  {
    id: 'EXC-001',
    title: 'Temporary waiver: Credit Scorer bias threshold for Q1 2026',
    policy_id: 'POL-004',
    control_ref: 'NIST AI RMF MEASURE 2.6',
    status: 'approved',
    risk_level: 'high',
    requestor: 'U-006',
    approver: 'U-001',
    justification: 'Credit Risk Scorer (MDL-001) fails gender parity threshold by 0.01 (0.84 vs 0.85). Retraining in progress with estimated completion by 2026-04-15. Human review gate enabled for all adverse decisions as compensating control.',
    compensating_controls: [
      'Mandatory human review for all adverse credit decisions',
      'Weekly bias metric monitoring with automated alerting',
      'Expedited model retraining with debiased dataset',
    ],
    expiry_date: '2026-04-30',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-20T14:00:00Z',
  },
  {
    id: 'EXC-002',
    title: 'Extended DPA renewal timeline for OpenAI vendor',
    policy_id: 'POL-006',
    control_ref: 'GDPR Art. 28',
    status: 'approved',
    risk_level: 'critical',
    requestor: 'U-002',
    approver: 'U-001',
    justification: 'OpenAI DPA renewal negotiations ongoing. Legal review of new EU AI Act clauses required. Extension granted to 2026-03-31 with data minimization controls.',
    compensating_controls: [
      'Minimize EU citizen data sent to OpenAI APIs',
      'Implement data anonymization for all LLM prompts',
      'Weekly legal status updates to CISO',
      'Backup provider (Anthropic) on standby for failover',
    ],
    expiry_date: '2026-03-31',
    created_at: '2026-01-05T09:00:00Z',
    updated_at: '2026-03-15T11:00:00Z',
  },
  {
    id: 'EXC-003',
    title: 'Delayed quarterly access review for training datasets',
    policy_id: 'POL-003',
    control_ref: 'ISO 27001 A.9.2',
    status: 'expired',
    risk_level: 'medium',
    requestor: 'U-004',
    approver: 'U-001',
    justification: 'Q4 2025 access review delayed due to IAM system migration. Manual review completed for critical datasets. Automated review tooling deployment in progress.',
    compensating_controls: [
      'Manual access review completed for all restricted datasets',
      'No new access grants approved during exception period',
      'Enhanced monitoring of data access logs',
    ],
    expiry_date: '2025-12-31',
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2025-12-31T23:59:00Z',
  },
  {
    id: 'EXC-004',
    title: 'LLM deployment without full Art. 13 documentation',
    policy_id: 'POL-005',
    control_ref: 'EU AI Act Art. 13',
    status: 'under_review',
    risk_level: 'high',
    requestor: 'U-006',
    approver: '',
    justification: 'Loan Approval Assistant (MDL-004) in staging environment requires limited user testing before full transparency documentation is complete. Request for 60-day exception with restricted scope.',
    compensating_controls: [
      'Limit deployment to internal testing group only',
      'No production traffic or real customer data',
      'Document known limitations in model card draft',
      'Complete transparency documentation before production promotion',
    ],
    expiry_date: '2026-05-31',
    created_at: '2026-03-25T09:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'EXC-005',
    title: 'Waiver: Prompt injection testing frequency for Q1',
    policy_id: 'POL-008',
    control_ref: 'OWASP LLM01',
    status: 'denied',
    risk_level: 'high',
    requestor: 'U-003',
    approver: 'U-001',
    justification: 'Request to reduce prompt injection testing from weekly to monthly for Loan Approval Assistant due to resource constraints. DENIED by CISO due to active threat THR-003.',
    compensating_controls: [],
    expiry_date: '',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-12T09:00:00Z',
  },
  {
    id: 'EXC-006',
    title: 'Temporary acceptance of elevated AML false positive rate',
    policy_id: 'POL-002',
    control_ref: 'NIST AI RMF MEASURE 1.1',
    status: 'approved',
    risk_level: 'medium',
    requestor: 'U-004',
    approver: 'U-002',
    justification: 'AML Transaction Monitor (MDL-005) false positive rate elevated to 6.2% (threshold 5%) due to new transaction patterns from product launch. Model recalibration scheduled.',
    compensating_controls: [
      'Additional analyst staffing for SAR review backlog',
      'Priority queue for high-confidence alerts',
      'Model recalibration sprint initiated with 2-week timeline',
    ],
    expiry_date: '2026-04-15',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-05T14:00:00Z',
  },
];

// ── Workflow Templates ────────────────────────────────────────────────────────

export interface SeedWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: {
    order: number;
    name: string;
    role: string;
    action: string;
    sla_hours: number;
  }[];
  auto_triggers: string[];
  created_by: string;
  status: 'active' | 'draft' | 'deprecated';
  created_at: string;
  updated_at: string;
}

export const SEED_WORKFLOW_TEMPLATES: SeedWorkflowTemplate[] = [
  {
    id: 'WFT-001',
    name: 'Model Promotion to Production',
    description: 'End-to-end approval workflow for promoting an AI model from staging to production. Includes bias audit, security review, compliance sign-off, and final CISO approval.',
    category: 'Model Lifecycle',
    steps: [
      { order: 1, name: 'Bias Audit Sign-off', role: 'ML Engineer', action: 'approve', sla_hours: 48 },
      { order: 2, name: 'Security Review', role: 'Security Engineer', action: 'approve', sla_hours: 72 },
      { order: 3, name: 'Compliance Review', role: 'VP Compliance', action: 'approve', sla_hours: 48 },
      { order: 4, name: 'Risk Assessment', role: 'Risk Analyst', action: 'approve', sla_hours: 24 },
      { order: 5, name: 'Final Approval', role: 'CISO', action: 'approve', sla_hours: 24 },
    ],
    auto_triggers: ['model_validation_complete', 'bias_audit_passed'],
    created_by: 'U-006',
    status: 'active',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2026-01-15T14:00:00Z',
  },
  {
    id: 'WFT-002',
    name: 'Policy Publication Workflow',
    description: 'Governance workflow for drafting, reviewing, and publishing organizational policies. Requires legal review, stakeholder feedback, and executive approval.',
    category: 'Governance',
    steps: [
      { order: 1, name: 'Draft Review', role: 'Policy Owner', action: 'submit', sla_hours: 168 },
      { order: 2, name: 'Legal Review', role: 'Legal Counsel', action: 'approve', sla_hours: 120 },
      { order: 3, name: 'Stakeholder Comment Period', role: 'All Stakeholders', action: 'comment', sla_hours: 336 },
      { order: 4, name: 'Final Approval', role: 'VP Compliance', action: 'approve', sla_hours: 48 },
      { order: 5, name: 'Publication', role: 'Policy Owner', action: 'publish', sla_hours: 24 },
    ],
    auto_triggers: ['policy_draft_complete'],
    created_by: 'U-002',
    status: 'active',
    created_at: '2025-06-15T09:00:00Z',
    updated_at: '2025-12-01T10:00:00Z',
  },
  {
    id: 'WFT-003',
    name: 'Risk Acceptance Workflow',
    description: 'Formal risk acceptance workflow requiring business justification, compensating controls documentation, and multi-level approval with CISO final sign-off.',
    category: 'Risk Management',
    steps: [
      { order: 1, name: 'Risk Documentation', role: 'Risk Analyst', action: 'submit', sla_hours: 48 },
      { order: 2, name: 'Business Justification', role: 'Business Owner', action: 'submit', sla_hours: 72 },
      { order: 3, name: 'Compensating Controls Review', role: 'Security Engineer', action: 'approve', sla_hours: 48 },
      { order: 4, name: 'Risk Committee Review', role: 'Risk Committee', action: 'approve', sla_hours: 120 },
      { order: 5, name: 'CISO Approval', role: 'CISO', action: 'approve', sla_hours: 24 },
    ],
    auto_triggers: ['risk_acceptance_requested'],
    created_by: 'U-004',
    status: 'active',
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'WFT-004',
    name: 'AI Impact Assessment Approval',
    description: 'Approval workflow for AI Impact Assessments and Data Protection Impact Assessments. Includes technical review, legal review, DPO sign-off, and regulatory filing.',
    category: 'Compliance',
    steps: [
      { order: 1, name: 'Technical Assessment', role: 'ML Engineer', action: 'submit', sla_hours: 168 },
      { order: 2, name: 'Bias & Fairness Review', role: 'Model Risk Mgr', action: 'approve', sla_hours: 72 },
      { order: 3, name: 'Legal & Privacy Review', role: 'Legal Counsel', action: 'approve', sla_hours: 120 },
      { order: 4, name: 'DPO Sign-off', role: 'VP Compliance', action: 'approve', sla_hours: 48 },
      { order: 5, name: 'Regulatory Filing', role: 'Compliance Officer', action: 'submit', sla_hours: 72 },
    ],
    auto_triggers: ['aiia_draft_complete', 'dpia_required'],
    created_by: 'U-002',
    status: 'active',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2026-01-20T11:00:00Z',
  },
];

// ── Workflow Instances ────────────────────────────────────────────────────────

export interface SeedWorkflowInstance {
  id: string;
  template_id: string;
  title: string;
  entity_type: string;
  entity_id: string;
  status: 'active' | 'completed' | 'cancelled' | 'blocked';
  current_step: number;
  initiated_by: string;
  initiated_at: string;
  completed_at: string;
  step_history: {
    step: number;
    actor: string;
    action: string;
    timestamp: string;
    notes: string;
  }[];
  created_at: string;
  updated_at: string;
}

export const SEED_WORKFLOW_INSTANCES: SeedWorkflowInstance[] = [
  {
    id: 'WFI-001',
    template_id: 'WFT-001',
    title: 'Promote Fraud Detection Engine v2.1 to Production',
    entity_type: 'model',
    entity_id: 'MDL-002',
    status: 'completed',
    current_step: 5,
    initiated_by: 'U-003',
    initiated_at: '2025-12-01T09:00:00Z',
    completed_at: '2025-12-18T14:00:00Z',
    step_history: [
      { step: 1, actor: 'U-003', action: 'approved', timestamp: '2025-12-03T10:00:00Z', notes: 'Bias audit BA-002 passed. All metrics within thresholds.' },
      { step: 2, actor: 'U-007', action: 'approved', timestamp: '2025-12-06T14:00:00Z', notes: 'Security review complete. No vulnerabilities found.' },
      { step: 3, actor: 'U-002', action: 'approved', timestamp: '2025-12-10T11:00:00Z', notes: 'SOC 2 compliance verified.' },
      { step: 4, actor: 'U-004', action: 'approved', timestamp: '2025-12-15T09:00:00Z', notes: 'Risk assessment complete. Acceptable risk level.' },
      { step: 5, actor: 'U-001', action: 'approved', timestamp: '2025-12-18T14:00:00Z', notes: 'Final approval granted. Deploy to production.' },
    ],
    created_at: '2025-12-01T09:00:00Z',
    updated_at: '2025-12-18T14:00:00Z',
  },
  {
    id: 'WFI-002',
    template_id: 'WFT-001',
    title: 'Promote Churn Predictor v1.1 to Production',
    entity_type: 'model',
    entity_id: 'MDL-003',
    status: 'active',
    current_step: 3,
    initiated_by: 'U-003',
    initiated_at: '2026-03-01T10:00:00Z',
    completed_at: '',
    step_history: [
      { step: 1, actor: 'U-003', action: 'approved', timestamp: '2026-03-05T11:00:00Z', notes: 'Bias audit passed. Fairness score 88%.' },
      { step: 2, actor: 'U-007', action: 'approved', timestamp: '2026-03-10T15:00:00Z', notes: 'Security scan clean. No issues.' },
    ],
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-10T15:00:00Z',
  },
  {
    id: 'WFI-003',
    template_id: 'WFT-001',
    title: 'Promote Loan Approval Assistant to Production',
    entity_type: 'model',
    entity_id: 'MDL-004',
    status: 'blocked',
    current_step: 1,
    initiated_by: 'U-006',
    initiated_at: '2026-02-15T09:00:00Z',
    completed_at: '',
    step_history: [
      { step: 1, actor: 'U-003', action: 'rejected', timestamp: '2026-02-20T14:00:00Z', notes: 'BLOCKED: Bias audit BA-005 failed with critical severity. Multiple protected attributes below threshold. Remediation required before re-submission.' },
    ],
    created_at: '2026-02-15T09:00:00Z',
    updated_at: '2026-02-20T14:00:00Z',
  },
  {
    id: 'WFI-004',
    template_id: 'WFT-002',
    title: 'Publish EU AI Act Compliance Framework Policy',
    entity_type: 'policy',
    entity_id: 'POL-005',
    status: 'active',
    current_step: 3,
    initiated_by: 'U-005',
    initiated_at: '2026-01-10T10:00:00Z',
    completed_at: '',
    step_history: [
      { step: 1, actor: 'U-005', action: 'submitted', timestamp: '2026-01-20T16:00:00Z', notes: 'Draft v0.9 submitted for review.' },
      { step: 2, actor: 'U-002', action: 'approved', timestamp: '2026-02-15T11:00:00Z', notes: 'Legal review complete. Minor amendments incorporated.' },
    ],
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-02-15T11:00:00Z',
  },
  {
    id: 'WFI-005',
    template_id: 'WFT-002',
    title: 'Publish LLM Security Policy',
    entity_type: 'policy',
    entity_id: 'POL-008',
    status: 'active',
    current_step: 1,
    initiated_by: 'U-001',
    initiated_at: '2026-03-15T09:00:00Z',
    completed_at: '',
    step_history: [],
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
  },
  {
    id: 'WFI-006',
    template_id: 'WFT-003',
    title: 'Accept Risk: EU AI Act Documentation Gap',
    entity_type: 'risk',
    entity_id: 'RSK-007',
    status: 'completed',
    current_step: 5,
    initiated_by: 'U-004',
    initiated_at: '2026-01-15T10:00:00Z',
    completed_at: '2026-02-10T14:00:00Z',
    step_history: [
      { step: 1, actor: 'U-004', action: 'submitted', timestamp: '2026-01-16T11:00:00Z', notes: 'Risk documentation with gap analysis attached.' },
      { step: 2, actor: 'U-005', action: 'submitted', timestamp: '2026-01-20T14:00:00Z', notes: 'Business justification: Documentation sprint planned for Q2.' },
      { step: 3, actor: 'U-007', action: 'approved', timestamp: '2026-01-25T10:00:00Z', notes: 'Compensating controls adequate. Model cards in progress.' },
      { step: 4, actor: 'U-002', action: 'approved', timestamp: '2026-02-05T16:00:00Z', notes: 'Risk committee approved with condition: complete by Q2 end.' },
      { step: 5, actor: 'U-001', action: 'approved', timestamp: '2026-02-10T14:00:00Z', notes: 'Accepted. Quarterly review required until documentation complete.' },
    ],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-02-10T14:00:00Z',
  },
  {
    id: 'WFI-007',
    template_id: 'WFT-004',
    title: 'Approve Credit Risk Scorer AIIA Update',
    entity_type: 'aiia',
    entity_id: 'AIIA-001',
    status: 'active',
    current_step: 2,
    initiated_by: 'U-006',
    initiated_at: '2026-03-20T09:00:00Z',
    completed_at: '',
    step_history: [
      { step: 1, actor: 'U-003', action: 'submitted', timestamp: '2026-03-22T14:00:00Z', notes: 'Technical assessment updated with new bias findings from BA-001.' },
    ],
    created_at: '2026-03-20T09:00:00Z',
    updated_at: '2026-03-22T14:00:00Z',
  },
  {
    id: 'WFI-008',
    template_id: 'WFT-004',
    title: 'Approve Loan Approval Assistant DPIA',
    entity_type: 'aiia',
    entity_id: 'AIIA-003',
    status: 'active',
    current_step: 3,
    initiated_by: 'U-006',
    initiated_at: '2026-02-01T10:00:00Z',
    completed_at: '',
    step_history: [
      { step: 1, actor: 'U-003', action: 'submitted', timestamp: '2026-02-10T16:00:00Z', notes: 'Technical assessment complete. High risk classification confirmed.' },
      { step: 2, actor: 'U-006', action: 'approved', timestamp: '2026-02-20T11:00:00Z', notes: 'Bias review confirms multiple threshold failures. Conditional approval pending remediation plan.' },
    ],
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-20T11:00:00Z',
  },
];

// ── Training Courses ──────────────────────────────────────────────────────────

export interface SeedTrainingCourse {
  id: string;
  title: string;
  category: string;
  description: string;
  duration_hours: number;
  format: 'e-learning' | 'instructor-led' | 'hybrid' | 'self-paced';
  audience: string[];
  mandatory: boolean;
  passing_score: number;
  renewal_months: number;
  content_version: string;
  created_by: string;
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
}

export const SEED_TRAINING_COURSES: SeedTrainingCourse[] = [
  {
    id: 'TRN-001',
    title: 'AI Ethics & Responsible AI Foundations',
    category: 'AI Governance',
    description: 'Foundational course covering AI ethics principles, responsible AI development practices, bias awareness, and organizational AI governance framework.',
    duration_hours: 4,
    format: 'e-learning',
    audience: ['All Employees', 'AI/ML', 'Engineering'],
    mandatory: true,
    passing_score: 80,
    renewal_months: 12,
    content_version: 'v2.1',
    created_by: 'U-002',
    status: 'active',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2026-01-15T14:00:00Z',
  },
  {
    id: 'TRN-002',
    title: 'EU AI Act Compliance for Practitioners',
    category: 'Regulatory',
    description: 'Detailed training on EU AI Act requirements including risk classification, conformity assessments, technical documentation, and human oversight obligations for high-risk systems.',
    duration_hours: 8,
    format: 'instructor-led',
    audience: ['AI/ML', 'Compliance', 'Risk', 'Legal'],
    mandatory: true,
    passing_score: 85,
    renewal_months: 6,
    content_version: 'v1.3',
    created_by: 'U-002',
    status: 'active',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'TRN-003',
    title: 'Bias Detection & Fairness Testing',
    category: 'AI/ML Technical',
    description: 'Technical training on bias detection methodologies, fairness metrics (DI ratio, SPD, EOpp, calibration), debiasing techniques, and remediation strategies.',
    duration_hours: 6,
    format: 'hybrid',
    audience: ['AI/ML', 'Data Science', 'Model Risk'],
    mandatory: true,
    passing_score: 85,
    renewal_months: 12,
    content_version: 'v1.2',
    created_by: 'U-003',
    status: 'active',
    created_at: '2025-07-15T10:00:00Z',
    updated_at: '2026-01-20T11:00:00Z',
  },
  {
    id: 'TRN-004',
    title: 'LLM Security & Prompt Injection Defense',
    category: 'Security',
    description: 'Security training focused on LLM-specific threats including prompt injection, jailbreaking, data exfiltration, and OWASP LLM Top 10 vulnerabilities.',
    duration_hours: 4,
    format: 'hybrid',
    audience: ['Security', 'AI/ML', 'Engineering'],
    mandatory: true,
    passing_score: 80,
    renewal_months: 6,
    content_version: 'v1.0',
    created_by: 'U-001',
    status: 'active',
    created_at: '2025-11-01T10:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'TRN-005',
    title: 'GDPR & Data Privacy for AI Systems',
    category: 'Data Privacy',
    description: 'Comprehensive GDPR training covering data processing bases for AI, DPIA requirements, Art. 22 automated decision-making, and cross-border data transfer mechanisms.',
    duration_hours: 6,
    format: 'e-learning',
    audience: ['All Employees', 'Compliance', 'Legal', 'AI/ML'],
    mandatory: true,
    passing_score: 80,
    renewal_months: 12,
    content_version: 'v2.0',
    created_by: 'U-002',
    status: 'active',
    created_at: '2025-05-01T10:00:00Z',
    updated_at: '2025-12-15T09:00:00Z',
  },
  {
    id: 'TRN-006',
    title: 'Model Risk Management & Validation',
    category: 'Risk',
    description: 'Training on model risk management practices, validation methodologies, challenger model testing, and ongoing monitoring requirements per SR 11-7 and NIST AI RMF.',
    duration_hours: 8,
    format: 'instructor-led',
    audience: ['AI/ML', 'Risk', 'Model Risk', 'Audit'],
    mandatory: false,
    passing_score: 80,
    renewal_months: 12,
    content_version: 'v1.1',
    created_by: 'U-006',
    status: 'active',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 'TRN-007',
    title: 'Shadow AI Awareness & Prevention',
    category: 'Security',
    description: 'Awareness training on shadow AI risks, unauthorized AI deployment detection, approved AI tools list, and incident reporting procedures.',
    duration_hours: 2,
    format: 'e-learning',
    audience: ['All Employees'],
    mandatory: true,
    passing_score: 75,
    renewal_months: 6,
    content_version: 'v1.0',
    created_by: 'U-001',
    status: 'active',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'TRN-008',
    title: 'AI Incident Response Procedures',
    category: 'Incident Response',
    description: 'Training on AI-specific incident response procedures including bias incident handling, model failure escalation, LLM safety events, and regulatory notification requirements.',
    duration_hours: 4,
    format: 'hybrid',
    audience: ['Security', 'AI/ML', 'Compliance', 'Risk'],
    mandatory: false,
    passing_score: 80,
    renewal_months: 12,
    content_version: 'v1.0',
    created_by: 'U-001',
    status: 'active',
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2026-01-10T14:00:00Z',
  },
];

// ── Training Assignments ──────────────────────────────────────────────────────

export interface SeedTrainingAssignment {
  id: string;
  course_id: string;
  user_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  assigned_date: string;
  due_date: string;
  completed_date: string;
  score: number | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export const SEED_TRAINING_ASSIGNMENTS: SeedTrainingAssignment[] = [
  {
    id: 'TA-001',
    course_id: 'TRN-001',
    user_id: 'U-001',
    status: 'completed',
    assigned_date: '2025-06-15',
    due_date: '2025-07-15',
    completed_date: '2025-06-28',
    score: 95,
    attempts: 1,
    created_at: '2025-06-15T10:00:00Z',
    updated_at: '2025-06-28T14:00:00Z',
  },
  {
    id: 'TA-002',
    course_id: 'TRN-001',
    user_id: 'U-003',
    status: 'completed',
    assigned_date: '2025-06-15',
    due_date: '2025-07-15',
    completed_date: '2025-07-01',
    score: 92,
    attempts: 1,
    created_at: '2025-06-15T10:00:00Z',
    updated_at: '2025-07-01T16:00:00Z',
  },
  {
    id: 'TA-003',
    course_id: 'TRN-002',
    user_id: 'U-002',
    status: 'completed',
    assigned_date: '2025-09-15',
    due_date: '2025-10-15',
    completed_date: '2025-10-02',
    score: 90,
    attempts: 1,
    created_at: '2025-09-15T10:00:00Z',
    updated_at: '2025-10-02T11:00:00Z',
  },
  {
    id: 'TA-004',
    course_id: 'TRN-002',
    user_id: 'U-006',
    status: 'completed',
    assigned_date: '2025-09-15',
    due_date: '2025-10-15',
    completed_date: '2025-10-10',
    score: 88,
    attempts: 1,
    created_at: '2025-09-15T10:00:00Z',
    updated_at: '2025-10-10T15:00:00Z',
  },
  {
    id: 'TA-005',
    course_id: 'TRN-003',
    user_id: 'U-003',
    status: 'completed',
    assigned_date: '2025-07-20',
    due_date: '2025-08-20',
    completed_date: '2025-08-05',
    score: 96,
    attempts: 1,
    created_at: '2025-07-20T10:00:00Z',
    updated_at: '2025-08-05T14:00:00Z',
  },
  {
    id: 'TA-006',
    course_id: 'TRN-003',
    user_id: 'U-006',
    status: 'completed',
    assigned_date: '2025-07-20',
    due_date: '2025-08-20',
    completed_date: '2025-08-15',
    score: 91,
    attempts: 1,
    created_at: '2025-07-20T10:00:00Z',
    updated_at: '2025-08-15T10:00:00Z',
  },
  {
    id: 'TA-007',
    course_id: 'TRN-004',
    user_id: 'U-001',
    status: 'completed',
    assigned_date: '2025-11-15',
    due_date: '2025-12-15',
    completed_date: '2025-12-01',
    score: 88,
    attempts: 1,
    created_at: '2025-11-15T10:00:00Z',
    updated_at: '2025-12-01T16:00:00Z',
  },
  {
    id: 'TA-008',
    course_id: 'TRN-004',
    user_id: 'U-007',
    status: 'in_progress',
    assigned_date: '2026-03-01',
    due_date: '2026-04-01',
    completed_date: '',
    score: null,
    attempts: 0,
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
  },
  {
    id: 'TA-009',
    course_id: 'TRN-005',
    user_id: 'U-002',
    status: 'completed',
    assigned_date: '2025-05-15',
    due_date: '2025-06-15',
    completed_date: '2025-05-28',
    score: 94,
    attempts: 1,
    created_at: '2025-05-15T10:00:00Z',
    updated_at: '2025-05-28T14:00:00Z',
  },
  {
    id: 'TA-010',
    course_id: 'TRN-005',
    user_id: 'U-004',
    status: 'completed',
    assigned_date: '2025-05-15',
    due_date: '2025-06-15',
    completed_date: '2025-06-10',
    score: 82,
    attempts: 2,
    created_at: '2025-05-15T10:00:00Z',
    updated_at: '2025-06-10T11:00:00Z',
  },
  {
    id: 'TA-011',
    course_id: 'TRN-006',
    user_id: 'U-006',
    status: 'in_progress',
    assigned_date: '2026-02-01',
    due_date: '2026-04-01',
    completed_date: '',
    score: null,
    attempts: 0,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-10T14:00:00Z',
  },
  {
    id: 'TA-012',
    course_id: 'TRN-006',
    user_id: 'U-004',
    status: 'in_progress',
    assigned_date: '2026-02-01',
    due_date: '2026-04-01',
    completed_date: '',
    score: null,
    attempts: 0,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-05T09:00:00Z',
  },
  {
    id: 'TA-013',
    course_id: 'TRN-007',
    user_id: 'U-003',
    status: 'overdue',
    assigned_date: '2026-02-01',
    due_date: '2026-03-01',
    completed_date: '',
    score: null,
    attempts: 0,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    id: 'TA-014',
    course_id: 'TRN-007',
    user_id: 'U-008',
    status: 'completed',
    assigned_date: '2026-02-01',
    due_date: '2026-03-01',
    completed_date: '2026-02-20',
    score: 85,
    attempts: 1,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-20T15:00:00Z',
  },
  {
    id: 'TA-015',
    course_id: 'TRN-008',
    user_id: 'U-001',
    status: 'not_started',
    assigned_date: '2026-03-15',
    due_date: '2026-04-30',
    completed_date: '',
    score: null,
    attempts: 0,
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
  },
  {
    id: 'TA-016',
    course_id: 'TRN-008',
    user_id: 'U-007',
    status: 'not_started',
    assigned_date: '2026-03-15',
    due_date: '2026-04-30',
    completed_date: '',
    score: null,
    attempts: 0,
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-15T10:00:00Z',
  },
];

// ── Documents ─────────────────────────────────────────────────────────────────

export interface SeedDocument {
  id: string;
  title: string;
  type: 'policy' | 'procedure' | 'standard' | 'guideline' | 'template' | 'report' | 'evidence';
  category: string;
  version: string;
  status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  owner: string;
  file_size: string;
  file_type: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  framework_refs: string[];
  last_reviewed: string;
  next_review: string;
  created_at: string;
  updated_at: string;
}

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    id: 'DOC-001',
    title: 'AI Governance Framework Document',
    type: 'standard',
    category: 'AI Governance',
    version: 'v2.1',
    status: 'published',
    owner: 'U-002',
    file_size: '3.2 MB',
    file_type: 'PDF',
    classification: 'internal',
    framework_refs: ['ISO/IEC 42001', 'NIST AI RMF'],
    last_reviewed: '2026-01-15',
    next_review: '2026-07-15',
    created_at: '2025-04-01T10:00:00Z',
    updated_at: '2026-01-15T14:00:00Z',
  },
  {
    id: 'DOC-002',
    title: 'Model Validation Procedure',
    type: 'procedure',
    category: 'Model Risk',
    version: 'v1.4',
    status: 'published',
    owner: 'U-006',
    file_size: '1.8 MB',
    file_type: 'PDF',
    classification: 'confidential',
    framework_refs: ['NIST AI RMF', 'SR 11-7'],
    last_reviewed: '2026-02-01',
    next_review: '2026-08-01',
    created_at: '2025-06-15T10:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },
  {
    id: 'DOC-003',
    title: 'EU AI Act Conformity Assessment Template',
    type: 'template',
    category: 'Regulatory',
    version: 'v1.0',
    status: 'approved',
    owner: 'U-005',
    file_size: '2.5 MB',
    file_type: 'DOCX',
    classification: 'internal',
    framework_refs: ['EU AI Act'],
    last_reviewed: '2026-03-01',
    next_review: '2026-09-01',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'DOC-004',
    title: 'Bias Testing Methodology Standard',
    type: 'standard',
    category: 'AI/ML',
    version: 'v1.2',
    status: 'published',
    owner: 'U-003',
    file_size: '4.1 MB',
    file_type: 'PDF',
    classification: 'internal',
    framework_refs: ['NIST AI RMF MEASURE 2.6', 'EU AI Act Art. 10'],
    last_reviewed: '2026-01-20',
    next_review: '2026-07-20',
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2026-01-20T11:00:00Z',
  },
  {
    id: 'DOC-005',
    title: 'Incident Response Playbook — AI Bias Events',
    type: 'procedure',
    category: 'Incident Response',
    version: 'v1.1',
    status: 'published',
    owner: 'U-001',
    file_size: '1.5 MB',
    file_type: 'PDF',
    classification: 'confidential',
    framework_refs: ['SOC 2 CC7.3', 'ISO 27001 A.16.1'],
    last_reviewed: '2026-02-15',
    next_review: '2026-08-15',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2026-02-15T14:00:00Z',
  },
  {
    id: 'DOC-006',
    title: 'DPIA Template for AI Systems',
    type: 'template',
    category: 'Data Privacy',
    version: 'v2.0',
    status: 'published',
    owner: 'U-002',
    file_size: '890 KB',
    file_type: 'DOCX',
    classification: 'internal',
    framework_refs: ['GDPR Art. 35', 'EU AI Act Art. 9'],
    last_reviewed: '2025-12-01',
    next_review: '2026-06-01',
    created_at: '2025-03-01T10:00:00Z',
    updated_at: '2025-12-01T09:00:00Z',
  },
  {
    id: 'DOC-007',
    title: 'Third-Party AI Vendor Assessment Questionnaire',
    type: 'template',
    category: 'Vendor Management',
    version: 'v1.3',
    status: 'published',
    owner: 'U-004',
    file_size: '1.2 MB',
    file_type: 'XLSX',
    classification: 'internal',
    framework_refs: ['ISO 27001 A.15.2', 'SOC 2 CC9.2'],
    last_reviewed: '2026-01-10',
    next_review: '2026-07-10',
    created_at: '2025-05-15T10:00:00Z',
    updated_at: '2026-01-10T14:00:00Z',
  },
  {
    id: 'DOC-008',
    title: 'Q1 2026 AI Risk Report — Board Summary',
    type: 'report',
    category: 'Risk Management',
    version: 'v1.0',
    status: 'in_review',
    owner: 'U-004',
    file_size: '5.8 MB',
    file_type: 'PDF',
    classification: 'restricted',
    framework_refs: ['NIST AI RMF GOVERN 1.1'],
    last_reviewed: '',
    next_review: '2026-04-15',
    created_at: '2026-03-25T10:00:00Z',
    updated_at: '2026-03-28T16:00:00Z',
  },
  {
    id: 'DOC-009',
    title: 'Model Card Template — Standard Format',
    type: 'template',
    category: 'AI/ML',
    version: 'v1.1',
    status: 'published',
    owner: 'U-006',
    file_size: '450 KB',
    file_type: 'MD',
    classification: 'internal',
    framework_refs: ['EU AI Act Art. 13', 'NIST AI RMF MAP 1.1'],
    last_reviewed: '2026-02-10',
    next_review: '2026-08-10',
    created_at: '2025-10-01T10:00:00Z',
    updated_at: '2026-02-10T11:00:00Z',
  },
  {
    id: 'DOC-010',
    title: 'Human Oversight Implementation Guide',
    type: 'guideline',
    category: 'AI Governance',
    version: 'v1.0',
    status: 'draft',
    owner: 'U-002',
    file_size: '2.1 MB',
    file_type: 'PDF',
    classification: 'internal',
    framework_refs: ['EU AI Act Art. 14', 'ISO/IEC 42001'],
    last_reviewed: '',
    next_review: '2026-05-01',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
];

// ── BCP Plans ─────────────────────────────────────────────────────────────────

export interface SeedBCPPlan {
  id: string;
  title: string;
  category: string;
  status: 'active' | 'draft' | 'under_review' | 'tested' | 'archived';
  owner: string;
  rto_hours: number;
  rpo_hours: number;
  last_tested: string;
  next_test: string;
  critical_systems: string[];
  recovery_steps: string[];
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

export const SEED_BCP_PLANS: SeedBCPPlan[] = [
  {
    id: 'BCP-001',
    title: 'AI Model Inference Platform Disaster Recovery',
    category: 'Technology',
    status: 'tested',
    owner: 'U-008',
    rto_hours: 4,
    rpo_hours: 1,
    last_tested: '2026-02-15',
    next_test: '2026-08-15',
    critical_systems: ['MDL-001', 'MDL-002', 'MDL-005'],
    recovery_steps: [
      'Activate standby inference cluster in DR region (us-west-2)',
      'Restore latest model artifacts from S3 cross-region replicas',
      'Redirect traffic via Route 53 failover',
      'Validate model predictions against baseline test suite',
      'Notify stakeholders and begin monitoring',
    ],
    dependencies: ['AWS SageMaker', 'Route 53', 'S3 Cross-Region Replication'],
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2026-02-16T09:00:00Z',
  },
  {
    id: 'BCP-002',
    title: 'Fraud Detection System Failover Plan',
    category: 'Business Critical',
    status: 'active',
    owner: 'U-004',
    rto_hours: 1,
    rpo_hours: 0,
    last_tested: '2026-01-20',
    next_test: '2026-04-20',
    critical_systems: ['MDL-002'],
    recovery_steps: [
      'Activate rule-based fallback system for transaction scoring',
      'Enable manual review queue for high-value transactions',
      'Deploy warm standby model from secondary region',
      'Validate scoring consistency with production baseline',
      'Resume automated processing after validation',
    ],
    dependencies: ['AWS SageMaker', 'Redis Cache', 'Kafka'],
    created_at: '2025-04-15T10:00:00Z',
    updated_at: '2026-01-21T14:00:00Z',
  },
  {
    id: 'BCP-003',
    title: 'Data Platform Recovery Plan',
    category: 'Technology',
    status: 'active',
    owner: 'U-008',
    rto_hours: 8,
    rpo_hours: 4,
    last_tested: '2025-11-15',
    next_test: '2026-05-15',
    critical_systems: ['DS-001', 'DS-002', 'DS-005'],
    recovery_steps: [
      'Assess data platform failure scope and impact',
      'Initiate PostgreSQL point-in-time recovery from WAL archives',
      'Restore feature stores from latest snapshot',
      'Validate data integrity with checksums',
      'Re-sync ML pipelines and verify training data availability',
    ],
    dependencies: ['PostgreSQL', 'AWS S3', 'Snowflake'],
    created_at: '2025-05-01T10:00:00Z',
    updated_at: '2025-11-16T10:00:00Z',
  },
  {
    id: 'BCP-004',
    title: 'LLM Provider Failover Strategy',
    category: 'Third-Party',
    status: 'under_review',
    owner: 'U-006',
    rto_hours: 2,
    rpo_hours: 0,
    last_tested: '2025-12-10',
    next_test: '2026-06-10',
    critical_systems: ['MDL-004'],
    recovery_steps: [
      'Detect OpenAI API degradation via health check monitor',
      'Failover Loan Approval Assistant to Anthropic Claude API',
      'Adjust prompt templates for Claude compatibility',
      'Validate output quality against acceptance criteria',
      'Notify operations team and begin provider incident tracking',
    ],
    dependencies: ['OpenAI API', 'Anthropic API', 'API Gateway'],
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2026-03-15T11:00:00Z',
  },
  {
    id: 'BCP-005',
    title: 'GRC Platform Business Continuity Plan',
    category: 'Business Critical',
    status: 'draft',
    owner: 'U-001',
    rto_hours: 24,
    rpo_hours: 8,
    last_tested: '',
    next_test: '2026-06-01',
    critical_systems: ['Sentinel GRC Platform', 'Audit Trail', 'Evidence Store'],
    recovery_steps: [
      'Activate read-only mode for audit and compliance records',
      'Restore platform from latest database backup',
      'Verify audit trail integrity and continuity',
      'Resume write operations after data validation',
      'Conduct post-recovery reconciliation of all records',
    ],
    dependencies: ['Supabase', 'Vercel', 'AWS S3'],
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
];

// ── Compliance Calendar ───────────────────────────────────────────────────────

export interface SeedCalendarEvent {
  id: string;
  title: string;
  type: 'audit' | 'review' | 'filing' | 'training' | 'assessment' | 'certification' | 'renewal';
  category: string;
  date: string;
  end_date: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  owner: string;
  framework: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recurrence: 'one-time' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  created_at: string;
}

export const SEED_CALENDAR_EVENTS: SeedCalendarEvent[] = [
  {
    id: 'CAL-001',
    title: 'EU AI Act Full Enforcement Deadline',
    type: 'filing',
    category: 'Regulatory',
    date: '2026-08-01',
    end_date: '2026-08-01',
    status: 'upcoming',
    owner: 'U-002',
    framework: 'EU AI Act',
    description: 'Full enforcement of EU AI Act for high-risk AI systems. All conformity assessments must be complete.',
    priority: 'critical',
    recurrence: 'one-time',
    created_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 'CAL-002',
    title: 'Q2 2026 Bias Audit — All Production Models',
    type: 'audit',
    category: 'AI Ethics',
    date: '2026-04-15',
    end_date: '2026-04-30',
    status: 'upcoming',
    owner: 'U-003',
    framework: 'NIST AI RMF',
    description: 'Quarterly bias audit covering all production AI models. Includes DI ratio, SPD, and EOpp analysis across protected attributes.',
    priority: 'high',
    recurrence: 'quarterly',
    created_at: '2025-12-01T10:00:00Z',
  },
  {
    id: 'CAL-003',
    title: 'ISO 27001 Surveillance Audit',
    type: 'audit',
    category: 'Security',
    date: '2026-08-20',
    end_date: '2026-08-28',
    status: 'upcoming',
    owner: 'U-005',
    framework: 'ISO 27001',
    description: 'Annual ISO 27001 surveillance audit by external certification body. Scope includes AI system security controls.',
    priority: 'high',
    recurrence: 'annual',
    created_at: '2025-09-01T10:00:00Z',
  },
  {
    id: 'CAL-004',
    title: 'SOC 2 Type II Audit Period Start',
    type: 'audit',
    category: 'Trust',
    date: '2026-07-10',
    end_date: '2026-09-10',
    status: 'upcoming',
    owner: 'U-005',
    framework: 'SOC 2',
    description: 'SOC 2 Type II audit period for Security, Availability, and Confidentiality trust service criteria.',
    priority: 'high',
    recurrence: 'annual',
    created_at: '2025-10-01T10:00:00Z',
  },
  {
    id: 'CAL-005',
    title: 'GDPR DPA Annual Review — All Vendors',
    type: 'review',
    category: 'Data Privacy',
    date: '2026-05-01',
    end_date: '2026-05-31',
    status: 'upcoming',
    owner: 'U-002',
    framework: 'GDPR',
    description: 'Annual review of all Data Processing Agreements with AI vendors. Includes OpenAI, Anthropic, Pinecone, and AWS.',
    priority: 'critical',
    recurrence: 'annual',
    created_at: '2025-05-01T10:00:00Z',
  },
  {
    id: 'CAL-006',
    title: 'ISO/IEC 42001 Certification Readiness Review',
    type: 'assessment',
    category: 'AI Governance',
    date: '2026-06-01',
    end_date: '2026-06-15',
    status: 'upcoming',
    owner: 'U-002',
    framework: 'ISO/IEC 42001',
    description: 'Internal readiness assessment before ISO/IEC 42001 certification audit. Gap remediation must be complete.',
    priority: 'high',
    recurrence: 'one-time',
    created_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'CAL-007',
    title: 'Q1 2026 Model Validation Review',
    type: 'review',
    category: 'Model Risk',
    date: '2026-01-15',
    end_date: '2026-02-15',
    status: 'completed',
    owner: 'U-006',
    framework: 'NIST AI RMF',
    description: 'Quarterly independent validation review for all high-risk models. Covers accuracy, drift, and fairness metrics.',
    priority: 'high',
    recurrence: 'quarterly',
    created_at: '2025-10-01T10:00:00Z',
  },
  {
    id: 'CAL-008',
    title: 'AI Ethics Training Renewal — All Staff',
    type: 'training',
    category: 'Training',
    date: '2026-06-15',
    end_date: '2026-07-15',
    status: 'upcoming',
    owner: 'U-002',
    framework: 'ISO/IEC 42001',
    description: 'Annual mandatory AI ethics training renewal for all employees. Updated content includes EU AI Act obligations.',
    priority: 'medium',
    recurrence: 'annual',
    created_at: '2025-06-15T10:00:00Z',
  },
  {
    id: 'CAL-009',
    title: 'NIST AI RMF 2.0 Gap Analysis Deadline',
    type: 'assessment',
    category: 'Risk Management',
    date: '2026-05-15',
    end_date: '2026-05-15',
    status: 'upcoming',
    owner: 'U-006',
    framework: 'NIST AI RMF',
    description: 'Internal deadline to complete gap analysis against updated NIST AI RMF 2.0 framework.',
    priority: 'medium',
    recurrence: 'one-time',
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'CAL-010',
    title: 'Board Risk Committee — AI Risk Report',
    type: 'review',
    category: 'Governance',
    date: '2026-04-15',
    end_date: '2026-04-15',
    status: 'upcoming',
    owner: 'U-004',
    framework: 'NIST AI RMF',
    description: 'Quarterly board risk committee presentation on AI risk posture, incidents, and remediation progress.',
    priority: 'high',
    recurrence: 'quarterly',
    created_at: '2025-04-01T10:00:00Z',
  },
  {
    id: 'CAL-011',
    title: 'Penetration Test — AI Infrastructure',
    type: 'assessment',
    category: 'Security',
    date: '2026-05-01',
    end_date: '2026-05-15',
    status: 'upcoming',
    owner: 'U-007',
    framework: 'ISO 27001',
    description: 'Semi-annual penetration testing of AI inference endpoints, model APIs, and ML pipeline infrastructure.',
    priority: 'high',
    recurrence: 'semi-annual',
    created_at: '2025-11-01T10:00:00Z',
  },
  {
    id: 'CAL-012',
    title: 'OpenAI DPA Renewal Deadline',
    type: 'renewal',
    category: 'Vendor Management',
    date: '2026-03-31',
    end_date: '2026-03-31',
    status: 'overdue',
    owner: 'U-002',
    framework: 'GDPR',
    description: 'Critical deadline for OpenAI Data Processing Agreement renewal. EU data processing must be suspended if not renewed.',
    priority: 'critical',
    recurrence: 'annual',
    created_at: '2025-12-01T10:00:00Z',
  },
  {
    id: 'CAL-013',
    title: 'Red Team Exercise — LLM Systems',
    type: 'assessment',
    category: 'Security',
    date: '2026-06-01',
    end_date: '2026-06-15',
    status: 'upcoming',
    owner: 'U-001',
    framework: 'OWASP LLM',
    description: 'Quarterly red team exercise targeting all LLM-based systems. Focus on prompt injection, jailbreak, and data exfiltration vectors.',
    priority: 'high',
    recurrence: 'quarterly',
    created_at: '2026-01-01T10:00:00Z',
  },
  {
    id: 'CAL-014',
    title: 'BCP Tabletop Exercise — AI Platform',
    type: 'assessment',
    category: 'Business Continuity',
    date: '2026-04-20',
    end_date: '2026-04-20',
    status: 'upcoming',
    owner: 'U-008',
    framework: 'ISO 27001',
    description: 'Semi-annual tabletop exercise simulating AI platform outage scenario. Includes model inference failover and data recovery.',
    priority: 'medium',
    recurrence: 'semi-annual',
    created_at: '2025-10-20T10:00:00Z',
  },
  {
    id: 'CAL-015',
    title: 'Colorado AI Act SB 205 Compliance Filing',
    type: 'filing',
    category: 'Regulatory',
    date: '2026-02-01',
    end_date: '2026-02-01',
    status: 'completed',
    owner: 'U-002',
    framework: 'Colorado AI Act',
    description: 'Mandatory algorithmic impact assessment filing under Colorado SB 205 for consequential AI decisions in credit scoring.',
    priority: 'critical',
    recurrence: 'annual',
    created_at: '2025-10-01T10:00:00Z',
  },
];

// ── Maturity Assessments ──────────────────────────────────────────────────────

export interface SeedMaturityAssessment {
  id: string;
  title: string;
  framework: string;
  assessment_date: string;
  assessor: string;
  overall_score: number;
  maturity_level: 'Initial' | 'Managed' | 'Defined' | 'Quantitatively Managed' | 'Optimizing';
  dimensions: {
    name: string;
    score: number;
    target: number;
    level: string;
    findings: string;
  }[];
  recommendations: string[];
  next_assessment: string;
  created_at: string;
  updated_at: string;
}

export const SEED_MATURITY_ASSESSMENTS: SeedMaturityAssessment[] = [
  {
    id: 'MAT-001',
    title: 'AI Governance Maturity Assessment — H2 2025',
    framework: 'ISO/IEC 42001',
    assessment_date: '2025-12-15',
    assessor: 'U-002',
    overall_score: 2.8,
    maturity_level: 'Defined',
    dimensions: [
      { name: 'AI Strategy & Governance', score: 3.2, target: 4.0, level: 'Defined', findings: 'AI governance framework documented but not fully operationalized. Board oversight established.' },
      { name: 'Risk Management', score: 3.0, target: 4.0, level: 'Defined', findings: 'Risk assessment methodology defined. Need to expand to cover LLM-specific risks and supply chain.' },
      { name: 'Data Governance', score: 2.5, target: 4.0, level: 'Managed', findings: 'Basic data governance in place. Training data quality and representativeness controls need improvement.' },
      { name: 'Model Lifecycle Management', score: 3.5, target: 4.0, level: 'Defined', findings: 'Strong model inventory and versioning. Lifecycle tracking needs automation.' },
      { name: 'Bias & Fairness', score: 2.2, target: 4.0, level: 'Managed', findings: 'Bias testing established but not standardized. Multiple threshold failures requiring remediation.' },
      { name: 'Transparency & Explainability', score: 2.0, target: 4.0, level: 'Managed', findings: 'SHAP explanations for some models. Comprehensive explainability framework needed for EU AI Act.' },
      { name: 'Security & Privacy', score: 3.5, target: 4.0, level: 'Defined', findings: 'Strong security controls. LLM-specific security (prompt injection) needs maturation.' },
      { name: 'Human Oversight', score: 2.5, target: 4.0, level: 'Managed', findings: 'Human review gates for credit decisions. Need to extend to all high-risk automated decisions.' },
    ],
    recommendations: [
      'Invest in bias measurement standardization across all teams',
      'Accelerate EU AI Act Article 13 transparency documentation',
      'Implement automated model lifecycle tracking',
      'Expand human oversight to all Annex III classified systems',
    ],
    next_assessment: '2026-06-15',
    created_at: '2025-12-15T10:00:00Z',
    updated_at: '2025-12-20T14:00:00Z',
  },
  {
    id: 'MAT-002',
    title: 'AI Security Maturity Assessment — Q1 2026',
    framework: 'OWASP AI Security',
    assessment_date: '2026-03-15',
    assessor: 'U-001',
    overall_score: 2.4,
    maturity_level: 'Managed',
    dimensions: [
      { name: 'Prompt Injection Defense', score: 2.0, target: 4.0, level: 'Managed', findings: 'Basic input validation in place. Layered defense architecture needed. Active threat THR-003 unresolved.' },
      { name: 'Model Supply Chain Security', score: 2.5, target: 4.0, level: 'Managed', findings: 'Vendor assessment process exists. Model artifact integrity verification not automated.' },
      { name: 'Data Poisoning Prevention', score: 2.8, target: 4.0, level: 'Defined', findings: 'Training data validation implemented. Adversarial sample detection not deployed.' },
      { name: 'Model Theft Prevention', score: 3.0, target: 4.0, level: 'Defined', findings: 'API rate limiting and authentication controls in place. Model watermarking under evaluation.' },
      { name: 'Output Security', score: 2.2, target: 4.0, level: 'Managed', findings: 'PII detection in outputs. Sensitive information disclosure controls need strengthening for LLMs.' },
      { name: 'Shadow AI Detection', score: 1.8, target: 4.0, level: 'Initial', findings: 'Manual detection process. Three shadow agents discovered in Q1. Automated monitoring required.' },
      { name: 'Adversarial Robustness', score: 2.5, target: 4.0, level: 'Managed', findings: 'Red team exercises conducted quarterly. Need continuous adversarial testing integration.' },
      { name: 'Incident Response for AI', score: 2.5, target: 4.0, level: 'Managed', findings: 'AI incident playbooks exist. Need to improve MTTR for AI-specific incidents.' },
    ],
    recommendations: [
      'Deploy automated shadow AI detection with network monitoring',
      'Implement layered prompt injection defense architecture',
      'Integrate adversarial testing into CI/CD pipeline',
      'Strengthen LLM output filtering for sensitive information',
    ],
    next_assessment: '2026-09-15',
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
];

// ── Security Scans ────────────────────────────────────────────────────────────

export interface SeedSecurityScan {
  id: string;
  title: string;
  type: 'vulnerability' | 'penetration' | 'compliance' | 'configuration' | 'dependency' | 'container';
  target: string;
  status: 'completed' | 'running' | 'scheduled' | 'failed';
  scanner: string;
  findings_total: number;
  findings_critical: number;
  findings_high: number;
  findings_medium: number;
  findings_low: number;
  initiated_by: string;
  started_at: string;
  completed_at: string;
  next_scan: string;
  created_at: string;
}

export const SEED_SECURITY_SCANS: SeedSecurityScan[] = [
  {
    id: 'SCAN-001',
    title: 'Model API Vulnerability Scan — March 2026',
    type: 'vulnerability',
    target: 'api.sentinel-grc.com',
    status: 'completed',
    scanner: 'Qualys VMDR',
    findings_total: 12,
    findings_critical: 1,
    findings_high: 3,
    findings_medium: 5,
    findings_low: 3,
    initiated_by: 'U-007',
    started_at: '2026-03-25T02:00:00Z',
    completed_at: '2026-03-25T04:30:00Z',
    next_scan: '2026-04-25',
    created_at: '2026-03-25T02:00:00Z',
  },
  {
    id: 'SCAN-002',
    title: 'ML Pipeline Dependency Scan',
    type: 'dependency',
    target: 'mlops-prod.internal',
    status: 'completed',
    scanner: 'Snyk',
    findings_total: 28,
    findings_critical: 2,
    findings_high: 6,
    findings_medium: 12,
    findings_low: 8,
    initiated_by: 'U-008',
    started_at: '2026-03-20T08:00:00Z',
    completed_at: '2026-03-20T08:45:00Z',
    next_scan: '2026-04-20',
    created_at: '2026-03-20T08:00:00Z',
  },
  {
    id: 'SCAN-003',
    title: 'Container Security Scan — Model Serving',
    type: 'container',
    target: 'model-serving-cluster',
    status: 'completed',
    scanner: 'Trivy',
    findings_total: 15,
    findings_critical: 0,
    findings_high: 2,
    findings_medium: 8,
    findings_low: 5,
    initiated_by: 'U-008',
    started_at: '2026-03-22T06:00:00Z',
    completed_at: '2026-03-22T06:20:00Z',
    next_scan: '2026-04-22',
    created_at: '2026-03-22T06:00:00Z',
  },
  {
    id: 'SCAN-004',
    title: 'Cloud Configuration Compliance Scan',
    type: 'configuration',
    target: 'AWS Production Account',
    status: 'completed',
    scanner: 'AWS Security Hub',
    findings_total: 8,
    findings_critical: 0,
    findings_high: 1,
    findings_medium: 4,
    findings_low: 3,
    initiated_by: 'U-007',
    started_at: '2026-03-28T01:00:00Z',
    completed_at: '2026-03-28T02:15:00Z',
    next_scan: '2026-04-28',
    created_at: '2026-03-28T01:00:00Z',
  },
  {
    id: 'SCAN-005',
    title: 'Penetration Test — AI Inference Endpoints',
    type: 'penetration',
    target: 'api.sentinel-grc.com/v1/predict/*',
    status: 'running',
    scanner: 'Internal Red Team',
    findings_total: 0,
    findings_critical: 0,
    findings_high: 0,
    findings_medium: 0,
    findings_low: 0,
    initiated_by: 'U-001',
    started_at: '2026-03-30T09:00:00Z',
    completed_at: '',
    next_scan: '2026-06-30',
    created_at: '2026-03-30T09:00:00Z',
  },
  {
    id: 'SCAN-006',
    title: 'CIS Benchmark Compliance — Data Warehouse',
    type: 'compliance',
    target: 'data-warehouse.internal',
    status: 'scheduled',
    scanner: 'CIS-CAT Pro',
    findings_total: 0,
    findings_critical: 0,
    findings_high: 0,
    findings_medium: 0,
    findings_low: 0,
    initiated_by: 'U-007',
    started_at: '',
    completed_at: '',
    next_scan: '2026-04-15',
    created_at: '2026-03-28T10:00:00Z',
  },
];

// ── Security Vulnerabilities (additional) ─────────────────────────────────────

export interface SeedVulnerability {
  id: string;
  cve: string;
  title: string;
  cvss: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  status: 'open' | 'in_progress' | 'patched' | 'accepted' | 'false_positive';
  discovered: string;
  patch_date: string;
  assignee: string;
  scan_id: string;
  description: string;
  remediation: string;
  created_at: string;
  updated_at: string;
}

export const SEED_VULNERABILITIES: SeedVulnerability[] = [
  {
    id: 'SVULN-001',
    cve: 'CVE-2026-2201',
    title: 'PyTorch Model Deserialization RCE',
    cvss: 9.8,
    severity: 'critical',
    component: 'pytorch v2.2.0',
    status: 'in_progress',
    discovered: '2026-03-10',
    patch_date: '',
    assignee: 'U-003',
    scan_id: 'SCAN-002',
    description: 'Remote code execution via crafted pickle payload in PyTorch model deserialization. Affects custom model loading in ML pipeline.',
    remediation: 'Upgrade to PyTorch 2.2.1. Implement safetensors format for all model artifacts. Disable pickle-based model loading.',
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-25T14:00:00Z',
  },
  {
    id: 'SVULN-002',
    cve: 'CVE-2026-1890',
    title: 'NumPy Array Buffer Overflow',
    cvss: 7.5,
    severity: 'high',
    component: 'numpy v1.26.2',
    status: 'patched',
    discovered: '2026-02-28',
    patch_date: '2026-03-05',
    assignee: 'U-008',
    scan_id: 'SCAN-002',
    description: 'Heap buffer overflow when processing specially crafted ndarray data. Exploitable via malicious training data input.',
    remediation: 'Upgraded to NumPy 1.26.4. Added input validation for array dimensions in data ingestion pipeline.',
    created_at: '2026-02-28T10:00:00Z',
    updated_at: '2026-03-05T16:00:00Z',
  },
  {
    id: 'SVULN-003',
    cve: 'SENT-SV-003',
    title: 'Insecure Direct Object Reference in Model API',
    cvss: 6.8,
    severity: 'medium',
    component: 'inference-api v3.2',
    status: 'in_progress',
    discovered: '2026-03-25',
    patch_date: '',
    assignee: 'U-007',
    scan_id: 'SCAN-001',
    description: 'Model prediction API allows access to model metadata via sequential ID enumeration. Could expose model architecture details.',
    remediation: 'Replace sequential IDs with UUIDs. Add authorization checks for model metadata endpoints.',
    created_at: '2026-03-25T10:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
  },
  {
    id: 'SVULN-004',
    cve: 'CVE-2026-3345',
    title: 'FastAPI WebSocket Denial of Service',
    cvss: 5.3,
    severity: 'medium',
    component: 'fastapi v0.109.0',
    status: 'open',
    discovered: '2026-03-22',
    patch_date: '',
    assignee: 'U-008',
    scan_id: 'SCAN-001',
    description: 'Memory exhaustion via WebSocket connection flooding on model streaming endpoints. Can degrade inference service availability.',
    remediation: 'Upgrade FastAPI to 0.109.2. Implement WebSocket connection limits and rate throttling at API gateway level.',
    created_at: '2026-03-22T10:00:00Z',
    updated_at: '2026-03-22T10:00:00Z',
  },
  {
    id: 'SVULN-005',
    cve: 'SENT-SV-005',
    title: 'Model Serving Container Running as Root',
    cvss: 6.2,
    severity: 'medium',
    component: 'model-serving-container:latest',
    status: 'in_progress',
    discovered: '2026-03-22',
    patch_date: '',
    assignee: 'U-008',
    scan_id: 'SCAN-003',
    description: 'Model serving containers running with root privileges. Container escape could grant access to host system and adjacent workloads.',
    remediation: 'Rebuild container images with non-root user. Update Kubernetes SecurityContext to enforce runAsNonRoot.',
    created_at: '2026-03-22T11:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'SVULN-006',
    cve: 'CVE-2026-4102',
    title: 'Hugging Face Transformers Arbitrary File Read',
    cvss: 7.1,
    severity: 'high',
    component: 'transformers v4.38.2',
    status: 'open',
    discovered: '2026-03-20',
    patch_date: '',
    assignee: 'U-003',
    scan_id: 'SCAN-002',
    description: 'Path traversal in model configuration loading allows reading arbitrary files from the model hosting server.',
    remediation: 'Upgrade to transformers 4.39.0 when available. Apply path sanitization to all model config loading paths.',
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 'SVULN-007',
    cve: 'SENT-SV-007',
    title: 'S3 Bucket Policy Allows Public Model Access',
    cvss: 8.1,
    severity: 'high',
    component: 'model-artifacts-prod S3 bucket',
    status: 'patched',
    discovered: '2026-03-28',
    patch_date: '2026-03-28',
    assignee: 'U-007',
    scan_id: 'SCAN-004',
    description: 'S3 bucket policy misconfiguration allows unauthenticated read access to production model artifacts. Risk of model theft and IP exposure.',
    remediation: 'Immediately restricted bucket policy to authenticated principals only. Added SCPs to prevent future public access.',
    created_at: '2026-03-28T03:00:00Z',
    updated_at: '2026-03-28T05:00:00Z',
  },
  {
    id: 'SVULN-008',
    cve: 'SENT-SV-008',
    title: 'Hardcoded API Key in Feature Store Client',
    cvss: 4.5,
    severity: 'low',
    component: 'feature-store-client v1.2',
    status: 'patched',
    discovered: '2026-03-15',
    patch_date: '2026-03-16',
    assignee: 'U-008',
    scan_id: 'SCAN-002',
    description: 'Internal API key hardcoded in feature store client library. Key grants read access to feature store metadata.',
    remediation: 'Rotated API key. Migrated to AWS Secrets Manager for key storage. Added secret scanning to CI pipeline.',
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-16T11:00:00Z',
  },
];

// ── Security Threats (additional) ─────────────────────────────────────────────

export interface SeedThreat {
  id: string;
  name: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'investigating' | 'mitigated' | 'resolved';
  source: string;
  detected: string;
  description: string;
  affected_systems: string[];
  indicators_of_compromise: string[];
  remediation_steps: string[];
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

export const SEED_THREATS: SeedThreat[] = [
  {
    id: 'STHR-001',
    name: 'Adversarial Input Attack on Credit Scorer',
    category: 'Adversarial ML',
    severity: 'high',
    status: 'investigating',
    source: 'MITRE ATLAS',
    detected: '2026-03-15',
    description: 'Pattern of adversarial feature manipulation detected in credit scoring API inputs. Coordinated attempts to game model predictions by manipulating input features near decision boundaries.',
    affected_systems: ['MDL-001'],
    indicators_of_compromise: [
      'Unusual clustering of feature values near known decision boundaries',
      'Repeated submissions with systematic feature perturbations from same IP range',
      'Spike in borderline prediction scores (0.48-0.52 range)',
    ],
    remediation_steps: [
      'Enable adversarial input detection module',
      'Add input perturbation monitoring',
      'Block suspicious IP ranges at WAF level',
      'Review and harden decision boundary regions',
    ],
    assigned_to: 'U-007',
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'STHR-002',
    name: 'Model Inversion Attack Attempt — Fraud Engine',
    category: 'Model Theft',
    severity: 'medium',
    status: 'mitigated',
    source: 'Internal Detection',
    detected: '2026-02-20',
    description: 'Detected systematic querying pattern consistent with model inversion attack against Fraud Detection Engine. Attacker attempting to reconstruct training data characteristics from prediction outputs.',
    affected_systems: ['MDL-002'],
    indicators_of_compromise: [
      'Over 50,000 API calls from single API key in 24 hours',
      'Methodical grid search pattern in input feature space',
      'No legitimate business context for query patterns',
    ],
    remediation_steps: [
      'API key revoked and replaced',
      'Rate limiting reduced to 100 calls/minute per key',
      'Output confidence scores rounded to 2 decimal places',
      'Differential privacy noise added to prediction outputs',
    ],
    assigned_to: 'U-007',
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'STHR-003',
    name: 'Training Data Poisoning — Sentiment Corpus',
    category: 'Data Poisoning',
    severity: 'medium',
    status: 'resolved',
    source: 'Data Quality Monitor',
    detected: '2026-01-25',
    description: 'Anomalous labels detected in Customer Sentiment Corpus (DS-006) during routine quality monitoring. Approximately 2,300 records had inverted sentiment labels, likely from automated labeling error.',
    affected_systems: ['MDL-006', 'DS-006'],
    indicators_of_compromise: [
      'Label distribution shift in recent batch (30% positive vs. historical 55%)',
      'High disagreement rate between automated and human labels',
      'Batch originated from DataLabeler-v2 agent during maintenance window',
    ],
    remediation_steps: [
      'Quarantined affected data batch',
      'Reverted to last known good label set',
      'Added label distribution monitoring with alerting',
      'Implemented human-in-the-loop validation for automated labels',
    ],
    assigned_to: 'U-003',
    created_at: '2026-01-25T10:00:00Z',
    updated_at: '2026-02-05T14:00:00Z',
  },
  {
    id: 'STHR-004',
    name: 'Credential Stuffing Against ML Admin Portal',
    category: 'Authentication Attack',
    severity: 'high',
    status: 'mitigated',
    source: 'SIEM Alert',
    detected: '2026-03-05',
    description: 'High-volume credential stuffing attack targeting the MLOps admin portal (admin.sentinel-grc.com). Over 15,000 login attempts from botnet using leaked credential databases.',
    affected_systems: ['admin.sentinel-grc.com'],
    indicators_of_compromise: [
      'Login failure rate spike to 98% from distributed IP range',
      'Automated login patterns with 100ms intervals',
      'Credential pairs matching known breach databases',
    ],
    remediation_steps: [
      'Enabled adaptive MFA for all admin accounts',
      'Deployed CAPTCHA on login page',
      'Blocked offending IP ranges at network edge',
      'Forced password reset for all admin accounts',
    ],
    assigned_to: 'U-001',
    created_at: '2026-03-05T02:00:00Z',
    updated_at: '2026-03-06T10:00:00Z',
  },
  {
    id: 'STHR-005',
    name: 'Supply Chain Risk — Compromised Python Package',
    category: 'Supply Chain',
    severity: 'critical',
    status: 'active',
    source: 'PyPI Advisory',
    detected: '2026-03-28',
    description: 'Typosquatting attack discovered on PyPI targeting ML packages. Malicious package "scikit-Iearn" (capital I instead of lowercase L) found in development environment requirements.txt.',
    affected_systems: ['ML Development Environment'],
    indicators_of_compromise: [
      'Suspicious outbound DNS queries from development containers',
      'Package hash mismatch in dependency verification',
      'Unexpected network connections to unknown C2 server',
    ],
    remediation_steps: [
      'Remove malicious package from all environments immediately',
      'Scan all development machines for indicators of compromise',
      'Implement package allowlist for ML dependencies',
      'Enable pip hash verification for all requirements files',
      'Audit all recent code commits from affected development environments',
    ],
    assigned_to: 'U-007',
    created_at: '2026-03-28T14:00:00Z',
    updated_at: '2026-03-30T09:00:00Z',
  },
  {
    id: 'STHR-006',
    name: 'Insider Threat — Unauthorized Model Export',
    category: 'Insider Threat',
    severity: 'high',
    status: 'investigating',
    source: 'DLP Alert',
    detected: '2026-03-20',
    description: 'Data Loss Prevention system detected attempted export of production model weights from AML Transaction Monitor (MDL-005). Transfer attempted to personal cloud storage.',
    affected_systems: ['MDL-005'],
    indicators_of_compromise: [
      'Large file upload (2.4GB) to unapproved cloud storage endpoint',
      'Access outside normal working hours (3:42 AM)',
      'Model artifact accessed via non-standard download method',
    ],
    remediation_steps: [
      'Transfer blocked by DLP policy',
      'User access to model artifacts temporarily suspended',
      'HR and Legal notified for investigation',
      'Implement model artifact access logging with real-time alerts',
    ],
    assigned_to: 'U-001',
    created_at: '2026-03-20T04:00:00Z',
    updated_at: '2026-03-28T16:00:00Z',
  },
];

// ── Red Team Campaigns ────────────────────────────────────────────────────────

export interface SeedRedTeamCampaign {
  id: string;
  name: string;
  objective: string;
  status: 'planned' | 'active' | 'completed' | 'paused';
  attack_vectors: string[];
  target_models: string[];
  lead: string;
  team_members: string[];
  start_date: string;
  end_date: string;
  total_tests: number;
  successful_attacks: number;
  critical_findings: number;
  high_findings: number;
  findings_summary: string[];
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

export const SEED_RED_TEAM_CAMPAIGNS: SeedRedTeamCampaign[] = [
  {
    id: 'RTC-001',
    name: 'Operation Shadow Prompt — Q4 2025',
    objective: 'Test resilience of all LLM-based systems against advanced prompt injection, jailbreaking, and prompt leaking techniques.',
    status: 'completed',
    attack_vectors: ['Direct Prompt Injection', 'Indirect Prompt Injection', 'Jailbreak (DAN, AIM)', 'System Prompt Extraction', 'Token Smuggling'],
    target_models: ['MDL-004'],
    lead: 'U-001',
    team_members: ['U-001', 'U-007', 'U-006'],
    start_date: '2025-11-01',
    end_date: '2025-11-30',
    total_tests: 245,
    successful_attacks: 38,
    critical_findings: 4,
    high_findings: 8,
    findings_summary: [
      'System prompt fully extracted via multi-turn conversation technique',
      'Safety guardrails bypassed using encoded instruction format',
      'Loan terms hallucination induced via adversarial context injection',
      'PII exfiltration achieved through role-play prompt technique',
    ],
    recommendations: [
      'Implement layered prompt defense (input filter + output filter + semantic analysis)',
      'Add instruction hierarchy with system prompt protection',
      'Deploy real-time adversarial input monitoring',
      'Retrain guardrail models with discovered adversarial examples',
    ],
    created_at: '2025-11-01T09:00:00Z',
    updated_at: '2025-12-05T14:00:00Z',
  },
  {
    id: 'RTC-002',
    name: 'Operation Data Breach — Q1 2026',
    objective: 'Simulate end-to-end data exfiltration scenarios targeting AI systems, model artifacts, and training datasets.',
    status: 'completed',
    attack_vectors: ['API Key Theft', 'Model Weight Exfiltration', 'Training Data Extraction', 'Side Channel Analysis', 'Privilege Escalation'],
    target_models: ['MDL-001', 'MDL-002', 'MDL-005'],
    lead: 'U-007',
    team_members: ['U-007', 'U-008', 'U-001'],
    start_date: '2026-01-15',
    end_date: '2026-02-15',
    total_tests: 180,
    successful_attacks: 22,
    critical_findings: 3,
    high_findings: 6,
    findings_summary: [
      'S3 bucket misconfiguration allowed unauthenticated model artifact download',
      'API key recovered from application debug logs in staging environment',
      'Lateral movement from compromised ML pipeline to production data store',
    ],
    recommendations: [
      'Implement zero-trust architecture for model artifact storage',
      'Enable comprehensive secret scanning across all environments',
      'Segment ML pipeline network from production data stores',
      'Add model artifact integrity verification (signed hashes)',
    ],
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-02-20T14:00:00Z',
  },
  {
    id: 'RTC-003',
    name: 'Operation Bias Hunter — Q2 2026',
    objective: 'Adversarial testing to discover and exploit bias vulnerabilities in production models. Test fairness controls and detection mechanisms.',
    status: 'planned',
    attack_vectors: ['Adversarial Feature Manipulation', 'Decision Boundary Probing', 'Demographic Parity Attacks', 'Proxy Discrimination Testing', 'Fairness Constraint Evasion'],
    target_models: ['MDL-001', 'MDL-004', 'MDL-007'],
    lead: 'U-006',
    team_members: ['U-006', 'U-003', 'U-004'],
    start_date: '2026-04-15',
    end_date: '2026-05-15',
    total_tests: 0,
    successful_attacks: 0,
    critical_findings: 0,
    high_findings: 0,
    findings_summary: [],
    recommendations: [],
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
];

// ── Data Assets ───────────────────────────────────────────────────────────────

export interface SeedDataAsset {
  id: string;
  name: string;
  type: 'database' | 'data_lake' | 'feature_store' | 'vector_store' | 'file_store' | 'stream' | 'api' | 'warehouse';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  sensitivity: string;
  owner: string;
  location: string;
  encryption: string;
  retention_policy: string;
  linked_models: string[];
  pii_fields: string[];
  records_count: number;
  size_gb: number;
  last_scanned: string;
  compliance_tags: string[];
  status: 'active' | 'archived' | 'under_review' | 'quarantined';
  created_at: string;
  updated_at: string;
}

export const SEED_DATA_ASSETS: SeedDataAsset[] = [
  {
    id: 'DA-001',
    name: 'Customer Credit Bureau Data Warehouse',
    type: 'warehouse',
    classification: 'restricted',
    sensitivity: 'PII — Financial',
    owner: 'U-004',
    location: 'us-east-1 / Snowflake',
    encryption: 'AES-256 at rest, TLS 1.3 in transit',
    retention_policy: '7 years (regulatory requirement)',
    linked_models: ['MDL-001', 'MDL-004'],
    pii_fields: ['SSN', 'Full Name', 'Date of Birth', 'Address', 'Credit Score', 'Income'],
    records_count: 12500000,
    size_gb: 480,
    last_scanned: '2026-03-15',
    compliance_tags: ['GDPR', 'CCPA', 'ECOA', 'FCRA'],
    status: 'active',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2026-03-15T14:00:00Z',
  },
  {
    id: 'DA-002',
    name: 'Transaction Event Stream',
    type: 'stream',
    classification: 'confidential',
    sensitivity: 'PII — Financial',
    owner: 'U-004',
    location: 'us-east-1 / Kafka',
    encryption: 'AES-256 at rest, TLS 1.3 in transit',
    retention_policy: '90 days (hot), 5 years (cold storage)',
    linked_models: ['MDL-002', 'MDL-005'],
    pii_fields: ['Account Number', 'Transaction Amount', 'Merchant', 'IP Address'],
    records_count: 890000000,
    size_gb: 2400,
    last_scanned: '2026-03-28',
    compliance_tags: ['PCI-DSS', 'BSA/AML', 'SOX'],
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
  },
  {
    id: 'DA-003',
    name: 'ML Feature Store — Production',
    type: 'feature_store',
    classification: 'confidential',
    sensitivity: 'Derived PII',
    owner: 'U-003',
    location: 'us-east-1 / SageMaker Feature Store',
    encryption: 'AES-256 at rest, TLS 1.3 in transit',
    retention_policy: '3 years',
    linked_models: ['MDL-001', 'MDL-002', 'MDL-003', 'MDL-005'],
    pii_fields: ['Customer ID (hashed)', 'Behavioral Features', 'Aggregated Metrics'],
    records_count: 45000000,
    size_gb: 120,
    last_scanned: '2026-03-20',
    compliance_tags: ['GDPR Art. 5', 'NIST AI RMF'],
    status: 'active',
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'DA-004',
    name: 'Policy & Regulatory Document Corpus',
    type: 'vector_store',
    classification: 'internal',
    sensitivity: 'Non-PII',
    owner: 'U-002',
    location: 'us-east-1 / Pinecone',
    encryption: 'AES-256 at rest, TLS 1.3 in transit',
    retention_policy: '10 years',
    linked_models: ['MDL-004'],
    pii_fields: [],
    records_count: 185000,
    size_gb: 15,
    last_scanned: '2026-03-10',
    compliance_tags: ['ISO 27001'],
    status: 'active',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 'DA-005',
    name: 'HR Candidate & Employee Records',
    type: 'database',
    classification: 'restricted',
    sensitivity: 'PII — HR',
    owner: 'U-006',
    location: 'us-east-1 / PostgreSQL RDS',
    encryption: 'AES-256 at rest, TLS 1.3 in transit',
    retention_policy: '7 years post-employment',
    linked_models: ['MDL-007'],
    pii_fields: ['Full Name', 'SSN', 'Date of Birth', 'Gender', 'Ethnicity', 'Salary', 'Performance Ratings'],
    records_count: 42000,
    size_gb: 8,
    last_scanned: '2026-03-01',
    compliance_tags: ['GDPR', 'EEOC', 'Title VII', 'ADA'],
    status: 'under_review',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'DA-006',
    name: 'Insurance Claims Repository',
    type: 'data_lake',
    classification: 'restricted',
    sensitivity: 'PII — Health',
    owner: 'U-004',
    location: 'us-east-1 / S3 Data Lake',
    encryption: 'AES-256 at rest, TLS 1.3 in transit, SSE-KMS',
    retention_policy: '10 years (regulatory requirement)',
    linked_models: ['MDL-008'],
    pii_fields: ['Policyholder Name', 'SSN', 'Medical Records', 'Diagnosis Codes', 'Claim Amount'],
    records_count: 3200000,
    size_gb: 850,
    last_scanned: '2026-02-28',
    compliance_tags: ['HIPAA', 'GDPR Art. 9', 'State Insurance Regulations'],
    status: 'active',
    created_at: '2024-09-01T10:00:00Z',
    updated_at: '2026-02-28T09:00:00Z',
  },
  {
    id: 'DA-007',
    name: 'Model Inference Logs Archive',
    type: 'data_lake',
    classification: 'confidential',
    sensitivity: 'Operational — Contains Input/Output',
    owner: 'U-008',
    location: 'us-east-1 / S3 Glacier',
    encryption: 'AES-256 at rest',
    retention_policy: '2 years',
    linked_models: ['MDL-001', 'MDL-002', 'MDL-004', 'MDL-005', 'MDL-006'],
    pii_fields: ['Request IP', 'Input Feature Hashes', 'User Session ID'],
    records_count: 520000000,
    size_gb: 1800,
    last_scanned: '2026-03-01',
    compliance_tags: ['SOC 2 CC7.2', 'ISO 27001 A.12.4'],
    status: 'active',
    created_at: '2025-03-01T10:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
  },
  {
    id: 'DA-008',
    name: 'Customer Feedback & Survey Data',
    type: 'database',
    classification: 'internal',
    sensitivity: 'PII — Contact',
    owner: 'U-003',
    location: 'us-east-1 / PostgreSQL RDS',
    encryption: 'AES-256 at rest, TLS 1.3 in transit',
    retention_policy: '3 years',
    linked_models: ['MDL-003', 'MDL-006'],
    pii_fields: ['Email', 'Customer ID', 'Free Text Feedback'],
    records_count: 2800000,
    size_gb: 25,
    last_scanned: '2026-03-18',
    compliance_tags: ['GDPR', 'CCPA'],
    status: 'active',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2026-03-18T11:00:00Z',
  },
];

// ── Explainability Reports ────────────────────────────────────────────────────

export interface SeedExplainabilityReport {
  id: string;
  model_id: string;
  title: string;
  method: string;
  status: 'draft' | 'in_review' | 'published' | 'archived';
  generated_date: string;
  generated_by: string;
  scope: string;
  summary: string;
  top_features: {
    feature: string;
    importance: number;
    direction: 'positive' | 'negative' | 'neutral';
  }[];
  global_explanation: string;
  local_explanation_samples: number;
  framework_ref: string;
  created_at: string;
  updated_at: string;
}

export const SEED_EXPLAINABILITY_REPORTS: SeedExplainabilityReport[] = [
  {
    id: 'XAI-001',
    model_id: 'MDL-001',
    title: 'Credit Risk Scorer — SHAP Explainability Report Q1 2026',
    method: 'SHAP (TreeExplainer)',
    status: 'published',
    generated_date: '2026-03-15',
    generated_by: 'U-003',
    scope: 'Global and local explanations for Credit Risk Scorer v3.2.1 covering 10,000 sample predictions from Q1 2026.',
    summary: 'Top contributing features are payment history (32%), credit utilization (24%), and account age (18%). Geographic features contribute 8% which is under investigation for proxy bias. SHAP values show consistent feature contribution patterns across demographic subgroups.',
    top_features: [
      { feature: 'payment_history_score', importance: 0.32, direction: 'positive' },
      { feature: 'credit_utilization_ratio', importance: 0.24, direction: 'negative' },
      { feature: 'account_age_months', importance: 0.18, direction: 'positive' },
      { feature: 'num_credit_inquiries', importance: 0.10, direction: 'negative' },
      { feature: 'zip_code_median_income', importance: 0.08, direction: 'positive' },
      { feature: 'debt_to_income_ratio', importance: 0.05, direction: 'negative' },
      { feature: 'num_open_accounts', importance: 0.03, direction: 'neutral' },
    ],
    global_explanation: 'The model primarily relies on credit behavior features (payment history, utilization) for scoring decisions. Geographic proxy features (ZIP code) contribute 8% which exceeds the 5% threshold for proxy bias concerns. Recommendation: evaluate removal of geographic features from next model version.',
    local_explanation_samples: 10000,
    framework_ref: 'EU AI Act Art. 13',
    created_at: '2026-03-15T10:00:00Z',
    updated_at: '2026-03-18T14:00:00Z',
  },
  {
    id: 'XAI-002',
    model_id: 'MDL-002',
    title: 'Fraud Detection Engine — Feature Importance Report',
    method: 'SHAP (KernelExplainer) + Permutation Importance',
    status: 'published',
    generated_date: '2026-02-28',
    generated_by: 'U-004',
    scope: 'Global feature importance analysis and local explanation samples for Fraud Detection Engine v2.1 covering high-risk transaction subset.',
    summary: 'Transaction velocity (28%) and amount deviation (22%) are dominant predictors. Model shows strong performance across all demographic subgroups with minimal fairness concerns. Explanation quality validated against human expert assessments.',
    top_features: [
      { feature: 'transaction_velocity_24h', importance: 0.28, direction: 'negative' },
      { feature: 'amount_deviation_from_mean', importance: 0.22, direction: 'negative' },
      { feature: 'merchant_risk_category', importance: 0.15, direction: 'negative' },
      { feature: 'geo_distance_from_home', importance: 0.12, direction: 'negative' },
      { feature: 'device_fingerprint_mismatch', importance: 0.10, direction: 'negative' },
      { feature: 'time_since_last_transaction', importance: 0.08, direction: 'positive' },
      { feature: 'account_age_days', importance: 0.05, direction: 'positive' },
    ],
    global_explanation: 'Fraud detection relies primarily on behavioral anomaly features. No protected attribute features used directly. Geographic distance feature is legitimate for fraud detection (card-not-present scenarios) and does not exhibit discriminatory patterns.',
    local_explanation_samples: 5000,
    framework_ref: 'NIST AI RMF MEASURE 2.7',
    created_at: '2026-02-28T10:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'XAI-003',
    model_id: 'MDL-004',
    title: 'Loan Approval Assistant — LLM Explanation Audit',
    method: 'Attention Analysis + Chain-of-Thought Evaluation',
    status: 'in_review',
    generated_date: '2026-03-20',
    generated_by: 'U-006',
    scope: 'Evaluation of LLM-generated explanations for loan approval reasoning. Sample of 500 decision explanations reviewed for accuracy, completeness, and faithfulness.',
    summary: 'LLM-generated explanations are linguistically coherent but 12% contain factual inaccuracies about regulatory requirements. Chain-of-thought analysis reveals the model sometimes confabulates regulatory citations. Explanation faithfulness score: 78% (below 90% threshold).',
    top_features: [
      { feature: 'applicant_income', importance: 0.25, direction: 'positive' },
      { feature: 'credit_score', importance: 0.22, direction: 'positive' },
      { feature: 'employment_stability', importance: 0.18, direction: 'positive' },
      { feature: 'debt_to_income', importance: 0.15, direction: 'negative' },
      { feature: 'loan_to_value', importance: 0.12, direction: 'negative' },
      { feature: 'property_type', importance: 0.05, direction: 'neutral' },
      { feature: 'applicant_age', importance: 0.03, direction: 'positive' },
    ],
    global_explanation: 'CRITICAL: LLM explanation faithfulness below acceptable threshold. 12% of explanations contain hallucinated regulatory references. The model cites non-existent ECOA provisions in 8% of adverse decision explanations. RAG pipeline integration required before production use.',
    local_explanation_samples: 500,
    framework_ref: 'EU AI Act Art. 13 + GDPR Art. 22',
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'XAI-004',
    model_id: 'MDL-005',
    title: 'AML Transaction Monitor — Suspicious Activity Explanation Report',
    method: 'LIME + Rule Attribution',
    status: 'published',
    generated_date: '2026-03-10',
    generated_by: 'U-004',
    scope: 'Local explanation analysis for SAR-flagged transactions in Q1 2026. Covers 2,400 flagged transactions with LIME attribution and rule-based explanation generation.',
    summary: 'Transaction pattern features dominate SAR flagging decisions. LIME explanations align well with analyst expectations (92% agreement rate). Rule attribution provides clear audit trail for regulatory reporting.',
    top_features: [
      { feature: 'structuring_pattern_score', importance: 0.30, direction: 'negative' },
      { feature: 'cross_border_frequency', importance: 0.20, direction: 'negative' },
      { feature: 'counterparty_risk_score', importance: 0.18, direction: 'negative' },
      { feature: 'amount_velocity_deviation', importance: 0.15, direction: 'negative' },
      { feature: 'account_dormancy_reactivation', importance: 0.10, direction: 'negative' },
      { feature: 'beneficial_owner_complexity', importance: 0.05, direction: 'negative' },
      { feature: 'jurisdiction_risk_tier', importance: 0.02, direction: 'negative' },
    ],
    global_explanation: 'AML flagging decisions are primarily driven by transaction structuring patterns and cross-border activity. Explanation quality is sufficient for regulatory SAR filing requirements. Analyst agreement rate of 92% exceeds the 85% threshold.',
    local_explanation_samples: 2400,
    framework_ref: 'BSA/AML SAR Requirements',
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-12T09:00:00Z',
  },
];

// ── Conformity Assessments ────────────────────────────────────────────────────

export interface SeedConformityAssessment {
  id: string;
  title: string;
  model_id: string;
  framework: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  assessor_type: 'internal' | 'notified_body' | 'third_party';
  assessor_name: string;
  risk_classification: string;
  articles_assessed: {
    article: string;
    title: string;
    status: 'compliant' | 'partially_compliant' | 'non_compliant' | 'not_assessed';
    findings: string;
  }[];
  overall_result: 'pass' | 'conditional_pass' | 'fail' | 'pending';
  certificate_id: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
}

export const SEED_CONFORMITY_ASSESSMENTS: SeedConformityAssessment[] = [
  {
    id: 'CA-001',
    title: 'EU AI Act Conformity — Credit Risk Scorer',
    model_id: 'MDL-001',
    framework: 'EU AI Act',
    status: 'in_progress',
    assessor_type: 'notified_body',
    assessor_name: 'TUV Rheinland AI Assessment Division',
    risk_classification: 'High Risk — Annex III, 5(b) Creditworthiness',
    articles_assessed: [
      { article: 'Art. 9', title: 'Risk Management System', status: 'partially_compliant', findings: 'Risk management process exists but does not adequately address LLM-specific risks and adversarial inputs.' },
      { article: 'Art. 10', title: 'Data and Data Governance', status: 'non_compliant', findings: 'Training data representativeness not documented. Bias examination incomplete for geographic proxy features.' },
      { article: 'Art. 11', title: 'Technical Documentation', status: 'partially_compliant', findings: 'Model card exists but lacks required detail on design choices, validation methodology, and known limitations.' },
      { article: 'Art. 13', title: 'Transparency', status: 'non_compliant', findings: 'User-facing transparency documentation not available. No instructions for deployers on intended use and limitations.' },
      { article: 'Art. 14', title: 'Human Oversight', status: 'compliant', findings: 'Human review gate implemented for all adverse decisions. Override mechanism available to authorized operators.' },
      { article: 'Art. 15', title: 'Accuracy, Robustness, Cybersecurity', status: 'partially_compliant', findings: 'Accuracy monitoring in place. Adversarial robustness testing not yet formalized.' },
    ],
    overall_result: 'fail',
    certificate_id: '',
    valid_until: '',
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'CA-002',
    title: 'EU AI Act Conformity — Fraud Detection Engine',
    model_id: 'MDL-002',
    framework: 'EU AI Act',
    status: 'in_progress',
    assessor_type: 'internal',
    assessor_name: 'Acme Financial Corp Internal Assessment Team',
    risk_classification: 'High Risk — Annex III, 5(a) Credit Institutions',
    articles_assessed: [
      { article: 'Art. 9', title: 'Risk Management System', status: 'compliant', findings: 'Comprehensive risk management process covering model performance, fairness, and security risks.' },
      { article: 'Art. 10', title: 'Data and Data Governance', status: 'compliant', findings: 'Training data governance meets requirements. Bias examination documented with acceptable results.' },
      { article: 'Art. 11', title: 'Technical Documentation', status: 'partially_compliant', findings: 'Technical documentation complete for model architecture. Needs update for latest v2.1 deployment configuration.' },
      { article: 'Art. 13', title: 'Transparency', status: 'partially_compliant', findings: 'Basic transparency documentation exists. Deployer instructions need enhancement for Art. 13(3) requirements.' },
      { article: 'Art. 14', title: 'Human Oversight', status: 'compliant', findings: 'Analyst review process for flagged transactions. Escalation procedures documented and tested.' },
      { article: 'Art. 15', title: 'Accuracy, Robustness, Cybersecurity', status: 'compliant', findings: 'Regular accuracy testing, adversarial robustness validated via red team exercises, security controls verified.' },
    ],
    overall_result: 'conditional_pass',
    certificate_id: '',
    valid_until: '',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-25T11:00:00Z',
  },
  {
    id: 'CA-003',
    title: 'EU AI Act Conformity — AML Transaction Monitor',
    model_id: 'MDL-005',
    framework: 'EU AI Act',
    status: 'completed',
    assessor_type: 'third_party',
    assessor_name: 'Deloitte AI Assurance Practice',
    risk_classification: 'High Risk — Annex III, 5(a) Credit Institutions',
    articles_assessed: [
      { article: 'Art. 9', title: 'Risk Management System', status: 'compliant', findings: 'Risk management system meets all requirements. False positive management process well-documented.' },
      { article: 'Art. 10', title: 'Data and Data Governance', status: 'compliant', findings: 'Data governance framework comprehensive. Training data quality, relevance, and representativeness documented.' },
      { article: 'Art. 11', title: 'Technical Documentation', status: 'compliant', findings: 'Full technical documentation package available including design choices, training methodology, and validation results.' },
      { article: 'Art. 13', title: 'Transparency', status: 'compliant', findings: 'Deployer documentation complete. Instructions for use, known limitations, and performance boundaries documented.' },
      { article: 'Art. 14', title: 'Human Oversight', status: 'compliant', findings: 'Two-tier human review process for SAR filings. Analyst override capability with full audit trail.' },
      { article: 'Art. 15', title: 'Accuracy, Robustness, Cybersecurity', status: 'compliant', findings: 'Model accuracy validated independently. Adversarial testing completed. Security hardening verified.' },
    ],
    overall_result: 'pass',
    certificate_id: 'EU-AI-CA-2026-00142',
    valid_until: '2027-03-15',
    created_at: '2025-12-01T10:00:00Z',
    updated_at: '2026-03-15T14:00:00Z',
  },
];

// ── Incidents (additional) ────────────────────────────────────────────────────

export interface SeedIncident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed';
  category: string;
  reported_date: string;
  resolved_date: string;
  reporter: string;
  assignee: string;
  description: string;
  linked_model: string;
  root_cause: string;
  impact: string;
  corrective_actions: string[];
  created_at: string;
  updated_at: string;
}

export const SEED_INCIDENTS: SeedIncident[] = [
  {
    id: 'SINC-001',
    title: 'AML Model False Positive Rate Spike',
    severity: 'high',
    status: 'mitigating',
    category: 'Performance Degradation',
    reported_date: '2026-03-18',
    resolved_date: '',
    reporter: 'U-004',
    assignee: 'U-003',
    description: 'AML Transaction Monitor false positive rate spiked from 4.8% to 9.2% following new payment product launch. SAR review queue backlog growing.',
    linked_model: 'MDL-005',
    root_cause: 'New payment product transaction patterns not represented in training data. Model treating unfamiliar patterns as suspicious.',
    impact: 'Analyst workload increased 90%. SAR filing timeline at risk. 340 legitimate transactions blocked in 48 hours.',
    corrective_actions: [
      'Emergency model recalibration with new transaction patterns',
      'Temporary threshold adjustment for new payment product',
      'Additional analyst staffing from vendor partner',
      'Root cause analysis and model retraining scheduled',
    ],
    created_at: '2026-03-18T08:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'SINC-002',
    title: 'Churn Predictor Data Pipeline Failure',
    severity: 'medium',
    status: 'resolved',
    category: 'System Failure',
    reported_date: '2026-02-15',
    resolved_date: '2026-02-17',
    reporter: 'U-008',
    assignee: 'U-008',
    description: 'Churn Predictor feature pipeline failed silently for 72 hours. Model serving stale features from cache, degrading prediction quality.',
    linked_model: 'MDL-003',
    root_cause: 'Feature store ETL job failed due to schema change in upstream data source. No alerting configured for pipeline failures.',
    impact: 'Churn predictions degraded for 72 hours. Estimated 15% accuracy drop during period. Two retention campaigns launched with stale predictions.',
    corrective_actions: [
      'Pipeline failure alerting implemented with PagerDuty integration',
      'Schema validation added to ETL ingestion layer',
      'Feature freshness monitoring dashboard deployed',
      'Stale feature detection circuit breaker implemented',
    ],
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-02-17T16:00:00Z',
  },
  {
    id: 'SINC-003',
    title: 'Credit Scorer Latency Degradation Under Load',
    severity: 'medium',
    status: 'resolved',
    category: 'Performance Degradation',
    reported_date: '2026-01-22',
    resolved_date: '2026-01-25',
    reporter: 'U-003',
    assignee: 'U-008',
    description: 'Credit Risk Scorer P99 latency increased from 45ms to 320ms during peak loan application period. SLA breach for downstream applications.',
    linked_model: 'MDL-001',
    root_cause: 'Auto-scaling policy ceiling too low for seasonal application volume. GPU instance warm-up time exceeding target.',
    impact: 'Loan application processing delayed for 8,000 applications over 3-hour window. Customer complaint volume increased 40%.',
    corrective_actions: [
      'Increased auto-scaling ceiling from 10 to 25 instances',
      'Implemented predictive scaling based on historical patterns',
      'Added GPU instance pre-warming during known peak periods',
      'Updated SLA with downstream services for peak scenarios',
    ],
    created_at: '2026-01-22T14:00:00Z',
    updated_at: '2026-01-25T10:00:00Z',
  },
  {
    id: 'SINC-004',
    title: 'Unauthorized GPT-4 API Usage in Research Department',
    severity: 'high',
    status: 'closed',
    category: 'Shadow AI',
    reported_date: '2026-02-18',
    resolved_date: '2026-02-25',
    reporter: 'U-001',
    assignee: 'U-001',
    description: 'Network monitoring detected unauthorized OpenAI API calls from research department workstations. Researchers using personal API keys for internal data analysis.',
    linked_model: '',
    root_cause: 'Researchers used personal OpenAI API keys to analyze internal financial data without IT approval. Motivated by perceived slowness of internal AI tools approval process.',
    impact: 'Internal financial data (non-PII) sent to OpenAI API without DPA coverage. Potential competitive intelligence exposure. 4,200 API calls over 2-week period.',
    corrective_actions: [
      'Personal API key usage blocked via network policy',
      'Expedited internal AI sandbox provisioning for research team',
      'Shadow AI awareness training mandatory for all research staff',
      'API egress monitoring expanded to cover all departments',
    ],
    created_at: '2026-02-18T09:00:00Z',
    updated_at: '2026-02-25T14:00:00Z',
  },
  {
    id: 'SINC-005',
    title: 'Sentiment Analyzer Gender Bias Detection',
    severity: 'medium',
    status: 'resolved',
    category: 'Bias/Fairness',
    reported_date: '2026-01-10',
    resolved_date: '2026-02-05',
    reporter: 'U-005',
    assignee: 'U-003',
    description: 'Routine bias audit detected statistically significant gender bias in Customer Sentiment Analyzer. Male-authored feedback rated 0.12 points more positively than female-authored feedback.',
    linked_model: 'MDL-006',
    root_cause: 'Training data imbalance in sentiment labels. Historical customer service interactions contained implicit gender bias in resolution quality ratings.',
    impact: 'Minor impact on customer experience reporting. No direct customer impact as model used for aggregate analysis only. Bias present for approximately 4 months before detection.',
    corrective_actions: [
      'Rebalanced training dataset with stratified gender sampling',
      'Implemented continuous bias monitoring with weekly automated checks',
      'Added gender-blind feature processing for sentiment analysis',
      'Model retrained and bias metrics now within thresholds (0.96 gender parity)',
    ],
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-02-05T14:00:00Z',
  },
  {
    id: 'SINC-006',
    title: 'Model Serving Infrastructure Outage',
    severity: 'critical',
    status: 'resolved',
    category: 'System Failure',
    reported_date: '2025-12-05',
    resolved_date: '2025-12-05',
    reporter: 'U-008',
    assignee: 'U-008',
    description: 'Complete model serving infrastructure outage affecting all production models. Caused by AWS us-east-1 availability zone failure impacting SageMaker endpoints.',
    linked_model: '',
    root_cause: 'Single availability zone dependency for SageMaker inference endpoints. DR failover not configured for cross-AZ deployment.',
    impact: 'All model inference unavailable for 47 minutes. Fraud detection operated in rule-based fallback mode. Credit scoring temporarily suspended. Estimated 15,000 transactions processed without ML scoring.',
    corrective_actions: [
      'Multi-AZ deployment configured for all SageMaker endpoints',
      'Cross-region warm standby implemented for critical models',
      'Automated failover testing added to quarterly BCP exercises',
      'Incident response runbook updated with AI platform-specific procedures',
    ],
    created_at: '2025-12-05T03:00:00Z',
    updated_at: '2025-12-06T10:00:00Z',
  },
  {
    id: 'SINC-007',
    title: 'Loan Assistant Produced Discriminatory Denial Reason',
    severity: 'critical',
    status: 'investigating',
    category: 'Bias/Fairness',
    reported_date: '2026-03-25',
    resolved_date: '',
    reporter: 'U-002',
    assignee: 'U-006',
    description: 'Loan Approval Assistant generated a denial reason that explicitly referenced applicant age as a negative factor. Flagged during mandatory human review of adverse decisions.',
    linked_model: 'MDL-004',
    root_cause: 'LLM generating reasoning that surfaces age-correlated features in human-readable format, making proxy discrimination visible in output text.',
    impact: 'Single incident caught by human reviewer before customer delivery. Raises concerns about systematic age bias in LLM reasoning that may not always surface in text form.',
    corrective_actions: [
      'All LLM-generated denial reasons suspended pending investigation',
      'Comprehensive audit of 5,000 historical denial reasons initiated',
      'Age-related feature masking implemented in LLM prompt template',
      'External EEOC counsel engaged for compliance assessment',
    ],
    created_at: '2026-03-25T11:00:00Z',
    updated_at: '2026-03-30T14:00:00Z',
  },
  {
    id: 'SINC-008',
    title: 'Feature Store Data Quality Degradation',
    severity: 'low',
    status: 'closed',
    category: 'Data Quality',
    reported_date: '2026-03-01',
    resolved_date: '2026-03-05',
    reporter: 'U-003',
    assignee: 'U-003',
    description: 'Feature store data quality checks detected 0.3% null rate increase in customer behavioral features. Within tolerance but trending upward.',
    linked_model: 'MDL-003',
    root_cause: 'New customer onboarding flow missing optional profile fields that feed into behavioral feature computation.',
    impact: 'Minimal impact. Feature imputation handling gracefully managed null values. Churn predictor accuracy unaffected within measurement precision.',
    corrective_actions: [
      'Updated onboarding flow to populate required fields',
      'Added data quality trend alerting for gradual degradation patterns',
      'Documented acceptable null rate thresholds per feature group',
    ],
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-05T09:00:00Z',
  },
];

// ── Remediation Items ─────────────────────────────────────────────────────────

export interface SeedRemediationItem {
  id: string;
  title: string;
  source_type: 'audit_finding' | 'vulnerability' | 'incident' | 'gap' | 'risk';
  source_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'overdue';
  priority: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  assignee: string;
  description: string;
  action_items: string[];
  due_date: string;
  completed_date: string;
  verification_method: string;
  created_at: string;
  updated_at: string;
}

export const SEED_REMEDIATION_ITEMS: SeedRemediationItem[] = [
  {
    id: 'REM-001',
    title: 'Remediate Credit Scorer Geographic Proxy Bias',
    source_type: 'audit_finding',
    source_id: 'AF-007',
    status: 'in_progress',
    priority: 'critical',
    owner: 'U-003',
    assignee: 'U-003',
    description: 'Remove geographic proxy features from Credit Risk Scorer and retrain model to meet EU AI Act Art. 10 data governance requirements.',
    action_items: [
      'Identify all geographic proxy features (ZIP code, county, state-level indicators)',
      'Conduct feature ablation study to quantify impact of removal',
      'Retrain model v3.3.0 without geographic features',
      'Run comprehensive bias audit on retrained model',
      'Update model documentation and EU AI Act conformity assessment',
    ],
    due_date: '2026-05-15',
    completed_date: '',
    verification_method: 'Bias audit results showing all protected attribute metrics above 0.85 threshold. External auditor sign-off.',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-25T14:00:00Z',
  },
  {
    id: 'REM-002',
    title: 'Renew OpenAI Data Processing Agreement',
    source_type: 'audit_finding',
    source_id: 'AF-006',
    status: 'overdue',
    priority: 'critical',
    owner: 'U-002',
    assignee: 'U-002',
    description: 'Negotiate and execute renewed DPA with OpenAI including EU AI Act-compliant clauses for data processing, sub-processor management, and data residency.',
    action_items: [
      'Draft DPA amendment with EU AI Act-specific clauses',
      'Legal review of amended terms',
      'Negotiate data residency requirements for EU citizen data',
      'Obtain sub-processor audit certifications',
      'Execute renewed agreement',
    ],
    due_date: '2026-03-31',
    completed_date: '',
    verification_method: 'Signed DPA with confirmed EU data residency, AI Act compliance clauses, and valid sub-processor documentation.',
    created_at: '2026-02-05T10:00:00Z',
    updated_at: '2026-03-28T16:00:00Z',
  },
  {
    id: 'REM-003',
    title: 'Implement Layered Prompt Injection Defense',
    source_type: 'vulnerability',
    source_id: 'SVULN-003',
    status: 'in_progress',
    priority: 'high',
    owner: 'U-007',
    assignee: 'U-007',
    description: 'Deploy multi-layer prompt injection defense architecture for all LLM-based systems, addressing findings from Red Team Campaign RTC-001.',
    action_items: [
      'Deploy input sanitization layer (regex + ML classifier)',
      'Implement instruction hierarchy with system prompt protection',
      'Add output filtering for sensitive information leakage',
      'Integrate real-time adversarial monitoring dashboard',
      'Conduct validation testing with adversarial test suite',
    ],
    due_date: '2026-04-30',
    completed_date: '',
    verification_method: 'Red team re-test showing 90% reduction in successful prompt injection attacks. Continuous monitoring baseline established.',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-28T11:00:00Z',
  },
  {
    id: 'REM-004',
    title: 'Deploy Automated Shadow AI Detection',
    source_type: 'gap',
    source_id: 'GAP-010',
    status: 'in_progress',
    priority: 'high',
    owner: 'U-001',
    assignee: 'U-007',
    description: 'Implement automated network-level detection for unauthorized AI system deployments, replacing current manual detection processes.',
    action_items: [
      'Deploy network traffic analysis for known AI API endpoints (OpenAI, Anthropic, HuggingFace, etc.)',
      'Configure DLP rules for AI API key patterns',
      'Implement DNS monitoring for AI service domains',
      'Set up automated alerting and quarantine workflow',
      'Create dashboard for shadow AI monitoring',
    ],
    due_date: '2026-04-30',
    completed_date: '',
    verification_method: 'Detection of all test shadow AI deployments within 15 minutes. Zero false negative rate in validation testing.',
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
  {
    id: 'REM-005',
    title: 'Create EU AI Act Art. 13 Transparency Documentation',
    source_type: 'audit_finding',
    source_id: 'AF-008',
    status: 'in_progress',
    priority: 'critical',
    owner: 'U-006',
    assignee: 'U-006',
    description: 'Create comprehensive transparency documentation packages for MDL-001, MDL-004, and MDL-005 meeting EU AI Act Article 13 requirements.',
    action_items: [
      'Create model card for MDL-001 with intended use, limitations, and known biases',
      'Create model card for MDL-004 with LLM-specific transparency requirements',
      'Create model card for MDL-005 with AML regulatory context',
      'Develop deployer instruction manuals for each model',
      'Submit documentation package for conformity assessment review',
    ],
    due_date: '2026-05-30',
    completed_date: '',
    verification_method: 'Conformity assessment review sign-off on all transparency documentation packages. External assessor validation.',
    created_at: '2026-02-25T10:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
  },
  {
    id: 'REM-006',
    title: 'Upgrade PyTorch to Address Deserialization RCE',
    source_type: 'vulnerability',
    source_id: 'SVULN-001',
    status: 'in_progress',
    priority: 'critical',
    owner: 'U-008',
    assignee: 'U-008',
    description: 'Upgrade PyTorch from v2.2.0 to v2.2.1 across all ML environments and migrate model artifact format from pickle to safetensors.',
    action_items: [
      'Upgrade PyTorch in development environment and run test suite',
      'Convert all model artifacts to safetensors format',
      'Upgrade PyTorch in staging environment',
      'Run full regression test suite including model accuracy validation',
      'Deploy to production with staged rollout',
      'Disable pickle-based model loading in production',
    ],
    due_date: '2026-04-15',
    completed_date: '',
    verification_method: 'All environments running PyTorch 2.2.1. No pickle-based model files in any environment. Vulnerability scan confirming CVE-2026-2201 resolved.',
    created_at: '2026-03-12T10:00:00Z',
    updated_at: '2026-03-28T14:00:00Z',
  },
  {
    id: 'REM-007',
    title: 'Implement GDPR Art. 22 Customer Notification',
    source_type: 'audit_finding',
    source_id: 'AF-012',
    status: 'blocked',
    priority: 'high',
    owner: 'U-002',
    assignee: 'U-004',
    description: 'Implement mandatory customer notification for automated credit decisions, including right to contest and request human review per GDPR Art. 22(3).',
    action_items: [
      'Design customer notification template with legal team',
      'Implement notification trigger in credit decision pipeline',
      'Build human review request portal for customers',
      'Configure SLA tracking for human review requests (30-day maximum)',
      'Staff human review team for expected request volume',
    ],
    due_date: '2026-04-30',
    completed_date: '',
    verification_method: 'End-to-end test confirming notification delivery, review request submission, and human review completion within SLA.',
    created_at: '2025-09-01T10:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
  },
  {
    id: 'REM-008',
    title: 'Standardize Bias Measurement Methodology',
    source_type: 'audit_finding',
    source_id: 'AF-011',
    status: 'in_progress',
    priority: 'high',
    owner: 'U-003',
    assignee: 'U-003',
    description: 'Establish organization-wide standardized bias measurement methodology with consistent metrics, thresholds, and reporting formats across all AI teams.',
    action_items: [
      'Define standard bias metrics: DI ratio, SPD, EOpp, Calibration',
      'Set universal thresholds by risk tier (high: 0.85, limited: 0.80, minimal: 0.75)',
      'Create standardized bias report template',
      'Build automated bias measurement pipeline integrated with model CI/CD',
      'Train all ML teams on new methodology (TRN-003 update)',
    ],
    due_date: '2026-04-15',
    completed_date: '',
    verification_method: 'All production models measured using standardized methodology. Automated pipeline generating consistent reports. ML team certification through updated TRN-003.',
    created_at: '2025-11-25T10:00:00Z',
    updated_at: '2026-03-20T14:00:00Z',
  },
];

// ── Seed Data Categories (for Import Feature) ─────────────────────────────────

export const SEED_DATA_CATEGORIES = [
  { key: 'audits', label: 'Audits', data: SEED_AUDITS, icon: 'ClipboardText', section: 'Compliance' },
  { key: 'audit_findings', label: 'Audit Findings', data: SEED_AUDIT_FINDINGS, icon: 'MagnifyingGlass', section: 'Compliance' },
  { key: 'ai_impact_assessments', label: 'AI Impact Assessments', data: SEED_AI_IMPACT_ASSESSMENTS, icon: 'ShieldCheck', section: 'Compliance' },
  { key: 'conformity_assessments', label: 'Conformity Assessments', data: SEED_CONFORMITY_ASSESSMENTS, icon: 'Certificate', section: 'Compliance' },
  { key: 'exceptions', label: 'Exceptions', data: SEED_EXCEPTIONS, icon: 'Warning', section: 'Compliance' },
  { key: 'calendar_events', label: 'Compliance Calendar', data: SEED_CALENDAR_EVENTS, icon: 'Calendar', section: 'Compliance' },
  { key: 'workflow_templates', label: 'Workflow Templates', data: SEED_WORKFLOW_TEMPLATES, icon: 'GitBranch', section: 'Governance' },
  { key: 'workflow_instances', label: 'Workflow Instances', data: SEED_WORKFLOW_INSTANCES, icon: 'ArrowsClockwise', section: 'Governance' },
  { key: 'documents', label: 'Documents', data: SEED_DOCUMENTS, icon: 'FileText', section: 'Governance' },
  { key: 'maturity_assessments', label: 'Maturity Assessments', data: SEED_MATURITY_ASSESSMENTS, icon: 'ChartBar', section: 'Governance' },
  { key: 'training_courses', label: 'Training Courses', data: SEED_TRAINING_COURSES, icon: 'GraduationCap', section: 'Training' },
  { key: 'training_assignments', label: 'Training Assignments', data: SEED_TRAINING_ASSIGNMENTS, icon: 'UserList', section: 'Training' },
  { key: 'security_scans', label: 'Security Scans', data: SEED_SECURITY_SCANS, icon: 'Scan', section: 'Security' },
  { key: 'vulnerabilities', label: 'Vulnerabilities', data: SEED_VULNERABILITIES, icon: 'Bug', section: 'Security' },
  { key: 'threats', label: 'Threats', data: SEED_THREATS, icon: 'Lightning', section: 'Security' },
  { key: 'red_team_campaigns', label: 'Red Team Campaigns', data: SEED_RED_TEAM_CAMPAIGNS, icon: 'Target', section: 'Security' },
  { key: 'data_assets', label: 'Data Assets', data: SEED_DATA_ASSETS, icon: 'Database', section: 'Data Governance' },
  { key: 'explainability_reports', label: 'Explainability Reports', data: SEED_EXPLAINABILITY_REPORTS, icon: 'TreeStructure', section: 'AI/ML' },
  { key: 'incidents', label: 'Incidents', data: SEED_INCIDENTS, icon: 'Siren', section: 'Risk' },
  { key: 'remediation_items', label: 'Remediation Items', data: SEED_REMEDIATION_ITEMS, icon: 'Wrench', section: 'Risk' },
  { key: 'bcp_plans', label: 'BCP Plans', data: SEED_BCP_PLANS, icon: 'Lifebuoy', section: 'Risk' },
] as const;

// ── Master Export ──────────────────────────────────────────────────────────────

export const ALL_SEED_DATA = {
  users: SEED_USERS,
  audits: SEED_AUDITS,
  audit_findings: SEED_AUDIT_FINDINGS,
  ai_impact_assessments: SEED_AI_IMPACT_ASSESSMENTS,
  exceptions: SEED_EXCEPTIONS,
  workflow_templates: SEED_WORKFLOW_TEMPLATES,
  workflow_instances: SEED_WORKFLOW_INSTANCES,
  training_courses: SEED_TRAINING_COURSES,
  training_assignments: SEED_TRAINING_ASSIGNMENTS,
  documents: SEED_DOCUMENTS,
  bcp_plans: SEED_BCP_PLANS,
  calendar_events: SEED_CALENDAR_EVENTS,
  maturity_assessments: SEED_MATURITY_ASSESSMENTS,
  security_scans: SEED_SECURITY_SCANS,
  vulnerabilities: SEED_VULNERABILITIES,
  threats: SEED_THREATS,
  red_team_campaigns: SEED_RED_TEAM_CAMPAIGNS,
  data_assets: SEED_DATA_ASSETS,
  explainability_reports: SEED_EXPLAINABILITY_REPORTS,
  conformity_assessments: SEED_CONFORMITY_ASSESSMENTS,
  incidents: SEED_INCIDENTS,
  remediation_items: SEED_REMEDIATION_ITEMS,
} as const;
