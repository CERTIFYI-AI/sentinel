-- ============================================================================
-- Sentinel AI GRC Platform — Comprehensive Seed Data
-- Organization: Acme Financial Corp (Fortune 500 Financial Services)
-- Target: Supabase (PostgreSQL)
-- Generated: 2025-2026 timeframe
--
-- NOTES:
--   - All id columns are TEXT type (gen_random_uuid()::text pattern)
--   - PascalCase tables use double-quoted names with camelCase columns (Prisma ORM)
--   - snake_case tables use unquoted names with snake_case columns
--   - All INSERTs use ON CONFLICT DO NOTHING for idempotency
--   - Foreign key references are consistent across all tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. "Tenant" — Organization (1 row)
-- ============================================================================
INSERT INTO "Tenant" (id, name, domain, settings, "createdAt", "updatedAt")
VALUES (
  't-acme-001',
  'Acme Financial Corp',
  'acmefinancial.com',
  '{"plan": "enterprise", "modules": ["ai-governance", "compliance", "risk", "audit", "vendor", "policy", "security", "training"], "ssoEnabled": true, "maxUsers": 500}',
  '2025-01-15T09:00:00Z',
  '2026-03-01T14:30:00Z'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. "User" — 8 users
-- ============================================================================
INSERT INTO "User" (id, email, name, role, department, "passwordHash", "tenantId", "createdAt", "updatedAt") VALUES
  ('u-001', 'sarah.chen@acmefinancial.com', 'Sarah Chen', 'CISO', 'Information Security', '$2b$12$placeholder_hash_sarah_chen_001', 't-acme-001', '2025-01-15T09:00:00Z', '2026-03-15T10:00:00Z'),
  ('u-002', 'mike.johnson@acmefinancial.com', 'Mike Johnson', 'Compliance Lead', 'Compliance', '$2b$12$placeholder_hash_mike_johnson_002', 't-acme-001', '2025-01-16T10:00:00Z', '2026-03-10T11:00:00Z'),
  ('u-003', 'alice.park@acmefinancial.com', 'Alice Park', 'ML Engineer', 'AI/ML Engineering', '$2b$12$placeholder_hash_alice_park_003', 't-acme-001', '2025-01-20T08:30:00Z', '2026-03-12T09:00:00Z'),
  ('u-004', 'bob.kumar@acmefinancial.com', 'Bob Kumar', 'Risk Manager', 'Enterprise Risk', '$2b$12$placeholder_hash_bob_kumar_004', 't-acme-001', '2025-02-01T09:00:00Z', '2026-03-14T15:00:00Z'),
  ('u-005', 'james.liu@acmefinancial.com', 'James Liu', 'Data Protection Officer', 'Legal & Privacy', '$2b$12$placeholder_hash_james_liu_005', 't-acme-001', '2025-02-10T10:30:00Z', '2026-02-28T16:00:00Z'),
  ('u-006', 'emma.wilson@acmefinancial.com', 'Emma Wilson', 'Security Lead', 'Information Security', '$2b$12$placeholder_hash_emma_wilson_006', 't-acme-001', '2025-02-15T11:00:00Z', '2026-03-05T09:30:00Z'),
  ('u-007', 'priya.patel@acmefinancial.com', 'Priya Patel', 'Auditor', 'Internal Audit', '$2b$12$placeholder_hash_priya_patel_007', 't-acme-001', '2025-03-01T09:00:00Z', '2026-03-08T12:00:00Z'),
  ('u-008', 'david.kim@acmefinancial.com', 'David Kim', 'DevOps Lead', 'Platform Engineering', '$2b$12$placeholder_hash_david_kim_008', 't-acme-001', '2025-03-05T08:00:00Z', '2026-03-11T10:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. "Framework" — 7 frameworks
-- ============================================================================
INSERT INTO "Framework" (id, name, version, description, category, "tenantId", "createdAt") VALUES
  ('fw-001', 'ISO 27001:2022', '2022', 'Information security management systems — Requirements', 'Information Security', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('fw-002', 'SOC 2 Type II', '2017', 'Trust Services Criteria for service organizations', 'Audit & Assurance', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('fw-003', 'EU AI Act', '2024', 'European Union Artificial Intelligence Act — Regulation 2024/1689', 'AI Regulation', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('fw-004', 'NIST AI RMF', '1.0', 'NIST Artificial Intelligence Risk Management Framework', 'AI Risk Management', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('fw-005', 'GDPR', '2016/679', 'General Data Protection Regulation', 'Data Privacy', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('fw-006', 'ISO 42001', '2023', 'Artificial Intelligence Management System (AIMS)', 'AI Governance', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('fw-007', 'OWASP AI Top 10', '2025', 'Top 10 security risks for AI/ML systems', 'AI Security', 't-acme-001', '2025-02-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. "Policy" — 10 policies
-- ============================================================================
INSERT INTO "Policy" (id, title, status, version, content, "ownerId", "frameworkId", "tenantId", "approvedAt", "deprecatedAt", "createdAt", "updatedAt") VALUES
  ('pol-001', 'AI Model Governance Policy', 'approved', 3, 'Establishes mandatory governance requirements for all AI/ML models deployed at Acme Financial Corp, including risk classification, validation, monitoring, and decommissioning procedures.', 'u-001', 'fw-003', 't-acme-001', '2025-06-15T14:00:00Z', NULL, '2025-02-01T09:00:00Z', '2026-01-15T10:00:00Z'),
  ('pol-002', 'Data Privacy & Protection Policy', 'approved', 2, 'Defines data handling requirements for personal and sensitive data processed by AI systems, aligned with GDPR Articles 5, 6, and 25.', 'u-005', 'fw-005', 't-acme-001', '2025-07-01T10:00:00Z', NULL, '2025-03-01T09:00:00Z', '2025-12-20T11:00:00Z'),
  ('pol-003', 'AI Bias & Fairness Policy', 'approved', 2, 'Mandates bias testing and fairness audits for all high-risk AI models prior to production deployment and on a quarterly basis thereafter.', 'u-003', 'fw-004', 't-acme-001', '2025-08-10T09:00:00Z', NULL, '2025-04-01T09:00:00Z', '2026-02-01T08:00:00Z'),
  ('pol-004', 'Third-Party AI Vendor Management Policy', 'approved', 1, 'Requirements for evaluating, onboarding, and continuously monitoring third-party AI and ML service providers.', 'u-002', 'fw-002', 't-acme-001', '2025-09-01T14:00:00Z', NULL, '2025-05-15T09:00:00Z', '2025-11-10T09:00:00Z'),
  ('pol-005', 'Incident Response for AI Systems', 'approved', 2, 'Defines escalation procedures, response timelines, and remediation requirements for AI-related incidents including bias events, model failures, and data breaches.', 'u-006', 'fw-001', 't-acme-001', '2025-10-01T10:00:00Z', NULL, '2025-06-01T09:00:00Z', '2026-01-20T14:00:00Z'),
  ('pol-006', 'Human-in-the-Loop Oversight Policy', 'approved', 1, 'Establishes requirements for human review and approval of high-risk AI decisions in lending, claims processing, and customer-facing applications.', 'u-004', 'fw-003', 't-acme-001', '2025-11-15T09:00:00Z', NULL, '2025-07-01T09:00:00Z', '2025-11-15T09:00:00Z'),
  ('pol-007', 'AI Model Transparency & Explainability', 'review', 2, 'Requirements for generating and maintaining explainability documentation for all production AI models, aligned with EU AI Act Article 13.', 'u-003', 'fw-006', 't-acme-001', NULL, NULL, '2025-08-01T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('pol-008', 'Shadow AI Detection & Remediation Policy', 'draft', 1, 'Procedures for detecting unauthorized AI usage across the enterprise, including API scanning, library detection, and remediation workflows.', 'u-001', 'fw-001', 't-acme-001', NULL, NULL, '2025-10-01T09:00:00Z', '2026-02-15T09:00:00Z'),
  ('pol-009', 'AI Training Data Governance Policy', 'approved', 1, 'Standards for training data quality, provenance, bias assessment, and retention for all machine learning models.', 'u-005', 'fw-004', 't-acme-001', '2025-12-01T14:00:00Z', NULL, '2025-09-01T09:00:00Z', '2025-12-01T14:00:00Z'),
  ('pol-010', 'Acceptable Use Policy for Generative AI', 'approved', 2, 'Defines acceptable and prohibited uses of generative AI tools by employees, including guardrails for customer-facing deployments.', 'u-002', 'fw-003', 't-acme-001', '2026-01-10T10:00:00Z', NULL, '2025-10-15T09:00:00Z', '2026-01-10T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. "Control" — 20 controls across frameworks
-- ============================================================================
INSERT INTO "Control" (id, title, status, evidence, "policyId", "frameworkId", "tenantId", "createdAt", "updatedAt") VALUES
  ('ctrl-001', 'A.5.1 — Information Security Policies', 'implemented', 'Policy document repository with version control and annual review records', 'pol-001', 'fw-001', 't-acme-001', '2025-02-01T09:00:00Z', '2026-02-15T09:00:00Z'),
  ('ctrl-002', 'A.8.2 — Privileged Access Rights', 'implemented', 'PAM system logs, quarterly access reviews, role-based access matrix', 'pol-005', 'fw-001', 't-acme-001', '2025-02-01T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('ctrl-003', 'A.8.24 — Use of Cryptography', 'implemented', 'Encryption audit report, key management procedures, TLS scan results', 'pol-002', 'fw-001', 't-acme-001', '2025-02-15T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('ctrl-004', 'CC6.1 — Logical Access Controls', 'implemented', 'IAM configuration exports, MFA enforcement logs, SSO integration audit', 'pol-005', 'fw-002', 't-acme-001', '2025-03-01T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('ctrl-005', 'CC6.6 — System Operations Security', 'in-progress', 'Monitoring dashboards, alert configuration, incident response runbooks', 'pol-005', 'fw-002', 't-acme-001', '2025-03-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('ctrl-006', 'CC7.2 — System Monitoring', 'implemented', 'SIEM configuration, real-time alerting rules, monthly security review reports', 'pol-005', 'fw-002', 't-acme-001', '2025-03-15T09:00:00Z', '2026-01-30T09:00:00Z'),
  ('ctrl-007', 'Art. 9 — Risk Management System', 'in-progress', 'AI risk register, risk assessment methodology documentation', 'pol-001', 'fw-003', 't-acme-001', '2025-04-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('ctrl-008', 'Art. 10 — Data Governance', 'in-progress', 'Training data catalogs, data quality reports, bias assessment logs', 'pol-009', 'fw-003', 't-acme-001', '2025-04-01T09:00:00Z', '2026-03-12T09:00:00Z'),
  ('ctrl-009', 'Art. 13 — Transparency & Information', 'pending', 'Model card templates, user-facing documentation, disclosure notices', 'pol-007', 'fw-003', 't-acme-001', '2025-04-15T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('ctrl-010', 'Art. 14 — Human Oversight', 'implemented', 'HITL workflow configurations, escalation procedures, override audit trails', 'pol-006', 'fw-003', 't-acme-001', '2025-05-01T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('ctrl-011', 'GOVERN 1.1 — AI Governance Structure', 'implemented', 'AI governance charter, committee meeting minutes, RACI matrix', 'pol-001', 'fw-004', 't-acme-001', '2025-05-01T09:00:00Z', '2026-02-01T09:00:00Z'),
  ('ctrl-012', 'MAP 1.1 — AI Use Case Mapping', 'in-progress', 'AI use case inventory, stakeholder impact analysis', 'pol-001', 'fw-004', 't-acme-001', '2025-05-15T09:00:00Z', '2026-03-08T09:00:00Z'),
  ('ctrl-013', 'MEASURE 2.6 — Bias Evaluation', 'implemented', 'Quarterly bias audit reports, fairness metrics dashboard exports', 'pol-003', 'fw-004', 't-acme-001', '2025-06-01T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('ctrl-014', 'MANAGE 4.1 — Risk Response', 'in-progress', 'Risk treatment plans, mitigation tracking, residual risk assessments', 'pol-001', 'fw-004', 't-acme-001', '2025-06-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('ctrl-015', 'Art. 25 — Data Protection by Design', 'implemented', 'Privacy impact assessments, data minimization evidence, encryption configs', 'pol-002', 'fw-005', 't-acme-001', '2025-06-15T09:00:00Z', '2026-02-10T09:00:00Z'),
  ('ctrl-016', 'Art. 35 — Data Protection Impact Assessment', 'in-progress', 'DPIA reports for AI systems, processing activity records', 'pol-002', 'fw-005', 't-acme-001', '2025-07-01T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('ctrl-017', 'ISO 42001 4.1 — AI Context of Organization', 'implemented', 'AI stakeholder analysis, external/internal issue register', 'pol-001', 'fw-006', 't-acme-001', '2025-07-15T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('ctrl-018', 'ISO 42001 6.1 — AI Risk Assessment', 'in-progress', 'AI-specific risk assessment framework, treatment plans', 'pol-003', 'fw-006', 't-acme-001', '2025-08-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('ctrl-019', 'ML01 — Input Validation for ML Pipelines', 'pending', 'Input schema validation configs, adversarial testing results', 'pol-008', 'fw-007', 't-acme-001', '2025-09-01T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('ctrl-020', 'ML06 — AI Supply Chain Security', 'pending', 'Model provenance records, dependency scanning reports, SBOM', 'pol-004', 'fw-007', 't-acme-001', '2025-09-15T09:00:00Z', '2026-03-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. "Model" — 8 AI models
-- ============================================================================
INSERT INTO "Model" (id, name, type, status, "riskLevel", version, description, accuracy, "lastAuditDate", "vendorId", "datasetId", "ownerId", "tenantId", "createdAt", "updatedAt") VALUES
  ('mdl-001', 'GPT-4-Turbo Customer Chatbot', 'LLM', 'production', 'high', 'v4.1.2', 'Customer-facing conversational AI for account inquiries, product recommendations, and support escalation', 0.94, '2026-02-15T09:00:00Z', 'v-001', 'ds-001', 'u-003', 't-acme-001', '2025-03-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('mdl-002', 'CreditScorer-v3', 'Classification', 'production', 'critical', 'v3.2.1', 'Consumer credit risk scoring model for loan origination decisions, subject to ECOA and EU AI Act Annex III', 0.915, '2026-03-01T09:00:00Z', NULL, 'ds-002', 'u-003', 't-acme-001', '2025-01-15T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('mdl-003', 'FraudDetect-v2', 'Anomaly Detection', 'production', 'high', 'v2.1.0', 'Real-time transaction fraud detection for payment processing with sub-15ms latency requirement', 0.978, '2026-02-20T09:00:00Z', NULL, 'ds-003', 'u-004', 't-acme-001', '2025-02-01T09:00:00Z', '2026-03-12T09:00:00Z'),
  ('mdl-004', 'Claude-3-Sonnet Document Analyzer', 'LLM', 'production', 'medium', 'v3.5', 'Internal document analysis for contract review, regulatory filing extraction, and compliance summarization', 0.92, '2026-01-10T09:00:00Z', 'v-002', 'ds-004', 'u-003', 't-acme-001', '2025-04-01T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('mdl-005', 'SentimentAnalyzer', 'NLP', 'staging', 'medium', 'v1.3.0', 'Market sentiment analysis from financial news, social media, and earnings call transcripts', 0.87, '2026-01-15T09:00:00Z', NULL, 'ds-005', 'u-003', 't-acme-001', '2025-06-01T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('mdl-006', 'DataLabeler-v2', 'Classification', 'production', 'low', 'v2.0.1', 'Automated data classification and sensitivity labeling for enterprise data governance', 0.96, '2025-12-01T09:00:00Z', NULL, 'ds-006', 'u-005', 't-acme-001', '2025-05-01T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('mdl-007', 'ResumeScreener', 'Classification', 'development', 'critical', 'v0.9.0', 'Candidate resume screening and ranking for HR recruitment pipeline — high-risk under EU AI Act', 0.82, '2026-02-01T09:00:00Z', NULL, 'ds-002', 'u-003', 't-acme-001', '2025-09-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('mdl-008', 'ClaimsProcessor', 'LLM', 'staging', 'high', 'v1.1.0', 'Insurance claims triage and initial assessment using LLM-based document understanding', 0.89, '2026-02-10T09:00:00Z', 'v-001', 'ds-004', 'u-004', 't-acme-001', '2025-08-01T09:00:00Z', '2026-03-08T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. "Agent" — 6 agents
-- ============================================================================
INSERT INTO "Agent" (id, name, status, source, "modelId", department, description, "isShadowAi", "tenantId", "createdAt") VALUES
  ('agt-001', 'Customer Support Agent', 'approved', 'api_gateway', 'mdl-001', 'Customer Service', 'Production customer-facing chatbot handling account inquiries and basic transactions', false, 't-acme-001', '2025-04-01T09:00:00Z'),
  ('agt-002', 'Document Review Agent', 'approved', 'cicd', 'mdl-004', 'Legal', 'Automated contract and regulatory document analysis pipeline', false, 't-acme-001', '2025-05-15T09:00:00Z'),
  ('agt-003', 'Fraud Alert Agent', 'approved', 'k8s', 'mdl-003', 'Fraud Prevention', 'Real-time fraud alert triage and escalation agent', false, 't-acme-001', '2025-06-01T09:00:00Z'),
  ('agt-004', 'Data Classification Agent', 'approved', 'cicd', 'mdl-006', 'Data Governance', 'Automated PII detection and data classification across enterprise datastores', false, 't-acme-001', '2025-07-01T09:00:00Z'),
  ('agt-005', 'Shadow ChatGPT Usage', 'pending', 'logs', NULL, 'Marketing', 'Unauthorized ChatGPT API calls detected from marketing department infrastructure', true, 't-acme-001', '2026-01-15T09:00:00Z'),
  ('agt-006', 'Claims Triage Agent', 'pending', 'manual', 'mdl-008', 'Insurance Operations', 'Claims intake and initial triage using LLM document understanding', false, 't-acme-001', '2025-10-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. "RiskEntry" — 10 risks
-- ============================================================================
INSERT INTO "RiskEntry" (id, title, likelihood, impact, "riskScore", category, "modelId", mitigation, status, "ownerId", "tenantId", "createdAt", "updatedAt") VALUES
  ('rsk-001', 'Credit scoring model gender bias exceeds regulatory threshold', 4, 5, 20, 'Bias & Fairness', 'mdl-002', 'Implement reweighting algorithm and quarterly bias audits with 0.85 DI ratio threshold', 'mitigating', 'u-003', 't-acme-001', '2025-06-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('rsk-002', 'Customer chatbot generates hallucinated financial advice', 3, 5, 15, 'Operational', 'mdl-001', 'Deploy fact-checking guardrail, restrict to FAQ-based responses, implement confidence scoring', 'mitigating', 'u-004', 't-acme-001', '2025-07-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('rsk-003', 'PII leakage in LLM training data pipelines', 3, 4, 12, 'Privacy', 'mdl-001', 'Implement PII scrubbing in preprocessing pipeline, differential privacy in fine-tuning', 'open', 'u-005', 't-acme-001', '2025-08-01T09:00:00Z', '2026-03-12T09:00:00Z'),
  ('rsk-004', 'Model drift in fraud detection causing increased false positives', 3, 4, 12, 'Model Performance', 'mdl-003', 'Automated PSI monitoring with 0.2 threshold, weekly retraining pipeline', 'mitigating', 'u-004', 't-acme-001', '2025-09-01T09:00:00Z', '2026-03-08T09:00:00Z'),
  ('rsk-005', 'EU AI Act non-compliance for high-risk systems', 4, 4, 16, 'Regulatory', 'mdl-002', 'Complete conformity assessment, appoint authorized representative, establish technical documentation', 'open', 'u-002', 't-acme-001', '2025-10-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('rsk-006', 'Adversarial prompt injection against customer chatbot', 3, 3, 9, 'Security', 'mdl-001', 'Input sanitization, prompt hardening, output filtering, red team testing program', 'mitigating', 'u-006', 't-acme-001', '2025-10-15T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('rsk-007', 'Resume screening model perpetuates historical hiring bias', 5, 5, 25, 'Bias & Fairness', 'mdl-007', 'Hold deployment until bias audit passes, implement blind resume processing, add human oversight', 'open', 'u-003', 't-acme-001', '2025-11-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('rsk-008', 'Third-party vendor data breach affecting AI training data', 2, 5, 10, 'Vendor', NULL, 'Contractual DPA requirements, encryption at rest, vendor SOC 2 verification', 'accepted', 'u-001', 't-acme-001', '2025-11-15T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('rsk-009', 'Shadow AI usage across marketing and sales departments', 4, 3, 12, 'Shadow AI', NULL, 'API gateway monitoring, employee training, approved tool catalog, automated detection', 'mitigating', 'u-001', 't-acme-001', '2026-01-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('rsk-010', 'Claims processor model generates inconsistent assessments', 3, 3, 9, 'Operational', 'mdl-008', 'Implement consistency checks, A/B testing against human assessors, confidence thresholds', 'open', 'u-004', 't-acme-001', '2026-02-01T09:00:00Z', '2026-03-12T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. "HitlItem" — 8 items
-- ============================================================================
INSERT INTO "HitlItem" (id, "entityType", "entityId", action, status, "assignedTo", "createdBy", "decidedAt", decision, priority, "dueDate", "tenantId", "createdAt") VALUES
  ('hitl-001', 'Model', 'mdl-002', 'approve_production_deployment', 'approved', 'u-001', 'u-003', '2025-08-15T14:00:00Z', 'Approved with conditions: monthly bias monitoring required', 'critical', '2025-08-20T09:00:00Z', 't-acme-001', '2025-08-01T09:00:00Z'),
  ('hitl-002', 'Model', 'mdl-007', 'approve_production_deployment', 'pending', 'u-001', 'u-003', NULL, NULL, 'critical', '2026-04-01T09:00:00Z', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('hitl-003', 'Agent', 'agt-005', 'review_shadow_ai_finding', 'pending', 'u-006', 'u-008', NULL, NULL, 'high', '2026-03-20T09:00:00Z', 't-acme-001', '2026-01-15T09:00:00Z'),
  ('hitl-004', 'RiskEntry', 'rsk-001', 'approve_risk_mitigation', 'approved', 'u-004', 'u-003', '2026-01-10T10:00:00Z', 'Mitigation plan approved, schedule Q2 revalidation', 'high', '2026-01-15T09:00:00Z', 't-acme-001', '2025-12-15T09:00:00Z'),
  ('hitl-005', 'Policy', 'pol-007', 'approve_policy_revision', 'pending', 'u-002', 'u-003', NULL, NULL, 'medium', '2026-04-15T09:00:00Z', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('hitl-006', 'Vendor', 'v-006', 'approve_vendor_onboarding', 'approved', 'u-001', 'u-002', '2025-10-05T11:00:00Z', 'Approved pending SOC 2 report receipt', 'medium', '2025-10-10T09:00:00Z', 't-acme-001', '2025-09-20T09:00:00Z'),
  ('hitl-007', 'Model', 'mdl-008', 'approve_staging_deployment', 'rejected', 'u-001', 'u-004', '2026-02-20T15:00:00Z', 'Rejected: bias audit incomplete, requires fairness testing for claim amount distribution', 'high', '2026-02-25T09:00:00Z', 't-acme-001', '2026-02-10T09:00:00Z'),
  ('hitl-008', 'Agent', 'agt-006', 'approve_agent_registration', 'pending', 'u-002', 'u-004', NULL, NULL, 'medium', '2026-04-10T09:00:00Z', 't-acme-001', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. "Evidence" — 12 evidence items
-- ============================================================================
INSERT INTO "Evidence" (id, "controlId", "modelId", type, source, title, "collectedAt", "isStale", "uploadedBy", "tenantId", "createdAt") VALUES
  ('ev-001', 'ctrl-001', NULL, 'document', 'manual_upload', 'AI Governance Policy v3 — Approved Document', '2026-01-15T10:00:00Z', false, 'u-002', 't-acme-001', '2026-01-15T10:00:00Z'),
  ('ev-002', 'ctrl-002', NULL, 'report', 'automated_scan', 'PAM Quarterly Access Review Report — Q1 2026', '2026-01-30T09:00:00Z', false, 'u-006', 't-acme-001', '2026-01-30T09:00:00Z'),
  ('ev-003', 'ctrl-004', NULL, 'screenshot', 'manual_upload', 'IAM MFA Enforcement Dashboard Screenshot', '2026-02-01T09:00:00Z', false, 'u-006', 't-acme-001', '2026-02-01T09:00:00Z'),
  ('ev-004', 'ctrl-007', 'mdl-002', 'report', 'automated_pull', 'CreditScorer-v3 Risk Assessment Report', '2026-03-01T09:00:00Z', false, 'u-004', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('ev-005', 'ctrl-008', 'mdl-002', 'report', 'automated_pull', 'Training Data Quality Report — Credit Scoring Dataset', '2026-02-15T09:00:00Z', false, 'u-003', 't-acme-001', '2026-02-15T09:00:00Z'),
  ('ev-006', 'ctrl-010', 'mdl-001', 'log', 'automated_pull', 'HITL Override Audit Trail — Customer Chatbot', '2026-03-10T09:00:00Z', false, 'u-008', 't-acme-001', '2026-03-10T09:00:00Z'),
  ('ev-007', 'ctrl-013', 'mdl-002', 'report', 'automated_pull', 'Quarterly Bias Audit Report — CreditScorer Q1 2026', '2026-03-15T09:00:00Z', false, 'u-003', 't-acme-001', '2026-03-15T09:00:00Z'),
  ('ev-008', 'ctrl-013', 'mdl-003', 'report', 'automated_pull', 'Quarterly Bias Audit Report — FraudDetect Q1 2026', '2026-03-15T09:00:00Z', false, 'u-004', 't-acme-001', '2026-03-15T09:00:00Z'),
  ('ev-009', 'ctrl-015', NULL, 'document', 'manual_upload', 'DPIA for Customer Chatbot AI System', '2025-12-01T09:00:00Z', true, 'u-005', 't-acme-001', '2025-12-01T09:00:00Z'),
  ('ev-010', 'ctrl-003', NULL, 'certificate', 'manual_upload', 'TLS Certificate Scan Results — All AI Endpoints', '2026-02-28T09:00:00Z', false, 'u-008', 't-acme-001', '2026-02-28T09:00:00Z'),
  ('ev-011', 'ctrl-006', NULL, 'screenshot', 'manual_upload', 'SIEM Alert Configuration for AI Model Monitoring', '2026-01-20T09:00:00Z', false, 'u-006', 't-acme-001', '2026-01-20T09:00:00Z'),
  ('ev-012', 'ctrl-011', NULL, 'document', 'manual_upload', 'AI Governance Committee Meeting Minutes — Q1 2026', '2026-03-05T09:00:00Z', false, 'u-001', 't-acme-001', '2026-03-05T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. "Vendor" — 8 vendors
-- ============================================================================
INSERT INTO "Vendor" (id, name, "riskTier", status, "contactEmail", "contractExpiry", "lastAssessment", "suspendedReason", "tenantId", "createdAt") VALUES
  ('v-001', 'OpenAI', 1, 'approved', 'enterprise@openai.com', '2027-03-31T00:00:00Z', '2026-01-15T09:00:00Z', NULL, 't-acme-001', '2025-02-01T09:00:00Z'),
  ('v-002', 'Anthropic', 1, 'approved', 'enterprise@anthropic.com', '2027-06-30T00:00:00Z', '2026-02-01T09:00:00Z', NULL, 't-acme-001', '2025-03-01T09:00:00Z'),
  ('v-003', 'AWS', 2, 'approved', 'aws-enterprise@amazon.com', '2027-12-31T00:00:00Z', '2025-11-01T09:00:00Z', NULL, 't-acme-001', '2025-01-15T09:00:00Z'),
  ('v-004', 'Google Cloud', 2, 'approved', 'gcp-enterprise@google.com', '2027-09-30T00:00:00Z', '2025-12-01T09:00:00Z', NULL, 't-acme-001', '2025-02-15T09:00:00Z'),
  ('v-005', 'Pinecone', 2, 'approved', 'enterprise@pinecone.io', '2026-12-31T00:00:00Z', '2025-10-01T09:00:00Z', NULL, 't-acme-001', '2025-04-01T09:00:00Z'),
  ('v-006', 'DataRobot', 2, 'under_review', 'enterprise@datarobot.com', '2026-09-30T00:00:00Z', '2025-09-15T09:00:00Z', NULL, 't-acme-001', '2025-05-01T09:00:00Z'),
  ('v-007', 'Palantir', 1, 'approved', 'enterprise@palantir.com', '2027-06-30T00:00:00Z', '2026-01-01T09:00:00Z', NULL, 't-acme-001', '2025-06-01T09:00:00Z'),
  ('v-008', 'Snowflake', 2, 'approved', 'enterprise@snowflake.com', '2027-03-31T00:00:00Z', '2025-12-15T09:00:00Z', NULL, 't-acme-001', '2025-03-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. "AuditLog" — 20 entries
-- ============================================================================
INSERT INTO "AuditLog" (id, "entityType", "entityId", action, "userId", details, timestamp, "tenantId", "createdAt") VALUES
  ('al-001', 'Policy', 'pol-001', 'policy.approved', 'u-001', '{"version": 3, "title": "AI Model Governance Policy"}', '2025-06-15T14:00:00Z', 't-acme-001', '2025-06-15T14:00:00Z'),
  ('al-002', 'Model', 'mdl-001', 'model.deployed', 'u-003', '{"version": "v4.1.2", "environment": "production"}', '2025-09-01T09:00:00Z', 't-acme-001', '2025-09-01T09:00:00Z'),
  ('al-003', 'Model', 'mdl-002', 'model.deployed', 'u-003', '{"version": "v3.2.1", "environment": "production"}', '2025-04-15T09:00:00Z', 't-acme-001', '2025-04-15T09:00:00Z'),
  ('al-004', 'Vendor', 'v-001', 'vendor.approved', 'u-001', '{"name": "OpenAI", "riskTier": 1}', '2025-02-15T10:00:00Z', 't-acme-001', '2025-02-15T10:00:00Z'),
  ('al-005', 'Control', 'ctrl-001', 'control.implemented', 'u-002', '{"framework": "ISO 27001:2022", "controlRef": "A.5.1"}', '2025-06-01T09:00:00Z', 't-acme-001', '2025-06-01T09:00:00Z'),
  ('al-006', 'RiskEntry', 'rsk-001', 'risk.created', 'u-003', '{"title": "Credit scoring model gender bias", "riskScore": 20}', '2025-06-01T09:00:00Z', 't-acme-001', '2025-06-01T09:00:00Z'),
  ('al-007', 'HitlItem', 'hitl-001', 'hitl.approved', 'u-001', '{"entityType": "Model", "entityId": "mdl-002"}', '2025-08-15T14:00:00Z', 't-acme-001', '2025-08-15T14:00:00Z'),
  ('al-008', 'Agent', 'agt-001', 'agent.registered', 'u-003', '{"name": "Customer Support Agent", "source": "api_gateway"}', '2025-04-01T09:00:00Z', 't-acme-001', '2025-04-01T09:00:00Z'),
  ('al-009', 'Evidence', 'ev-007', 'evidence.uploaded', 'u-003', '{"title": "Quarterly Bias Audit Report — CreditScorer Q1 2026"}', '2026-03-15T09:00:00Z', 't-acme-001', '2026-03-15T09:00:00Z'),
  ('al-010', 'Policy', 'pol-010', 'policy.approved', 'u-002', '{"version": 2, "title": "Acceptable Use Policy for Generative AI"}', '2026-01-10T10:00:00Z', 't-acme-001', '2026-01-10T10:00:00Z'),
  ('al-011', 'Model', 'mdl-007', 'model.created', 'u-003', '{"name": "ResumeScreener", "riskLevel": "critical"}', '2025-09-01T09:00:00Z', 't-acme-001', '2025-09-01T09:00:00Z'),
  ('al-012', 'Agent', 'agt-005', 'shadow_ai.detected', 'u-008', '{"source": "logs", "department": "Marketing"}', '2026-01-15T09:00:00Z', 't-acme-001', '2026-01-15T09:00:00Z'),
  ('al-013', 'Vendor', 'v-006', 'vendor.review_initiated', 'u-002', '{"name": "DataRobot", "reason": "Annual assessment due"}', '2025-09-15T09:00:00Z', 't-acme-001', '2025-09-15T09:00:00Z'),
  ('al-014', 'RiskEntry', 'rsk-007', 'risk.escalated', 'u-003', '{"title": "Resume screening bias", "newScore": 25}', '2025-11-01T09:00:00Z', 't-acme-001', '2025-11-01T09:00:00Z'),
  ('al-015', 'Control', 'ctrl-010', 'control.tested', 'u-007', '{"result": "pass", "framework": "EU AI Act", "controlRef": "Art. 14"}', '2026-02-15T09:00:00Z', 't-acme-001', '2026-02-15T09:00:00Z'),
  ('al-016', 'HitlItem', 'hitl-007', 'hitl.rejected', 'u-001', '{"entityType": "Model", "entityId": "mdl-008", "reason": "Bias audit incomplete"}', '2026-02-20T15:00:00Z', 't-acme-001', '2026-02-20T15:00:00Z'),
  ('al-017', 'Policy', 'pol-007', 'policy.submitted_for_review', 'u-003', '{"version": 2, "title": "AI Model Transparency & Explainability"}', '2026-03-01T09:00:00Z', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('al-018', 'Model', 'mdl-005', 'model.promoted_to_staging', 'u-003', '{"version": "v1.3.0", "name": "SentimentAnalyzer"}', '2026-02-01T09:00:00Z', 't-acme-001', '2026-02-01T09:00:00Z'),
  ('al-019', 'Evidence', 'ev-012', 'evidence.uploaded', 'u-001', '{"title": "AI Governance Committee Meeting Minutes — Q1 2026"}', '2026-03-05T09:00:00Z', 't-acme-001', '2026-03-05T09:00:00Z'),
  ('al-020', 'Control', 'ctrl-008', 'control.updated', 'u-005', '{"status": "in-progress", "framework": "EU AI Act", "controlRef": "Art. 10"}', '2026-03-12T09:00:00Z', 't-acme-001', '2026-03-12T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 13. "TrustTrace" — 15 traces
-- ============================================================================
INSERT INTO "TrustTrace" (id, "modelId", "trustScore", "fairnessScore", "transparencyScore", "robustnessScore", "privacyScore", "accountabilityScore", timestamp, "tenantId", "createdAt") VALUES
  ('tt-001', 'mdl-001', 82.5, 88.0, 75.0, 80.0, 85.0, 90.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-002', 'mdl-001', 81.0, 87.0, 74.0, 79.0, 84.0, 89.0, '2026-03-14T08:00:00Z', 't-acme-001', '2026-03-14T08:00:00Z'),
  ('tt-003', 'mdl-001', 83.0, 89.0, 76.0, 81.0, 86.0, 91.0, '2026-03-13T08:00:00Z', 't-acme-001', '2026-03-13T08:00:00Z'),
  ('tt-004', 'mdl-002', 68.0, 62.0, 70.0, 85.0, 75.0, 80.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-005', 'mdl-002', 67.0, 61.0, 69.0, 84.0, 74.0, 79.0, '2026-03-14T08:00:00Z', 't-acme-001', '2026-03-14T08:00:00Z'),
  ('tt-006', 'mdl-002', 69.0, 63.0, 71.0, 86.0, 76.0, 81.0, '2026-03-13T08:00:00Z', 't-acme-001', '2026-03-13T08:00:00Z'),
  ('tt-007', 'mdl-003', 91.0, 93.0, 85.0, 90.0, 88.0, 95.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-008', 'mdl-003', 90.5, 92.0, 84.0, 89.0, 87.0, 94.0, '2026-03-14T08:00:00Z', 't-acme-001', '2026-03-14T08:00:00Z'),
  ('tt-009', 'mdl-004', 87.0, 85.0, 92.0, 82.0, 90.0, 88.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-010', 'mdl-004', 86.0, 84.0, 91.0, 81.0, 89.0, 87.0, '2026-03-14T08:00:00Z', 't-acme-001', '2026-03-14T08:00:00Z'),
  ('tt-011', 'mdl-005', 78.0, 80.0, 75.0, 72.0, 82.0, 76.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-012', 'mdl-006', 93.0, 95.0, 90.0, 88.0, 92.0, 96.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-013', 'mdl-007', 45.0, 38.0, 50.0, 60.0, 55.0, 42.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-014', 'mdl-008', 72.0, 70.0, 68.0, 75.0, 78.0, 74.0, '2026-03-15T08:00:00Z', 't-acme-001', '2026-03-15T08:00:00Z'),
  ('tt-015', 'mdl-008', 71.0, 69.0, 67.0, 74.0, 77.0, 73.0, '2026-03-14T08:00:00Z', 't-acme-001', '2026-03-14T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 14. "Dataset" — 6 datasets
-- ============================================================================
INSERT INTO "Dataset" (id, name, source, "recordCount", "hasPii", "hasDemographicData", description, "lastUpdated", "tenantId", "createdAt") VALUES
  ('ds-001', 'Customer Interaction Corpus', 'Salesforce CRM + Zendesk', 2500000, true, false, 'Historical customer support interactions used for chatbot fine-tuning. Contains names, account numbers, and transaction details.', '2026-02-28T09:00:00Z', 't-acme-001', '2025-02-01T09:00:00Z'),
  ('ds-002', 'Credit Application Dataset', 'Core Banking System', 1800000, true, true, 'Loan application data including applicant demographics, income, employment, and credit history. Subject to ECOA and GDPR.', '2026-03-01T09:00:00Z', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('ds-003', 'Transaction History', 'Payment Processing Platform', 45000000, true, false, 'Historical transaction records for fraud pattern detection. Contains merchant codes, amounts, timestamps, and anonymized card identifiers.', '2026-03-15T09:00:00Z', 't-acme-001', '2025-01-20T09:00:00Z'),
  ('ds-004', 'Regulatory Document Corpus', 'Internal Document Management', 150000, false, false, 'Collection of regulatory filings, contracts, compliance reports, and internal policies for document analysis model training.', '2026-01-15T09:00:00Z', 't-acme-001', '2025-03-01T09:00:00Z'),
  ('ds-005', 'Financial News & Sentiment', 'Bloomberg API + Reuters + SEC', 8000000, false, false, 'Financial news articles, social media posts, and earnings transcripts for market sentiment analysis.', '2026-03-10T09:00:00Z', 't-acme-001', '2025-05-01T09:00:00Z'),
  ('ds-006', 'Enterprise Data Catalog', 'Data Lake + S3 Metadata', 500000, true, false, 'Metadata catalog of all enterprise data assets used to train the data classification model.', '2026-02-15T09:00:00Z', 't-acme-001', '2025-04-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 15. "BiasAudit" — 4 audits
-- ============================================================================
INSERT INTO "BiasAudit" (id, "modelId", "datasetId", status, "startedAt", "completedAt", result, "triggeredBy", "tenantId", "createdAt") VALUES
  ('ba-001', 'mdl-002', 'ds-002', 'completed', '2026-02-01T09:00:00Z', '2026-02-15T16:00:00Z', '{"overallResult": "fail", "metrics": {"genderParity": 0.84, "ageGroupFairness": 0.81, "ethnicDisparityIndex": 0.76, "geographicProxy": 0.79}, "thresholds": {"disparateImpact": 0.85}, "recommendation": "Implement reweighting and disparate impact remediator", "sampleSize": 50000}', 'scheduled_quarterly', 't-acme-001', '2026-02-01T09:00:00Z'),
  ('ba-002', 'mdl-003', 'ds-003', 'completed', '2026-02-10T09:00:00Z', '2026-02-12T14:00:00Z', '{"overallResult": "pass", "metrics": {"genderParity": 0.95, "ageGroupFairness": 0.93, "geographicFairness": 0.89, "transactionSizeBias": 0.91}, "thresholds": {"disparateImpact": 0.85}, "sampleSize": 100000}', 'scheduled_quarterly', 't-acme-001', '2026-02-10T09:00:00Z'),
  ('ba-003', 'mdl-007', 'ds-002', 'completed', '2026-01-15T09:00:00Z', '2026-01-20T11:00:00Z', '{"overallResult": "fail", "metrics": {"genderParity": 0.65, "ageGroupFairness": 0.58, "educationBias": 0.72, "nameOriginProxy": 0.45}, "thresholds": {"disparateImpact": 0.85}, "recommendation": "Do not deploy — significant bias in protected categories", "sampleSize": 25000}', 'pre_deployment', 't-acme-001', '2026-01-15T09:00:00Z'),
  ('ba-004', 'mdl-001', 'ds-001', 'in-progress', '2026-03-10T09:00:00Z', NULL, NULL, 'scheduled_quarterly', 't-acme-001', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 16. "ShadowAIFinding" — 5 findings
-- ============================================================================
INSERT INTO "ShadowAIFinding" (id, "sourceType", endpoint, library, service, "firstSeen", "lastSeen", "riskLevel", status, "recommendedAction", "escalatedToHitl", "createdAt") VALUES
  ('saf-001', 'api_call', 'https://api.openai.com/v1/chat/completions', NULL, 'ChatGPT API', '2026-01-10T14:23:00Z', '2026-03-14T09:15:00Z', 'high', 'Unsanctioned', 'Sanction or block — marketing team using personal API keys', true, '2026-01-10T14:23:00Z'),
  ('saf-002', 'saas_oauth', NULL, NULL, 'Jasper.ai', '2026-01-20T11:00:00Z', '2026-03-12T16:30:00Z', 'medium', 'Unsanctioned', 'Review and evaluate for sanctioned tool catalog', false, '2026-01-20T11:00:00Z'),
  ('saf-003', 'library_import', NULL, 'langchain==0.1.5', NULL, '2026-02-05T08:45:00Z', '2026-02-28T10:00:00Z', 'high', 'Sanctioned', 'Approved for AI engineering team with guardrails', false, '2026-02-05T08:45:00Z'),
  ('saf-004', 'api_call', 'https://api.anthropic.com/v1/messages', NULL, 'Claude API', '2026-02-15T13:00:00Z', '2026-03-10T15:20:00Z', 'medium', 'Unsanctioned', 'Sales team using unauthorized Claude API — route to approved integration', false, '2026-02-15T13:00:00Z'),
  ('saf-005', 'saas_oauth', NULL, NULL, 'Midjourney', '2026-03-01T09:00:00Z', '2026-03-15T11:00:00Z', 'low', 'Dismissed', 'Marketing creative use — low risk, no customer data', false, '2026-03-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 17. "Regulation" — 7 entries
-- ============================================================================
INSERT INTO "Regulation" (id, name, jurisdiction, "effectiveDate", category, "tenantId", "createdAt") VALUES
  ('reg-001', 'EU AI Act (Regulation 2024/1689)', 'European Union', '2025-08-01T00:00:00Z', 'AI Regulation', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('reg-002', 'General Data Protection Regulation (GDPR)', 'European Union', '2018-05-25T00:00:00Z', 'Data Privacy', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('reg-003', 'California Consumer Privacy Act (CCPA/CPRA)', 'United States — California', '2023-01-01T00:00:00Z', 'Data Privacy', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('reg-004', 'Equal Credit Opportunity Act (ECOA)', 'United States', '1974-10-28T00:00:00Z', 'Fair Lending', 't-acme-001', '2025-01-15T09:00:00Z'),
  ('reg-005', 'SEC AI Disclosure Requirements', 'United States', '2025-06-01T00:00:00Z', 'Securities Regulation', 't-acme-001', '2025-03-01T09:00:00Z'),
  ('reg-006', 'UK AI Regulation Framework', 'United Kingdom', '2025-03-01T00:00:00Z', 'AI Regulation', 't-acme-001', '2025-02-01T09:00:00Z'),
  ('reg-007', 'Digital Operational Resilience Act (DORA)', 'European Union', '2025-01-17T00:00:00Z', 'Operational Resilience', 't-acme-001', '2025-01-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 18. "Notification" — 10 notifications
-- ============================================================================
INSERT INTO "Notification" (id, "entityType", "entityId", action, "userId", details, timestamp, "tenantId", "createdAt") VALUES
  ('notif-001', 'Model', 'mdl-002', 'bias_audit_failed', 'u-003', '{"auditId": "ba-001", "model": "CreditScorer-v3", "result": "fail"}', '2026-02-15T16:00:00Z', 't-acme-001', '2026-02-15T16:00:00Z'),
  ('notif-002', 'HitlItem', 'hitl-002', 'hitl_review_assigned', 'u-001', '{"entityType": "Model", "entityId": "mdl-007", "priority": "critical"}', '2026-03-01T09:00:00Z', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('notif-003', 'Policy', 'pol-007', 'policy_review_due', 'u-002', '{"title": "AI Model Transparency & Explainability", "dueDate": "2026-04-15"}', '2026-03-01T09:00:00Z', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('notif-004', 'Agent', 'agt-005', 'shadow_ai_detected', 'u-001', '{"agentName": "Shadow ChatGPT Usage", "department": "Marketing"}', '2026-01-15T09:00:00Z', 't-acme-001', '2026-01-15T09:00:00Z'),
  ('notif-005', 'RiskEntry', 'rsk-007', 'risk_score_critical', 'u-003', '{"title": "Resume screening bias", "riskScore": 25}', '2025-11-01T09:00:00Z', 't-acme-001', '2025-11-01T09:00:00Z'),
  ('notif-006', 'Vendor', 'v-006', 'vendor_assessment_due', 'u-002', '{"vendor": "DataRobot", "lastAssessment": "2025-09-15"}', '2026-03-15T09:00:00Z', 't-acme-001', '2026-03-15T09:00:00Z'),
  ('notif-007', 'Control', 'ctrl-009', 'control_pending_implementation', 'u-003', '{"controlRef": "Art. 13", "framework": "EU AI Act"}', '2026-02-28T09:00:00Z', 't-acme-001', '2026-02-28T09:00:00Z'),
  ('notif-008', 'Evidence', 'ev-009', 'evidence_stale', 'u-005', '{"title": "DPIA for Customer Chatbot AI System", "collectedAt": "2025-12-01"}', '2026-03-01T09:00:00Z', 't-acme-001', '2026-03-01T09:00:00Z'),
  ('notif-009', 'Model', 'mdl-008', 'hitl_review_rejected', 'u-004', '{"model": "ClaimsProcessor", "reason": "Bias audit incomplete"}', '2026-02-20T15:00:00Z', 't-acme-001', '2026-02-20T15:00:00Z'),
  ('notif-010', 'Model', 'mdl-005', 'model_promoted', 'u-003', '{"model": "SentimentAnalyzer", "environment": "staging"}', '2026-02-01T09:00:00Z', 't-acme-001', '2026-02-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 19. "GuardrailRule" — 8 rules
-- ============================================================================
INSERT INTO "GuardrailRule" (id, name, type, "modelId", rule, action, "isActive", "createdBy", "tenantId", "createdAt") VALUES
  ('gr-001', 'PII Detection — Customer Chatbot', 'pii', 'mdl-001', 'Detect and redact SSN, credit card numbers, bank account numbers, and DOB from all outputs', 'redact', true, 'u-006', 't-acme-001', '2025-04-01T09:00:00Z'),
  ('gr-002', 'Prompt Injection Guard', 'injection', 'mdl-001', 'Block inputs containing system prompt extraction attempts, role-play commands, or instruction override patterns', 'block', true, 'u-006', 't-acme-001', '2025-04-01T09:00:00Z'),
  ('gr-003', 'Financial Advice Restriction', 'intent', 'mdl-001', 'Block responses that provide specific investment advice, price predictions, or buy/sell recommendations', 'block', true, 'u-002', 't-acme-001', '2025-05-01T09:00:00Z'),
  ('gr-004', 'Credit Decision Explainability', 'schema', 'mdl-002', 'All credit scoring outputs must include SHAP-based feature importance explanations and adverse action reasons', 'warn', true, 'u-003', 't-acme-001', '2025-03-01T09:00:00Z'),
  ('gr-005', 'Toxicity Filter — All Models', 'toxicity', NULL, 'Block outputs with toxicity score exceeding 0.7 on Perspective API scale', 'block', true, 'u-006', 't-acme-001', '2025-04-15T09:00:00Z'),
  ('gr-006', 'Fraud Alert Confidence Threshold', 'schema', 'mdl-003', 'Fraud alerts must include confidence score and only flag transactions with confidence above 0.85', 'warn', true, 'u-004', 't-acme-001', '2025-06-01T09:00:00Z'),
  ('gr-007', 'Document Classification PII Guard', 'pii', 'mdl-004', 'Redact personal identifiers from document analysis outputs before sending to downstream systems', 'redact', true, 'u-005', 't-acme-001', '2025-07-01T09:00:00Z'),
  ('gr-008', 'Resume Screening Bias Guard', 'intent', 'mdl-007', 'Block outputs that reference age, gender, ethnicity, disability, or other protected characteristics', 'block', true, 'u-003', 't-acme-001', '2025-10-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 20. "ComplianceEvent" — 6 events
-- ============================================================================

-- Note: The Prisma schema does not define a "ComplianceEvent" model, but the
-- SQLAlchemy ORM uses the table name "compliance_events" (snake_case). We insert
-- into the snake_case table as defined in the Python backend.

INSERT INTO compliance_events (id, tenant_id, event_type, entity_type, entity_id, entity_name, details, created_at) VALUES
  ('ce-001', 't-acme-001', 'bias_audit_completed', 'Model', 'mdl-002', 'CreditScorer-v3', '{"result": "fail", "auditId": "ba-001", "framework": "EU AI Act"}', '2026-02-15T16:00:00Z'),
  ('ce-002', 't-acme-001', 'policy_approved', 'Policy', 'pol-010', 'Acceptable Use Policy for Generative AI', '{"version": 2, "approver": "u-002"}', '2026-01-10T10:00:00Z'),
  ('ce-003', 't-acme-001', 'control_implemented', 'Control', 'ctrl-010', 'Art. 14 — Human Oversight', '{"framework": "EU AI Act", "tester": "u-007"}', '2026-02-15T09:00:00Z'),
  ('ce-004', 't-acme-001', 'shadow_ai_detected', 'Agent', 'agt-005', 'Shadow ChatGPT Usage', '{"department": "Marketing", "source": "logs", "riskLevel": "high"}', '2026-01-15T09:00:00Z'),
  ('ce-005', 't-acme-001', 'risk_score_exceeded', 'RiskEntry', 'rsk-007', 'Resume screening model perpetuates historical hiring bias', '{"riskScore": 25, "threshold": 20}', '2025-11-01T09:00:00Z'),
  ('ce-006', 't-acme-001', 'vendor_review_initiated', 'Vendor', 'v-006', 'DataRobot', '{"reason": "Annual assessment due", "currentStatus": "under_review"}', '2025-09-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 21. "ObservabilityMetric" — 10 metrics (snake_case table: observability_metrics)
-- ============================================================================
INSERT INTO observability_metrics (id, model_id, timestamp, p50_latency, p95_latency, p99_latency, error_rate, throughput, psi_score, trust_score, token_count, cost_usd) VALUES
  ('om-001', 'mdl-001', '2026-03-15T08:00:00Z', 120.0, 280.0, 450.0, 0.012, 1250.0, 0.03, 82.5, 850000, 425.00),
  ('om-002', 'mdl-001', '2026-03-14T08:00:00Z', 118.0, 275.0, 440.0, 0.011, 1180.0, 0.03, 81.0, 820000, 410.00),
  ('om-003', 'mdl-002', '2026-03-15T08:00:00Z', 45.0, 85.0, 120.0, 0.003, 4500.0, 0.18, 68.0, 0, 12.50),
  ('om-004', 'mdl-002', '2026-03-14T08:00:00Z', 44.0, 82.0, 115.0, 0.003, 4200.0, 0.17, 67.0, 0, 11.80),
  ('om-005', 'mdl-003', '2026-03-15T08:00:00Z', 12.0, 25.0, 38.0, 0.001, 15200.0, 0.05, 91.0, 0, 45.00),
  ('om-006', 'mdl-003', '2026-03-14T08:00:00Z', 11.0, 24.0, 36.0, 0.001, 14800.0, 0.05, 90.5, 0, 43.50),
  ('om-007', 'mdl-004', '2026-03-15T08:00:00Z', 950.0, 2100.0, 3500.0, 0.008, 320.0, 0.02, 87.0, 1200000, 1800.00),
  ('om-008', 'mdl-005', '2026-03-15T08:00:00Z', 200.0, 450.0, 680.0, 0.015, 500.0, 0.04, 78.0, 350000, 175.00),
  ('om-009', 'mdl-006', '2026-03-15T08:00:00Z', 30.0, 55.0, 80.0, 0.002, 8000.0, 0.01, 93.0, 0, 5.00),
  ('om-010', 'mdl-008', '2026-03-15T08:00:00Z', 450.0, 1200.0, 2000.0, 0.020, 150.0, 0.08, 72.0, 500000, 750.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 22. "ModelTrustConfig" — 8 configs (snake_case table: model_trust_configs)
-- ============================================================================
INSERT INTO model_trust_configs (id, model_id, allowed_intents, blocked_intents, output_schema, fallback_chain, trust_score_threshold, fallback_threshold, pii_sensitivity, hallucination_mode, budget_monthly_usd, latency_sla_ms, tool_policy, retention_days, created_at, updated_at) VALUES
  ('mtc-001', 'mdl-001', '["account_inquiry", "product_info", "support_escalation", "faq"]', '["investment_advice", "price_prediction", "system_prompt_extraction"]', '{"type": "object", "required": ["response", "confidence", "sources"]}', '["mdl-004", "human_escalation"]', 70.0, 50.0, 'redact', 'balanced', 15000.00, 500.0, '{"web_search": false, "code_execution": false, "file_access": "read_only"}', 90, '2025-04-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('mtc-002', 'mdl-002', '["credit_scoring", "risk_assessment"]', '["discrimination", "proxy_variable_usage"]', '{"type": "object", "required": ["score", "factors", "adverse_action_reasons"]}', '["manual_review"]', 80.0, 60.0, 'block', 'strict', 5000.00, 100.0, '{"external_api": false}', 365, '2025-02-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('mtc-003', 'mdl-003', '["fraud_detection", "transaction_monitoring"]', '["customer_profiling"]', '{"type": "object", "required": ["is_fraud", "confidence", "risk_factors"]}', '["rule_engine_fallback"]', 85.0, 70.0, 'block', 'strict', 3000.00, 20.0, '{"external_api": false}', 180, '2025-03-01T09:00:00Z', '2026-03-12T09:00:00Z'),
  ('mtc-004', 'mdl-004', '["document_analysis", "contract_review", "compliance_check"]', '["legal_advice", "binding_interpretation"]', '{"type": "object", "required": ["analysis", "key_findings", "confidence"]}', '["human_review"]', 75.0, 55.0, 'redact', 'balanced', 8000.00, 5000.0, '{"file_access": "read_only", "web_search": false}', 90, '2025-05-01T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('mtc-005', 'mdl-005', '["sentiment_analysis", "trend_detection"]', '["trading_signal", "price_target"]', '{"type": "object", "required": ["sentiment", "confidence", "sources"]}', '["neutral_fallback"]', 65.0, 45.0, 'warn', 'lenient', 2000.00, 1000.0, '{"web_search": true}', 30, '2025-07-01T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('mtc-006', 'mdl-006', '["data_classification", "pii_detection", "sensitivity_labeling"]', '["data_modification", "data_deletion"]', '{"type": "object", "required": ["classification", "sensitivity_level", "pii_types"]}', '["conservative_default"]', 90.0, 75.0, 'block', 'strict', 1500.00, 50.0, '{"file_access": "read_only"}', 60, '2025-06-01T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('mtc-007', 'mdl-007', '["resume_screening", "candidate_ranking"]', '["demographic_assessment", "age_estimation", "gender_classification"]', '{"type": "object", "required": ["score", "skill_match", "experience_match"]}', '["human_review_only"]', 85.0, 70.0, 'block', 'strict', 1000.00, 200.0, '{"external_api": false}', 365, '2025-10-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('mtc-008', 'mdl-008', '["claims_triage", "document_extraction", "initial_assessment"]', '["final_decision", "payment_authorization"]', '{"type": "object", "required": ["triage_category", "confidence", "extracted_fields"]}', '["human_adjudicator"]', 75.0, 55.0, 'redact', 'balanced', 6000.00, 3000.0, '{"file_access": "read_only"}', 180, '2025-09-01T09:00:00Z', '2026-03-08T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 23. "PolicyVersion" — 5 versions (snake_case table: policy_versions from Python ORM)
-- ============================================================================

-- Note: Using the SQLAlchemy-based policy_versions table structure
INSERT INTO policy_versions (id, policy_id, version, content, status, changed_by, changelog, created_at) VALUES
  ('pv-001', 'pol-001', '1.0', 'Initial draft of AI Model Governance Policy covering model inventory, risk classification, and basic approval workflows.', 'superseded', 'u-001', 'Initial version', '2025-02-01T09:00:00Z'),
  ('pv-002', 'pol-001', '2.0', 'Added EU AI Act conformity assessment requirements, expanded risk classification to include Annex III categories, and added model lifecycle management section.', 'superseded', 'u-001', 'Added EU AI Act alignment and lifecycle management', '2025-04-15T09:00:00Z'),
  ('pv-003', 'pol-001', '3.0', 'Incorporated NIST AI RMF mapping, added human oversight requirements for high-risk models, updated vendor management section with new assessment criteria.', 'approved', 'u-001', 'NIST RMF alignment, HITL requirements, vendor updates', '2025-06-15T09:00:00Z'),
  ('pv-004', 'pol-003', '1.0', 'Initial AI Bias & Fairness Policy defining quarterly bias audit requirements and disparate impact thresholds.', 'superseded', 'u-003', 'Initial version', '2025-04-01T09:00:00Z'),
  ('pv-005', 'pol-003', '2.0', 'Expanded protected categories, added intersectional bias analysis requirement, introduced continuous monitoring triggers and automated retraining criteria.', 'approved', 'u-003', 'Expanded protected categories and added continuous monitoring', '2025-08-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 24. "RBACRole" — 5 roles (snake_case table: rbac_roles)
-- ============================================================================
INSERT INTO rbac_roles (id, name, description, is_system, permissions, created_at) VALUES
  ('role-001', 'Administrator', 'Full platform access with user management, configuration, and all module permissions', true, '{"dashboard": ["read"], "models": ["read", "write", "approve", "delete"], "policies": ["read", "write", "approve", "delete"], "risks": ["read", "write", "approve", "delete"], "vendors": ["read", "write", "approve", "delete"], "controls": ["read", "write", "approve", "delete"], "audit": ["read", "write"], "settings": ["read", "write"], "users": ["read", "write", "delete"]}', '2025-01-15T09:00:00Z'),
  ('role-002', 'Compliance Officer', 'Full compliance management with policy approval, control management, and audit access', true, '{"dashboard": ["read"], "models": ["read", "write"], "policies": ["read", "write", "approve"], "risks": ["read", "write", "approve"], "vendors": ["read", "write"], "controls": ["read", "write", "approve"], "audit": ["read", "write"], "settings": ["read"]}', '2025-01-15T09:00:00Z'),
  ('role-003', 'Model Owner', 'AI model lifecycle management with limited policy and control visibility', false, '{"dashboard": ["read"], "models": ["read", "write"], "policies": ["read"], "risks": ["read", "write"], "vendors": ["read"], "controls": ["read"], "audit": ["read"]}', '2025-01-15T09:00:00Z'),
  ('role-004', 'Auditor', 'Read-only access to all modules with audit trail management capabilities', true, '{"dashboard": ["read"], "models": ["read"], "policies": ["read"], "risks": ["read"], "vendors": ["read"], "controls": ["read"], "audit": ["read", "write"]}', '2025-01-15T09:00:00Z'),
  ('role-005', 'Viewer', 'Read-only access to dashboards and compliance status', true, '{"dashboard": ["read"], "models": ["read"], "policies": ["read"], "risks": ["read"], "vendors": ["read"], "controls": ["read"]}', '2025-01-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 25. "RBACUser" — 8 assignments (snake_case table: rbac_users)
-- ============================================================================
INSERT INTO rbac_users (id, email, name, role_id, role_name, enabled, last_login, created_at) VALUES
  ('ru-001', 'sarah.chen@acmefinancial.com', 'Sarah Chen', 'role-001', 'Administrator', true, '2026-03-15T09:15:00Z', '2025-01-15T09:00:00Z'),
  ('ru-002', 'mike.johnson@acmefinancial.com', 'Mike Johnson', 'role-002', 'Compliance Officer', true, '2026-03-15T08:45:00Z', '2025-01-16T10:00:00Z'),
  ('ru-003', 'alice.park@acmefinancial.com', 'Alice Park', 'role-003', 'Model Owner', true, '2026-03-14T17:30:00Z', '2025-01-20T08:30:00Z'),
  ('ru-004', 'bob.kumar@acmefinancial.com', 'Bob Kumar', 'role-002', 'Compliance Officer', true, '2026-03-15T10:00:00Z', '2025-02-01T09:00:00Z'),
  ('ru-005', 'james.liu@acmefinancial.com', 'James Liu', 'role-002', 'Compliance Officer', true, '2026-03-13T14:20:00Z', '2025-02-10T10:30:00Z'),
  ('ru-006', 'emma.wilson@acmefinancial.com', 'Emma Wilson', 'role-003', 'Model Owner', true, '2026-03-15T11:00:00Z', '2025-02-15T11:00:00Z'),
  ('ru-007', 'priya.patel@acmefinancial.com', 'Priya Patel', 'role-004', 'Auditor', true, '2026-03-14T09:00:00Z', '2025-03-01T09:00:00Z'),
  ('ru-008', 'david.kim@acmefinancial.com', 'David Kim', 'role-003', 'Model Owner', true, '2026-03-15T07:30:00Z', '2025-03-05T08:00:00Z')
ON CONFLICT (id) DO NOTHING;


-- ############################################################################
-- ############################################################################
--
--   SNAKE_CASE TABLES (New Modules)
--
-- ############################################################################
-- ############################################################################


-- ============================================================================
-- 26. audits — 6
-- ============================================================================
INSERT INTO audits (id, tenant_id, title, audit_type, status, lead_auditor, scope, start_date, end_date, framework, findings_count, created_at, updated_at) VALUES
  ('aud-001', 't-acme-001', 'Annual ISO 27001 Surveillance Audit', 'external', 'completed', 'u-007', 'Information security management system across all AI operations', '2025-10-01', '2025-10-30', 'ISO 27001:2022', 4, '2025-09-15T09:00:00Z', '2025-11-05T09:00:00Z'),
  ('aud-002', 't-acme-001', 'SOC 2 Type II Annual Audit', 'external', 'completed', 'u-007', 'Trust services criteria evaluation for AI platform services', '2025-11-01', '2025-12-15', 'SOC 2 Type II', 2, '2025-10-15T09:00:00Z', '2025-12-20T09:00:00Z'),
  ('aud-003', 't-acme-001', 'EU AI Act Conformity Pre-Assessment', 'internal', 'in_progress', 'u-002', 'Pre-assessment of high-risk AI systems against EU AI Act requirements', '2026-01-15', '2026-03-31', 'EU AI Act', 6, '2026-01-10T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('aud-004', 't-acme-001', 'AI Bias & Fairness Internal Audit', 'internal', 'completed', 'u-007', 'Review of bias testing procedures and fairness metrics across all production models', '2026-01-01', '2026-02-15', 'NIST AI RMF', 3, '2025-12-15T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('aud-005', 't-acme-001', 'Data Privacy Compliance Audit', 'internal', 'in_progress', 'u-005', 'GDPR and CCPA compliance assessment for AI data processing activities', '2026-02-01', '2026-04-30', 'GDPR', 0, '2026-01-20T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('aud-006', 't-acme-001', 'Vendor AI Risk Assessment Audit', 'internal', 'planned', 'u-002', 'Assessment of third-party AI vendor compliance and risk posture', '2026-04-01', '2026-05-31', 'SOC 2 Type II', 0, '2026-03-01T09:00:00Z', '2026-03-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 27. audit_findings — 12
-- ============================================================================
INSERT INTO audit_findings (id, tenant_id, audit_id, title, description, severity, status, category, control_ref, assignee, due_date, remediation_plan, created_at, updated_at) VALUES
  ('af-001', 't-acme-001', 'aud-001', 'Incomplete access review documentation for AI model endpoints', 'Quarterly access reviews for AI model API endpoints do not include service accounts and automated pipelines', 'high', 'remediated', 'Access Control', 'A.8.2', 'u-006', '2025-12-31', 'Expand access review scope to include all service accounts and CI/CD pipeline credentials', '2025-10-15T09:00:00Z', '2025-12-28T09:00:00Z'),
  ('af-002', 't-acme-001', 'aud-001', 'Missing encryption at rest for model artifact storage', 'S3 bucket containing model artifacts and training checkpoints not configured with SSE-KMS encryption', 'critical', 'remediated', 'Cryptography', 'A.8.24', 'u-008', '2025-11-30', 'Enable SSE-KMS encryption on all model artifact storage buckets with customer-managed keys', '2025-10-18T09:00:00Z', '2025-11-25T09:00:00Z'),
  ('af-003', 't-acme-001', 'aud-001', 'AI model change management process gaps', 'Model version promotion from staging to production lacks formal change approval documentation', 'medium', 'in_progress', 'Change Management', 'A.8.32', 'u-003', '2026-01-31', 'Implement automated change request generation in CI/CD pipeline for model deployments', '2025-10-20T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('af-004', 't-acme-001', 'aud-001', 'Logging gaps in AI inference pipeline', 'Not all AI inference requests are being captured in the centralized logging system during peak load', 'medium', 'remediated', 'Monitoring', 'A.8.15', 'u-008', '2025-12-15', 'Increase log ingestion capacity and implement dead letter queue for overflow', '2025-10-22T09:00:00Z', '2025-12-10T09:00:00Z'),
  ('af-005', 't-acme-001', 'aud-002', 'Insufficient documentation of AI model testing procedures', 'SOC 2 CC7.1 requires documented testing procedures for system components including AI models', 'medium', 'remediated', 'Testing', 'CC7.1', 'u-003', '2026-01-15', 'Create standardized model testing runbooks and integrate with CI/CD pipeline documentation', '2025-11-20T09:00:00Z', '2026-01-10T09:00:00Z'),
  ('af-006', 't-acme-001', 'aud-002', 'Vendor risk assessment frequency below SOC 2 requirements', 'Annual vendor assessments insufficient for Tier 1 AI vendors — SOC 2 recommends semi-annual', 'high', 'in_progress', 'Vendor Management', 'CC9.2', 'u-002', '2026-03-31', 'Implement semi-annual assessment cycle for all Tier 1 AI vendors', '2025-12-01T09:00:00Z', '2026-02-15T09:00:00Z'),
  ('af-007', 't-acme-001', 'aud-003', 'No conformity assessment process for high-risk AI systems', 'EU AI Act Article 43 requires conformity assessment — no formal process established', 'critical', 'open', 'Conformity Assessment', 'Art. 43', 'u-002', '2026-06-30', 'Establish conformity assessment procedure and designate authorized representative', '2026-01-20T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('af-008', 't-acme-001', 'aud-003', 'Insufficient technical documentation per Article 11', 'Technical documentation for CreditScorer-v3 and ResumeScreener does not meet EU AI Act requirements', 'high', 'open', 'Documentation', 'Art. 11', 'u-003', '2026-05-31', 'Create comprehensive technical documentation following Annex IV template', '2026-01-25T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('af-009', 't-acme-001', 'aud-003', 'Missing data governance measures for training datasets', 'Article 10 data governance requirements not fully implemented for credit scoring training data', 'high', 'in_progress', 'Data Governance', 'Art. 10', 'u-005', '2026-04-30', 'Implement data quality monitoring, bias detection in training data, and data sheet documentation', '2026-02-01T09:00:00Z', '2026-03-12T09:00:00Z'),
  ('af-010', 't-acme-001', 'aud-003', 'Human oversight mechanism gaps for customer chatbot', 'Article 14 human oversight requirements partially met — no real-time intervention capability', 'medium', 'open', 'Human Oversight', 'Art. 14', 'u-004', '2026-05-15', 'Deploy real-time monitoring dashboard with one-click model disable capability', '2026-02-10T09:00:00Z', '2026-03-08T09:00:00Z'),
  ('af-011', 't-acme-001', 'aud-004', 'Bias testing does not cover intersectional categories', 'Current bias audits test single protected attributes but not intersectional combinations', 'high', 'in_progress', 'Bias Testing', 'MEASURE 2.6', 'u-003', '2026-04-15', 'Expand bias testing framework to include intersectional analysis across all protected categories', '2026-01-20T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('af-012', 't-acme-001', 'aud-004', 'No automated bias monitoring in production', 'Bias metrics are only measured during scheduled quarterly audits, not continuously in production', 'medium', 'in_progress', 'Monitoring', 'MEASURE 2.7', 'u-003', '2026-03-31', 'Implement real-time bias monitoring pipeline with alerting for threshold breaches', '2026-01-25T09:00:00Z', '2026-02-28T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 28. ai_impact_assessments — 8
-- ============================================================================
INSERT INTO ai_impact_assessments (id, tenant_id, model_id, title, status, risk_level, assessor, assessment_type, summary, impact_areas, mitigation_measures, review_date, approved_by, created_at, updated_at) VALUES
  ('aia-001', 't-acme-001', 'mdl-001', 'Customer Chatbot AI Impact Assessment', 'completed', 'high', 'u-004', 'pre_deployment', 'Assessment of customer-facing AI chatbot impact on consumer rights, data privacy, and financial advice boundaries', '["consumer_protection", "data_privacy", "financial_advice_risk", "accessibility"]', '["guardrail_deployment", "human_escalation_path", "pii_redaction", "financial_advice_block"]', '2025-08-01', 'u-001', '2025-06-15T09:00:00Z', '2025-08-05T09:00:00Z'),
  ('aia-002', 't-acme-001', 'mdl-002', 'Credit Scoring Model Impact Assessment', 'completed', 'critical', 'u-004', 'pre_deployment', 'Comprehensive impact assessment for consumer credit scoring AI covering fair lending, disparate impact, and regulatory compliance', '["fair_lending", "disparate_impact", "consumer_rights", "regulatory_compliance", "economic_impact"]', '["bias_audits", "adverse_action_notices", "human_review_for_borderline", "appeal_process"]', '2025-03-15', 'u-001', '2025-02-01T09:00:00Z', '2025-03-20T09:00:00Z'),
  ('aia-003', 't-acme-001', 'mdl-003', 'Fraud Detection System Impact Assessment', 'completed', 'high', 'u-004', 'pre_deployment', 'Assessment of fraud detection AI impact on legitimate transactions, false positive rates, and customer experience', '["false_positive_impact", "customer_experience", "financial_loss_prevention", "operational_efficiency"]', '["confidence_thresholds", "human_review_escalation", "customer_notification", "appeal_mechanism"]', '2025-04-01', 'u-001', '2025-03-01T09:00:00Z', '2025-04-05T09:00:00Z'),
  ('aia-004', 't-acme-001', 'mdl-004', 'Document Analysis AI Impact Assessment', 'completed', 'medium', 'u-005', 'pre_deployment', 'Impact assessment for internal document analysis system covering data confidentiality and accuracy risks', '["data_confidentiality", "analysis_accuracy", "operational_dependency", "data_retention"]', '["pii_redaction", "human_verification", "access_controls", "audit_logging"]', '2025-06-01', 'u-002', '2025-05-01T09:00:00Z', '2025-06-05T09:00:00Z'),
  ('aia-005', 't-acme-001', 'mdl-005', 'Sentiment Analyzer Impact Assessment', 'in_review', 'medium', 'u-004', 'pre_deployment', 'Assessment of market sentiment analysis AI for potential market manipulation risks and data quality concerns', '["market_manipulation_risk", "data_quality", "prediction_reliability", "regulatory_compliance"]', '["trading_signal_block", "confidence_scoring", "human_review", "audit_trail"]', '2026-03-01', NULL, '2026-02-01T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('aia-006', 't-acme-001', 'mdl-006', 'Data Classification AI Impact Assessment', 'completed', 'low', 'u-005', 'pre_deployment', 'Impact assessment for automated data classification and sensitivity labeling system', '["classification_accuracy", "false_labeling_risk", "data_governance", "operational_efficiency"]', '["human_verification_sampling", "confidence_thresholds", "override_mechanism"]', '2025-08-15', 'u-001', '2025-07-15T09:00:00Z', '2025-08-20T09:00:00Z'),
  ('aia-007', 't-acme-001', 'mdl-007', 'Resume Screening AI Impact Assessment', 'in_progress', 'critical', 'u-004', 'pre_deployment', 'Critical assessment of AI-powered resume screening for employment discrimination risks under EU AI Act and EEOC guidelines', '["employment_discrimination", "protected_class_bias", "accessibility", "transparency", "appeal_rights"]', '["blind_processing", "bias_audit_pre_deployment", "human_final_decision", "candidate_notification", "disparate_impact_testing"]', NULL, NULL, '2025-11-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('aia-008', 't-acme-001', 'mdl-008', 'Claims Processor AI Impact Assessment', 'draft', 'high', 'u-004', 'pre_deployment', 'Assessment of AI-assisted insurance claims processing for fairness, accuracy, and consumer protection', '["claims_fairness", "assessment_accuracy", "consumer_protection", "operational_risk", "regulatory_compliance"]', '["human_adjudicator_review", "confidence_thresholds", "appeal_process", "bias_monitoring"]', NULL, NULL, '2026-02-15T09:00:00Z', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 29. exceptions — 6
-- ============================================================================
INSERT INTO exceptions (id, tenant_id, title, description, exception_type, status, risk_level, requestor, approver, policy_id, control_id, justification, compensating_controls, expiry_date, created_at, updated_at) VALUES
  ('exc-001', 't-acme-001', 'CreditScorer bias threshold temporary exception', 'Temporary exception for CreditScorer-v3 operating below 0.85 DI ratio while reweighting algorithm is deployed', 'policy_exception', 'approved', 'high', 'u-003', 'u-001', 'pol-003', 'ctrl-013', 'Reweighting algorithm deployment in progress — estimated completion Q2 2026. Current DI ratio 0.84 is marginally below threshold.', 'Enhanced monitoring with weekly bias reports, manual review of borderline decisions, monthly progress reporting to compliance committee', '2026-06-30', '2026-02-20T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('exc-002', 't-acme-001', 'Vendor assessment frequency exception for DataRobot', 'Exception to semi-annual vendor assessment requirement pending contract renegotiation', 'control_exception', 'approved', 'medium', 'u-002', 'u-001', 'pol-004', 'ctrl-005', 'Contract renegotiation in progress — current annual assessment valid through Q3 2026. DataRobot maintains SOC 2 Type II certification.', 'Monthly automated security posture monitoring via SecurityScorecard, quarterly business review meetings', '2026-09-30', '2026-01-15T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('exc-003', 't-acme-001', 'Delayed DPIA for customer chatbot update', 'Exception for deploying chatbot v4.1.2 before updated DPIA completion', 'regulatory_exception', 'expired', 'high', 'u-003', 'u-005', 'pol-002', 'ctrl-016', 'Critical security patch included in v4.1.2 required immediate deployment. DPIA delta assessment covers only changed functionality.', 'Deployed with enhanced logging, restricted to existing functionality scope, DPIA delta assessment completed within 30 days', '2026-01-15', '2025-11-20T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('exc-004', 't-acme-001', 'Temporary exception for incomplete model documentation', 'EU AI Act Article 11 technical documentation exception for SentimentAnalyzer during staging', 'regulatory_exception', 'approved', 'medium', 'u-003', 'u-002', 'pol-001', 'ctrl-009', 'Model is in staging environment only — not serving production traffic or making decisions. Documentation will be completed before production promotion.', 'Staging-only deployment restriction, documentation sprint scheduled for Q2 2026, weekly progress tracking', '2026-06-30', '2026-02-15T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('exc-005', 't-acme-001', 'Shadow AI grace period for marketing tools', 'Grace period for marketing department Jasper.ai usage pending formal evaluation', 'policy_exception', 'approved', 'medium', 'u-001', 'u-002', 'pol-008', NULL, 'Marketing team adopted Jasper.ai before shadow AI policy was enacted. Usage limited to content generation without customer data.', 'No customer data allowed, usage monitoring enabled, formal vendor evaluation initiated, training on acceptable use policy', '2026-04-30', '2026-02-01T09:00:00Z', '2026-02-05T09:00:00Z'),
  ('exc-006', 't-acme-001', 'Encryption standard exception for legacy data pipeline', 'Exception for legacy data pipeline using AES-128 instead of AES-256 for model training data', 'control_exception', 'pending', 'high', 'u-008', NULL, 'pol-002', 'ctrl-003', 'Legacy Hadoop cluster cannot be upgraded to AES-256 without full cluster rebuild scheduled for Q3 2026. Data is in private VPC with additional network controls.', 'Network segmentation, VPC isolation, IP allowlisting, transit encryption with TLS 1.3', '2026-09-30', '2026-03-10T09:00:00Z', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 30. workflow_templates — 4
-- ============================================================================
INSERT INTO workflow_templates (id, tenant_id, name, description, workflow_type, steps, is_active, created_by, created_at, updated_at) VALUES
  ('wft-001', 't-acme-001', 'Model Production Deployment Approval', 'Multi-stage approval workflow for promoting AI models to production environment', 'model_deployment', '[{"step": 1, "name": "Technical Review", "role": "Model Owner", "action": "approve", "sla_hours": 48}, {"step": 2, "name": "Bias & Fairness Review", "role": "Compliance Officer", "action": "approve", "sla_hours": 72}, {"step": 3, "name": "Security Review", "role": "Security Lead", "action": "approve", "sla_hours": 48}, {"step": 4, "name": "CISO Final Approval", "role": "Administrator", "action": "approve", "sla_hours": 24}]', true, 'u-001', '2025-03-01T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('wft-002', 't-acme-001', 'Policy Approval Workflow', 'Standard approval workflow for new or revised policies', 'policy_approval', '[{"step": 1, "name": "Draft Review", "role": "Policy Owner", "action": "submit"}, {"step": 2, "name": "Compliance Review", "role": "Compliance Officer", "action": "approve", "sla_hours": 120}, {"step": 3, "name": "Legal Review", "role": "Data Protection Officer", "action": "approve", "sla_hours": 120}, {"step": 4, "name": "Executive Approval", "role": "Administrator", "action": "approve", "sla_hours": 72}]', true, 'u-002', '2025-03-15T09:00:00Z', '2025-11-01T09:00:00Z'),
  ('wft-003', 't-acme-001', 'Vendor Onboarding Workflow', 'Vendor evaluation and onboarding approval process for AI service providers', 'vendor_onboarding', '[{"step": 1, "name": "Initial Assessment", "role": "Compliance Officer", "action": "assess"}, {"step": 2, "name": "Security Evaluation", "role": "Security Lead", "action": "approve", "sla_hours": 168}, {"step": 3, "name": "Contract Review", "role": "Data Protection Officer", "action": "approve", "sla_hours": 168}, {"step": 4, "name": "Final Approval", "role": "Administrator", "action": "approve", "sla_hours": 48}]', true, 'u-002', '2025-04-01T09:00:00Z', '2025-12-01T09:00:00Z'),
  ('wft-004', 't-acme-001', 'Exception Request Workflow', 'Approval workflow for policy and control exceptions', 'exception_request', '[{"step": 1, "name": "Risk Assessment", "role": "Risk Manager", "action": "assess", "sla_hours": 48}, {"step": 2, "name": "Compliance Review", "role": "Compliance Officer", "action": "approve", "sla_hours": 72}, {"step": 3, "name": "Executive Approval", "role": "Administrator", "action": "approve", "sla_hours": 24}]', true, 'u-001', '2025-05-01T09:00:00Z', '2025-10-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 31. workflow_instances — 8
-- ============================================================================
INSERT INTO workflow_instances (id, tenant_id, template_id, entity_type, entity_id, entity_name, status, current_step, initiated_by, initiated_at, completed_at, created_at, updated_at) VALUES
  ('wfi-001', 't-acme-001', 'wft-001', 'Model', 'mdl-001', 'GPT-4-Turbo Customer Chatbot', 'completed', 4, 'u-003', '2025-07-01T09:00:00Z', '2025-08-15T14:00:00Z', '2025-07-01T09:00:00Z', '2025-08-15T14:00:00Z'),
  ('wfi-002', 't-acme-001', 'wft-001', 'Model', 'mdl-002', 'CreditScorer-v3', 'completed', 4, 'u-003', '2025-03-01T09:00:00Z', '2025-04-10T10:00:00Z', '2025-03-01T09:00:00Z', '2025-04-10T10:00:00Z'),
  ('wfi-003', 't-acme-001', 'wft-001', 'Model', 'mdl-007', 'ResumeScreener', 'in_progress', 2, 'u-003', '2026-03-01T09:00:00Z', NULL, '2026-03-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('wfi-004', 't-acme-001', 'wft-002', 'Policy', 'pol-007', 'AI Model Transparency & Explainability', 'in_progress', 2, 'u-003', '2026-03-01T09:00:00Z', NULL, '2026-03-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('wfi-005', 't-acme-001', 'wft-003', 'Vendor', 'v-006', 'DataRobot', 'in_progress', 2, 'u-002', '2025-09-01T09:00:00Z', NULL, '2025-09-01T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('wfi-006', 't-acme-001', 'wft-004', 'Exception', 'exc-001', 'CreditScorer bias threshold temporary exception', 'completed', 3, 'u-003', '2026-02-15T09:00:00Z', '2026-02-20T09:00:00Z', '2026-02-15T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('wfi-007', 't-acme-001', 'wft-001', 'Model', 'mdl-008', 'ClaimsProcessor', 'rejected', 2, 'u-004', '2026-02-01T09:00:00Z', '2026-02-20T15:00:00Z', '2026-02-01T09:00:00Z', '2026-02-20T15:00:00Z'),
  ('wfi-008', 't-acme-001', 'wft-004', 'Exception', 'exc-006', 'Encryption standard exception for legacy data pipeline', 'in_progress', 1, 'u-008', '2026-03-10T09:00:00Z', NULL, '2026-03-10T09:00:00Z', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 32. workflow_step_actions — 15
-- ============================================================================
INSERT INTO workflow_step_actions (id, tenant_id, workflow_instance_id, step_number, step_name, action, actor, comments, acted_at, created_at) VALUES
  ('wsa-001', 't-acme-001', 'wfi-001', 1, 'Technical Review', 'approved', 'u-003', 'Model performance metrics meet production readiness criteria', '2025-07-05T14:00:00Z', '2025-07-05T14:00:00Z'),
  ('wsa-002', 't-acme-001', 'wfi-001', 2, 'Bias & Fairness Review', 'approved', 'u-002', 'Bias audit passed with acceptable fairness metrics', '2025-07-15T10:00:00Z', '2025-07-15T10:00:00Z'),
  ('wsa-003', 't-acme-001', 'wfi-001', 3, 'Security Review', 'approved', 'u-006', 'Security assessment complete — guardrails configured and tested', '2025-08-01T11:00:00Z', '2025-08-01T11:00:00Z'),
  ('wsa-004', 't-acme-001', 'wfi-001', 4, 'CISO Final Approval', 'approved', 'u-001', 'Approved for production with monthly monitoring requirement', '2025-08-15T14:00:00Z', '2025-08-15T14:00:00Z'),
  ('wsa-005', 't-acme-001', 'wfi-002', 1, 'Technical Review', 'approved', 'u-003', 'CreditScorer-v3 technical review passed', '2025-03-10T09:00:00Z', '2025-03-10T09:00:00Z'),
  ('wsa-006', 't-acme-001', 'wfi-002', 2, 'Bias & Fairness Review', 'approved', 'u-002', 'Initial bias audit satisfactory — conditional on quarterly re-audit', '2025-03-20T14:00:00Z', '2025-03-20T14:00:00Z'),
  ('wsa-007', 't-acme-001', 'wfi-002', 3, 'Security Review', 'approved', 'u-006', 'Input validation and output encryption verified', '2025-04-01T10:00:00Z', '2025-04-01T10:00:00Z'),
  ('wsa-008', 't-acme-001', 'wfi-002', 4, 'CISO Final Approval', 'approved', 'u-001', 'Approved with mandatory quarterly bias audits and ECOA compliance monitoring', '2025-04-10T10:00:00Z', '2025-04-10T10:00:00Z'),
  ('wsa-009', 't-acme-001', 'wfi-003', 1, 'Technical Review', 'approved', 'u-003', 'Model architecture review complete — performance acceptable for staging', '2026-03-08T09:00:00Z', '2026-03-08T09:00:00Z'),
  ('wsa-010', 't-acme-001', 'wfi-004', 1, 'Draft Review', 'submitted', 'u-003', 'Policy v2 ready for compliance review — added EU AI Act Article 13 requirements', '2026-03-01T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('wsa-011', 't-acme-001', 'wfi-005', 1, 'Initial Assessment', 'assessed', 'u-002', 'DataRobot initial compliance assessment indicates medium risk — SOC 2 certified', '2025-09-10T09:00:00Z', '2025-09-10T09:00:00Z'),
  ('wsa-012', 't-acme-001', 'wfi-006', 1, 'Risk Assessment', 'assessed', 'u-004', 'Risk level acceptable with compensating controls in place', '2026-02-16T09:00:00Z', '2026-02-16T09:00:00Z'),
  ('wsa-013', 't-acme-001', 'wfi-006', 2, 'Compliance Review', 'approved', 'u-002', 'Exception justified — compensating controls sufficient', '2026-02-18T09:00:00Z', '2026-02-18T09:00:00Z'),
  ('wsa-014', 't-acme-001', 'wfi-006', 3, 'Executive Approval', 'approved', 'u-001', 'Approved — ensure quarterly progress reports on reweighting algorithm', '2026-02-20T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('wsa-015', 't-acme-001', 'wfi-007', 2, 'Bias & Fairness Review', 'rejected', 'u-002', 'Bias audit incomplete — fairness testing required for claim amount distribution before staging promotion', '2026-02-20T15:00:00Z', '2026-02-20T15:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 33. training_courses — 8
-- ============================================================================
INSERT INTO training_courses (id, tenant_id, title, description, category, duration_minutes, is_mandatory, target_roles, content_url, passing_score, created_at, updated_at) VALUES
  ('tc-001', 't-acme-001', 'AI Governance Fundamentals', 'Introduction to AI governance principles, regulatory landscape, and organizational responsibilities', 'governance', 90, true, '["all"]', '/training/ai-governance-101', 80, '2025-02-01T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('tc-002', 't-acme-001', 'EU AI Act Compliance for Practitioners', 'Deep dive into EU AI Act requirements, risk classification, and conformity assessment procedures', 'compliance', 120, true, '["Compliance Officer", "Model Owner", "Administrator"]', '/training/eu-ai-act', 85, '2025-03-01T09:00:00Z', '2026-02-01T09:00:00Z'),
  ('tc-003', 't-acme-001', 'AI Bias Detection & Mitigation', 'Technical training on bias metrics, testing methodologies, and remediation techniques for ML models', 'technical', 180, true, '["Model Owner", "ML Engineer"]', '/training/bias-mitigation', 80, '2025-04-01T09:00:00Z', '2025-12-15T09:00:00Z'),
  ('tc-004', 't-acme-001', 'Responsible Use of Generative AI', 'Guidelines for appropriate use of generative AI tools in enterprise financial services', 'awareness', 60, true, '["all"]', '/training/genai-responsible-use', 75, '2025-05-01T09:00:00Z', '2026-01-01T09:00:00Z'),
  ('tc-005', 't-acme-001', 'AI Incident Response Procedures', 'Training on AI-specific incident identification, escalation, and response protocols', 'operations', 90, false, '["Security Lead", "Model Owner", "DevOps Lead"]', '/training/ai-incident-response', 80, '2025-06-01T09:00:00Z', '2025-11-01T09:00:00Z'),
  ('tc-006', 't-acme-001', 'Data Privacy for AI Systems', 'GDPR and CCPA compliance requirements for AI training data and inference pipelines', 'compliance', 120, true, '["Data Protection Officer", "Model Owner", "Compliance Officer"]', '/training/ai-data-privacy', 85, '2025-07-01T09:00:00Z', '2025-12-01T09:00:00Z'),
  ('tc-007', 't-acme-001', 'AI Vendor Risk Assessment', 'Methodology for evaluating and monitoring third-party AI service providers', 'risk', 90, false, '["Compliance Officer", "Risk Manager"]', '/training/ai-vendor-risk', 80, '2025-08-01T09:00:00Z', '2025-11-15T09:00:00Z'),
  ('tc-008', 't-acme-001', 'AI Security Best Practices', 'Security controls for AI systems including adversarial robustness, supply chain, and infrastructure', 'security', 120, false, '["Security Lead", "DevOps Lead", "Model Owner"]', '/training/ai-security', 80, '2025-09-01T09:00:00Z', '2026-02-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 34. training_assignments — 16
-- ============================================================================
INSERT INTO training_assignments (id, tenant_id, course_id, user_id, status, score, assigned_at, due_date, started_at, completed_at, created_at) VALUES
  ('ta-001', 't-acme-001', 'tc-001', 'u-001', 'completed', 95, '2025-02-15T09:00:00Z', '2025-03-15', '2025-02-20T10:00:00Z', '2025-02-25T14:00:00Z', '2025-02-15T09:00:00Z'),
  ('ta-002', 't-acme-001', 'tc-001', 'u-002', 'completed', 92, '2025-02-15T09:00:00Z', '2025-03-15', '2025-02-18T09:00:00Z', '2025-02-22T11:00:00Z', '2025-02-15T09:00:00Z'),
  ('ta-003', 't-acme-001', 'tc-001', 'u-003', 'completed', 88, '2025-02-15T09:00:00Z', '2025-03-15', '2025-03-01T08:00:00Z', '2025-03-05T16:00:00Z', '2025-02-15T09:00:00Z'),
  ('ta-004', 't-acme-001', 'tc-002', 'u-002', 'completed', 90, '2025-03-15T09:00:00Z', '2025-04-30', '2025-03-20T09:00:00Z', '2025-04-01T15:00:00Z', '2025-03-15T09:00:00Z'),
  ('ta-005', 't-acme-001', 'tc-002', 'u-003', 'completed', 87, '2025-03-15T09:00:00Z', '2025-04-30', '2025-04-01T08:00:00Z', '2025-04-15T12:00:00Z', '2025-03-15T09:00:00Z'),
  ('ta-006', 't-acme-001', 'tc-003', 'u-003', 'completed', 94, '2025-04-15T09:00:00Z', '2025-05-31', '2025-04-20T09:00:00Z', '2025-05-10T11:00:00Z', '2025-04-15T09:00:00Z'),
  ('ta-007', 't-acme-001', 'tc-004', 'u-001', 'completed', 85, '2025-06-01T09:00:00Z', '2025-07-15', '2025-06-05T10:00:00Z', '2025-06-10T14:00:00Z', '2025-06-01T09:00:00Z'),
  ('ta-008', 't-acme-001', 'tc-004', 'u-004', 'completed', 82, '2025-06-01T09:00:00Z', '2025-07-15', '2025-06-10T08:00:00Z', '2025-06-15T16:00:00Z', '2025-06-01T09:00:00Z'),
  ('ta-009', 't-acme-001', 'tc-005', 'u-006', 'completed', 91, '2025-07-01T09:00:00Z', '2025-08-15', '2025-07-05T09:00:00Z', '2025-07-20T13:00:00Z', '2025-07-01T09:00:00Z'),
  ('ta-010', 't-acme-001', 'tc-006', 'u-005', 'completed', 96, '2025-08-01T09:00:00Z', '2025-09-15', '2025-08-05T09:00:00Z', '2025-08-20T15:00:00Z', '2025-08-01T09:00:00Z'),
  ('ta-011', 't-acme-001', 'tc-002', 'u-004', 'in_progress', NULL, '2026-02-01T09:00:00Z', '2026-03-31', '2026-02-15T10:00:00Z', NULL, '2026-02-01T09:00:00Z'),
  ('ta-012', 't-acme-001', 'tc-003', 'u-004', 'not_started', NULL, '2026-03-01T09:00:00Z', '2026-04-30', NULL, NULL, '2026-03-01T09:00:00Z'),
  ('ta-013', 't-acme-001', 'tc-008', 'u-006', 'in_progress', NULL, '2026-02-15T09:00:00Z', '2026-04-15', '2026-03-01T09:00:00Z', NULL, '2026-02-15T09:00:00Z'),
  ('ta-014', 't-acme-001', 'tc-007', 'u-002', 'completed', 88, '2025-09-01T09:00:00Z', '2025-10-31', '2025-09-10T09:00:00Z', '2025-10-05T14:00:00Z', '2025-09-01T09:00:00Z'),
  ('ta-015', 't-acme-001', 'tc-004', 'u-007', 'completed', 80, '2025-06-01T09:00:00Z', '2025-07-15', '2025-06-20T09:00:00Z', '2025-06-30T11:00:00Z', '2025-06-01T09:00:00Z'),
  ('ta-016', 't-acme-001', 'tc-008', 'u-008', 'not_started', NULL, '2026-03-01T09:00:00Z', '2026-04-30', NULL, NULL, '2026-03-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 35. documents — 10
-- ============================================================================
INSERT INTO documents (id, tenant_id, title, description, document_type, category, status, owner, file_url, file_size_bytes, mime_type, tags, created_at, updated_at) VALUES
  ('doc-001', 't-acme-001', 'AI Governance Charter', 'Enterprise AI governance charter defining roles, responsibilities, and decision-making authority', 'charter', 'governance', 'approved', 'u-001', '/documents/ai-governance-charter-v2.pdf', 524288, 'application/pdf', '["governance", "charter", "executive"]', '2025-02-01T09:00:00Z', '2025-11-01T09:00:00Z'),
  ('doc-002', 't-acme-001', 'CreditScorer-v3 Model Card', 'Comprehensive model card for credit risk scoring model including performance metrics, limitations, and intended use', 'model_card', 'model_documentation', 'approved', 'u-003', '/documents/creditscorer-v3-model-card.pdf', 1048576, 'application/pdf', '["model_card", "credit_scoring", "high_risk"]', '2025-03-15T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('doc-003', 't-acme-001', 'EU AI Act Compliance Roadmap', 'Detailed roadmap for achieving EU AI Act compliance across all high-risk AI systems', 'roadmap', 'compliance', 'approved', 'u-002', '/documents/eu-ai-act-roadmap-2026.pdf', 2097152, 'application/pdf', '["eu_ai_act", "roadmap", "compliance"]', '2025-06-01T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('doc-004', 't-acme-001', 'AI Risk Assessment Methodology', 'Standard methodology for assessing AI-specific risks aligned with NIST AI RMF and ISO 42001', 'methodology', 'risk', 'approved', 'u-004', '/documents/ai-risk-methodology-v1.pdf', 786432, 'application/pdf', '["risk", "methodology", "nist_ai_rmf"]', '2025-05-01T09:00:00Z', '2025-12-01T09:00:00Z'),
  ('doc-005', 't-acme-001', 'Vendor AI Assessment Questionnaire', 'Standardized questionnaire for evaluating third-party AI vendor compliance and risk', 'template', 'vendor', 'approved', 'u-002', '/documents/vendor-ai-assessment-template.docx', 262144, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '["vendor", "assessment", "template"]', '2025-04-15T09:00:00Z', '2025-10-01T09:00:00Z'),
  ('doc-006', 't-acme-001', 'DPIA — Customer Chatbot AI', 'Data Protection Impact Assessment for GPT-4-Turbo customer chatbot deployment', 'dpia', 'privacy', 'review', 'u-005', '/documents/dpia-customer-chatbot-v2.pdf', 1572864, 'application/pdf', '["dpia", "chatbot", "gdpr", "privacy"]', '2025-11-01T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('doc-007', 't-acme-001', 'AI Incident Response Playbook', 'Step-by-step playbook for responding to AI-specific incidents including bias events, model failures, and prompt injection', 'playbook', 'security', 'approved', 'u-006', '/documents/ai-incident-playbook-v1.pdf', 1048576, 'application/pdf', '["incident_response", "security", "playbook"]', '2025-07-01T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('doc-008', 't-acme-001', 'Quarterly AI Governance Report — Q1 2026', 'Executive summary of AI governance metrics, compliance status, and key risks for Q1 2026', 'report', 'governance', 'draft', 'u-001', '/documents/q1-2026-ai-governance-report.pdf', 3145728, 'application/pdf', '["quarterly_report", "executive", "governance"]', '2026-03-15T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('doc-009', 't-acme-001', 'SOC 2 Type II Report — 2025', 'Annual SOC 2 Type II examination report for AI platform services', 'audit_report', 'audit', 'approved', 'u-007', '/documents/soc2-type2-2025.pdf', 5242880, 'application/pdf', '["soc2", "audit_report", "type_ii"]', '2025-12-20T09:00:00Z', '2025-12-20T09:00:00Z'),
  ('doc-010', 't-acme-001', 'AI Ethics Guidelines', 'Corporate guidelines for ethical AI development and deployment in financial services', 'guidelines', 'ethics', 'approved', 'u-001', '/documents/ai-ethics-guidelines-v1.pdf', 655360, 'application/pdf', '["ethics", "guidelines", "corporate"]', '2025-04-01T09:00:00Z', '2025-09-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 36. document_versions — 8
-- ============================================================================
INSERT INTO document_versions (id, tenant_id, document_id, version_number, title, change_summary, file_url, created_by, created_at) VALUES
  ('dv-001', 't-acme-001', 'doc-001', 1, 'AI Governance Charter v1', 'Initial charter establishing AI governance committee and basic governance structure', '/documents/archive/ai-governance-charter-v1.pdf', 'u-001', '2025-02-01T09:00:00Z'),
  ('dv-002', 't-acme-001', 'doc-001', 2, 'AI Governance Charter v2', 'Updated with EU AI Act committee responsibilities and expanded risk oversight mandate', '/documents/ai-governance-charter-v2.pdf', 'u-001', '2025-11-01T09:00:00Z'),
  ('dv-003', 't-acme-001', 'doc-002', 1, 'CreditScorer-v3 Model Card v1', 'Initial model card with basic performance metrics and use case description', '/documents/archive/creditscorer-v3-model-card-v1.pdf', 'u-003', '2025-03-15T09:00:00Z'),
  ('dv-004', 't-acme-001', 'doc-002', 2, 'CreditScorer-v3 Model Card v2', 'Added bias audit results, expanded limitations section, added EU AI Act classification', '/documents/creditscorer-v3-model-card.pdf', 'u-003', '2026-03-01T09:00:00Z'),
  ('dv-005', 't-acme-001', 'doc-003', 1, 'EU AI Act Compliance Roadmap v1', 'Initial roadmap with high-level milestones and resource estimates', '/documents/archive/eu-ai-act-roadmap-v1.pdf', 'u-002', '2025-06-01T09:00:00Z'),
  ('dv-006', 't-acme-001', 'doc-003', 2, 'EU AI Act Compliance Roadmap v2', 'Updated with conformity assessment timeline and technical documentation requirements', '/documents/eu-ai-act-roadmap-2026.pdf', 'u-002', '2026-01-15T09:00:00Z'),
  ('dv-007', 't-acme-001', 'doc-006', 1, 'DPIA — Customer Chatbot v1', 'Initial DPIA for chatbot v3.x deployment', '/documents/archive/dpia-customer-chatbot-v1.pdf', 'u-005', '2025-05-15T09:00:00Z'),
  ('dv-008', 't-acme-001', 'doc-006', 2, 'DPIA — Customer Chatbot v2', 'Updated DPIA for v4.1.2 including new data processing activities and guardrail configurations', '/documents/dpia-customer-chatbot-v2.pdf', 'u-005', '2026-03-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 37. bcp_plans — 5
-- ============================================================================
INSERT INTO bcp_plans (id, tenant_id, title, description, plan_type, status, owner, rto_hours, rpo_hours, last_tested, next_test_date, dependencies, created_at, updated_at) VALUES
  ('bcp-001', 't-acme-001', 'AI Model Inference Service Continuity Plan', 'Business continuity plan for maintaining AI model inference services during outages', 'disaster_recovery', 'approved', 'u-008', 4, 1, '2026-01-15T09:00:00Z', '2026-07-15', '["AWS us-east-1", "model_artifact_store", "feature_store", "monitoring_stack"]', '2025-06-01T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('bcp-002', 't-acme-001', 'Credit Scoring Service Failover Plan', 'Dedicated failover plan for credit scoring model service with manual fallback procedures', 'failover', 'approved', 'u-003', 2, 0, '2025-12-01T09:00:00Z', '2026-06-01', '["creditscorer_primary", "creditscorer_standby", "rule_engine_fallback"]', '2025-04-01T09:00:00Z', '2025-12-05T09:00:00Z'),
  ('bcp-003', 't-acme-001', 'Fraud Detection Real-Time Failover', 'Sub-minute failover plan for real-time fraud detection system', 'failover', 'approved', 'u-004', 0, 0, '2026-02-01T09:00:00Z', '2026-08-01', '["fraud_model_primary", "fraud_model_standby", "rule_engine", "kafka_cluster"]', '2025-03-01T09:00:00Z', '2026-02-05T09:00:00Z'),
  ('bcp-004', 't-acme-001', 'AI Training Pipeline Recovery Plan', 'Recovery procedures for AI model training infrastructure and data pipelines', 'disaster_recovery', 'draft', 'u-008', 24, 4, NULL, '2026-06-01', '["gpu_cluster", "data_lake", "mlflow", "feature_store", "s3_training_data"]', '2026-01-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('bcp-005', 't-acme-001', 'Customer Chatbot Degradation Plan', 'Graceful degradation plan for customer chatbot during AI service disruptions', 'degradation', 'approved', 'u-003', 1, 0, '2025-11-15T09:00:00Z', '2026-05-15', '["chatbot_primary", "faq_fallback", "human_agent_routing"]', '2025-05-01T09:00:00Z', '2025-11-20T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 38. compliance_calendar — 15
-- ============================================================================
INSERT INTO compliance_calendar (id, tenant_id, title, description, event_type, due_date, status, assigned_to, framework, recurrence, entity_type, entity_id, created_at, updated_at) VALUES
  ('cc-001', 't-acme-001', 'Q1 2026 Bias Audit — CreditScorer-v3', 'Quarterly bias audit for credit scoring model', 'audit', '2026-03-31', 'in_progress', 'u-003', 'NIST AI RMF', 'quarterly', 'Model', 'mdl-002', '2026-01-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('cc-002', 't-acme-001', 'Q1 2026 Bias Audit — FraudDetect-v2', 'Quarterly bias audit for fraud detection model', 'audit', '2026-03-31', 'completed', 'u-004', 'NIST AI RMF', 'quarterly', 'Model', 'mdl-003', '2026-01-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('cc-003', 't-acme-001', 'EU AI Act Article 11 Documentation — CreditScorer', 'Technical documentation update per EU AI Act requirements', 'documentation', '2026-05-31', 'pending', 'u-003', 'EU AI Act', 'annual', 'Model', 'mdl-002', '2026-01-15T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('cc-004', 't-acme-001', 'Annual ISO 27001 Surveillance Audit', 'Annual external audit for ISO 27001 certification maintenance', 'audit', '2026-10-31', 'pending', 'u-007', 'ISO 27001:2022', 'annual', NULL, NULL, '2026-01-01T09:00:00Z', '2026-01-01T09:00:00Z'),
  ('cc-005', 't-acme-001', 'GDPR Data Processing Review', 'Annual review of AI data processing activities for GDPR compliance', 'review', '2026-05-25', 'pending', 'u-005', 'GDPR', 'annual', NULL, NULL, '2026-01-01T09:00:00Z', '2026-01-01T09:00:00Z'),
  ('cc-006', 't-acme-001', 'Vendor Assessment — OpenAI', 'Semi-annual vendor risk assessment for OpenAI services', 'assessment', '2026-07-15', 'pending', 'u-002', 'SOC 2 Type II', 'semi_annual', 'Vendor', 'v-001', '2026-01-15T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('cc-007', 't-acme-001', 'Vendor Assessment — Anthropic', 'Semi-annual vendor risk assessment for Anthropic services', 'assessment', '2026-08-01', 'pending', 'u-002', 'SOC 2 Type II', 'semi_annual', 'Vendor', 'v-002', '2026-02-01T09:00:00Z', '2026-02-01T09:00:00Z'),
  ('cc-008', 't-acme-001', 'AI Governance Committee Meeting — Q2', 'Quarterly governance committee meeting', 'meeting', '2026-06-15', 'pending', 'u-001', NULL, 'quarterly', NULL, NULL, '2026-03-15T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('cc-009', 't-acme-001', 'Policy Review — AI Model Governance', 'Annual review of AI Model Governance Policy', 'review', '2026-06-15', 'pending', 'u-001', 'EU AI Act', 'annual', 'Policy', 'pol-001', '2026-01-15T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('cc-010', 't-acme-001', 'BCP Test — AI Inference Service', 'Semi-annual BCP drill for AI model inference services', 'test', '2026-07-15', 'pending', 'u-008', 'ISO 27001:2022', 'semi_annual', NULL, NULL, '2026-01-20T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('cc-011', 't-acme-001', 'Q2 2026 Bias Audit — CreditScorer-v3', 'Quarterly bias audit for credit scoring model', 'audit', '2026-06-30', 'pending', 'u-003', 'NIST AI RMF', 'quarterly', 'Model', 'mdl-002', '2026-03-15T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('cc-012', 't-acme-001', 'Shadow AI Detection Scan', 'Monthly automated shadow AI detection across enterprise', 'scan', '2026-04-15', 'pending', 'u-006', NULL, 'monthly', NULL, NULL, '2026-03-15T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('cc-013', 't-acme-001', 'AI Training Completion Review — Q1', 'Quarterly review of AI governance training completion rates', 'review', '2026-03-31', 'in_progress', 'u-002', NULL, 'quarterly', NULL, NULL, '2026-01-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('cc-014', 't-acme-001', 'EU AI Act Conformity Assessment Deadline', 'Deadline for completing conformity assessment for all high-risk AI systems', 'deadline', '2026-08-01', 'pending', 'u-002', 'EU AI Act', 'one_time', NULL, NULL, '2025-09-01T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('cc-015', 't-acme-001', 'DORA Operational Resilience Review', 'Annual DORA compliance review for AI operational resilience', 'review', '2026-12-31', 'pending', 'u-001', 'DORA', 'annual', NULL, NULL, '2026-01-01T09:00:00Z', '2026-01-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 39. maturity_assessments — 2
-- ============================================================================
INSERT INTO maturity_assessments (id, tenant_id, title, assessment_date, assessor, framework, overall_score, overall_level, status, notes, created_at, updated_at) VALUES
  ('ma-001', 't-acme-001', 'AI Governance Maturity Assessment — 2025', '2025-12-15', 'u-007', 'NIST AI RMF', 2.8, 'Developing', 'completed', 'Initial baseline assessment. Strong in governance structure (Level 3), developing in bias monitoring and transparency. Key gaps in conformity assessment and continuous monitoring.', '2025-11-01T09:00:00Z', '2025-12-20T09:00:00Z'),
  ('ma-002', 't-acme-001', 'AI Governance Maturity Assessment — Q1 2026', '2026-03-15', 'u-007', 'NIST AI RMF', 3.1, 'Established', 'in_progress', 'Follow-up assessment showing improvement in bias testing and vendor management. Still developing conformity assessment and explainability capabilities.', '2026-02-15T09:00:00Z', '2026-03-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 40. maturity_dimensions — 16 (8 per assessment)
-- ============================================================================
INSERT INTO maturity_dimensions (id, tenant_id, assessment_id, dimension, category, score, level, evidence_notes, recommendations, created_at) VALUES
  ('md-001', 't-acme-001', 'ma-001', 'AI Governance Structure', 'GOVERN', 3.5, 'Established', 'Governance charter approved, AI committee meets quarterly, RACI matrix defined', 'Expand committee to include business unit representatives', '2025-12-15T09:00:00Z'),
  ('md-002', 't-acme-001', 'ma-001', 'Risk Management', 'MAP', 2.5, 'Developing', 'Risk register established, basic risk assessment methodology documented', 'Implement automated risk scoring and integrate with model lifecycle', '2025-12-15T09:00:00Z'),
  ('md-003', 't-acme-001', 'ma-001', 'Bias & Fairness Testing', 'MEASURE', 2.5, 'Developing', 'Quarterly bias audits in place, basic fairness metrics tracked', 'Add intersectional analysis, implement continuous monitoring', '2025-12-15T09:00:00Z'),
  ('md-004', 't-acme-001', 'ma-001', 'Transparency & Explainability', 'MEASURE', 2.0, 'Initial', 'Model cards exist for some models, no standardized explainability framework', 'Adopt standardized model card template, implement SHAP/LIME for all production models', '2025-12-15T09:00:00Z'),
  ('md-005', 't-acme-001', 'ma-001', 'Incident Response', 'MANAGE', 3.0, 'Established', 'AI incident playbook defined, escalation procedures documented', 'Add AI-specific runbooks, tabletop exercises', '2025-12-15T09:00:00Z'),
  ('md-006', 't-acme-001', 'ma-001', 'Vendor Management', 'GOVERN', 2.5, 'Developing', 'Vendor assessment questionnaire exists, annual reviews conducted', 'Implement continuous vendor monitoring, increase assessment frequency for Tier 1', '2025-12-15T09:00:00Z'),
  ('md-007', 't-acme-001', 'ma-001', 'Human Oversight', 'MANAGE', 3.0, 'Established', 'HITL workflows configured for high-risk models, override capabilities exist', 'Add real-time intervention capability, improve SLA tracking', '2025-12-15T09:00:00Z'),
  ('md-008', 't-acme-001', 'ma-001', 'Conformity Assessment', 'GOVERN', 2.0, 'Initial', 'No formal conformity assessment process, EU AI Act gap analysis in progress', 'Establish conformity assessment procedure, designate authorized representative', '2025-12-15T09:00:00Z'),
  ('md-009', 't-acme-001', 'ma-002', 'AI Governance Structure', 'GOVERN', 3.5, 'Established', 'Governance committee active, expanded membership to include business units', 'Consider external advisory board for EU AI Act compliance', '2026-03-15T09:00:00Z'),
  ('md-010', 't-acme-001', 'ma-002', 'Risk Management', 'MAP', 3.0, 'Established', 'Automated risk scoring implemented, risk register integrated with model inventory', 'Implement risk appetite framework, quantitative risk modeling', '2026-03-15T09:00:00Z'),
  ('md-011', 't-acme-001', 'ma-002', 'Bias & Fairness Testing', 'MEASURE', 3.0, 'Established', 'Intersectional analysis added to bias audits, automated bias monitoring in development', 'Complete automated monitoring deployment, add pre-training bias detection', '2026-03-15T09:00:00Z'),
  ('md-012', 't-acme-001', 'ma-002', 'Transparency & Explainability', 'MEASURE', 2.5, 'Developing', 'Standardized model card template adopted, SHAP implemented for credit scoring', 'Extend explainability to all production models, implement user-facing explanations', '2026-03-15T09:00:00Z'),
  ('md-013', 't-acme-001', 'ma-002', 'Incident Response', 'MANAGE', 3.5, 'Established', 'AI-specific runbooks created, tabletop exercise conducted in Q1', 'Integrate with automated detection systems, practice cross-team exercises', '2026-03-15T09:00:00Z'),
  ('md-014', 't-acme-001', 'ma-002', 'Vendor Management', 'GOVERN', 3.0, 'Established', 'Semi-annual assessments implemented for Tier 1 vendors, continuous monitoring initiated', 'Expand continuous monitoring to all AI vendors, implement automated alerting', '2026-03-15T09:00:00Z'),
  ('md-015', 't-acme-001', 'ma-002', 'Human Oversight', 'MANAGE', 3.5, 'Established', 'Real-time monitoring dashboard deployed, SLA tracking improved', 'Add one-click model disable capability, expand coverage to staging models', '2026-03-15T09:00:00Z'),
  ('md-016', 't-acme-001', 'ma-002', 'Conformity Assessment', 'GOVERN', 2.5, 'Developing', 'Conformity assessment process defined, pre-assessment for high-risk systems initiated', 'Complete conformity assessments for all high-risk systems by August 2026', '2026-03-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 41. security_scans — 6
-- ============================================================================
INSERT INTO security_scans (id, tenant_id, scan_type, target, status, started_at, completed_at, findings_count, critical_count, high_count, medium_count, low_count, scanner, created_at) VALUES
  ('ss-001', 't-acme-001', 'model_vulnerability', 'mdl-001', 'completed', '2026-03-01T02:00:00Z', '2026-03-01T04:30:00Z', 5, 0, 2, 2, 1, 'Sentinel AI Security Scanner v2.1', '2026-03-01T02:00:00Z'),
  ('ss-002', 't-acme-001', 'adversarial_robustness', 'mdl-002', 'completed', '2026-02-15T02:00:00Z', '2026-02-15T06:00:00Z', 3, 0, 1, 1, 1, 'Adversarial Robustness Toolkit v1.4', '2026-02-15T02:00:00Z'),
  ('ss-003', 't-acme-001', 'dependency_scan', 'mdl-001', 'completed', '2026-03-10T01:00:00Z', '2026-03-10T01:45:00Z', 12, 1, 3, 5, 3, 'Snyk AI Dependencies v3.0', '2026-03-10T01:00:00Z'),
  ('ss-004', 't-acme-001', 'prompt_injection', 'mdl-001', 'completed', '2026-03-05T03:00:00Z', '2026-03-05T05:00:00Z', 8, 0, 3, 4, 1, 'Garak Prompt Injection Scanner v0.9', '2026-03-05T03:00:00Z'),
  ('ss-005', 't-acme-001', 'model_vulnerability', 'mdl-003', 'completed', '2026-02-28T02:00:00Z', '2026-02-28T03:30:00Z', 2, 0, 0, 1, 1, 'Sentinel AI Security Scanner v2.1', '2026-02-28T02:00:00Z'),
  ('ss-006', 't-acme-001', 'adversarial_robustness', 'mdl-008', 'in_progress', '2026-03-15T02:00:00Z', NULL, 0, 0, 0, 0, 0, 'Adversarial Robustness Toolkit v1.4', '2026-03-15T02:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 42. security_vulnerabilities — 8
-- ============================================================================
INSERT INTO security_vulnerabilities (id, tenant_id, scan_id, title, description, severity, status, cve_id, affected_component, remediation, assigned_to, discovered_at, resolved_at, created_at) VALUES
  ('sv-001', 't-acme-001', 'ss-001', 'Token length manipulation enables context window overflow', 'Crafted inputs exceeding expected token length can cause out-of-memory conditions in inference pipeline', 'high', 'remediated', NULL, 'inference_pipeline', 'Implement input token length validation and truncation with configurable maximum', 'u-008', '2026-03-01T04:30:00Z', '2026-03-05T10:00:00Z', '2026-03-01T04:30:00Z'),
  ('sv-002', 't-acme-001', 'ss-001', 'System prompt leak via multi-turn conversation', 'System prompt can be partially extracted through multi-turn conversation manipulation', 'high', 'in_progress', NULL, 'chatbot_guardrails', 'Strengthen system prompt protection, add output filtering for prompt-like content', 'u-006', '2026-03-01T04:30:00Z', NULL, '2026-03-01T04:30:00Z'),
  ('sv-003', 't-acme-001', 'ss-002', 'Model output manipulation via adversarial input perturbation', 'Small perturbations in credit application numerical fields can shift model output by up to 15%', 'high', 'in_progress', NULL, 'creditscorer_model', 'Implement input validation bounds checking and adversarial training augmentation', 'u-003', '2026-02-15T06:00:00Z', NULL, '2026-02-15T06:00:00Z'),
  ('sv-004', 't-acme-001', 'ss-003', 'Critical dependency vulnerability in transformers library', 'CVE-2025-38721 — Remote code execution via crafted model file in transformers<=4.38.1', 'critical', 'remediated', 'CVE-2025-38721', 'transformers_library', 'Upgrade transformers library to >=4.38.2', 'u-008', '2026-03-10T01:45:00Z', '2026-03-11T09:00:00Z', '2026-03-10T01:45:00Z'),
  ('sv-005', 't-acme-001', 'ss-003', 'Outdated tokenizers library with known deserialization issue', 'tokenizers<0.15.1 vulnerable to arbitrary code execution via crafted vocabulary file', 'high', 'remediated', 'CVE-2025-29401', 'tokenizers_library', 'Upgrade tokenizers to >=0.15.1', 'u-008', '2026-03-10T01:45:00Z', '2026-03-11T09:00:00Z', '2026-03-10T01:45:00Z'),
  ('sv-006', 't-acme-001', 'ss-004', 'DAN-style jailbreak partially bypasses safety filters', 'Do Anything Now (DAN) variant prompts can partially circumvent content safety filters', 'high', 'in_progress', NULL, 'chatbot_safety_filters', 'Update safety filter patterns, implement adversarial prompt classifier', 'u-006', '2026-03-05T05:00:00Z', NULL, '2026-03-05T05:00:00Z'),
  ('sv-007', 't-acme-001', 'ss-004', 'Indirect prompt injection via customer data fields', 'Malicious content in customer account notes can influence chatbot responses', 'medium', 'open', NULL, 'data_ingestion_pipeline', 'Implement input sanitization for all data fields consumed by the chatbot', 'u-003', '2026-03-05T05:00:00Z', NULL, '2026-03-05T05:00:00Z'),
  ('sv-008', 't-acme-001', 'ss-003', 'Medium-severity dependency vulnerabilities in ML pipeline', 'Multiple medium-severity issues in numpy, scipy, and pandas affecting ML training pipeline', 'medium', 'open', NULL, 'ml_training_pipeline', 'Upgrade affected packages to latest patch versions during next maintenance window', 'u-008', '2026-03-10T01:45:00Z', NULL, '2026-03-10T01:45:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 43. security_threats — 6
-- ============================================================================
INSERT INTO security_threats (id, tenant_id, title, description, threat_type, severity, status, source, affected_models, mitigations, detected_at, mitigated_at, created_at) VALUES
  ('st-001', 't-acme-001', 'Adversarial prompt injection campaign targeting financial chatbots', 'Coordinated campaign detected attempting to extract financial advice from AI chatbots using novel jailbreak techniques', 'prompt_injection', 'high', 'mitigated', 'threat_intelligence', '["mdl-001"]', '["Updated guardrail patterns", "Deployed injection classifier", "Increased monitoring"]', '2026-02-10T14:00:00Z', '2026-02-12T09:00:00Z', '2026-02-10T14:00:00Z'),
  ('st-002', 't-acme-001', 'Data poisoning risk in public financial news dataset', 'Potential data poisoning vectors identified in third-party financial news dataset used for sentiment analysis', 'data_poisoning', 'medium', 'investigating', 'internal_research', '["mdl-005"]', '["Data validation checksums", "Anomaly detection on training data"]', '2026-03-01T09:00:00Z', NULL, '2026-03-01T09:00:00Z'),
  ('st-003', 't-acme-001', 'Model extraction attack pattern detected on fraud detection API', 'Suspicious query patterns suggesting systematic model extraction attempt on fraud detection endpoint', 'model_extraction', 'high', 'mitigated', 'api_monitoring', '["mdl-003"]', '["Rate limiting tightened", "Query pattern anomaly detection", "IP blocklist updated"]', '2026-01-20T16:00:00Z', '2026-01-21T10:00:00Z', '2026-01-20T16:00:00Z'),
  ('st-004', 't-acme-001', 'Supply chain risk — compromised ML library detected in ecosystem', 'Malicious package with typosquatting name detected in Python AI ecosystem, potentially affecting ML pipelines', 'supply_chain', 'critical', 'mitigated', 'threat_intelligence', '["mdl-001", "mdl-002", "mdl-003", "mdl-004"]', '["Dependency audit completed", "Package allowlist implemented", "Hash verification added"]', '2026-02-25T08:00:00Z', '2026-02-25T14:00:00Z', '2026-02-25T08:00:00Z'),
  ('st-005', 't-acme-001', 'PII extraction attempt via conversational manipulation', 'Social engineering technique detected attempting to extract customer PII through chatbot conversation steering', 'social_engineering', 'medium', 'active', 'incident_response', '["mdl-001"]', '["PII guardrail strengthened", "Conversation pattern monitoring"]', '2026-03-10T11:00:00Z', NULL, '2026-03-10T11:00:00Z'),
  ('st-006', 't-acme-001', 'Evasion attack on fraud detection using adversarial transactions', 'Sophisticated adversarial transaction patterns designed to evade fraud detection model classification', 'evasion', 'high', 'investigating', 'model_monitoring', '["mdl-003"]', '["Enhanced feature monitoring", "Adversarial training dataset augmentation"]', '2026-03-12T09:00:00Z', NULL, '2026-03-12T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 44. red_team_campaigns — 3
-- ============================================================================
INSERT INTO red_team_campaigns (id, tenant_id, title, description, status, target_model, campaign_type, start_date, end_date, lead, team_members, findings_summary, total_tests, passed_tests, failed_tests, created_at, updated_at) VALUES
  ('rt-001', 't-acme-001', 'Customer Chatbot Red Team — Q1 2026', 'Comprehensive red team assessment of customer-facing chatbot including prompt injection, jailbreak, data exfiltration, and harmful content generation', 'completed', 'mdl-001', 'comprehensive', '2026-01-15', '2026-02-15', 'u-006', '["u-006", "u-008", "u-003"]', 'Identified 3 high-severity and 5 medium-severity vulnerabilities. Key findings: partial system prompt leakage, DAN variant bypass, and indirect injection via customer data fields. Guardrail improvements deployed.', 45, 37, 8, '2026-01-10T09:00:00Z', '2026-02-20T09:00:00Z'),
  ('rt-002', 't-acme-001', 'Credit Scoring Adversarial Robustness', 'Targeted adversarial robustness testing for credit scoring model focusing on input perturbation and evasion attacks', 'completed', 'mdl-002', 'adversarial', '2026-02-01', '2026-02-28', 'u-003', '["u-003", "u-006"]', 'Model shows moderate vulnerability to adversarial input perturbation. Numerical field perturbations can shift outputs by up to 15%. Recommended adversarial training augmentation and input bounds validation.', 30, 27, 3, '2026-01-25T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('rt-003', 't-acme-001', 'Claims Processor Pre-Deployment Red Team', 'Pre-deployment security and safety assessment for insurance claims processing AI', 'in_progress', 'mdl-008', 'comprehensive', '2026-03-01', '2026-04-15', 'u-006', '["u-006", "u-004", "u-003"]', NULL, 20, 14, 6, '2026-02-25T09:00:00Z', '2026-03-15T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 45. data_assets — 8
-- ============================================================================
INSERT INTO data_assets (id, tenant_id, name, description, asset_type, classification, owner, source_system, contains_pii, contains_financial, retention_days, storage_location, encryption_type, access_controls, linked_model_ids, created_at, updated_at) VALUES
  ('da-001', 't-acme-001', 'Customer Profile Database', 'Master customer profile data including personal information, account details, and interaction history', 'database', 'confidential', 'u-005', 'Core Banking System', true, true, 2555, 'us-east-1/rds/customer-profiles', 'AES-256', '["role_based", "mfa_required", "audit_logged"]', '["mdl-001", "mdl-002"]', '2025-01-15T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('da-002', 't-acme-001', 'Transaction Ledger', 'Complete transaction history across all payment channels and instruments', 'database', 'restricted', 'u-004', 'Payment Processing Platform', true, true, 3650, 'us-east-1/rds/transaction-ledger', 'AES-256', '["role_based", "mfa_required", "audit_logged", "need_to_know"]', '["mdl-003"]', '2025-01-15T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('da-003', 't-acme-001', 'Credit Application Archive', 'Historical and active credit applications with applicant demographics and financial data', 'data_lake', 'restricted', 'u-005', 'Loan Origination System', true, true, 3650, 'us-east-1/s3/credit-applications', 'AES-256', '["role_based", "mfa_required", "audit_logged", "data_masking"]', '["mdl-002", "mdl-007"]', '2025-01-15T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('da-004', 't-acme-001', 'Regulatory Document Repository', 'Collection of regulatory filings, compliance reports, contracts, and internal policies', 'document_store', 'internal', 'u-002', 'Document Management System', false, false, 3650, 'us-east-1/s3/regulatory-docs', 'AES-256', '["role_based", "audit_logged"]', '["mdl-004"]', '2025-02-01T09:00:00Z', '2026-01-15T09:00:00Z'),
  ('da-005', 't-acme-001', 'Financial News Feed', 'Real-time and historical financial news, social media, and earnings transcripts', 'streaming', 'public', 'u-003', 'Bloomberg API + Reuters', false, false, 365, 'us-east-1/kinesis/financial-news', 'TLS-in-transit', '["api_key_auth", "rate_limited"]', '["mdl-005"]', '2025-03-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('da-006', 't-acme-001', 'Enterprise Data Catalog Metadata', 'Metadata catalog describing all enterprise data assets, schemas, and lineage', 'metadata', 'internal', 'u-005', 'Data Lake + S3 Metadata Service', true, false, 1825, 'us-east-1/s3/data-catalog', 'AES-256', '["role_based", "audit_logged"]', '["mdl-006"]', '2025-03-01T09:00:00Z', '2026-02-15T09:00:00Z'),
  ('da-007', 't-acme-001', 'Customer Support Interaction Logs', 'Chat transcripts, call recordings metadata, and support ticket history', 'data_lake', 'confidential', 'u-001', 'Salesforce + Zendesk', true, false, 1095, 'us-east-1/s3/support-interactions', 'AES-256', '["role_based", "mfa_required", "pii_masking"]', '["mdl-001"]', '2025-02-01T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('da-008', 't-acme-001', 'Insurance Claims Repository', 'Insurance claims documentation, assessments, and payment records', 'database', 'restricted', 'u-004', 'Claims Management System', true, true, 3650, 'us-east-1/rds/insurance-claims', 'AES-256', '["role_based", "mfa_required", "audit_logged", "data_masking"]', '["mdl-008"]', '2025-06-01T09:00:00Z', '2026-03-08T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 46. explainability_reports — 4
-- ============================================================================
INSERT INTO explainability_reports (id, tenant_id, model_id, title, report_type, status, method, summary, feature_importances, sample_explanations, generated_by, reviewed_by, created_at, updated_at) VALUES
  ('er-001', 't-acme-001', 'mdl-002', 'CreditScorer-v3 SHAP Explainability Report', 'global', 'approved', 'SHAP', 'Global feature importance analysis for credit scoring model. Top features: payment history (0.28), credit utilization (0.22), length of credit history (0.18), recent inquiries (0.12). Protected attributes show minimal direct influence but proxy effects detected through ZIP code.', '{"payment_history": 0.28, "credit_utilization": 0.22, "credit_history_length": 0.18, "recent_inquiries": 0.12, "debt_to_income": 0.08, "available_credit": 0.06, "account_types": 0.04, "zip_code": 0.02}', '[{"input": "Applicant A — denied", "explanation": "Primary factors: high credit utilization (78%), short credit history (2 years), 3 recent inquiries"}, {"input": "Applicant B — approved", "explanation": "Primary factors: excellent payment history (99.5%), low utilization (12%), long credit history (15 years)"}]', 'u-003', 'u-002', '2026-02-15T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('er-002', 't-acme-001', 'mdl-003', 'FraudDetect-v2 Decision Explanation Report', 'local', 'approved', 'LIME', 'Local explanation framework for individual fraud detection decisions. Each flagged transaction includes top contributing features and counterfactual analysis.', '{"transaction_amount": 0.25, "merchant_category": 0.20, "time_of_day": 0.15, "geographic_distance": 0.15, "velocity_24h": 0.12, "device_fingerprint": 0.08, "card_present": 0.05}', '[{"input": "Transaction $4,521 — flagged", "explanation": "Unusual amount for merchant category, geographic anomaly (2000km from last transaction in 1 hour), velocity spike"}, {"input": "Transaction $89 — cleared", "explanation": "Normal pattern: known merchant, typical amount, local geography"}]', 'u-004', 'u-002', '2026-01-20T09:00:00Z', '2026-02-01T09:00:00Z'),
  ('er-003', 't-acme-001', 'mdl-001', 'Customer Chatbot Response Attribution Report', 'global', 'draft', 'Attention Attribution', 'Analysis of attention patterns and response attribution for customer chatbot. Identifies which input tokens most influence output generation and potential hallucination patterns.', '{"customer_query": 0.35, "system_prompt": 0.25, "account_context": 0.20, "conversation_history": 0.15, "knowledge_base": 0.05}', '[{"input": "What is my account balance?", "explanation": "Response primarily driven by account context retrieval (85% attribution), with conversation history providing disambiguation"}]', 'u-003', NULL, '2026-03-10T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('er-004', 't-acme-001', 'mdl-007', 'ResumeScreener Fairness Explainability Report', 'fairness', 'in_progress', 'Counterfactual', 'Counterfactual fairness analysis for resume screening model. Tests whether changing protected attributes while holding qualifications constant affects ranking.', '{"years_experience": 0.30, "skill_match": 0.25, "education_level": 0.20, "role_similarity": 0.15, "keyword_match": 0.10}', '[{"input": "Candidate with name changed", "explanation": "Name change from stereotypically male to female name resulted in 3-position ranking drop — indicates bias"}]', 'u-003', NULL, '2026-03-01T09:00:00Z', '2026-03-14T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 47. conformity_assessments — 3
-- ============================================================================
INSERT INTO conformity_assessments (id, tenant_id, model_id, title, status, assessment_type, framework, assessor, risk_classification, requirements_met, requirements_total, gaps, action_items, started_at, completed_at, created_at, updated_at) VALUES
  ('ca-001', 't-acme-001', 'mdl-002', 'EU AI Act Conformity Assessment — CreditScorer-v3', 'in_progress', 'self_assessment', 'EU AI Act', 'u-002', 'high_risk', 18, 28, '["Art. 10 data governance gaps", "Art. 11 technical documentation incomplete", "Art. 13 transparency measures partial", "Art. 15 accuracy monitoring needs enhancement"]', '["Complete data quality framework per Art. 10", "Finalize technical documentation per Annex IV", "Deploy user-facing transparency notices", "Implement continuous accuracy monitoring"]', '2026-01-15T09:00:00Z', NULL, '2026-01-15T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('ca-002', 't-acme-001', 'mdl-007', 'EU AI Act Conformity Assessment — ResumeScreener', 'in_progress', 'self_assessment', 'EU AI Act', 'u-002', 'high_risk', 8, 28, '["Art. 9 risk management incomplete", "Art. 10 training data governance deficient", "Art. 13 no transparency documentation", "Art. 14 human oversight limited", "Art. 15 no ongoing monitoring"]', '["Complete risk management system", "Implement bias-free training data pipeline", "Create transparency documentation", "Design human oversight workflow", "Deploy monitoring infrastructure"]', '2026-02-01T09:00:00Z', NULL, '2026-02-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('ca-003', 't-acme-001', 'mdl-001', 'EU AI Act Conformity Assessment — Customer Chatbot', 'in_progress', 'self_assessment', 'EU AI Act', 'u-002', 'limited_risk', 15, 20, '["Art. 52 transparency obligations partial", "Logging requirements need enhancement"]', '["Complete transparency disclosure for AI-generated content", "Enhance interaction logging"]', '2026-02-15T09:00:00Z', NULL, '2026-02-15T09:00:00Z', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 48. incident_workflow_steps — 12
-- ============================================================================
INSERT INTO incident_workflow_steps (id, tenant_id, incident_id, step_number, step_name, status, assigned_to, action_taken, notes, started_at, completed_at, created_at) VALUES
  ('iws-001', 't-acme-001', 'inc-001', 1, 'Detection & Triage', 'completed', 'u-006', 'Automated alert triggered by bias monitoring system', 'CreditScorer bias metric breached threshold — DI ratio dropped to 0.84', '2026-01-08T10:00:00Z', '2026-01-08T10:30:00Z', '2026-01-08T10:00:00Z'),
  ('iws-002', 't-acme-001', 'inc-001', 2, 'Investigation', 'completed', 'u-003', 'Root cause analysis performed', 'Training data drift detected — new credit application demographic distribution shifted', '2026-01-08T10:30:00Z', '2026-01-09T16:00:00Z', '2026-01-08T10:30:00Z'),
  ('iws-003', 't-acme-001', 'inc-001', 3, 'Containment', 'completed', 'u-003', 'Enhanced monitoring and manual review for borderline decisions', 'Added human review step for credit decisions within 5% of threshold boundary', '2026-01-09T16:00:00Z', '2026-01-10T09:00:00Z', '2026-01-09T16:00:00Z'),
  ('iws-004', 't-acme-001', 'inc-001', 4, 'Remediation', 'in_progress', 'u-003', 'Reweighting algorithm development underway', 'Implementing reweighting approach to correct demographic imbalance — estimated completion Q2 2026', '2026-01-10T09:00:00Z', NULL, '2026-01-10T09:00:00Z'),
  ('iws-005', 't-acme-001', 'inc-002', 1, 'Detection & Triage', 'completed', 'u-006', 'API monitoring detected unusual query pattern', 'Systematic query pattern suggesting model extraction attempt on fraud detection endpoint', '2026-01-20T16:00:00Z', '2026-01-20T16:30:00Z', '2026-01-20T16:00:00Z'),
  ('iws-006', 't-acme-001', 'inc-002', 2, 'Investigation', 'completed', 'u-006', 'Analyzed API logs and identified source', 'Queries originated from single IP block, systematic feature space exploration pattern confirmed', '2026-01-20T16:30:00Z', '2026-01-20T20:00:00Z', '2026-01-20T16:30:00Z'),
  ('iws-007', 't-acme-001', 'inc-002', 3, 'Containment', 'completed', 'u-008', 'IP blocklist updated, rate limiting tightened', 'Blocked source IPs, reduced rate limits, enabled query pattern anomaly detection', '2026-01-20T20:00:00Z', '2026-01-21T10:00:00Z', '2026-01-20T20:00:00Z'),
  ('iws-008', 't-acme-001', 'inc-002', 4, 'Remediation', 'completed', 'u-008', 'Permanent security controls deployed', 'Implemented differential privacy noise injection on API responses, added watermarking', '2026-01-21T10:00:00Z', '2026-01-25T14:00:00Z', '2026-01-21T10:00:00Z'),
  ('iws-009', 't-acme-001', 'inc-003', 1, 'Detection & Triage', 'completed', 'u-006', 'Red team exercise identified vulnerability', 'DAN variant jailbreak partially bypassed chatbot safety filters during red team campaign', '2026-02-05T14:00:00Z', '2026-02-05T15:00:00Z', '2026-02-05T14:00:00Z'),
  ('iws-010', 't-acme-001', 'inc-003', 2, 'Investigation', 'completed', 'u-006', 'Analyzed bypass mechanism', 'Novel DAN variant uses context switching technique not covered by existing filter patterns', '2026-02-05T15:00:00Z', '2026-02-06T12:00:00Z', '2026-02-05T15:00:00Z'),
  ('iws-011', 't-acme-001', 'inc-003', 3, 'Containment', 'completed', 'u-006', 'Emergency filter pattern update deployed', 'Added new DAN variant patterns to injection detection classifier', '2026-02-06T12:00:00Z', '2026-02-06T16:00:00Z', '2026-02-06T12:00:00Z'),
  ('iws-012', 't-acme-001', 'inc-003', 4, 'Remediation', 'completed', 'u-003', 'Adversarial prompt classifier trained and deployed', 'ML-based injection classifier deployed as additional guardrail layer', '2026-02-06T16:00:00Z', '2026-02-12T09:00:00Z', '2026-02-06T16:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 49. remediation_items — 8
-- ============================================================================
INSERT INTO remediation_items (id, tenant_id, title, description, source_type, source_id, severity, status, assigned_to, due_date, resolution, effort_estimate, created_at, updated_at) VALUES
  ('rem-001', 't-acme-001', 'Implement reweighting algorithm for CreditScorer bias remediation', 'Deploy demographic reweighting in CreditScorer-v3 training pipeline to achieve 0.85 DI ratio', 'audit_finding', 'af-011', 'critical', 'in_progress', 'u-003', '2026-06-30', NULL, 'large', '2026-01-10T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('rem-002', 't-acme-001', 'Complete EU AI Act technical documentation for CreditScorer', 'Create comprehensive technical documentation per EU AI Act Annex IV requirements', 'audit_finding', 'af-008', 'high', 'in_progress', 'u-003', '2026-05-31', NULL, 'large', '2026-01-25T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('rem-003', 't-acme-001', 'Deploy real-time bias monitoring pipeline', 'Implement continuous bias monitoring with automated alerting for all production models', 'audit_finding', 'af-012', 'high', 'in_progress', 'u-003', '2026-03-31', NULL, 'medium', '2026-01-25T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('rem-004', 't-acme-001', 'Establish EU AI Act conformity assessment procedure', 'Define and document formal conformity assessment process per Article 43', 'audit_finding', 'af-007', 'critical', 'open', 'u-002', '2026-06-30', NULL, 'large', '2026-01-20T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('rem-005', 't-acme-001', 'Fix system prompt leakage in customer chatbot', 'Strengthen system prompt protection and add output filtering for prompt-like content', 'security_vulnerability', 'sv-002', 'high', 'in_progress', 'u-006', '2026-04-15', NULL, 'medium', '2026-03-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('rem-006', 't-acme-001', 'Implement adversarial training for CreditScorer', 'Augment training data with adversarial examples to improve model robustness', 'security_vulnerability', 'sv-003', 'high', 'open', 'u-003', '2026-05-15', NULL, 'large', '2026-02-15T09:00:00Z', '2026-03-05T09:00:00Z'),
  ('rem-007', 't-acme-001', 'Implement semi-annual vendor assessments for Tier 1', 'Increase vendor assessment frequency from annual to semi-annual for all Tier 1 AI vendors', 'audit_finding', 'af-006', 'medium', 'completed', 'u-002', '2026-03-31', 'Semi-annual assessment schedule implemented. Next assessments scheduled for Q3 2026.', 'small', '2025-12-01T09:00:00Z', '2026-03-01T09:00:00Z'),
  ('rem-008', 't-acme-001', 'Sanitize customer data fields consumed by chatbot', 'Implement input sanitization for all customer data fields to prevent indirect prompt injection', 'security_vulnerability', 'sv-007', 'medium', 'open', 'u-003', '2026-04-30', NULL, 'medium', '2026-03-05T09:00:00Z', '2026-03-10T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 50. incidents — 8
-- ============================================================================
INSERT INTO incidents (id, tenant_id, title, description, severity, status, category, model_id, reported_by, assigned_to, resolution, resolved_at, created_at, updated_at) VALUES
  ('inc-001', 't-acme-001', 'CreditScorer-v3 Bias Threshold Breach', 'Credit scoring model gender parity metric dropped below 0.85 threshold (measured at 0.84) during Q4 2025 quarterly audit', 'critical', 'mitigating', 'bias_violation', 'mdl-002', 'u-003', 'u-003', NULL, NULL, '2026-01-08T10:00:00Z', '2026-03-15T09:00:00Z'),
  ('inc-002', 't-acme-001', 'Fraud Detection Model Extraction Attempt', 'Systematic query pattern detected on fraud detection API suggesting model extraction attack', 'high', 'resolved', 'security_breach', 'mdl-003', 'u-006', 'u-008', 'IP blocklist updated, rate limiting tightened, differential privacy noise injection deployed, API response watermarking implemented', '2026-01-25T14:00:00Z', '2026-01-20T16:00:00Z', '2026-01-25T14:00:00Z'),
  ('inc-003', 't-acme-001', 'Customer Chatbot Jailbreak Bypass', 'DAN variant jailbreak partially bypassed chatbot safety filters during red team exercise', 'high', 'resolved', 'prompt_injection', 'mdl-001', 'u-006', 'u-006', 'Updated injection detection patterns, deployed ML-based adversarial prompt classifier as additional guardrail', '2026-02-12T09:00:00Z', '2026-02-05T14:00:00Z', '2026-02-12T09:00:00Z'),
  ('inc-004', 't-acme-001', 'SentimentAnalyzer False Signal Generation', 'Sentiment analysis model generated false positive market signal due to satire article misclassification', 'medium', 'resolved', 'model_failure', 'mdl-005', 'u-003', 'u-003', 'Added satire/sarcasm detection pre-filter, updated training data to include satirical content examples', '2026-02-20T14:00:00Z', '2026-02-10T09:00:00Z', '2026-02-20T14:00:00Z'),
  ('inc-005', 't-acme-001', 'Shadow AI Data Exposure — Marketing', 'Marketing team used personal ChatGPT API keys to process customer segment data without authorization', 'high', 'investigating', 'data_exposure', NULL, 'u-008', 'u-005', NULL, NULL, '2026-01-15T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('inc-006', 't-acme-001', 'Critical Dependency Vulnerability — Transformers Library', 'CVE-2025-38721 remote code execution vulnerability in transformers library used across multiple models', 'critical', 'resolved', 'vulnerability', NULL, 'u-008', 'u-008', 'Upgraded transformers library to v4.38.2 across all model serving infrastructure within 24 hours', '2026-03-11T09:00:00Z', '2026-03-10T01:45:00Z', '2026-03-11T09:00:00Z'),
  ('inc-007', 't-acme-001', 'Customer Chatbot PII Leak Attempt', 'Customer manipulated chatbot conversation to attempt extraction of other customers PII through social engineering', 'medium', 'mitigating', 'data_exposure', 'mdl-001', 'u-006', 'u-006', NULL, NULL, '2026-03-10T11:00:00Z', '2026-03-15T09:00:00Z'),
  ('inc-008', 't-acme-001', 'FraudDetect-v2 Latency Spike', 'Fraud detection model latency spiked to 200ms (SLA: 15ms) during peak trading hours due to feature store degradation', 'medium', 'resolved', 'performance_degradation', 'mdl-003', 'u-008', 'u-008', 'Feature store cache layer restored, added redundant cache tier to prevent recurrence', '2026-02-05T14:00:00Z', '2026-02-05T10:00:00Z', '2026-02-05T14:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 51. risks — 10
-- ============================================================================
INSERT INTO risks (id, tenant_id, title, description, category, likelihood, impact, risk_score, status, owner_id, mitigation_plan, model_id, created_at, updated_at) VALUES
  ('risk-001', 't-acme-001', 'Systematic bias in credit scoring affecting protected classes', 'CreditScorer-v3 shows disparate impact on gender and age dimensions, potentially violating ECOA and EU AI Act', 'bias_fairness', 4, 5, 20, 'mitigating', 'u-003', 'Deploy reweighting algorithm, implement continuous bias monitoring, establish quarterly audit cadence with intersectional analysis', 'mdl-002', '2025-06-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('risk-002', 't-acme-001', 'AI chatbot generating misleading financial information', 'Customer chatbot may generate hallucinated or inaccurate financial information leading to regulatory action', 'operational', 3, 5, 15, 'mitigating', 'u-004', 'Deploy fact-checking guardrail, restrict to FAQ-based responses, implement confidence scoring with human escalation below threshold', 'mdl-001', '2025-07-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('risk-003', 't-acme-001', 'PII exposure through LLM training data or inference', 'Risk of personal identifiable information leakage through model memorization or inadequate input/output filtering', 'privacy', 3, 4, 12, 'open', 'u-005', 'Implement differential privacy in training, PII scanning in inference pipeline, data minimization in context windows', 'mdl-001', '2025-08-01T09:00:00Z', '2026-03-12T09:00:00Z'),
  ('risk-004', 't-acme-001', 'Model performance drift in fraud detection increasing false positives', 'Data drift causing fraud detection model to generate excessive false positives impacting customer experience', 'model_performance', 3, 4, 12, 'mitigating', 'u-004', 'Automated PSI monitoring with 0.2 threshold, weekly retraining pipeline, A/B testing framework for model updates', 'mdl-003', '2025-09-01T09:00:00Z', '2026-03-08T09:00:00Z'),
  ('risk-005', 't-acme-001', 'EU AI Act non-compliance penalties for high-risk systems', 'Failure to complete conformity assessment for high-risk AI systems before enforcement deadline', 'regulatory', 4, 4, 16, 'open', 'u-002', 'Accelerate conformity assessment program, designate authorized representative, establish technical documentation per Annex IV', 'mdl-002', '2025-10-01T09:00:00Z', '2026-03-14T09:00:00Z'),
  ('risk-006', 't-acme-001', 'Adversarial prompt injection compromising chatbot integrity', 'Sophisticated prompt injection attacks may bypass safety filters and generate harmful or unauthorized outputs', 'security', 3, 3, 9, 'mitigating', 'u-006', 'Input sanitization, adversarial prompt classifier, output filtering, regular red team testing, guardrail pattern updates', 'mdl-001', '2025-10-15T09:00:00Z', '2026-02-28T09:00:00Z'),
  ('risk-007', 't-acme-001', 'Resume screening AI perpetuating historical hiring discrimination', 'ResumeScreener model shows significant bias across gender, age, and name origin dimensions', 'bias_fairness', 5, 5, 25, 'open', 'u-003', 'Hold deployment until bias audit passes, implement blind resume processing, require human final decision, add disparate impact testing', 'mdl-007', '2025-11-01T09:00:00Z', '2026-03-15T09:00:00Z'),
  ('risk-008', 't-acme-001', 'Third-party AI vendor data breach or service disruption', 'Dependency on external AI vendors creates risk of data breach, service outage, or compliance failure', 'vendor', 2, 5, 10, 'accepted', 'u-001', 'Contractual DPA requirements, encryption at rest and in transit, vendor SOC 2 verification, BCP failover plans', NULL, '2025-11-15T09:00:00Z', '2026-01-20T09:00:00Z'),
  ('risk-009', 't-acme-001', 'Uncontrolled shadow AI proliferation across business units', 'Unauthorized AI tool usage spreading across marketing, sales, and operations without governance oversight', 'shadow_ai', 4, 3, 12, 'mitigating', 'u-001', 'API gateway monitoring, monthly shadow AI scans, employee training program, approved tool catalog, detection automation', NULL, '2026-01-01T09:00:00Z', '2026-03-10T09:00:00Z'),
  ('risk-010', 't-acme-001', 'AI model supply chain compromise', 'Risk of malicious code injection through compromised ML libraries, model files, or training data sources', 'security', 2, 5, 10, 'mitigating', 'u-008', 'Dependency scanning, package allowlisting, hash verification, SBOM maintenance, automated vulnerability patching', NULL, '2026-02-01T09:00:00Z', '2026-03-12T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

COMMIT;
