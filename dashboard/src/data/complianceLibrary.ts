// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Atomic Control Library — 11 AI-governance frameworks, 92 default controls, and
// cross-framework crosswalk clusters. This is the frontend source of truth that
// the Control Drift view fans out from. Mirrors the Step-0 seed migration; when
// the Supabase `controls`/`regulation_entries` tables are populated the same
// shapes load live (this seed is the demo/empty-DB fallback).

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type EvalType = 'AUTO' | 'MANUAL';

export interface FrameworkDef {
  code: string; name: string; shortCode: string; version: string;
  region: string; category: string; effectiveDate: string; description: string;
  // Authoritative framework scope (the full standard), distinct from the mapped
  // operational controls Sentinel tracks. `count`/`unit` = official size;
  // `structure` = how it decomposes.
  official: { count: number; unit: string; structure: string };
}

export interface ControlDef {
  framework: string; code: string; name: string; clause: string;
  severity: Severity; evalType: EvalType; description: string;
  policyRuleKey?: string; // links an AUTO control to a deterministic backend rule
}

// Control code → deterministic policy rule key (matches sentinel/compliance/policy_rules.py).
// Only AUTO controls with telemetry-backed checks are mapped; the rest are MANUAL attestation.
export const POLICY_RULE_KEYS: Record<string, string> = {
  'EU-003': 'check_human_oversight', 'EU-005': 'check_hallucination_rate', 'EU-006': 'check_drift',
  'EU-008': 'check_accuracy', 'EU-009': 'check_bias',
  'GDPR-001': 'check_pii_leakage', 'GDPR-005': 'check_human_oversight',
  'ISO42-005': 'check_bias', 'ISO42-008': 'check_accuracy',
  'MITRE-001': 'check_injection_rate',
  'NIST-005': 'check_bias', 'NIST-006': 'check_trust_score', 'NIST-007': 'check_drift',
  'OECD-002': 'check_human_oversight', 'OECD-004': 'check_trust_score',
  'OWASP-LLM01': 'check_injection_rate', 'OWASP-LLM02': 'check_pii_leakage', 'OWASP-LLM09': 'check_hallucination_rate',
  'SG-005': 'check_drift', 'SG-006': 'check_trust_score', 'SG-007': 'check_injection_rate',
  'UNESCO-003': 'check_pii_leakage', 'UNESCO-007': 'check_human_oversight', 'UNESCO-008': 'check_bias',
  'IN-005': 'check_bias', 'IN-007': 'check_drift',
};

export const FRAMEWORKS: FrameworkDef[] = [
  { code: 'EU_AI_ACT', name: 'EU AI Act', shortCode: 'EU_AI_ACT', version: '2024/1689', region: 'EU', category: 'AI Regulation', effectiveDate: '2024-08-01', description: 'EU regulation on artificial intelligence systems', official: { count: 130, unit: 'obligations', structure: '113 Articles → ~130 high-risk provider obligations (Art. 9 risk mgmt, Art. 10 data governance, Art. 11 tech docs)' } },
  { code: 'GDPR', name: 'GDPR', shortCode: 'GDPR', version: '2016/679', region: 'EU', category: 'Data Privacy', effectiveDate: '2018-05-25', description: 'EU General Data Protection Regulation', official: { count: 99, unit: 'articles', structure: '99 legal Articles → ~35–40 operational controls (RoPA Art. 30, DPIA Art. 35)' } },
  { code: 'GOOGLE_SAIF', name: 'Google SAIF', shortCode: 'GOOGLE_SAIF', version: '1.0', region: 'GLOBAL', category: 'AI Security', effectiveDate: '2023-06-08', description: 'Google Secure AI Framework for securing AI systems', official: { count: 60, unit: 'controls', structure: '6 core pillars → 60 security controls (model security, data protection, infrastructure)' } },
  { code: 'ISO_42001', name: 'ISO/IEC 42001', shortCode: 'ISO_42001', version: '2023', region: 'GLOBAL', category: 'AI Management', effectiveDate: '2023-12-01', description: 'International standard for AI management systems', official: { count: 38, unit: 'Annex A controls', structure: '10 clauses + exactly 38 Annex A controls (A.2–A.10)' } },
  { code: 'MITRE_ATLAS', name: 'MITRE ATLAS', shortCode: 'MITRE_ATLAS', version: '2024', region: 'GLOBAL', category: 'AI Threat Intel', effectiveDate: '2022-01-01', description: 'Adversarial Threat Landscape for AI Systems', official: { count: 84, unit: 'techniques', structure: '16 tactics · 84 techniques · 32 mitigations' } },
  { code: 'NIST_AI_RMF', name: 'NIST AI RMF 1.0', shortCode: 'NIST_AI_RMF', version: '1.0', region: 'US', category: 'Risk Management', effectiveDate: '2023-01-26', description: 'NIST AI Risk Management Framework', official: { count: 72, unit: 'sub-categories', structure: '4 functions (Govern/Map/Measure/Manage) · 19 categories · 72 sub-categories' } },
  { code: 'OECD_AI', name: 'OECD AI Principles', shortCode: 'OECD_AI', version: '2024', region: 'GLOBAL', category: 'AI Ethics', effectiveDate: '2019-05-22', description: 'OECD principles for trustworthy AI stewardship', official: { count: 10, unit: 'principles', structure: '5 values-based principles + 5 policymaker recommendations' } },
  { code: 'OWASP_LLM', name: 'OWASP LLM Top 10', shortCode: 'OWASP_LLM', version: '2025', region: 'GLOBAL', category: 'LLM Security', effectiveDate: '2023-10-01', description: 'Security risks specific to LLM applications', official: { count: 10, unit: 'risks', structure: 'Top 10 critical LLM risks → ~50+ specific mitigations' } },
  { code: 'SG_MODEL_AI', name: 'Singapore Model AI Framework', shortCode: 'SG_MODEL_AI', version: '2.0', region: 'APAC', category: 'AI Governance', effectiveDate: '2024-05-01', description: 'Singapore framework for responsible AI governance', official: { count: 9, unit: 'principles', structure: '2 key pillars (internal governance, human-centricity) · 9 guiding principles' } },
  { code: 'UNESCO_AI', name: 'UNESCO Ethics of AI', shortCode: 'UNESCO_AI', version: '2021', region: 'GLOBAL', category: 'AI Ethics', effectiveDate: '2021-11-23', description: 'UNESCO recommendation on the ethics of AI', official: { count: 11, unit: 'policy areas', structure: '10 core values/principles · 11 policy action areas (data, gender, education…)' } },
  { code: 'INDIA_AI_GOV', name: 'India AI Governance Guidelines', shortCode: 'INDIA_AI_GOV', version: '2024', region: 'IN', category: 'AI Governance', effectiveDate: '2024-01-01', description: 'India IndiaAI / MeitY responsible AI guidelines', official: { count: 7, unit: 'guideline areas', structure: 'MeitY/IndiaAI responsible-AI guideline areas aligned to the DPDP Act 2023' } },
];

export const FRAMEWORK_NAME: Record<string, string> = Object.fromEntries(FRAMEWORKS.map(f => [f.code, f.name]));

export const CONTROLS: ControlDef[] = [
  // EU AI Act (12)
  { framework: 'EU_AI_ACT', code: 'EU-001', name: 'High-Risk Classification', clause: 'Article 6, Annex III', severity: 'HIGH', evalType: 'AUTO', description: 'AI system classified per Annex III high-risk categories before deployment' },
  { framework: 'EU_AI_ACT', code: 'EU-002', name: 'Conformity Assessment', clause: 'Article 43', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Conformity assessment completed before market placement for high-risk systems' },
  { framework: 'EU_AI_ACT', code: 'EU-003', name: 'Human Oversight Mechanism', clause: 'Article 14', severity: 'HIGH', evalType: 'AUTO', description: 'Human oversight mechanism implemented for high-risk AI systems' },
  { framework: 'EU_AI_ACT', code: 'EU-004', name: 'Technical Documentation', clause: 'Article 11, Annex IV', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Technical documentation maintained per Annex IV requirements' },
  { framework: 'EU_AI_ACT', code: 'EU-005', name: 'Transparency Disclosure', clause: 'Article 13, Article 50', severity: 'MEDIUM', evalType: 'AUTO', description: 'AI interaction disclosed to natural persons' },
  { framework: 'EU_AI_ACT', code: 'EU-006', name: 'Post-Market Monitoring', clause: 'Article 72', severity: 'HIGH', evalType: 'AUTO', description: 'Post-market monitoring system tracks performance after deployment' },
  { framework: 'EU_AI_ACT', code: 'EU-007', name: 'Fundamental Rights Impact Assessment', clause: 'Article 27', severity: 'HIGH', evalType: 'MANUAL', description: 'FRIA conducted for high-risk systems used by public bodies' },
  { framework: 'EU_AI_ACT', code: 'EU-008', name: 'Accuracy and Robustness', clause: 'Article 15', severity: 'HIGH', evalType: 'AUTO', description: 'System meets accuracy, robustness, and cybersecurity thresholds' },
  { framework: 'EU_AI_ACT', code: 'EU-009', name: 'Data Governance', clause: 'Article 10', severity: 'CRITICAL', evalType: 'AUTO', description: 'Training/validation/testing data meets quality, bias, relevance criteria' },
  { framework: 'EU_AI_ACT', code: 'EU-010', name: 'Risk Management System', clause: 'Article 9', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Continuous risk management system implemented across AI lifecycle' },
  { framework: 'EU_AI_ACT', code: 'EU-011', name: 'Record-Keeping / Logging', clause: 'Article 12', severity: 'MEDIUM', evalType: 'AUTO', description: 'Automatic logging of events throughout system lifetime' },
  { framework: 'EU_AI_ACT', code: 'EU-012', name: 'GPAI Systemic Risk Assessment', clause: 'Article 55', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Systemic risk assessment for general-purpose AI models above compute threshold' },
  // GDPR (8)
  { framework: 'GDPR', code: 'GDPR-001', name: 'Lawful Basis for AI Processing', clause: 'Article 6', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Documented lawful basis exists for all personal data processing by AI' },
  { framework: 'GDPR', code: 'GDPR-002', name: 'Data Subject Rights', clause: 'Articles 15-22', severity: 'HIGH', evalType: 'MANUAL', description: 'Mechanisms exist for access, rectification, erasure, and portability requests' },
  { framework: 'GDPR', code: 'GDPR-003', name: 'DPIA for High-Risk AI', clause: 'Article 35', severity: 'HIGH', evalType: 'MANUAL', description: 'Data Protection Impact Assessment completed for high-risk processing' },
  { framework: 'GDPR', code: 'GDPR-004', name: 'Data Minimisation', clause: 'Article 5(1)(c)', severity: 'MEDIUM', evalType: 'AUTO', description: 'Training data limited to what is necessary for the stated purpose' },
  { framework: 'GDPR', code: 'GDPR-005', name: 'Automated Decision-Making Opt-Out', clause: 'Article 22', severity: 'HIGH', evalType: 'MANUAL', description: 'Right to human intervention for solely automated significant decisions' },
  { framework: 'GDPR', code: 'GDPR-006', name: 'Retention Limits', clause: 'Article 5(1)(e)', severity: 'MEDIUM', evalType: 'AUTO', description: 'Personal data retained only as long as necessary, enforced by policy' },
  { framework: 'GDPR', code: 'GDPR-007', name: 'Cross-Border Transfer Safeguards', clause: 'Chapter V', severity: 'HIGH', evalType: 'MANUAL', description: 'Adequate safeguards (SCCs, adequacy decisions) for international transfers' },
  { framework: 'GDPR', code: 'GDPR-008', name: 'Privacy by Design and Default', clause: 'Article 25', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Privacy-protective settings and architecture built in from the start' },
  // Google SAIF (6)
  { framework: 'GOOGLE_SAIF', code: 'SAIF-001', name: 'Secure-by-Default Infrastructure', clause: 'SAIF Element 1', severity: 'HIGH', evalType: 'AUTO', description: 'AI infrastructure built on hardened, secure-by-default foundations' },
  { framework: 'GOOGLE_SAIF', code: 'SAIF-002', name: 'Extend Detection & Response to AI', clause: 'SAIF Element 2', severity: 'HIGH', evalType: 'AUTO', description: 'Threat detection and incident response extended to cover AI-specific threats' },
  { framework: 'GOOGLE_SAIF', code: 'SAIF-003', name: 'Automated Defenses', clause: 'SAIF Element 3', severity: 'MEDIUM', evalType: 'AUTO', description: 'Automated defensive controls keep pace with AI-driven attack speed' },
  { framework: 'GOOGLE_SAIF', code: 'SAIF-004', name: 'Harmonised Platform Controls', clause: 'SAIF Element 4', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Consistent security controls applied across all AI platforms used' },
  { framework: 'GOOGLE_SAIF', code: 'SAIF-005', name: 'Adaptive Controls / Red-Teaming', clause: 'SAIF Element 5', severity: 'HIGH', evalType: 'MANUAL', description: 'Continuous adaptation via adversarial testing and red-team feedback' },
  { framework: 'GOOGLE_SAIF', code: 'SAIF-006', name: 'Contextualised AI Risk in Business Process', clause: 'SAIF Element 6', severity: 'MEDIUM', evalType: 'MANUAL', description: 'AI risk evaluation embedded in broader enterprise risk management' },
  // ISO/IEC 42001 (10)
  { framework: 'ISO_42001', code: 'ISO42-001', name: 'AIMS Scope Definition', clause: 'Clause 4.3', severity: 'MEDIUM', evalType: 'MANUAL', description: 'AI Management System scope formally defined and documented' },
  { framework: 'ISO_42001', code: 'ISO42-002', name: 'AI Risk Assessment Process', clause: 'Clause 6.1, Annex C', severity: 'HIGH', evalType: 'AUTO', description: 'Systematic AI risk assessment conducted at defined intervals' },
  { framework: 'ISO_42001', code: 'ISO42-003', name: 'AI Policy', clause: 'Clause 5.2', severity: 'HIGH', evalType: 'MANUAL', description: 'Top management has established and communicated an AI policy' },
  { framework: 'ISO_42001', code: 'ISO42-004', name: 'Resource and Competence Management', clause: 'Clause 7.2', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Personnel have demonstrated competence for AI system roles' },
  { framework: 'ISO_42001', code: 'ISO42-005', name: 'Data Management (A.8.2)', clause: 'Annex A.8.2', severity: 'CRITICAL', evalType: 'AUTO', description: 'Data quality, provenance, and lifecycle managed per AIMS controls' },
  { framework: 'ISO_42001', code: 'ISO42-006', name: 'Supplier / Third-Party AI Governance', clause: 'Annex A.10', severity: 'MEDIUM', evalType: 'MANUAL', description: 'AI suppliers and vendors assessed and monitored for AIMS compliance' },
  { framework: 'ISO_42001', code: 'ISO42-007', name: 'Incident Management', clause: 'Clause 10.1, Annex A.9', severity: 'HIGH', evalType: 'AUTO', description: 'AI incidents managed through documented procedure with root-cause analysis' },
  { framework: 'ISO_42001', code: 'ISO42-008', name: 'Operational Performance Monitoring', clause: 'Clause 8.2, Annex A.6', severity: 'HIGH', evalType: 'AUTO', description: 'AI system performance continuously monitored against defined criteria' },
  { framework: 'ISO_42001', code: 'ISO42-009', name: 'Internal Audit Programme', clause: 'Clause 9.2', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Internal audits of the AIMS conducted at planned intervals' },
  { framework: 'ISO_42001', code: 'ISO42-010', name: 'Continual Improvement', clause: 'Clause 10.2', severity: 'LOW', evalType: 'MANUAL', description: 'Nonconformities trigger corrective action and system improvement' },
  // MITRE ATLAS (10)
  { framework: 'MITRE_ATLAS', code: 'MITRE-001', name: 'Prompt Injection Detection', clause: 'AML.T0051', severity: 'CRITICAL', evalType: 'AUTO', description: 'Detect and block direct/indirect prompt injection attempts' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-002', name: 'Model Extraction Prevention', clause: 'AML.T0024', severity: 'HIGH', evalType: 'AUTO', description: 'Rate limiting and query monitoring prevent model extraction via API' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-003', name: 'Adversarial Input Detection', clause: 'AML.T0043', severity: 'HIGH', evalType: 'AUTO', description: 'Adversarially perturbed inputs detected before inference' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-004', name: 'Training Data Poisoning Detection', clause: 'AML.T0020', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Training pipeline monitored for data poisoning indicators' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-005', name: 'Red Team Exercises', clause: 'AML Mitigation M0017', severity: 'HIGH', evalType: 'MANUAL', description: 'Scheduled adversarial red-team testing against deployed models' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-006', name: 'Model Supply Chain Integrity', clause: 'AML.T0010', severity: 'HIGH', evalType: 'AUTO', description: 'Model artifacts signed and hash-verified through supply chain' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-007', name: 'LLM Jailbreak Resistance', clause: 'AML.T0054', severity: 'CRITICAL', evalType: 'AUTO', description: 'System resists known jailbreak techniques bypassing safety training' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-008', name: 'Inference API Exfiltration Monitoring', clause: 'AML.T0025', severity: 'MEDIUM', evalType: 'AUTO', description: 'Unusual query patterns indicative of data exfiltration are flagged' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-009', name: 'Backdoor / Trojaned Model Detection', clause: 'AML.T0018', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Models scanned for embedded backdoor triggers before deployment' },
  { framework: 'MITRE_ATLAS', code: 'MITRE-010', name: 'ML Supply Chain Compromise', clause: 'AML.T0010', severity: 'HIGH', evalType: 'MANUAL', description: 'Third-party model and dataset sources vetted for compromise' },
  // NIST AI RMF (8)
  { framework: 'NIST_AI_RMF', code: 'NIST-001', name: 'AI Governance Structure', clause: 'GOVERN 1.1', severity: 'CRITICAL', evalType: 'MANUAL', description: 'AI governance policies and accountability structures established' },
  { framework: 'NIST_AI_RMF', code: 'NIST-002', name: 'Risk Tolerance Definition', clause: 'GOVERN 1.3', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Organisational AI risk tolerance documented and approved' },
  { framework: 'NIST_AI_RMF', code: 'NIST-003', name: 'Context and Risk Mapping', clause: 'MAP 1.1', severity: 'HIGH', evalType: 'AUTO', description: 'AI system context, use case, and impacted parties mapped' },
  { framework: 'NIST_AI_RMF', code: 'NIST-004', name: 'Categorisation of AI System', clause: 'MAP 1.5', severity: 'MEDIUM', evalType: 'MANUAL', description: 'System categorised by risk per organisational risk taxonomy' },
  { framework: 'NIST_AI_RMF', code: 'NIST-005', name: 'Fairness Measurement', clause: 'MEASURE 2.5', severity: 'HIGH', evalType: 'AUTO', description: 'Fairness and bias metrics measured against established thresholds' },
  { framework: 'NIST_AI_RMF', code: 'NIST-006', name: 'Trustworthiness Measurement', clause: 'MEASURE 2.1-2.13', severity: 'HIGH', evalType: 'AUTO', description: 'Trust score / trustworthiness characteristics measured continuously' },
  { framework: 'NIST_AI_RMF', code: 'NIST-007', name: 'Failure Monitoring', clause: 'MANAGE 2.3', severity: 'HIGH', evalType: 'AUTO', description: 'System monitored for failures, drift, and performance degradation' },
  { framework: 'NIST_AI_RMF', code: 'NIST-008', name: 'Third-Party Risk Management', clause: 'MANAGE 3.1-3.2', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Third-party AI components assessed and managed as supply chain risk' },
  // OECD AI (6)
  { framework: 'OECD_AI', code: 'OECD-001', name: 'Inclusive Growth and Well-being', clause: 'Principle 1.1', severity: 'LOW', evalType: 'MANUAL', description: 'AI deployment assessed for positive societal and environmental impact' },
  { framework: 'OECD_AI', code: 'OECD-002', name: 'Human Rights and Democratic Values', clause: 'Principle 1.2', severity: 'HIGH', evalType: 'MANUAL', description: 'AI systems respect human rights, fairness, and human oversight' },
  { framework: 'OECD_AI', code: 'OECD-003', name: 'Transparency and Explainability', clause: 'Principle 1.3', severity: 'MEDIUM', evalType: 'AUTO', description: 'Sufficient transparency for stakeholders to understand AI outcomes' },
  { framework: 'OECD_AI', code: 'OECD-004', name: 'Robustness, Security, and Safety', clause: 'Principle 1.4', severity: 'HIGH', evalType: 'AUTO', description: 'AI systems function robustly and securely throughout lifecycle' },
  { framework: 'OECD_AI', code: 'OECD-005', name: 'Accountability', clause: 'Principle 1.5', severity: 'HIGH', evalType: 'MANUAL', description: 'Clear accountability mechanisms for AI system outcomes' },
  { framework: 'OECD_AI', code: 'OECD-006', name: 'National Policy and Cooperation', clause: 'Principle 2', severity: 'LOW', evalType: 'MANUAL', description: 'Organisation tracks and aligns with evolving national AI policy' },
  // OWASP LLM Top 10 (10)
  { framework: 'OWASP_LLM', code: 'OWASP-LLM01', name: 'Prompt Injection', clause: 'LLM01:2025', severity: 'CRITICAL', evalType: 'AUTO', description: 'Direct and indirect prompt injection mitigations in place' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM02', name: 'Sensitive Information Disclosure', clause: 'LLM02:2025', severity: 'HIGH', evalType: 'AUTO', description: 'PII and sensitive data filtered from model outputs' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM03', name: 'Supply Chain Vulnerabilities', clause: 'LLM03:2025', severity: 'HIGH', evalType: 'MANUAL', description: 'Model, plugin, and dataset supply chain vetted for vulnerabilities' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM04', name: 'Data and Model Poisoning', clause: 'LLM04:2025', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Training/fine-tuning data validated against poisoning' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM05', name: 'Improper Output Handling', clause: 'LLM05:2025', severity: 'HIGH', evalType: 'AUTO', description: 'LLM outputs validated/sanitised before downstream use (e.g. code exec)' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM06', name: 'Excessive Agency', clause: 'LLM06:2025', severity: 'HIGH', evalType: 'MANUAL', description: 'Agent tool permissions and autonomy scoped to least privilege' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM07', name: 'System Prompt Leakage', clause: 'LLM07:2025', severity: 'MEDIUM', evalType: 'AUTO', description: 'System prompts do not contain secrets and resist extraction' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM08', name: 'Vector and Embedding Weaknesses', clause: 'LLM08:2025', severity: 'MEDIUM', evalType: 'AUTO', description: 'RAG vector store access controls and embedding inversion mitigations' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM09', name: 'Misinformation', clause: 'LLM09:2025', severity: 'MEDIUM', evalType: 'AUTO', description: 'Hallucination rate monitored; grounding/citation required for factual claims' },
  { framework: 'OWASP_LLM', code: 'OWASP-LLM10', name: 'Unbounded Consumption', clause: 'LLM10:2025', severity: 'MEDIUM', evalType: 'AUTO', description: 'Rate limits and resource quotas prevent denial-of-wallet/service' },
  // Singapore Model AI (7)
  { framework: 'SG_MODEL_AI', code: 'SG-001', name: 'Internal Governance Structures', clause: 'Pillar 1', severity: 'HIGH', evalType: 'MANUAL', description: 'Internal governance, accountability, and risk management structures in place' },
  { framework: 'SG_MODEL_AI', code: 'SG-002', name: 'Risk Management Approach', clause: 'Pillar 2', severity: 'HIGH', evalType: 'AUTO', description: 'Risk-proportionate measures applied across AI development lifecycle' },
  { framework: 'SG_MODEL_AI', code: 'SG-003', name: 'Development and Deployment Lifecycle Controls', clause: 'Pillar 3', severity: 'MEDIUM', evalType: 'AUTO', description: 'Controls applied at each stage: data, model dev, deployment, monitoring' },
  { framework: 'SG_MODEL_AI', code: 'SG-004', name: 'Stakeholder Communication and Interaction', clause: 'Pillar 4', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Clear disclosure to users when interacting with AI / AI-generated content' },
  { framework: 'SG_MODEL_AI', code: 'SG-005', name: 'Monitoring and Reporting', clause: 'Pillar 5', severity: 'HIGH', evalType: 'AUTO', description: 'Ongoing monitoring with defined incident reporting channels' },
  { framework: 'SG_MODEL_AI', code: 'SG-006', name: 'Testing and Assurance', clause: 'Pillar 6', severity: 'HIGH', evalType: 'AUTO', description: 'Pre-deployment testing and third-party assurance where appropriate' },
  { framework: 'SG_MODEL_AI', code: 'SG-007', name: 'Security in AI Systems', clause: 'Pillar 7', severity: 'HIGH', evalType: 'AUTO', description: 'AI-specific security controls (model, data, infra) implemented' },
  // UNESCO (8)
  { framework: 'UNESCO_AI', code: 'UNESCO-001', name: 'Proportionality and Do No Harm', clause: 'Section 4 §28-29', severity: 'HIGH', evalType: 'MANUAL', description: 'AI use proportionate to legitimate aim; harm assessment conducted' },
  { framework: 'UNESCO_AI', code: 'UNESCO-002', name: 'Safety and Security', clause: 'Section 4 §30-31', severity: 'HIGH', evalType: 'AUTO', description: 'Unwanted harms and security vulnerabilities avoided/addressed' },
  { framework: 'UNESCO_AI', code: 'UNESCO-003', name: 'Right to Privacy and Data Protection', clause: 'Section 4 §32-37', severity: 'CRITICAL', evalType: 'AUTO', description: 'Privacy protected throughout AI system lifecycle' },
  { framework: 'UNESCO_AI', code: 'UNESCO-004', name: 'Multi-Stakeholder Governance', clause: 'Section 4 §38-40', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Diverse stakeholder participation in AI governance decisions' },
  { framework: 'UNESCO_AI', code: 'UNESCO-005', name: 'Responsibility and Accountability', clause: 'Section 4 §41-44', severity: 'HIGH', evalType: 'MANUAL', description: 'Clear ethical and legal responsibility assigned across AI lifecycle' },
  { framework: 'UNESCO_AI', code: 'UNESCO-006', name: 'Transparency and Explainability', clause: 'Section 4 §45-50', severity: 'MEDIUM', evalType: 'AUTO', description: 'Degree of transparency and explainability appropriate to context' },
  { framework: 'UNESCO_AI', code: 'UNESCO-007', name: 'Human Oversight and Determination', clause: 'Section 4 §51-52', severity: 'HIGH', evalType: 'AUTO', description: 'Final human determination preserved for significant decisions' },
  { framework: 'UNESCO_AI', code: 'UNESCO-008', name: 'Fairness and Non-Discrimination', clause: 'Section 4 §53-57', severity: 'CRITICAL', evalType: 'AUTO', description: 'AI actors promote social justice and non-discrimination' },
  // India AI Governance (7)
  { framework: 'INDIA_AI_GOV', code: 'IN-001', name: 'Risk-Based Tiering', clause: 'IndiaAI Governance Guidelines §3', severity: 'HIGH', evalType: 'MANUAL', description: 'AI systems tiered by risk consistent with sectoral regulator guidance' },
  { framework: 'INDIA_AI_GOV', code: 'IN-002', name: 'DPDP Act Alignment', clause: 'Digital Personal Data Protection Act 2023', severity: 'CRITICAL', evalType: 'MANUAL', description: 'Personal data processing aligned with DPDP Act consent and purpose limitation' },
  { framework: 'INDIA_AI_GOV', code: 'IN-003', name: 'Algorithmic Accountability', clause: 'IndiaAI Governance Guidelines §4', severity: 'HIGH', evalType: 'MANUAL', description: 'Named accountable owner for each deployed AI system' },
  { framework: 'INDIA_AI_GOV', code: 'IN-004', name: 'Grievance Redressal Mechanism', clause: 'IndiaAI Governance Guidelines §5', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Accessible grievance redressal channel for AI-affected individuals' },
  { framework: 'INDIA_AI_GOV', code: 'IN-005', name: 'Bias and Fairness Testing', clause: 'IndiaAI Governance Guidelines §6', severity: 'HIGH', evalType: 'AUTO', description: 'Bias testing conducted with attention to Indian socio-demographic context' },
  { framework: 'INDIA_AI_GOV', code: 'IN-006', name: 'Data Localisation Considerations', clause: 'DPDP Act §17', severity: 'MEDIUM', evalType: 'MANUAL', description: 'Cross-border data transfer assessed against sectoral localisation rules' },
  { framework: 'INDIA_AI_GOV', code: 'IN-007', name: 'Critical AI System Incident Reporting', clause: 'IndiaAI Governance Guidelines §7', severity: 'HIGH', evalType: 'AUTO', description: 'Serious AI incidents reported per sectoral/CERT-In requirements' },
];

// Cross-framework crosswalk clusters — one atomic concept fans out to many
// controls, so a single telemetry signal updates every mapped framework.
export interface CrosswalkGroup { concept: string; label: string; controls: string[] }
export const CROSSWALK_GROUPS: CrosswalkGroup[] = [
  { concept: 'bias_fairness_check', label: 'Bias / Fairness', controls: ['EU-009', 'ISO42-005', 'NIST-005', 'UNESCO-008', 'IN-005', 'SG-002'] },
  { concept: 'prompt_injection_defense', label: 'Prompt Injection Defense', controls: ['MITRE-001', 'OWASP-LLM01', 'SAIF-002', 'SG-007'] },
  { concept: 'human_oversight', label: 'Human Oversight', controls: ['EU-003', 'GDPR-005', 'OECD-002', 'UNESCO-007', 'NIST-001'] },
  { concept: 'data_governance', label: 'Data Governance / Privacy', controls: ['EU-009', 'GDPR-001', 'ISO42-005', 'UNESCO-003', 'IN-002'] },
  { concept: 'transparency_explainability', label: 'Transparency / Explainability', controls: ['EU-005', 'OECD-003', 'UNESCO-006', 'SG-004', 'OWASP-LLM07'] },
  { concept: 'incident_monitoring', label: 'Incident Management / Monitoring', controls: ['EU-006', 'ISO42-007', 'NIST-007', 'SG-005', 'IN-007', 'SAIF-002'] },
  { concept: 'governance_accountability', label: 'Governance / Accountability', controls: ['NIST-001', 'ISO42-003', 'OECD-005', 'UNESCO-005', 'SG-001', 'IN-003'] },
  { concept: 'security_robustness', label: 'Security / Robustness', controls: ['EU-008', 'MITRE-006', 'MITRE-009', 'OWASP-LLM03', 'SAIF-001', 'SG-007', 'UNESCO-002'] },
];

// Attach policy-rule keys to their controls (single source of truth for the map).
for (const c of CONTROLS) { if (POLICY_RULE_KEYS[c.code]) c.policyRuleKey = POLICY_RULE_KEYS[c.code]; }

// For a control code, the distinct frameworks it impacts via crosswalks (plus its own).
export function frameworksImpactedBy(code: string): string[] {
  const set = new Set<string>();
  const own = CONTROLS.find(c => c.code === code);
  if (own) set.add(own.framework);
  for (const g of CROSSWALK_GROUPS) {
    if (g.controls.includes(code)) {
      for (const cc of g.controls) {
        const def = CONTROLS.find(c => c.code === cc);
        if (def) set.add(def.framework);
      }
    }
  }
  return [...set];
}
