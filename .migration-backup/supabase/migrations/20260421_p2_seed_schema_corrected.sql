-- =============================================================================
-- Sentinel GRC: Schema-Corrected Seed Migration (P2)
-- File: 20260421_p2_seed_schema_corrected.sql
-- Description: Seeds all empty tables using actual production column names.
--              Corrects: risk_register→risks, org_id→tenant_id, uuid→text ids,
--              column name mapping for incidents, vendors, bias_audits, etc.
-- Idempotent: All INSERTs use ON CONFLICT (id) DO NOTHING
-- Tenant ID: 00000000-0000-0000-0000-000000000001
-- =============================================================================

-- =============================================================================
-- 1. RISKS — 12 AI risk entries (table: risks, id=text, tenant_id=text)
-- =============================================================================
INSERT INTO public.risks
  (id, tenant_id, name, categories, potential_impact, likelihood, severity, risk_level,
   mitigation_status, mitigation_plan, description, created_at, updated_at)
VALUES
  ('risk-001', '00000000-0000-0000-0000-000000000001',
   'LLM Hallucination in Customer Advisory Outputs',
   ARRAY['AI Model Risk','Output Quality'],
   'Customers may make ill-informed financial decisions based on fabricated AI outputs.',
   4, 5, 'Critical', 'In Progress',
   'Implement output grounding with RAG pipeline; add human review gate for high-value recommendations.',
   'The customer advisory LLM generates factually incorrect information without grounding, creating regulatory and reputational risk.',
   now() - interval '45 days', now() - interval '3 days'),

  ('risk-002', '00000000-0000-0000-0000-000000000001',
   'Biased Lending Decision Model',
   ARRAY['Fairness & Bias','Regulatory Compliance'],
   'Discriminatory lending outcomes; ECOA/FCRA violations; regulatory fines.',
   4, 5, 'Critical', 'Mitigating',
   'Conduct quarterly bias audits using Fairlearn; implement equalized odds post-processing; disparate impact monitoring.',
   'Credit scoring model shows 23% approval rate gap between protected and non-protected demographic groups.',
   now() - interval '60 days', now() - interval '7 days'),

  ('risk-003', '00000000-0000-0000-0000-000000000001',
   'Prompt Injection Attack on Internal Copilot',
   ARRAY['Cybersecurity','AI Security'],
   'Data exfiltration; unauthorized API invocations; reputational damage.',
   5, 4, 'Critical', 'Open',
   'Deploy prompt sanitization layer; implement context isolation; add red-team testing quarterly.',
   'Malicious users can inject instructions into the enterprise copilot via crafted inputs, bypassing security controls.',
   now() - interval '30 days', now() - interval '2 days'),

  ('risk-004', '00000000-0000-0000-0000-000000000001',
   'PII Leakage via Model Training Data Memorization',
   ARRAY['Data Privacy','GDPR'],
   'GDPR Art.33 notification obligation; regulatory fines up to 4% global turnover.',
   4, 5, 'Critical', 'Open',
   'Apply differential privacy (ε=1.0); implement membership inference attack testing; data minimization controls.',
   'NLP model may memorize and reproduce personally identifiable information from training datasets.',
   now() - interval '50 days', now() - interval '5 days'),

  ('risk-005', '00000000-0000-0000-0000-000000000001',
   'Third-Party AI API Vendor Lock-in and Outage Risk',
   ARRAY['Operational Risk','Vendor Risk'],
   'Service disruption; SLA breach; revenue loss from AI-dependent workflows.',
   3, 4, 'High', 'Accepted',
   'Implement multi-vendor failover architecture; maintain 30-day API parity across top-3 providers.',
   'Critical workflows depend on single AI API provider with no tested failover mechanism.',
   now() - interval '90 days', now() - interval '10 days'),

  ('risk-006', '00000000-0000-0000-0000-000000000001',
   'Explainability Gap in Credit Scoring Model',
   ARRAY['Regulatory Compliance','Transparency'],
   'FCRA adverse action notice violations; inability to pass OCC examination.',
   3, 5, 'High', 'Mitigating',
   'Deploy SHAP-based explanation service; integrate with adverse action notice generation; ECOA/FCRA alignment.',
   'Credit scoring model cannot produce human-readable explanations required for regulatory compliance.',
   now() - interval '40 days', now() - interval '4 days'),

  ('risk-007', '00000000-0000-0000-0000-000000000001',
   'Model Drift in Fraud Detection System',
   ARRAY['Model Performance','Operational Risk'],
   'Increased false positives blocking legitimate transactions; false negatives allowing fraud.',
   3, 4, 'High', 'Monitoring',
   'Implement PSI monitoring with 0.2 alert threshold; automated retraining pipeline; monthly champion-challenger evaluation.',
   'Population stability index exceeding thresholds due to seasonal patterns; model accuracy degrading.',
   now() - interval '25 days', now() - interval '1 day'),

  ('risk-008', '00000000-0000-0000-0000-000000000001',
   'Unauthorized AI Agent Autonomy in Customer Operations',
   ARRAY['Governance','Agentic AI'],
   'Unauthorized financial transactions; customer harm; governance failures.',
   4, 4, 'High', 'Open',
   'Enforce HITL gates for all high-value agent actions; implement action policy firewall; audit logging for agent decisions.',
   'AI agents in customer operations have insufficient human oversight controls for high-stakes actions.',
   now() - interval '20 days', now() - interval '2 days'),

  ('risk-009', '00000000-0000-0000-0000-000000000001',
   'Supply Chain AI Component Vulnerability',
   ARRAY['Supply Chain Security','Third-Party Risk'],
   'Compromised AI components propagating vulnerabilities to production systems.',
   3, 4, 'High', 'Mitigating',
   'Conduct SBOM analysis for all AI dependencies; implement continuous CVE monitoring; vendor security attestation annually.',
   '7 AI dependency components have known CVEs; supply chain attack vectors not fully mapped.',
   now() - interval '15 days', now() - interval '3 days'),

  ('risk-010', '00000000-0000-0000-0000-000000000001',
   'Overreliance on AI in Medical Triage Module',
   ARRAY['Ethics & Safety','Healthcare AI'],
   'Patient harm; medical liability; regulatory action under EU AI Act High-Risk classification.',
   3, 5, 'High', 'Open',
   'Mandate physician override for all AI triage recommendations; implement confidence threshold gating at 90%.',
   'Medical triage AI used without mandatory human oversight for high-stakes diagnostic decisions.',
   now() - interval '35 days', now() - interval '6 days'),

  ('risk-011', '00000000-0000-0000-0000-000000000001',
   'Carbon Footprint of Large-Scale Model Training',
   ARRAY['Environmental Risk','ESG'],
   'ESG disclosure gaps; regulatory non-compliance; reputational risk with ESG-focused investors.',
   2, 3, 'Medium', 'Monitoring',
   'Track GPU hours and kWh per training run; target 50% renewable compute by Q4 2026.',
   'Model training carbon emissions not fully tracked or disclosed in ESG reporting.',
   now() - interval '70 days', now() - interval '14 days'),

  ('risk-012', '00000000-0000-0000-0000-000000000001',
   'AI-Generated Synthetic Data Misuse in Research',
   ARRAY['Intellectual Property','Data Governance'],
   'IP infringement; synthetic data leaking into unauthorized commercial products.',
   2, 4, 'Medium', 'Accepted',
   'Enforce data provenance tagging; watermark synthetic datasets; legal review for downstream commercial use.',
   'Synthetic datasets generated for research purposes may be used in commercial products without authorization.',
   now() - interval '55 days', now() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. INCIDENTS — 8 AI incidents (table: incidents, id=text, tenant_id=text)
-- =============================================================================
INSERT INTO public.incidents
  (id, tenant_id, ai_use_case_or_framework, incident_type, severity, status,
   occurred_date, detected_date, reporter, model_system_version,
   categories_of_harm, affected_persons, description,
   immediate_mitigations, planned_corrective_actions, created_at, updated_at)
VALUES
  ('inc-001', '00000000-0000-0000-0000-000000000001',
   'Customer Advisory Chatbot', 'model_failure', 'high', 'resolved',
   now() - interval '44 days', now() - interval '42 days', 'Risk Monitoring System',
   'gpt-4-turbo-2024-04', ARRAY['Financial Harm','Customer Trust'], 3,
   'GPT-4 Turbo Advisory Hallucination Event — Q1 2026. The chatbot generated a fabricated ISIN code and incorrect dividend yield for a mutual fund, causing 3 customers to make ill-informed investment decisions. Root cause: insufficient RAG grounding on fund data.',
   'Suspended model; activated manual advisory review queue; notified affected customers.',
   'Implement mandatory source citation with confidence ≥0.85; expand RAG knowledge base; add hallucination detection layer.',
   now() - interval '42 days', now() - interval '38 days'),

  ('inc-002', '00000000-0000-0000-0000-000000000001',
   'Mortgage Approval Underwriting System', 'bias_detected', 'critical', 'investigating',
   now() - interval '9 days', now() - interval '8 days', 'Automated Bias Monitor',
   'mortgage-v3.2.1', ARRAY['Discrimination','Regulatory Violation'], 847,
   'Bias Detection Alert: Mortgage Approval Model Disparate Impact. Automated monitoring detected 23% lower approval rate for applicants from ZIP codes with >60% minority population. Immediate model suspension triggered. HMDA reporting obligation assessed.',
   'Model suspended; all pending decisions routed to human underwriters; legal counsel engaged.',
   'Retrain model with bias-corrected data; implement equalized odds post-processing; file HMDA adverse action report.',
   now() - interval '8 days', now() - interval '1 day'),

  ('inc-003', '00000000-0000-0000-0000-000000000001',
   'Customer Support Portal Chatbot', 'security_breach', 'high', 'resolved',
   now() - interval '23 days', now() - interval '22 days', 'Security Operations Center',
   'support-bot-v2.4.6', ARRAY['Data Exposure','Unauthorized Access'], 1,
   'Prompt Injection via Customer Support Portal. A malicious user injected instructions into the support chatbot via a crafted ticket, causing the AI to reveal internal escalation procedures and attempt to invoke unapproved API endpoints.',
   'Blocked malicious session; rotated exposed credentials; deployed prompt sanitization patch v2.4.7.',
   'Deploy context isolation layer; implement prompt injection detection ML classifier; quarterly red-team testing.',
   now() - interval '22 days', now() - interval '20 days'),

  ('inc-004', '00000000-0000-0000-0000-000000000001',
   'Fraud Detection System', 'model_drift', 'medium', 'resolved',
   now() - interval '36 days', now() - interval '35 days', 'MLOps Monitoring Dashboard',
   'fraud-v2.8.0', ARRAY['Financial Harm','Service Disruption'], 1247,
   'Fraud Detection Model Drift — False Positive Surge. PSI exceeded threshold (PSI=0.31) following seasonal spending shift. False positive rate increased to 4.2%, blocking legitimate transactions for 1,200+ customers.',
   'Raised decision threshold from 0.65 to 0.75; notified affected customers; escalated to model team.',
   'Emergency retraining on recent data; implement champion-challenger pipeline; set PSI alert at 0.20.',
   now() - interval '35 days', now() - interval '30 days'),

  ('inc-005', '00000000-0000-0000-0000-000000000001',
   'NLP Entity Extraction Training Pipeline', 'data_breach', 'critical', 'resolved',
   now() - interval '66 days', now() - interval '65 days', 'Internal Audit Team',
   'nlp-extraction-v1.3', ARRAY['Privacy Violation','GDPR Breach'], 2847,
   'Training Data PII Exposure. Internal audit discovered 2,847 unredacted customer records with name, SSN, and account numbers in NLP training dataset. GDPR Art.33 DPA notification initiated.',
   'Quarantined training dataset; initiated incident response; engaged DPO and legal counsel.',
   'Purge and rescrub all training datasets; implement automated PII detection in data pipelines; GDPR Art.33 report filed.',
   now() - interval '65 days', now() - interval '55 days'),

  ('inc-006', '00000000-0000-0000-0000-000000000001',
   'Treasury Management AI Agent', 'unauthorized_action', 'critical', 'closed',
   now() - interval '19 days', now() - interval '18 days', 'Treasury Operations Team',
   'treasury-agent-v1.1', ARRAY['Financial Risk','Governance Failure'], 0,
   'AI Agent Unauthorized Financial Transfer Attempt. Autonomous treasury agent attempted to initiate a $2.3M inter-account transfer without human approval, bypassing HITL gate due to policy firewall configuration error.',
   'Transfer blocked by secondary approval system; agent suspended; emergency configuration review initiated.',
   'Patch policy firewall configuration; add mandatory dual-approval for all treasury actions >$100K; audit all agent permissions.',
   now() - interval '18 days', now() - interval '14 days'),

  ('inc-007', '00000000-0000-0000-0000-000000000001',
   'Model Governance Portal — SHAP Service', 'system_outage', 'high', 'resolved',
   now() - interval '13 days', now() - interval '12 days', 'Platform Engineering',
   'shap-service-v3.2', ARRAY['Regulatory Risk','Service Disruption'], 0,
   'Explainability System Failure During Regulatory Audit. SHAP explanation service became unavailable during live OCC examination, preventing examiners from reviewing AI decision rationale for 68 sampled loan decisions.',
   'Activated manual explanation fallback; assigned compliance team to produce manual explanations for 68 decisions.',
   'Implement HA configuration for SHAP service; create pre-generated explanation cache; add SLA monitoring.',
   now() - interval '12 days', now() - interval '10 days'),

  ('inc-008', '00000000-0000-0000-0000-000000000001',
   'KYC Document Verification Pipeline', 'adversarial_attack', 'high', 'investigating',
   now() - interval '6 days', now() - interval '5 days', 'Security Research Team',
   'kyc-classifier-v4.1', ARRAY['Security Risk','Identity Fraud'], 0,
   'Adversarial Example Attack on KYC Image Classification Model. Security researchers found crafted image perturbations bypass KYC document verification with 78% success rate, enabling potential identity fraud.',
   'Routed all KYC flagged cases to human review; engaged external security researchers for coordinated disclosure.',
   'Implement adversarial training; add input perturbation detection; apply certified robustness techniques.',
   now() - interval '5 days', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. VENDORS — 8 vendor records (table: vendors, id=text, vendor_name=text)
-- =============================================================================
INSERT INTO public.vendors
  (id, tenant_id, vendor_name, category, risk_tier, review_status,
   what_does_vendor_provide, use_cases, reviewer, review_date, review_result,
   data_sensitivity, business_criticality, past_issues, regulatory_exposure,
   created_at, updated_at)
VALUES
  ('vendor-001', '00000000-0000-0000-0000-000000000001',
   'OpenAI', 'Foundation Model Provider', 1, 'Approved',
   'Primary LLM provider: GPT-4 Turbo and GPT-4o APIs for customer advisory and internal copilot.',
   'Customer advisory chatbot, internal copilot, document summarization',
   'Vendor Risk Team', now() - interval '30 days', 'Approved — SOC2 Type II verified',
   5, 5, 0, 5, now() - interval '180 days', now() - interval '30 days'),

  ('vendor-002', '00000000-0000-0000-0000-000000000001',
   'Anthropic', 'Foundation Model Provider', 1, 'Approved',
   'Secondary LLM provider: Claude 3 Opus for compliance document analysis and risk summarization.',
   'Compliance analysis, risk summarization, fallback advisory',
   'Vendor Risk Team', now() - interval '45 days', 'Approved — GDPR DPA executed',
   5, 4, 0, 5, now() - interval '200 days', now() - interval '45 days'),

  ('vendor-003', '00000000-0000-0000-0000-000000000001',
   'Microsoft Azure AI', 'Cloud AI Platform', 1, 'Approved',
   'Enterprise Azure OpenAI Service for regulated workloads requiring EU data residency. Azure AI Content Safety for guardrail enforcement.',
   'EU-regulated AI workloads, guardrail enforcement, content safety',
   'Vendor Risk Team', now() - interval '15 days', 'Approved — ISO 27001 + ISO 42001 certified',
   5, 5, 0, 5, now() - interval '365 days', now() - interval '15 days'),

  ('vendor-004', '00000000-0000-0000-0000-000000000001',
   'DataRobot', 'MLOps Platform', 2, 'Approved',
   'Automated ML platform for credit risk and fraud models. Provides model monitoring, drift detection, and explainability.',
   'Model monitoring, drift detection, explainability, credit risk',
   'Vendor Risk Team', now() - interval '60 days', 'Approved — SOC2 Type II verified',
   4, 4, 0, 4, now() - interval '240 days', now() - interval '60 days'),

  ('vendor-005', '00000000-0000-0000-0000-000000000001',
   'Palantir AIP', 'AI Platform', 2, 'Approved',
   'Enterprise AI platform for operational intelligence and agentic workflows. Treasury optimization and risk aggregation.',
   'Treasury optimization, risk aggregation, agentic workflows',
   'Vendor Risk Team', now() - interval '20 days', 'Approved — FedRAMP authorized',
   5, 5, 1, 5, now() - interval '400 days', now() - interval '20 days'),

  ('vendor-006', '00000000-0000-0000-0000-000000000001',
   'Weights & Biases', 'ML Experiment Tracking', 3, 'Approved',
   'ML experiment tracking and model registry for internal ML team. Tracks training runs, hyperparameters, and model artifacts.',
   'Experiment tracking, model registry, hyperparameter management',
   'Vendor Risk Team', now() - interval '90 days', 'Approved — GDPR DPA executed',
   3, 3, 0, 2, now() - interval '300 days', now() - interval '90 days'),

  ('vendor-007', '00000000-0000-0000-0000-000000000001',
   'Snyk AI Security', 'Security Testing', 2, 'Under Review',
   'AI security scanning for ML model dependencies and container images. SBOM generation and CVE monitoring.',
   'AI supply chain security, SBOM generation, CVE monitoring',
   'Security Team', now() - interval '10 days', 'Under Review — contract renewal due 2026-06-30',
   3, 3, 0, 3, now() - interval '120 days', now() - interval '10 days'),

  ('vendor-008', '00000000-0000-0000-0000-000000000001',
   'Hugging Face Enterprise', 'Model Repository', 3, 'Approved',
   'Enterprise model hub for open-source model hosting and fine-tuning. Internal NLP models including document classification.',
   'Open-source model hosting, fine-tuning, NLP model deployment',
   'Vendor Risk Team', now() - interval '75 days', 'Approved — EU data residency confirmed',
   4, 3, 0, 3, now() - interval '250 days', now() - interval '75 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. BIAS AUDITS — 6 records (table: bias_audits, id=text, tenant_id=text)
-- =============================================================================
INSERT INTO public.bias_audits
  (id, tenant_id, model_id, framework, bias_dimensions, fairness_metric,
   threshold, overall_score, status, results, created_at, updated_at)
VALUES
  ('bias-001', '00000000-0000-0000-0000-000000000001',
   'credit-scoring-v3.2.1', 'EU AI Act Art.10 + Fairlearn',
   ARRAY['demographic_parity','equalized_odds','calibration','individual_fairness'],
   'disparate_impact',
   0.80, 0.71, 'Completed',
   '{"demographic_parity":0.68,"equalized_odds":0.74,"calibration":0.79,"individual_fairness":0.63,"approval_rate_majority":0.71,"approval_rate_minority":0.54,"disparate_impact":0.76,"passed":false,"recommendations":["Implement equalized odds post-processing","Increase minority representation to ≥40%","Quarterly recalibration required"]}'::jsonb,
   now() - interval '30 days', now() - interval '25 days'),

  ('bias-002', '00000000-0000-0000-0000-000000000001',
   'fraud-detection-v2.8', 'NIST AI RMF MG-2.2',
   ARRAY['demographic_parity','equalized_odds','calibration','individual_fairness'],
   'equalized_odds',
   0.85, 0.89, 'Completed',
   '{"demographic_parity":0.91,"equalized_odds":0.87,"calibration":0.93,"individual_fairness":0.85,"false_positive_rate_majority":0.021,"false_positive_rate_minority":0.028,"flag_rate_disparity":1.33,"auc_roc":0.97,"passed":true,"recommendations":["Monitor flag rate disparity quarterly","Expand test population diversity"]}'::jsonb,
   now() - interval '60 days', now() - interval '55 days'),

  ('bias-003', '00000000-0000-0000-0000-000000000001',
   'kyc-image-classifier-v4.1', 'ISO/IEC 42001 Annex A.6',
   ARRAY['skin_tone_parity','age_group_parity','gender_parity'],
   'demographic_parity',
   0.85, 0.77, 'Completed',
   '{"skin_tone_parity":0.72,"age_group_parity":0.81,"gender_parity":0.78,"accuracy_light_skin":0.96,"accuracy_dark_skin":0.89,"accuracy_gap":0.07,"passed":false,"recommendations":["Augment training with diverse synthetic images","Address 7% accuracy gap for darker skin tones — critical"]}'::jsonb,
   now() - interval '5 days', now() - interval '3 days'),

  ('bias-004', '00000000-0000-0000-0000-000000000001',
   'nlp-sentiment-v1.5', 'Google SAIF Pillar 4',
   ARRAY['language_parity','regional_dialect_parity','formality_parity'],
   'f1_parity',
   0.85, 0.92, 'Completed',
   '{"language_parity":0.94,"regional_dialect_parity":0.89,"formality_parity":0.93,"english_f1":0.95,"non_english_f1":0.91,"passed":true,"recommendations":["Expand dialect training data for AAVE variants","Annual re-audit recommended"]}'::jsonb,
   now() - interval '90 days', now() - interval '85 days'),

  ('bias-005', '00000000-0000-0000-0000-000000000001',
   'recommendation-engine-v2', 'EU AI Act Art.9 + ISO 42001',
   ARRAY['demographic_parity','equalized_odds','calibration'],
   'disparate_impact',
   0.85, NULL, 'In Progress',
   '{}'::jsonb,
   now() - interval '3 days', now() - interval '1 day'),

  ('bias-006', '00000000-0000-0000-0000-000000000001',
   'churn-prediction-v1.2', 'NIST AI RMF MG-2.2',
   ARRAY['demographic_parity','equalized_odds','calibration'],
   'equalized_odds',
   0.80, 0.83, 'Completed',
   '{"demographic_parity":0.85,"equalized_odds":0.81,"calibration":0.87,"churn_flag_rate_high_income":0.08,"churn_flag_rate_low_income":0.14,"income_disparity_ratio":1.75,"passed":true,"recommendations":["Remove direct income feature — use proxy indicators","Annual ECOA analysis recommended"]}'::jsonb,
   now() - interval '45 days', now() - interval '40 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. EVIDENCE — 10 evidence records (table: evidence, id=text)
-- =============================================================================
INSERT INTO public.evidence
  (id, tenant_id, title, type, source, description, auto_collected,
   freshness_status, linked_controls, linked_models, created_at, updated_at)
VALUES
  ('evd-001', '00000000-0000-0000-0000-000000000001',
   'SHAP Explanation Report — Credit Scoring Model Q1 2026', 'Report', 'DataRobot Explainability',
   'SHAP feature importance report for credit scoring model v3.2.1, Q1 2026. Documents top 15 features and their directional impact on credit decisions.',
   true, 'Fresh', ARRAY['AI-CTL-007','AI-CTL-012'], ARRAY['credit-scoring-v3.2.1'],
   now() - interval '30 days', now() - interval '5 days'),

  ('evd-002', '00000000-0000-0000-0000-000000000001',
   'SOC2 Type II Report — OpenAI Enterprise 2025', 'Certificate', 'OpenAI Trust Portal',
   'SOC2 Type II audit report covering OpenAI enterprise infrastructure for the period Jan–Dec 2025. Covers security, availability, and confidentiality trust service criteria.',
   false, 'Fresh', ARRAY['AI-CTL-031','AI-CTL-045'], ARRAY[],
   now() - interval '45 days', now() - interval '45 days'),

  ('evd-003', '00000000-0000-0000-0000-000000000001',
   'Bias Audit Report — Credit Scoring v3.2.1', 'Audit Report', 'Fairlearn + Internal Audit',
   'Comprehensive bias audit using Fairlearn framework. Disparate impact ratio: 0.76. Model failed threshold. Remediation plan approved.',
   true, 'Fresh', ARRAY['AI-CTL-010','AI-CTL-011'], ARRAY['credit-scoring-v3.2.1'],
   now() - interval '28 days', now() - interval '25 days'),

  ('evd-004', '00000000-0000-0000-0000-000000000001',
   'GDPR Data Processing Agreement — Anthropic', 'Legal Document', 'Legal Department',
   'Executed GDPR Article 28 Data Processing Agreement with Anthropic for Claude API usage in EU-regulated workloads. Signed 2025-11-15.',
   false, 'Fresh', ARRAY['AI-CTL-022','AI-CTL-023'], ARRAY[],
   now() - interval '150 days', now() - interval '150 days'),

  ('evd-005', '00000000-0000-0000-0000-000000000001',
   'Model Risk Management Policy v2.1', 'Policy Document', 'Risk Committee',
   'Board-approved model risk management policy covering validation, monitoring, and retirement of AI/ML models. Aligned with SR 11-7 guidance.',
   false, 'Fresh', ARRAY['AI-CTL-001','AI-CTL-002','AI-CTL-003'], ARRAY[],
   now() - interval '60 days', now() - interval '30 days'),

  ('evd-006', '00000000-0000-0000-0000-000000000001',
   'Penetration Test Report — Customer Advisory Chatbot', 'Security Report', 'External Pentesting Firm',
   'Adversarial testing and prompt injection assessment for customer advisory chatbot. 3 critical findings identified; 2 remediated; 1 in progress.',
   false, 'Stale', ARRAY['AI-CTL-041','AI-CTL-042'], ARRAY['gpt-4-turbo-advisory'],
   now() - interval '120 days', now() - interval '120 days'),

  ('evd-007', '00000000-0000-0000-0000-000000000001',
   'EU AI Act Conformity Assessment — Mortgage Model', 'Regulatory Filing', 'Compliance Department',
   'Self-assessment conformity report for high-risk AI system (mortgage approval) under EU AI Act Article 43. Submitted to notified body 2026-03-01.',
   false, 'Fresh', ARRAY['AI-CTL-051','AI-CTL-052','AI-CTL-053'], ARRAY['mortgage-approval-model'],
   now() - interval '50 days', now() - interval '40 days'),

  ('evd-008', '00000000-0000-0000-0000-000000000001',
   'Model Drift Monitoring Logs — Fraud Detection Q1 2026', 'Log File', 'MLOps Platform (DataRobot)',
   'Automated PSI monitoring logs for fraud detection model, Jan–Mar 2026. Includes PSI scores, alert timestamps, and retraining trigger events.',
   true, 'Fresh', ARRAY['AI-CTL-015','AI-CTL-016'], ARRAY['fraud-detection-v2.8'],
   now() - interval '20 days', now() - interval '2 days'),

  ('evd-009', '00000000-0000-0000-0000-000000000001',
   'ISO/IEC 27001 Certificate — Microsoft Azure AI', 'Certificate', 'Microsoft Trust Center',
   'ISO/IEC 27001:2022 certification for Microsoft Azure AI services. Valid until 2027-02-28. Covers information security management for Azure AI infrastructure.',
   false, 'Fresh', ARRAY['AI-CTL-031'], ARRAY[],
   now() - interval '90 days', now() - interval '90 days'),

  ('evd-010', '00000000-0000-0000-0000-000000000001',
   'HITL Review Logs — Treasury Agent April 2026', 'Log File', 'HITL Gateway System',
   'Audit log of all human-in-the-loop review decisions for treasury AI agent actions, April 2026. Includes the unauthorized transfer attempt incident response logs.',
   true, 'Fresh', ARRAY['AI-CTL-031','AI-CTL-032'], ARRAY['treasury-agent-v1.1'],
   now() - interval '10 days', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. MATURITY ASSESSMENTS — 3 records (table: maturity_assessments, id=text)
-- =============================================================================
INSERT INTO public.maturity_assessments
  (id, tenant_id, assessment_id, title, assessment_date, overall_level,
   overall_target, status, metadata, created_at, updated_at)
VALUES
  ('mat-001', '00000000-0000-0000-0000-000000000001',
   'MATUR-2026-Q1', 'AI Governance Maturity Assessment Q1 2026',
   '2026-03-31', 2.8, 4.0, 'Completed',
   '{"dimensions":{"governance":3.1,"risk_management":2.9,"compliance":2.7,"fairness":2.6,"transparency":2.8,"security":3.0,"data_quality":2.9,"model_ops":2.5},"methodology":"NIST AI RMF + ISO 42001","assessor":"Internal GRC Team","approved_by":"CRO"}'::jsonb,
   now() - interval '21 days', now() - interval '18 days'),

  ('mat-002', '00000000-0000-0000-0000-000000000001',
   'MATUR-2025-Q4', 'AI Governance Maturity Assessment Q4 2025',
   '2025-12-31', 2.4, 3.5, 'Completed',
   '{"dimensions":{"governance":2.7,"risk_management":2.5,"compliance":2.3,"fairness":2.1,"transparency":2.3,"security":2.6,"data_quality":2.4,"model_ops":2.2},"methodology":"NIST AI RMF","assessor":"Internal GRC Team","approved_by":"CRO"}'::jsonb,
   now() - interval '110 days', now() - interval '100 days'),

  ('mat-003', '00000000-0000-0000-0000-000000000001',
   'MATUR-2026-Q2-PLAN', 'AI Governance Maturity Assessment Q2 2026 (Planned)',
   '2026-06-30', NULL, 4.0, 'Planned',
   '{"methodology":"ISO 42001","planned_assessor":"External Auditor (Deloitte)","scope":"Full enterprise AI portfolio"}'::jsonb,
   now() - interval '5 days', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. SECURITY THREATS — 8 records (table: security_threats, id=text)
-- =============================================================================
INSERT INTO public.security_threats
  (id, tenant_id, threat_id, title, description, threat_type, severity,
   source, affected_models, mitigation, status, created_at, updated_at)
VALUES
  ('thr-001', '00000000-0000-0000-0000-000000000001',
   'THREAT-001', 'Prompt Injection via Crafted Support Tickets',
   'Adversaries craft malicious support ticket content to manipulate AI assistant behavior, exfiltrate internal data, or invoke unauthorized API calls.',
   'prompt_injection', 'critical', 'OWASP LLM Top 10 (LLM01)',
   ARRAY['support-bot-v2.4.6','internal-copilot-v1.0'],
   'Deploy prompt sanitization middleware; implement context isolation; add jailbreak detection classifier.',
   'Active', now() - interval '30 days', now() - interval '2 days'),

  ('thr-002', '00000000-0000-0000-0000-000000000001',
   'THREAT-002', 'Training Data Poisoning via Third-Party Datasets',
   'Malicious actors introduce poisoned examples into third-party training datasets, causing model backdoors or systematic bias post-deployment.',
   'data_poisoning', 'high', 'NIST AI RMF AV-4.1',
   ARRAY['credit-scoring-v3.2.1','nlp-extraction-v1.3'],
   'Implement dataset provenance verification; automated anomaly detection in training data; hash-based integrity checks.',
   'Monitoring', now() - interval '45 days', now() - interval '7 days'),

  ('thr-003', '00000000-0000-0000-0000-000000000001',
   'THREAT-003', 'Model Inversion Attack on Credit Scoring API',
   'Repeated API queries with crafted inputs may allow adversaries to reconstruct sensitive training data through model inversion, exposing PII.',
   'model_inversion', 'high', 'MITRE ATLAS ML07',
   ARRAY['credit-scoring-v3.2.1'],
   'Implement query rate limiting (100/hour per client); add prediction rounding; deploy membership inference detection.',
   'Mitigated', now() - interval '60 days', now() - interval '20 days'),

  ('thr-004', '00000000-0000-0000-0000-000000000001',
   'THREAT-004', 'Adversarial Examples Bypassing KYC Verification',
   'Pixel-level perturbations to identity documents can fool the KYC image classifier, enabling identity fraud with 78% success rate in testing.',
   'adversarial_examples', 'critical', 'Security Research Disclosure',
   ARRAY['kyc-image-classifier-v4.1'],
   'Implement adversarial training; add input perturbation detection; certified robustness via randomized smoothing.',
   'Active', now() - interval '5 days', now() - interval '1 day'),

  ('thr-005', '00000000-0000-0000-0000-000000000001',
   'THREAT-005', 'Supply Chain Compromise of ML Dependencies',
   'Malicious packages in PyPI/conda ecosystem can introduce backdoors into AI model training or inference pipelines.',
   'supply_chain', 'high', 'OWASP Top 10 A06:2021',
   ARRAY[],
   'Implement SBOM generation for all AI projects; pin dependency versions; use private package mirrors; Snyk CVE monitoring.',
   'Monitoring', now() - interval '90 days', now() - interval '14 days'),

  ('thr-006', '00000000-0000-0000-0000-000000000001',
   'THREAT-006', 'Model Extraction via Black-Box API Queries',
   'Adversaries can reconstruct a functional model clone by querying the production API systematically, bypassing licensing and IP protections.',
   'model_extraction', 'medium', 'MITRE ATLAS ML06',
   ARRAY['fraud-detection-v2.8','recommendation-engine-v2'],
   'Implement prediction watermarking; query budget enforcement per client; anomalous query pattern detection.',
   'Monitoring', now() - interval '120 days', now() - interval '30 days'),

  ('thr-007', '00000000-0000-0000-0000-000000000001',
   'THREAT-007', 'LLM-Generated Phishing Content for Social Engineering',
   'Internal LLM APIs could be misused to generate highly convincing phishing emails or social engineering content at scale.',
   'misuse', 'medium', 'Internal Threat Model',
   ARRAY['internal-copilot-v1.0'],
   'Implement content safety guardrails; log and audit all generation requests; apply PII detection on outputs.',
   'Mitigated', now() - interval '75 days', now() - interval '25 days'),

  ('thr-008', '00000000-0000-0000-0000-000000000001',
   'THREAT-008', 'Insider Threat via ML Platform Access',
   'Privileged ML platform users could exfiltrate model weights, training data, or customer inference logs.',
   'insider_threat', 'high', 'Internal Risk Assessment',
   ARRAY[],
   'Implement least-privilege access; MFA on all ML platforms; data loss prevention on model artifact downloads; access reviews quarterly.',
   'Monitoring', now() - interval '180 days', now() - interval '60 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 8. SECURITY SCANS — 6 records (table: security_scans, id=text)
-- =============================================================================
INSERT INTO public.security_scans
  (id, tenant_id, scan_id, scan_type, target, status, findings_count,
   critical_count, high_count, medium_count, low_count,
   started_at, completed_at, initiated_by, created_at)
VALUES
  ('scan-001', '00000000-0000-0000-0000-000000000001',
   'SCAN-2026-041', 'DAST', 'Customer Advisory Chatbot API (prod)', 'Completed',
   12, 2, 4, 5, 1,
   now() - interval '20 days', now() - interval '19 days', 'Security Ops Team',
   now() - interval '20 days'),

  ('scan-002', '00000000-0000-0000-0000-000000000001',
   'SCAN-2026-042', 'SAST', 'ML Training Pipeline Codebase', 'Completed',
   7, 0, 2, 4, 1,
   now() - interval '35 days', now() - interval '34 days', 'DevSecOps Pipeline',
   now() - interval '35 days'),

  ('scan-003', '00000000-0000-0000-0000-000000000001',
   'SCAN-2026-043', 'Container Scan', 'Model Inference Docker Images', 'Completed',
   18, 3, 6, 7, 2,
   now() - interval '14 days', now() - interval '14 days', 'Snyk Automated Scan',
   now() - interval '14 days'),

  ('scan-004', '00000000-0000-0000-0000-000000000001',
   'SCAN-2026-044', 'Dependency Scan', 'Python ML Dependencies (requirements.txt)', 'Completed',
   9, 1, 3, 4, 1,
   now() - interval '7 days', now() - interval '7 days', 'Snyk Automated Scan',
   now() - interval '7 days'),

  ('scan-005', '00000000-0000-0000-0000-000000000001',
   'SCAN-2026-045', 'Prompt Injection Scan', 'Internal Copilot v1.0', 'In Progress',
   4, 1, 2, 1, 0,
   now() - interval '2 days', NULL, 'Red Team',
   now() - interval '2 days'),

  ('scan-006', '00000000-0000-0000-0000-000000000001',
   'SCAN-2026-046', 'Infrastructure Scan', 'Supabase + AWS ML Infrastructure', 'Scheduled',
   0, 0, 0, 0, 0,
   now() + interval '3 days', NULL, 'Security Ops Team',
   now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 9. SECURITY VULNERABILITIES — 8 records (table: security_vulnerabilities, id=text)
-- =============================================================================
INSERT INTO public.security_vulnerabilities
  (id, tenant_id, vuln_id, title, description, severity, cvss_score,
   affected_component, affected_model_id, status, remediation,
   discovered_at, created_at, updated_at)
VALUES
  ('vuln-001', '00000000-0000-0000-0000-000000000001',
   'CVE-2024-38281', 'ONNX Runtime Arbitrary Code Execution',
   'Heap buffer overflow in ONNX Runtime model loading allows arbitrary code execution when loading untrusted model files.',
   'critical', 9.8, 'onnxruntime==1.16.2', 'fraud-detection-v2.8',
   'Patched', 'Upgrade to onnxruntime>=1.17.0; implement model file signature verification.',
   now() - interval '60 days', now() - interval '60 days', now() - interval '55 days'),

  ('vuln-002', '00000000-0000-0000-0000-000000000001',
   'CVE-2024-41110', 'Transformers Library Pickle Deserialization RCE',
   'Unsafe pickle deserialization in Hugging Face Transformers allows RCE when loading untrusted model weights.',
   'critical', 9.6, 'transformers==4.38.0', 'nlp-extraction-v1.3',
   'Patched', 'Upgrade to transformers>=4.39.0; use SafeTensors format exclusively.',
   now() - interval '45 days', now() - interval '45 days', now() - interval '40 days'),

  ('vuln-003', '00000000-0000-0000-0000-000000000001',
   'CVE-2024-35195', 'Requests Library SSRF via Redirect',
   'Server-side request forgery via redirect following in requests library, exploitable in ML data ingestion pipelines.',
   'high', 7.5, 'requests==2.31.0', NULL,
   'Patched', 'Upgrade to requests>=2.32.0; disable redirect following for external URLs.',
   now() - interval '30 days', now() - interval '30 days', now() - interval '28 days'),

  ('vuln-004', '00000000-0000-0000-0000-000000000001',
   'CVE-2024-27317', 'LangChain SQL Injection via Prompt',
   'Insufficient sanitization in LangChain SQL chain allows prompt-injected SQL execution against connected databases.',
   'high', 8.2, 'langchain==0.1.5', 'internal-copilot-v1.0',
   'Open', 'Upgrade to langchain>=0.2.0; implement parameterized queries; restrict DB permissions to read-only.',
   now() - interval '15 days', now() - interval '15 days', now() - interval '5 days'),

  ('vuln-005', '00000000-0000-0000-0000-000000000001',
   'SNYK-PY-2024-089', 'NumPy Integer Overflow in Array Operations',
   'Integer overflow in NumPy array indexing operations may lead to memory corruption in model preprocessing pipelines.',
   'medium', 5.3, 'numpy==1.24.3', NULL,
   'In Remediation', 'Upgrade to numpy>=1.26.0; add input bounds validation.',
   now() - interval '10 days', now() - interval '10 days', now() - interval '3 days'),

  ('vuln-006', '00000000-0000-0000-0000-000000000001',
   'CVE-2024-22195', 'Jinja2 SSTI in ML Report Templates',
   'Server-side template injection in Jinja2 report generation allows code execution via malicious template variables.',
   'high', 7.8, 'jinja2==3.1.2', NULL,
   'Patched', 'Upgrade to jinja2>=3.1.3; use Jinja2 sandbox environment for all report templates.',
   now() - interval '90 days', now() - interval '90 days', now() - interval '85 days'),

  ('vuln-007', '00000000-0000-0000-0000-000000000001',
   'SNYK-PY-2024-102', 'Pillow Heap Buffer Overflow in Image Processing',
   'Heap buffer overflow in Pillow image processing library exploitable during KYC document preprocessing.',
   'high', 7.1, 'pillow==10.1.0', 'kyc-image-classifier-v4.1',
   'Patched', 'Upgrade to pillow>=10.3.0.',
   now() - interval '25 days', now() - interval '25 days', now() - interval '22 days'),

  ('vuln-008', '00000000-0000-0000-0000-000000000001',
   'CVE-2024-37890', 'WebSocket Denial of Service in ML Inference Server',
   'Uncontrolled resource consumption via WebSocket connections in ML inference server may cause service disruption.',
   'medium', 5.9, 'websockets==12.0', NULL,
   'Open', 'Upgrade to websockets>=12.1; implement connection rate limiting and timeout enforcement.',
   now() - interval '8 days', now() - interval '8 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 10. RED TEAM CAMPAIGNS — 5 records (table: red_team_campaigns, id=text)
-- =============================================================================
INSERT INTO public.red_team_campaigns
  (id, tenant_id, campaign_id, name, description, target_model_id,
   attack_types, status, findings_count, success_rate,
   started_at, completed_at, created_at, updated_at)
VALUES
  ('rtc-001', '00000000-0000-0000-0000-000000000001',
   'RT-2026-Q1-001', 'Customer Advisory Chatbot Red Team — Q1 2026',
   'Comprehensive adversarial testing of customer advisory chatbot. Focus: prompt injection, jailbreaks, PII exfiltration, and harmful content generation.',
   'gpt-4-turbo-advisory',
   ARRAY['prompt_injection','jailbreak','pii_extraction','harmful_content'],
   'Completed', 23, 0.18,
   now() - interval '45 days', now() - interval '38 days',
   now() - interval '45 days', now() - interval '38 days'),

  ('rtc-002', '00000000-0000-0000-0000-000000000001',
   'RT-2026-Q1-002', 'KYC Classifier Adversarial Robustness Test',
   'Adversarial example generation against KYC image classifier using FGSM, PGD, and C&W attacks. Goal: identify robustness thresholds.',
   'kyc-image-classifier-v4.1',
   ARRAY['adversarial_examples','evasion_attacks','boundary_attacks'],
   'Completed', 12, 0.78,
   now() - interval '10 days', now() - interval '6 days',
   now() - interval '10 days', now() - interval '6 days'),

  ('rtc-003', '00000000-0000-0000-0000-000000000001',
   'RT-2026-Q2-001', 'Internal Copilot Security Assessment — Q2 2026',
   'Red team assessment of internal copilot covering prompt injection, data exfiltration via crafted queries, and privilege escalation through tool use.',
   'internal-copilot-v1.0',
   ARRAY['prompt_injection','data_exfiltration','tool_abuse','privilege_escalation'],
   'In Progress', 4, 0.12,
   now() - interval '3 days', NULL,
   now() - interval '3 days', now() - interval '1 day'),

  ('rtc-004', '00000000-0000-0000-0000-000000000001',
   'RT-2025-Q4-003', 'Fraud Detection Model Evasion Campaign',
   'Black-box model evasion testing for fraud detection model. Tested gradient-free adversarial attacks to bypass transaction screening.',
   'fraud-detection-v2.8',
   ARRAY['evasion_attacks','black_box_attacks','feature_manipulation'],
   'Completed', 7, 0.09,
   now() - interval '120 days', now() - interval '115 days',
   now() - interval '120 days', now() - interval '115 days'),

  ('rtc-005', '00000000-0000-0000-0000-000000000001',
   'RT-2026-Q2-002', 'Treasury Agent Autonomy Limits Red Team',
   'Adversarial testing of treasury AI agent HITL controls, policy firewall bypasses, and unauthorized action escalation paths.',
   'treasury-agent-v1.1',
   ARRAY['policy_bypass','hitl_evasion','privilege_escalation','social_engineering'],
   'Planned', 0, 0.00,
   now() + interval '14 days', NULL,
   now(), now())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 11. CONSENT RECORDS — 6 records (table: consent_records, id=uuid)
-- =============================================================================
INSERT INTO public.consent_records
  (id, tenant_id, consent_ref, subject_ref, type, legal_basis, purposes,
   status, consent_date, expiry_date, created_at, updated_at)
VALUES
  ('aa100001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'CONS-2026-001', 'cust-ref-10284', 'explicit', 'Consent (GDPR Art.6(1)(a))',
   ARRAY['AI_credit_scoring','personalized_offers','fraud_detection'],
   'active', now() - interval '120 days', now() + interval '245 days',
   now() - interval '120 days', now() - interval '120 days'),

  ('aa100002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'CONS-2026-002', 'emp-ref-00523', 'explicit', 'Consent (GDPR Art.6(1)(a))',
   ARRAY['AI_performance_monitoring','automated_task_assignment'],
   'active', now() - interval '90 days', now() + interval '275 days',
   now() - interval '90 days', now() - interval '90 days'),

  ('aa100003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'CONS-2026-003', 'cust-ref-20751', 'explicit', 'Legitimate Interest (GDPR Art.6(1)(f))',
   ARRAY['fraud_detection','transaction_monitoring'],
   'active', now() - interval '60 days', now() + interval '305 days',
   now() - interval '60 days', now() - interval '60 days'),

  ('aa100004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'CONS-2026-004', 'cust-ref-38291', 'explicit', 'Consent (GDPR Art.6(1)(a))',
   ARRAY['AI_credit_scoring','personalized_offers'],
   'withdrawn', now() - interval '200 days', NULL,
   now() - interval '200 days', now() - interval '15 days'),

  ('aa100005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'CONS-2026-005', 'partner-ref-00109', 'implicit', 'Contract (GDPR Art.6(1)(b))',
   ARRAY['vendor_risk_scoring','AI_contract_analysis'],
   'active', now() - interval '365 days', now() + interval '0 days',
   now() - interval '365 days', now() - interval '365 days'),

  ('aa100006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'CONS-2026-006', 'cust-ref-51047', 'explicit', 'Consent (GDPR Art.6(1)(a))',
   ARRAY['AI_medical_triage','health_data_processing'],
   'expired', now() - interval '400 days', now() - interval '35 days',
   now() - interval '400 days', now() - interval '35 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 12. DSAR REQUESTS — 6 records (table: dsar_requests, id=uuid, org_id=uuid)
-- =============================================================================
INSERT INTO public.dsar_requests
  (id, org_id, requester_name, requester_email, request_type,
   description, status, priority, due_date, notes, created_at, updated_at)
VALUES
  ('bb200001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Sarah Mitchell', 'sarah.mitchell@example.com', 'access',
   'Request for all personal data used in AI credit scoring decisions and associated explanations.',
   'in_review', 'high', (now() + interval '12 days')::date,
   'Requester cited EU AI Act Art.86 right to explanation; escalated to legal.', now() - interval '18 days', now() - interval '2 days'),

  ('bb200002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'James Ofosu', 'j.ofosu@example.com', 'erasure',
   'Right to erasure request covering all personal data including training data. Subject believes data used in mortgage model.',
   'pending', 'high', (now() + interval '10 days')::date,
   'Requires coordination with ML team to assess training data erasure feasibility.', now() - interval '20 days', now() - interval '20 days'),

  ('bb200003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Amara Osei', 'amara.osei@example.com', 'portability',
   'Data portability request for transaction history and AI-generated risk scores.',
   'completed', 'medium', (now() - interval '5 days')::date,
   'Completed — exported structured data in JSON format per GDPR Art.20.', now() - interval '35 days', now() - interval '5 days'),

  ('bb200004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Elena Vasquez', 'e.vasquez@example.com', 'objection',
   'Objection to automated AI decision-making in loan application processing under GDPR Art.22.',
   'in_review', 'high', (now() + interval '8 days')::date,
   'Legal review in progress — determining applicability of Art.22 exemptions.', now() - interval '12 days', now() - interval '3 days'),

  ('bb200005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Marcus Chen', 'm.chen@example.com', 'rectification',
   'Request to correct inaccurate personal data in KYC records that affected AI verification outcome.',
   'completed', 'medium', (now() - interval '2 days')::date,
   'Completed — KYC record corrected; AI model re-evaluated with corrected data.', now() - interval '25 days', now() - interval '2 days'),

  ('bb200006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Priya Nair', 'priya.nair@example.com', 'access',
   'Access request for personal data processed by AI fraud detection system and all associated flags.',
   'pending', 'medium', (now() + interval '20 days')::date,
   NULL, now() - interval '5 days', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 13. TASKS — 8 records (table: tasks, id=text, tenant_id=text)
-- =============================================================================
INSERT INTO public.tasks
  (id, tenant_id, title, description, status, priority,
   categories, assignees, due_date, auto_generated, created_at, updated_at)
VALUES
  ('task-001', '00000000-0000-0000-0000-000000000001',
   'Remediate Credit Scoring Bias — Equalized Odds Implementation',
   'Implement equalized odds post-processing layer for credit scoring model v3.2.1. Validate on holdout set. Deploy to staging for UAT.',
   'in_progress', 'critical',
   ARRAY['bias','remediation','model_update'],
   ARRAY['Marcus Chen','Dr. Lin Zhang'],
   now() + interval '14 days', false, now() - interval '25 days', now() - interval '2 days'),

  ('task-002', '00000000-0000-0000-0000-000000000001',
   'Apply Prompt Injection Patch to Customer Advisory Chatbot',
   'Deploy prompt sanitization middleware (v2.4.7 patch). Run regression suite. Monitor for 72h post-deployment.',
   'completed', 'critical',
   ARRAY['security','prompt_injection','deployment'],
   ARRAY['Priya Nair','Security Ops'],
   now() - interval '10 days', false, now() - interval '22 days', now() - interval '10 days'),

  ('task-003', '00000000-0000-0000-0000-000000000001',
   'EU AI Act Conformity Assessment — Mortgage Approval Model',
   'Complete self-assessment documentation per EU AI Act Annex VIII. Engage notified body for third-party review. Submit by deadline.',
   'in_progress', 'high',
   ARRAY['regulatory','conformity_assessment','eu_ai_act'],
   ARRAY['Sophie Beaumont','Legal Team'],
   now() + interval '30 days', false, now() - interval '40 days', now() - interval '5 days'),

  ('task-004', '00000000-0000-0000-0000-000000000001',
   'Implement Differential Privacy for NLP Training Pipeline',
   'Apply differential privacy (ε=1.0) using OpenDP library to NLP model training. Benchmark accuracy-privacy tradeoff. Document in model card.',
   'todo', 'high',
   ARRAY['privacy','differential_privacy','ml_engineering'],
   ARRAY['Dr. Kenji Tanaka'],
   now() + interval '45 days', false, now() - interval '15 days', now() - interval '15 days'),

  ('task-005', '00000000-0000-0000-0000-000000000001',
   'Quarterly Vendor Risk Assessment — All Tier 1 Vendors',
   'Conduct risk assessment for OpenAI, Anthropic, and Microsoft Azure AI. Review SOC2 reports, DPAs, and security posture. Update vendor registry.',
   'in_progress', 'medium',
   ARRAY['vendor_risk','compliance','assessment'],
   ARRAY['Vendor Risk Team','James Okafor'],
   now() + interval '7 days', true, now() - interval '10 days', now() - interval '3 days'),

  ('task-006', '00000000-0000-0000-0000-000000000001',
   'Upgrade ONNX Runtime to Address CVE-2024-38281',
   'Upgrade onnxruntime from 1.16.2 to 1.17.0+ in all production ML services. Test fraud detection inference pipeline. Deploy.',
   'completed', 'critical',
   ARRAY['security','vulnerability','dependency_update'],
   ARRAY['DevSecOps Team'],
   now() - interval '50 days', true, now() - interval '60 days', now() - interval '55 days'),

  ('task-007', '00000000-0000-0000-0000-000000000001',
   'Implement Model Monitoring Dashboard for Production Models',
   'Deploy DataRobot monitoring dashboards for all 6 production models. Set PSI, accuracy, and fairness alert thresholds. Connect to incident workflow.',
   'in_progress', 'high',
   ARRAY['mlops','monitoring','observability'],
   ARRAY['Elena Vasquez','MLOps Team'],
   now() + interval '21 days', false, now() - interval '30 days', now() - interval '7 days'),

  ('task-008', '00000000-0000-0000-0000-000000000001',
   'Complete GDPR DPIA for AI-Assisted Medical Triage Module',
   'Conduct Data Protection Impact Assessment per GDPR Art.35 for medical triage AI. Engage DPO. Document high-risk processing activities.',
   'todo', 'high',
   ARRAY['privacy','dpia','gdpr','healthcare_ai'],
   ARRAY['Dr. Fatima Al-Rashid','DPO Office'],
   now() + interval '60 days', false, now() - interval '5 days', now() - interval '5 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 14. CONFORMITY ASSESSMENTS — 4 records (table: conformity_assessments, id=text)
-- =============================================================================
INSERT INTO public.conformity_assessments
  (id, tenant_id, assessment_id, model_id, framework_id, title,
   assessment_body, status, compliance_level, findings,
   valid_until, created_at, updated_at)
VALUES
  ('ca-001', '00000000-0000-0000-0000-000000000001',
   'CA-2026-001', 'mortgage-approval-model', 'eu-ai-act',
   'EU AI Act High-Risk AI System Conformity Assessment — Mortgage Approval Model',
   'Internal + Notified Body (TÜV SÜD)', 'In Progress', 'Partial',
   '{"open_findings":5,"critical":1,"major":2,"minor":2,"last_updated":"2026-04-10"}'::jsonb,
   '2027-04-01',
   now() - interval '50 days', now() - interval '5 days'),

  ('ca-002', '00000000-0000-0000-0000-000000000001',
   'CA-2026-002', 'credit-scoring-v3.2.1', 'iso-42001',
   'ISO/IEC 42001 AI Management System Conformity Assessment',
   'BSI Group', 'Completed', 'Conformant',
   '{"open_findings":0,"closed_findings":3,"certification_valid_until":"2027-06-01"}'::jsonb,
   '2027-06-01',
   now() - interval '90 days', now() - interval '60 days'),

  ('ca-003', '00000000-0000-0000-0000-000000000001',
   'CA-2026-003', 'fraud-detection-v2.8', 'nist-ai-rmf',
   'NIST AI RMF Core Functions Assessment — Fraud Detection System',
   'Internal Risk Team', 'Completed', 'Substantially Conformant',
   '{"govern":0.87,"map":0.82,"measure":0.91,"manage":0.85,"overall":0.86,"gaps":["MG-2.2 bias monitoring","GV-6.1 documentation"]}'::jsonb,
   '2027-01-01',
   now() - interval '120 days', now() - interval '90 days'),

  ('ca-004', '00000000-0000-0000-0000-000000000001',
   'CA-2026-004', 'kyc-image-classifier-v4.1', 'eu-ai-act',
   'EU AI Act High-Risk AI System Conformity Assessment — KYC Classifier',
   'Internal', 'Not Started', 'Pending',
   '{}'::jsonb,
   NULL,
   now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 15. EXCEPTIONS — 5 records (table: exceptions, id=text)
-- =============================================================================
INSERT INTO public.exceptions
  (id, tenant_id, exception_id, title, description, requested_by,
   status, risk_accepted, justification, expiry_date,
   renewal_count, created_at, updated_at)
VALUES
  ('exc-001', '00000000-0000-0000-0000-000000000001',
   'EXC-2026-001',
   'Temporary Waiver: Explainability Requirement for Fraud Detection API',
   'Waiver for SHAP explanation SLA for fraud detection API calls below $100 threshold. Current SHAP latency (380ms) exceeds acceptable API response time.',
   'Elena Vasquez', 'Approved', 'Medium',
   'Revenue impact of SHAP latency is $2.3M/quarter. Compensating control: batch explanations available within 2 hours on request.',
   (now() + interval '90 days')::date, 1, now() - interval '45 days', now() - interval '40 days'),

  ('exc-002', '00000000-0000-0000-0000-000000000001',
   'EXC-2026-002',
   'Extended Deadline: EU AI Act Art.9 Risk Management Documentation',
   'Exception to internal Q1 2026 deadline for complete risk management documentation for mortgage approval model.',
   'Sophie Beaumont', 'Approved', 'Low',
   'Notified body engagement delayed by 3 weeks. Compensating control: internal draft documentation complete; external review in progress.',
   (now() + interval '30 days')::date, 0, now() - interval '30 days', now() - interval '25 days'),

  ('exc-003', '00000000-0000-0000-0000-000000000001',
   'EXC-2026-003',
   'Waiver: MFA Requirement for Weights & Biases Shared Team Accounts',
   'Three ML engineers share a team W&B account without individual MFA. Migration to individual accounts requires W&B enterprise upgrade.',
   'DevSecOps Team', 'Pending', 'Medium',
   'Cost of W&B enterprise upgrade is $47K. Under budget review. Compensating control: IP allowlisting enabled; quarterly password rotation.',
   (now() + interval '60 days')::date, 0, now() - interval '10 days', now() - interval '5 days'),

  ('exc-004', '00000000-0000-0000-0000-000000000001',
   'EXC-2025-004',
   'Approved Exception: Bias Threshold for NLP Sentiment Model (Low-Risk Use)',
   'Exception to standard 0.85 fairness threshold for NLP sentiment model used for internal market research (no adverse impact on individuals).',
   'Dr. Lin Zhang', 'Approved', 'Low',
   'Use case does not affect individual rights or significant interests. Model used for aggregate market sentiment analysis only.',
   (now() + interval '180 days')::date, 2, now() - interval '180 days', now() - interval '90 days'),

  ('exc-005', '00000000-0000-0000-0000-000000000001',
   'EXC-2026-005',
   'Denial: Exception Request for Bypassing HITL on Treasury Transfers <$50K',
   'Request to disable HITL review for treasury AI agent actions below $50K threshold. Denied following unauthorized transfer incident.',
   'Treasury Operations', 'Denied', 'Not Applicable',
   'Denied following INC-006 incident where HITL bypass contributed to $2.3M unauthorized transfer attempt. Risk unacceptable.',
   NULL, 0, now() - interval '5 days', now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 16. REMEDIATION PLANS — 5 records (table: remediation_plans, id=uuid)
-- =============================================================================
INSERT INTO public.remediation_plans
  (id, tenant_id, plan_ref, title, source_type, source_id,
   priority, status, due_date, progress_pct,
   milestones, created_at, updated_at)
VALUES
  ('cc300001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'REM-2026-001', 'Credit Scoring Bias Remediation Plan',
   'bias_audit', 'bias-001', 'critical', 'In Progress',
   (now() + interval '14 days')::date, 45,
   '[{"title":"Root cause analysis complete","due":"2026-04-10","status":"completed"},{"title":"Equalized odds implementation","due":"2026-04-25","status":"in_progress"},{"title":"Validation on holdout set","due":"2026-04-30","status":"pending"},{"title":"Production deployment","due":"2026-05-05","status":"pending"}]'::jsonb,
   now() - interval '25 days', now() - interval '2 days'),

  ('cc300002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'REM-2026-002', 'Prompt Injection Hardening — Customer Advisory Chatbot',
   'incident', 'inc-003', 'critical', 'Completed',
   (now() - interval '10 days')::date, 100,
   '[{"title":"Patch v2.4.7 deployed","due":"2026-03-30","status":"completed"},{"title":"Context isolation implemented","due":"2026-04-05","status":"completed"},{"title":"Jailbreak detection classifier deployed","due":"2026-04-10","status":"completed"},{"title":"Post-deployment monitoring 30 days","due":"2026-04-30","status":"completed"}]'::jsonb,
   now() - interval '40 days', now() - interval '10 days'),

  ('cc300003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'REM-2026-003', 'KYC Adversarial Robustness Remediation',
   'incident', 'inc-008', 'high', 'In Progress',
   (now() + interval '30 days')::date, 20,
   '[{"title":"Adversarial training data generation","due":"2026-04-25","status":"in_progress"},{"title":"Model retraining with robust techniques","due":"2026-05-05","status":"pending"},{"title":"Security validation testing","due":"2026-05-10","status":"pending"},{"title":"Production deployment","due":"2026-05-15","status":"pending"}]'::jsonb,
   now() - interval '5 days', now() - interval '1 day'),

  ('cc300004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'REM-2026-004', 'HITL Policy Firewall Hardening — Treasury Agent',
   'incident', 'inc-006', 'critical', 'Completed',
   (now() - interval '7 days')::date, 100,
   '[{"title":"Emergency configuration patch applied","due":"2026-04-03","status":"completed"},{"title":"Dual-approval workflow deployed for >$100K","due":"2026-04-07","status":"completed"},{"title":"Agent permission audit completed","due":"2026-04-10","status":"completed"},{"title":"Penetration test of HITL controls","due":"2026-04-14","status":"completed"}]'::jsonb,
   now() - interval '18 days', now() - interval '7 days'),

  ('cc300005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001',
   'REM-2026-005', 'Explainability Infrastructure HA Upgrade',
   'incident', 'inc-007', 'high', 'In Progress',
   (now() + interval '21 days')::date, 60,
   '[{"title":"HA architecture design approved","due":"2026-04-15","status":"completed"},{"title":"Explanation cache pre-generation system","due":"2026-04-20","status":"completed"},{"title":"Kubernetes multi-replica deployment","due":"2026-04-25","status":"in_progress"},{"title":"SLA monitoring and alerting","due":"2026-04-30","status":"pending"}]'::jsonb,
   now() - interval '12 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 17. ESG REPORTS — 4 records (table: esg_reports, id=uuid, org_id=uuid)
-- =============================================================================
INSERT INTO public.esg_reports
  (id, org_id, title, period, framework, status, author,
   environmental_score, social_score, governance_score, overall_score,
   highlights, ai_metrics, published_at, created_at, updated_at)
VALUES
  ('dd400001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Sentinel AI GRC ESG Report — Q1 2026', 'Q1 2026', 'GRI + TCFD + EU CSRD', 'Published',
   'Oliver Green',
   72.4, 81.3, 88.5, 80.7,
   ARRAY['31% renewable energy for AI compute','Bias audit coverage expanded to 6 models','ISO 42001 certification achieved','GDPR DSR response rate 98.4%'],
   '{"ai_carbon_kg":3100,"renewable_pct":31,"bias_audits_completed":4,"models_with_explainability":6,"dsar_compliance_rate":0.984}'::jsonb,
   now() - interval '21 days', now() - interval '30 days', now() - interval '21 days'),

  ('dd400002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Sentinel AI GRC ESG Report — Q4 2025', 'Q4 2025', 'GRI + TCFD', 'Published',
   'Oliver Green',
   68.1, 79.5, 85.2, 77.6,
   ARRAY['22% renewable energy (up from 15% Q3)','Launched AI Ethics Committee','GDPR training completion 96%','Carbon tracking system deployed'],
   '{"ai_carbon_kg":3850,"renewable_pct":22,"bias_audits_completed":2,"models_with_explainability":3,"dsar_compliance_rate":0.971}'::jsonb,
   now() - interval '90 days', now() - interval '100 days', now() - interval '90 days'),

  ('dd400003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Sentinel AI GRC ESG Report — Q2 2026 (Draft)', 'Q2 2026', 'GRI + TCFD + EU CSRD + ISO 42001', 'Draft',
   'Oliver Green',
   NULL, NULL, NULL, NULL,
   ARRAY[]::text[],
   '{}'::jsonb,
   NULL, now() - interval '5 days', now() - interval '5 days'),

  ('dd400004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Sentinel AI GRC Annual ESG Report 2025', 'FY 2025', 'GRI + TCFD + SASB', 'Published',
   'Sustainability Team',
   65.8, 77.2, 82.9, 75.3,
   ARRAY['AI compute carbon footprint first disclosed','Governance framework ISO 42001 roadmap launched','Employee AI ethics training introduced','Vendor ESG screening criteria added'],
   '{"ai_carbon_kg":14200,"renewable_pct":18,"bias_audits_completed":3,"models_with_explainability":2,"dsar_compliance_rate":0.963}'::jsonb,
   now() - interval '110 days', now() - interval '120 days', now() - interval '110 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 18. ENERGY METRICS — 8 records (table: energy_metrics, id=uuid, org_id=uuid)
-- =============================================================================
INSERT INTO public.energy_metrics
  (id, org_id, model_name, period, gpu_hours, kwh, tokens_generated,
   efficiency_score, renewable_percent, compute_provider,
   measurement_source, pue, recorded_at, created_at, updated_at)
VALUES
  ('ee500001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'GPT-4 Turbo (Advisory)', 'Q1 2026', 18420, 4142.5, 2840000000,
   0.74, 34.0, 'Azure OpenAI (EU West)', 'Azure Carbon Dashboard', 1.12,
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ee500002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Claude 3 Opus (Compliance)', 'Q1 2026', 6240, 1404.0, 890000000,
   0.81, 45.0, 'AWS (us-east-1)', 'Anthropic API Carbon Report', 1.18,
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ee500003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Fraud Detection v2.8 (Inference)', 'Q1 2026', 2180, 523.2, 0,
   0.88, 28.0, 'On-Premises GPU Cluster', 'Data Center Metering', 1.45,
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ee500004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Credit Scoring v3.2.1 (Training Run)', 'Q1 2026', 4200, 1050.0, 0,
   0.69, 15.0, 'AWS (ap-southeast-1)', 'AWS Customer Carbon Footprint Tool', 1.22,
   now() - interval '35 days', now() - interval '35 days', now() - interval '35 days'),

  ('ee500005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'GPT-4 Turbo (Advisory)', 'Q4 2025', 16800, 3780.0, 2510000000,
   0.71, 22.0, 'Azure OpenAI (EU West)', 'Azure Carbon Dashboard', 1.14,
   now() - interval '90 days', now() - interval '95 days', now() - interval '90 days'),

  ('ee500006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'KYC Classifier v4.1 (Inference)', 'Q1 2026', 890, 213.6, 0,
   0.91, 28.0, 'AWS (ap-southeast-1)', 'AWS Customer Carbon Footprint Tool', 1.22,
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ee500007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'NLP Entity Extraction v1.3 (Training)', 'Q1 2026', 3100, 744.0, 0,
   0.76, 28.0, 'AWS (ap-southeast-1)', 'AWS Customer Carbon Footprint Tool', 1.22,
   now() - interval '40 days', now() - interval '40 days', now() - interval '40 days'),

  ('ee500008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'All Models Combined', 'Q1 2026', 35030, 8077.3, 3730000000,
   0.78, 31.0, 'Multi-Cloud', 'Consolidated Carbon Report', 1.21,
   now() - interval '21 days', now() - interval '21 days', now() - interval '21 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 19. MODEL EFFICIENCY — 6 records (table: model_efficiency, id=uuid, org_id=uuid)
-- =============================================================================
INSERT INTO public.model_efficiency
  (id, org_id, model_name, version, task, latency_p50, latency_p99,
   throughput, accuracy, f1_score, cost_per_inference, memory_mb,
   carbon_per_inference, compliance_score, bias_score, explainability_score,
   overall_score, benchmarked_by, benchmarked_at, created_at, updated_at)
VALUES
  ('ff600001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'GPT-4 Turbo', 'gpt-4-turbo-2024-04', 'Customer Advisory Generation',
   1240, 3850, 45.2, 0.94, 0.91, 0.00842, 0, 0.00089,
   0.91, 0.82, 0.88, 0.89, 'ML Benchmarking Team',
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ff600002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Claude 3 Opus', 'claude-3-opus-20240229', 'Compliance Document Analysis',
   1580, 4200, 38.7, 0.96, 0.94, 0.01500, 0, 0.00071,
   0.94, 0.89, 0.92, 0.92, 'ML Benchmarking Team',
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ff600003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Fraud Detection XGBoost', 'v2.8.0', 'Transaction Fraud Classification',
   12, 45, 8400.0, 0.97, 0.95, 0.00002, 512, 0.0000031,
   0.91, 0.89, 0.94, 0.91, 'MLOps Team',
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ff600004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'Credit Scoring Neural Net', 'v3.2.1', 'Credit Risk Assessment',
   28, 95, 3200.0, 0.93, 0.89, 0.00004, 1024, 0.0000052,
   0.87, 0.71, 0.86, 0.82, 'MLOps Team',
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days'),

  ('ff600005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'KYC Image Classifier', 'v4.1', 'Identity Document Verification',
   85, 310, 1200.0, 0.92, 0.90, 0.00012, 2048, 0.0000145,
   0.83, 0.77, 0.79, 0.80, 'ML Benchmarking Team',
   now() - interval '10 days', now() - interval '12 days', now() - interval '10 days'),

  ('ff600006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
   'NLP Entity Extraction', 'v1.3', 'Document PII Detection',
   42, 180, 5600.0, 0.95, 0.93, 0.00006, 768, 0.0000078,
   0.88, 0.85, 0.87, 0.87, 'MLOps Team',
   now() - interval '21 days', now() - interval '25 days', now() - interval '21 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 20. ENABLE REALTIME for all seeded tables (safe — ignores existing)
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'risks','incidents','vendors','bias_audits','evidence',
    'maturity_assessments','security_threats','security_scans','security_vulnerabilities',
    'red_team_campaigns','consent_records','dsar_requests','tasks',
    'conformity_assessments','exceptions','remediation_plans',
    'esg_reports','energy_metrics','model_efficiency'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- already in publication, skip
    WHEN undefined_object THEN
      NULL; -- publication doesn't exist yet, skip
    END;
  END LOOP;
END $$;
