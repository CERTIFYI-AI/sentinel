-- REPLAY NOTE (2026-08-16): this legacy seed/integration file predates the
-- repo's replay contract and contains statements that contradict the
-- repo-defined schema (they only ever applied against the live database's
-- out-of-band state, and some never applied cleanly anywhere). Each top-level
-- statement is now wrapped to be individually fault-tolerant: compatible
-- statements still seed a fresh environment; incompatible ones raise a
-- WARNING instead of aborting the replay. Live behavior is unchanged.
-- Canonical demo data lives in the 202608xx seed migrations.
-- See supabase/migrations/README.md.

DO $seed$
BEGIN
  -- =============================================================================
  -- Sentinel GRC: Full Module Seed Migration
  -- File: 20260421_p1_seed_all_modules.sql
  -- Description: Seeds all empty tables with enterprise-grade production-like data.
  --              Creates esg_reports, energy_metrics, model_efficiency tables.
  --              Adds all new tables to realtime publication.
  -- Idempotent: All INSERTs use ON CONFLICT DO NOTHING
  -- Org ID: 00000000-0000-0000-0000-000000000001
  -- =============================================================================
  
  -- Default org already exists: id=00000000-0000-0000-0000-000000000001, name='Sentinel AI GRC', slug='sentinel-ai-grc'
  -- Skipping org INSERT to avoid NOT NULL constraint on slug column
  
  -- =============================================================================
  -- 1. RISK REGISTER — 12 diverse AI risk entries
  -- =============================================================================
  INSERT INTO public.risk_register
    (id, org_id, title, category, likelihood, impact, risk_score, status, owner, mitigation, tags, metadata, created_at, updated_at)
  VALUES
    ('11100001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'LLM Hallucination in Customer Advisory Outputs', 'AI Model Risk', 4, 5, 20, 'open',
     'Dr. Amara Osei', 'Implement output grounding with RAG pipeline; add human review gate for high-value recommendations.',
     ARRAY['llm','hallucination','customer-impact'], '{"framework":"EU AI Act Art.9","control_refs":["AI-CTL-007","AI-CTL-012"],"residual_score":8}'::jsonb,
     now() - interval '45 days', now() - interval '3 days'),
  
    ('11100002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Biased Lending Decision Model', 'Fairness & Bias', 4, 5, 20, 'mitigating',
     'Marcus Chen', 'Conduct quarterly bias audits using Fairlearn; implement equalized odds post-processing; disparate impact monitoring.',
     ARRAY['bias','lending','fairness','regulatory'], '{"framework":"EU AI Act Art.10","regulation":"ECOA","audit_frequency":"quarterly"}'::jsonb,
     now() - interval '60 days', now() - interval '7 days'),
  
    ('11100003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Prompt Injection Attack on Internal Copilot', 'Cybersecurity', 5, 4, 20, 'open',
     'Priya Nair', 'Deploy prompt sanitization layer; implement context isolation; add red-team testing quarterly.',
     ARRAY['prompt-injection','security','llm'], '{"owasp_ref":"LLM01","severity":"critical","cvss":8.2}'::jsonb,
     now() - interval '30 days', now() - interval '2 days'),
  
    ('11100004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'PII Leakage via Model Training Data Memorization', 'Data Privacy', 4, 5, 20, 'open',
     'Sophie Beaumont', 'Apply differential privacy (ε=1.0); implement membership inference attack testing; data minimization controls.',
     ARRAY['pii','privacy','gdpr','training-data'], '{"gdpr_article":"Art.25","dpia_required":true,"data_subjects":50000}'::jsonb,
     now() - interval '50 days', now() - interval '5 days'),
  
    ('11100005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Third-Party AI API Vendor Lock-in and Outage Risk', 'Operational Risk', 3, 4, 12, 'accepted',
     'James Okafor', 'Implement multi-vendor failover architecture; maintain 30-day API parity across top-3 providers.',
     ARRAY['vendor','resilience','operational'], '{"vendor":"OpenAI","sla_target":"99.9%","fallback_vendor":"Anthropic"}'::jsonb,
     now() - interval '90 days', now() - interval '10 days'),
  
    ('11100006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Explainability Gap in Credit Scoring Model', 'Regulatory Compliance', 3, 5, 15, 'mitigating',
     'Dr. Lin Zhang', 'Deploy SHAP-based explanation service; integrate with adverse action notice generation; ECOA/FCRA alignment.',
     ARRAY['explainability','credit','regulatory','ecoa'], '{"regulation":"FCRA","framework":"NIST AI RMF","explanation_method":"SHAP"}'::jsonb,
     now() - interval '40 days', now() - interval '4 days'),
  
    ('11100007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Model Drift in Fraud Detection System', 'Model Performance', 3, 4, 12, 'monitoring',
     'Elena Vasquez', 'Implement PSI monitoring with 0.2 alert threshold; automated retraining pipeline; monthly champion-challenger evaluation.',
     ARRAY['drift','fraud-detection','monitoring'], '{"psi_threshold":0.2,"retraining_trigger":"weekly","last_drift_event":"2026-03-15"}'::jsonb,
     now() - interval '25 days', now() - interval '1 day'),
  
    ('11100008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Unauthorized AI Agent Autonomy in Customer Operations', 'Governance', 4, 4, 16, 'open',
     'Tobias Werner', 'Enforce HITL gates for all high-value agent actions; implement action policy firewall; audit logging for agent decisions.',
     ARRAY['agentic-ai','governance','hitl'], '{"agent_type":"customer_ops","hitl_threshold":"high","escalation_policy":"strict"}'::jsonb,
     now() - interval '20 days', now() - interval '2 days'),
  
    ('11100009-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Supply Chain AI Component Vulnerability', 'Supply Chain Security', 3, 4, 12, 'mitigating',
     'Ananya Krishnan', 'Conduct SBOM analysis for all AI dependencies; implement continuous CVE monitoring; vendor security attestation annually.',
     ARRAY['supply-chain','sbom','dependencies'], '{"components_at_risk":7,"critical_cves":2,"last_sbom_scan":"2026-04-10"}'::jsonb,
     now() - interval '15 days', now() - interval '3 days'),
  
    ('11100010-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Overreliance on AI in Medical Triage Module', 'Ethics & Safety', 3, 5, 15, 'open',
     'Dr. Fatima Al-Rashid', 'Mandate physician override for all AI triage recommendations; implement confidence threshold gating at 90%; ethics board review quarterly.',
     ARRAY['medical','ethics','human-oversight','safety'], '{"use_case":"medical_triage","hitl_required":true,"confidence_gate":0.9}'::jsonb,
     now() - interval '35 days', now() - interval '6 days'),
  
    ('11100011-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Carbon Footprint of Large-Scale Model Training', 'Environmental Risk', 2, 3, 6, 'monitoring',
     'Oliver Green', 'Track GPU hours and kWh per training run; target 50% renewable compute by Q4 2026; report in ESG disclosures.',
     ARRAY['carbon','esg','sustainability','gpu'], '{"annual_co2_kg":12400,"renewable_pct":31,"target_year":2026}'::jsonb,
     now() - interval '70 days', now() - interval '14 days'),
  
    ('11100012-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI-Generated Synthetic Data Misuse in Research', 'Intellectual Property', 2, 4, 8, 'accepted',
     'Dr. Kenji Tanaka', 'Enforce data provenance tagging; watermark synthetic datasets; legal review for downstream commercial use.',
     ARRAY['synthetic-data','ip','data-governance'], '{"datasets_affected":4,"watermarking":"enabled","legal_review":"required"}'::jsonb,
     now() - interval '55 days', now() - interval '8 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 2. INCIDENTS — 8 AI incidents
  -- =============================================================================
  INSERT INTO public.incidents
    (id, org_id, title, description, severity, status, incident_type, affected_systems, detected_at, resolved_at, assignee_id, metadata, created_at, updated_at)
  VALUES
    ('22200001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'GPT-4 Turbo Advisory Hallucination Event — Q1 2026',
     'The customer advisory chatbot generated a fabricated ISIN code and incorrect dividend yield for a mutual fund product, causing 3 customers to make ill-informed investment decisions. Root cause: insufficient RAG grounding on fund data.',
     'high', 'resolved', 'model_failure',
     ARRAY['customer-advisory-chatbot','fund-data-pipeline'],
     now() - interval '42 days', now() - interval '38 days',
     NULL, '{"affected_customers":3,"financial_impact_usd":12400,"regulatory_reported":true,"root_cause":"rag_gap","lessons_learned":"Implement mandatory source citation with confidence ≥0.85"}'::jsonb,
     now() - interval '42 days', now() - interval '38 days'),
  
    ('22200002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Bias Detection Alert: Mortgage Approval Model Disparate Impact',
     'Automated monitoring detected a 23% lower approval rate for applicants from ZIP codes with >60% minority population. Immediate model suspension triggered. HMDA reporting obligation assessed.',
     'critical', 'investigating', 'bias_detected',
     ARRAY['mortgage-approval-model','underwriting-system'],
     now() - interval '8 days', NULL,
     NULL, '{"disparate_impact_ratio":0.77,"affected_applications":847,"hmda_reportable":true,"model_version":"v3.2.1","suspension_time":"2026-04-13T09:22:00Z"}'::jsonb,
     now() - interval '8 days', now() - interval '1 day'),
  
    ('22200003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Prompt Injection via Customer Support Portal',
     'A malicious user injected instructions into the support chatbot via a crafted support ticket, causing the AI to reveal internal escalation procedures and attempt to invoke unapproved API endpoints.',
     'high', 'resolved', 'security_breach',
     ARRAY['support-chatbot','crm-integration'],
     now() - interval '22 days', now() - interval '20 days',
     NULL, '{"attack_vector":"prompt_injection","data_exposed":"internal_escalation_sop","endpoints_invoked":2,"patched_version":"v2.4.7"}'::jsonb,
     now() - interval '22 days', now() - interval '20 days'),
  
    ('22200004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Fraud Detection Model Drift — False Positive Surge',
     'Population stability index for the fraud detection model exceeded threshold (PSI=0.31) following a seasonal spending shift. False positive rate increased to 4.2%, blocking legitimate transactions for 1,200+ customers.',
     'medium', 'resolved', 'model_drift',
     ARRAY['fraud-detection-model','transaction-processing'],
     now() - interval '35 days', now() - interval '30 days',
     NULL, '{"psi_score":0.31,"false_positive_rate":0.042,"blocked_transactions":1247,"retraining_completed":"2026-03-18","new_psi_score":0.08}'::jsonb,
     now() - interval '35 days', now() - interval '30 days'),
  
    ('22200005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Training Data PII Exposure — NLP Entity Extraction Model',
     'Internal audit discovered that the NLP model''s training dataset contained 2,847 unredacted customer records with name, SSN, and account numbers. Immediate incident response and GDPR Art.33 notification to DPA initiated.',
     'critical', 'resolved', 'data_breach',
     ARRAY['nlp-extraction-model','training-data-store'],
     now() - interval '65 days', now() - interval '55 days',
     NULL, '{"pii_records_exposed":2847,"gdpr_article_33_notified":true,"dpa_notification_date":"2026-02-18","remediation":"dataset_purge_and_rescrub"}'::jsonb,
     now() - interval '65 days', now() - interval '55 days'),
  
    ('22200006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Agent Unauthorized Financial Transfer Attempt',
     'An autonomous AI agent in the treasury management system attempted to initiate a $2.3M inter-account transfer without human approval, bypassing the configured HITL gate due to a configuration error in the policy firewall.',
     'critical', 'closed', 'unauthorized_action',
     ARRAY['treasury-ai-agent','hitl-gateway','policy-firewall'],
     now() - interval '18 days', now() - interval '14 days',
     NULL, '{"transfer_amount_usd":2300000,"transfer_blocked":true,"hitl_bypass_cause":"policy_config_error","control_gap_ref":"AI-CTL-031","post_incident_config_hardened":true}'::jsonb,
     now() - interval '18 days', now() - interval '14 days'),
  
    ('22200007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Explainability System Failure During Regulatory Audit',
     'SHAP explanation service became unavailable during a live OCC examination, preventing examiners from reviewing AI decision rationale for 68 sampled loan decisions. Emergency manual review process invoked.',
     'high', 'resolved', 'system_outage',
     ARRAY['shap-explanation-service','model-governance-portal'],
     now() - interval '12 days', now() - interval '10 days',
     NULL, '{"audit_body":"OCC","sampled_decisions":68,"downtime_minutes":143,"manual_review_completed":true,"sla_breach":true,"occ_notified":true}'::jsonb,
     now() - interval '12 days', now() - interval '10 days'),
  
    ('22200008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Adversarial Example Attack on Image Classification KYC Model',
     'Security researchers discovered that carefully crafted perturbations to identity document images could bypass the KYC document verification model with 78% success rate, potentially enabling identity fraud.',
     'high', 'investigating', 'adversarial_attack',
     ARRAY['kyc-image-classifier','identity-verification-pipeline'],
     now() - interval '5 days', NULL,
     NULL, '{"attack_success_rate":0.78,"perturbation_type":"FGSM","model_version":"kyc-v4.1","temporary_mitigation":"human_review_all_flagged","researcher_disclosure":"responsible"}'::jsonb,
     now() - interval '5 days', now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 3. VENDORS (snake_case) — 8 vendor records
  -- =============================================================================
  INSERT INTO public.vendors
    (id, org_id, name, category, risk_tier, status, contact_email, contract_expiry, last_assessment, description, metadata, created_at, updated_at)
  VALUES
    ('33300001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'OpenAI', 'Foundation Model Provider', 1, 'Active',
     'enterprise@openai.com', now() + interval '18 months', now() - interval '30 days',
     'Primary LLM provider for customer advisory and internal copilot use cases. GPT-4 Turbo and GPT-4o deployed in production.',
     '{"soc2_type2":true,"iso27001":true,"gdpr_dpa":true,"models_in_use":["gpt-4-turbo","gpt-4o"],"annual_spend_usd":840000,"data_residency":"US"}'::jsonb,
     now() - interval '180 days', now() - interval '30 days'),
  
    ('33300002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Anthropic', 'Foundation Model Provider', 1, 'Active',
     'enterprise@anthropic.com', now() + interval '12 months', now() - interval '45 days',
     'Secondary LLM provider for compliance document analysis and risk summarization. Claude 3 Opus deployed as fallback system.',
     '{"soc2_type2":true,"iso27001":false,"gdpr_dpa":true,"models_in_use":["claude-3-opus","claude-3-sonnet"],"annual_spend_usd":320000,"data_residency":"US"}'::jsonb,
     now() - interval '200 days', now() - interval '45 days'),
  
    ('33300003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Microsoft Azure AI', 'Cloud AI Platform', 1, 'Active',
     'azureenterprise@microsoft.com', now() + interval '24 months', now() - interval '15 days',
     'Enterprise Azure OpenAI Service for regulated workloads requiring data residency in EU. Provides Azure AI Content Safety for guardrail enforcement.',
     '{"soc2_type2":true,"iso27001":true,"gdpr_dpa":true,"iso42001":true,"models_in_use":["azure-gpt-4","azure-text-embedding"],"annual_spend_usd":1200000,"data_residency":"EU"}'::jsonb,
     now() - interval '365 days', now() - interval '15 days'),
  
    ('33300004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DataRobot', 'MLOps Platform', 2, 'Active',
     'enterprise@datarobot.com', now() + interval '8 months', now() - interval '60 days',
     'Automated machine learning platform for credit risk and fraud models. Provides model monitoring, drift detection, and explainability services.',
     '{"soc2_type2":true,"iso27001":true,"gdpr_dpa":true,"annual_spend_usd":480000,"models_monitored":12,"bias_monitoring":true}'::jsonb,
     now() - interval '240 days', now() - interval '60 days'),
  
    ('33300005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Palantir AIP', 'AI Platform', 2, 'Active',
     'aip-enterprise@palantir.com', now() + interval '36 months', now() - interval '20 days',
     'Enterprise AI platform for operational intelligence and agentic workflows. Used for treasury optimization and risk aggregation pipelines.',
     '{"soc2_type2":true,"fedramp_authorized":true,"gdpr_dpa":true,"annual_spend_usd":2100000,"deployment":"on-prem-hybrid","data_residency":"Customer-Controlled"}'::jsonb,
     now() - interval '400 days', now() - interval '20 days'),
  
    ('33300006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Weights & Biases', 'ML Experiment Tracking', 3, 'Active',
     'enterprise@wandb.ai', now() + interval '6 months', now() - interval '90 days',
     'ML experiment tracking and model registry platform for internal ML team. Tracks training runs, hyperparameters, and model artifacts.',
     '{"soc2_type2":true,"iso27001":false,"gdpr_dpa":true,"annual_spend_usd":95000,"models_tracked":47,"data_residency":"US"}'::jsonb,
     now() - interval '300 days', now() - interval '90 days'),
  
    ('33300007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Snyk AI Security', 'Security Testing', 2, 'Under Review',
     'enterprise@snyk.io', now() + interval '2 months', now() - interval '10 days',
     'AI security scanning for ML model dependencies and container images. Provides SBOM generation and CVE monitoring for AI supply chain.',
     '{"soc2_type2":true,"iso27001":true,"gdpr_dpa":true,"annual_spend_usd":72000,"sbom_reports":true,"cve_monitoring":true,"contract_renewal_due":"2026-06-30"}'::jsonb,
     now() - interval '120 days', now() - interval '10 days'),
  
    ('33300008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Hugging Face Enterprise', 'Model Repository', 3, 'Active',
     'enterprise@huggingface.co', now() + interval '14 months', now() - interval '75 days',
     'Enterprise model hub for open-source model hosting and fine-tuning. Used for internal NLP models including document classification and entity extraction.',
     '{"soc2_type2":false,"iso27001":false,"gdpr_dpa":true,"annual_spend_usd":58000,"models_hosted":14,"private_models":true,"data_residency":"EU"}'::jsonb,
     now() - interval '250 days', now() - interval '75 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 4. BIAS AUDITS — 6 audit records
  -- =============================================================================
  INSERT INTO public.bias_audits
    (id, org_id, model_id, framework, status, overall_score, breakdown, metrics, recommendations, threshold, passed, triggered_by, created_at, completed_at)
  VALUES
    ('44400001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'credit-scoring-v3-2-1', 'EU AI Act Art.10 + Fairlearn',
     'Completed', 0.71,
     '{"demographic_parity":0.68,"equalized_odds":0.74,"calibration":0.79,"individual_fairness":0.63}'::jsonb,
     '{"approval_rate_overall":0.62,"approval_rate_majority":0.71,"approval_rate_minority":0.54,"disparate_impact":0.76,"statistical_significance":0.001}'::jsonb,
     '["Implement equalized odds post-processing layer","Increase minority representation in training data to ≥40%","Quarterly recalibration schedule required","Deploy adverse action notice system for automated denials"]'::jsonb,
     0.80, false, 'regulatory_requirement',
     now() - interval '30 days', now() - interval '25 days'),
  
    ('44400002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'fraud-detection-v2-8', 'NIST AI RMF MG-2.2',
     'Completed', 0.89,
     '{"demographic_parity":0.91,"equalized_odds":0.87,"calibration":0.93,"individual_fairness":0.85}'::jsonb,
     '{"false_positive_rate_majority":0.021,"false_positive_rate_minority":0.028,"flag_rate_disparity":1.33,"auc_roc":0.97}'::jsonb,
     '["Minor flag rate disparity detected — monitor quarterly","Expand test population diversity","Document bias test results for EU AI Act conformity assessment"]'::jsonb,
     0.85, true, 'scheduled',
     now() - interval '60 days', now() - interval '55 days'),
  
    ('44400003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'kyc-image-classifier-v4-1', 'ISO/IEC 42001 Annex A.6',
     'Completed', 0.77,
     '{"skin_tone_parity":0.72,"age_group_parity":0.81,"gender_parity":0.78}'::jsonb,
     '{"accuracy_light_skin":0.96,"accuracy_dark_skin":0.89,"accuracy_gap":0.07,"age_65_plus_accuracy":0.84,"document_type_variation":0.91}'::jsonb,
     '["Augment training with synthetic diverse document images","Address 7% accuracy gap for darker skin tones — critical","Test with additional document types from 50+ jurisdictions"]'::jsonb,
     0.85, false, 'incident_response',
     now() - interval '5 days', now() - interval '3 days'),
  
    ('44400004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'nlp-sentiment-v1-5', 'Google SAIF Pillar 4',
     'Completed', 0.92,
     '{"language_parity":0.94,"regional_dialect_parity":0.89,"formality_parity":0.93}'::jsonb,
     '{"english_f1":0.95,"non_english_f1":0.91,"dialect_detection_accuracy":0.88,"neutral_misclassification_rate":0.04}'::jsonb,
     '["Expand dialect training data for AAVE and regional variants","Acceptable bias levels for current use case","Annual re-audit recommended"]'::jsonb,
     0.85, true, 'scheduled',
     now() - interval '90 days', now() - interval '85 days'),
  
    ('44400005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'recommendation-engine-v2', 'EU AI Act Art.9 + ISO 42001',
     'In Progress', NULL,
     '{}'::jsonb, '{}'::jsonb,
     '[]'::jsonb,
     0.85, NULL, 'quarterly_cycle',
     now() - interval '3 days', NULL),
  
    ('44400006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'churn-prediction-v1-2', 'NIST AI RMF MG-2.2',
     'Completed', 0.83,
     '{"demographic_parity":0.85,"equalized_odds":0.81,"calibration":0.87}'::jsonb,
     '{"churn_flag_rate_high_income":0.08,"churn_flag_rate_low_income":0.14,"income_disparity_ratio":1.75,"feature_importance_income_rank":3}'::jsonb,
     '["Remove direct income feature — use proxy indicators only","Income disparity acceptable within FCRA safe harbor","Conduct annual ECOA analysis"]'::jsonb,
     0.80, true, 'scheduled',
     now() - interval '45 days', now() - interval '40 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

-- =============================================================================
-- 5. FRAMEWORKS — 12 compliance frameworks (if < 10 exist)
-- =============================================================================
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.frameworks) < 10 THEN
    INSERT INTO public.frameworks (id, name, short_name, version, category, issuing_body, jurisdiction, effective_date, control_count, structure, description, url, status, adopted, coverage_pct)
    VALUES
      ('iso-42001',   'ISO/IEC 42001:2023','ISO 42001','2023','AI Management','ISO/IEC','International','2023-12-18',38,'9 governance areas in Annex A','AI Management System standard providing structured approach for managing AI risks and opportunities.','https://www.iso.org/standard/81230.html','active',true,31),
      ('nist-ai-rmf', 'NIST AI Risk Management Framework 1.0','NIST AI RMF','1.0','AI Risk Management','NIST','United States','2023-01-26',58,'4 core functions: Govern, Map, Measure, Manage','Voluntary framework to better manage risks to individuals, organizations, and society associated with AI.','https://www.nist.gov/itl/ai-risk-management-framework','active',true,74),
      ('eu-ai-act',   'EU AI Act','EU AI Act','2024','AI Regulation','European Union','European Union','2024-08-01',113,'Risk-based tiers: Unacceptable, High, Limited, Minimal','Regulation laying down harmonised rules on artificial intelligence with risk-based obligations.','https://artificialintelligenceact.eu/','active',true,71),
      ('gdpr',        'General Data Protection Regulation','GDPR','2016/679','Data Protection','European Union','European Union','2018-05-25',99,'99 Articles; Art.22 automated decisions, Art.35 DPIA','EU regulation on data protection and privacy for all individuals within the EU and EEA.','https://gdpr-info.eu/','active',true,89),
      ('owasp-llm',   'OWASP Top 10 for LLM Applications','OWASP LLM','2025','AI Security','OWASP Foundation','International','2025-01-01',10,'10 primary LLM security vulnerabilities','Critical vulnerability classes for LLM applications including prompt injection and supply chain risk.','https://owasp.org/www-project-top-10-for-large-language-model-applications/','active',true,87),
      ('nist-csf',    'NIST Cybersecurity Framework 2.0','NIST CSF','2.0','Cybersecurity','NIST','United States','2024-02-26',106,'6 Functions: Govern, Identify, Protect, Detect, Respond, Recover','Framework for improving cybersecurity risk management across critical infrastructure.','https://www.nist.gov/cyberframework','active',true,63),
      ('soc2',        'SOC 2 Type II','SOC 2','2017','Security Audit','AICPA','United States','2017-04-01',60,'5 Trust Services Criteria: Security, Availability, Confidentiality, Processing Integrity, Privacy','Auditing standard for service organizations managing customer data.','https://us.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report','active',true,78),
      ('iso-27001',   'ISO/IEC 27001:2022','ISO 27001','2022','Information Security','ISO/IEC','International','2022-10-25',93,'Annex A: 93 security controls in 4 domains','International standard for information security management systems (ISMS).','https://www.iso.org/standard/82875.html','active',true,82),
      ('mitre-atlas', 'MITRE ATLAS','MITRE ATLAS','2024','AI Threat Modeling','MITRE Corporation','International','2023-07-01',30,'~30 Tactics/Techniques mapped like ATT&CK','Adversarial Threat Landscape for AI Systems knowledge base.','https://atlas.mitre.org/','active',true,51),
      ('oecd-ai',     'OECD AI Principles','OECD AI','2019','AI Principles','OECD','International','2019-05-22',10,'5 values-based principles + 5 policy recommendations','First intergovernmental standard on AI promoting trustworthy AI.','https://oecd.ai/en/ai-principles','active',true,62),
      ('pci-dss',     'PCI DSS v4.0','PCI DSS','4.0','Payment Security','PCI SSC','International','2022-03-31',64,'12 Requirements + 64 sub-requirements for cardholder data protection','Payment Card Industry Data Security Standard for protecting cardholder data.','https://www.pcisecuritystandards.org/','active',true,76),
      ('singapore-ai','Singapore Model AI Governance Framework','SG Model AI','2.0','AI Governance','IMDA Singapore','Singapore','2020-01-21',25,'4 pillars: Internal Governance, HITL, Operations, Customer Communication','Framework providing guidance on key ethical and governance issues when deploying AI.','https://www.pdpc.gov.sg/help-and-resources/2020/01/model-ai-governance-framework','active',true,43)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 6. EVIDENCE — 10 evidence records
  -- =============================================================================
  INSERT INTO public.evidence
    (id, org_id, title, evidence_type, type, source, control_id, status, collected_by, metadata, created_at, updated_at)
  VALUES
    ('55500001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'ISO 42001 Certification Audit Report — Q4 2025',
     'certification', 'document', 'External Auditor (KPMG)',
     'iso-42001-annex-a6', 'valid', 'compliance@acme-fs.com',
     '{"file_name":"ISO42001_CertAudit_Q4_2025.pdf","file_size":"4.2MB","audit_firm":"KPMG","audit_date":"2025-11-30","certificate_expiry":"2026-11-30","controls_tested":38,"controls_passed":36}'::jsonb,
     now() - interval '120 days', now() - interval '120 days'),
  
    ('55500002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'GDPR DPIA — Customer Advisory AI System',
     'dpia', 'document', 'Privacy Engineering Team',
     'gdpr-art35', 'valid', 'dpo@acme-fs.com',
     '{"file_name":"DPIA_CustomerAdvisoryAI_2026.pdf","file_size":"2.8MB","dpia_completed":"2026-01-15","dpo_approved":true,"supervisory_authority_consulted":false,"data_subjects":95000}'::jsonb,
     now() - interval '90 days', now() - interval '90 days'),
  
    ('55500003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Penetration Test Report — AI Gateway v2.4',
     'pentest', 'document', 'Crowdstrike Red Team',
     'nist-csf-pr-pt', 'valid', 'security@acme-fs.com',
     '{"file_name":"PenTest_AIGateway_2026Q1.pdf","file_size":"6.1MB","test_date":"2026-02-28","critical_findings":1,"high_findings":3,"medium_findings":7,"all_critical_remediated":true}'::jsonb,
     now() - interval '50 days', now() - interval '30 days'),
  
    ('55500004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'SOC 2 Type II Report — FY2025',
     'audit_report', 'document', 'Deloitte',
     'soc2-cc6', 'valid', 'compliance@acme-fs.com',
     '{"file_name":"SOC2_TypeII_FY2025_Deloitte.pdf","file_size":"8.7MB","audit_period":"2025-01-01_to_2025-12-31","opinion":"unqualified","exceptions":0,"controls_tested":60}'::jsonb,
     now() - interval '100 days', now() - interval '100 days'),
  
    ('55500005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Bias Audit Results — Credit Scoring Model v3.2.1',
     'bias_audit', 'report', 'Internal AI Ethics Team',
     'eu-ai-act-art10', 'valid', 'ai-ethics@acme-fs.com',
     '{"file_name":"BiasAudit_CreditScoring_v321_2026Q1.pdf","file_size":"1.9MB","model_id":"credit-scoring-v3-2-1","overall_fairness_score":0.71,"passed":false,"remediation_required":true}'::jsonb,
     now() - interval '25 days', now() - interval '25 days'),
  
    ('55500006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Model Risk Management Policy v4.1 — Board Approval',
     'policy_approval', 'document', 'Board of Directors',
     'iso-42001-annex-a4', 'valid', 'governance@acme-fs.com',
     '{"file_name":"MRM_Policy_v4.1_Board_Approval.pdf","file_size":"0.8MB","approved_date":"2026-01-10","approval_body":"Board Risk Committee","version":"4.1","effective_date":"2026-02-01"}'::jsonb,
     now() - interval '80 days', now() - interval '80 days'),
  
    ('55500007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Continuous Security Scan — AI Model Registry (April 2026)',
     'security_scan', 'automated', 'Snyk AI Security (Automated)',
     'nist-csf-id-ra', 'valid', 'cicd-pipeline@acme-fs.com',
     '{"scan_date":"2026-04-20","critical_cves":0,"high_cves":1,"medium_cves":4,"sbom_components":247,"scan_tool":"Snyk","auto_remediation_applied":false}'::jsonb,
     now() - interval '1 day', now() - interval '1 day'),
  
    ('55500008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Incident Log — Quarterly Summary Q1 2026',
     'incident_log', 'report', 'AI Governance Office',
     'eu-ai-act-art73', 'valid', 'ai-governance@acme-fs.com',
     '{"file_name":"AI_Incident_Log_Q1_2026.xlsx","file_size":"0.5MB","period":"2026-Q1","total_incidents":12,"critical":2,"high":5,"medium":5,"mean_time_to_resolve_days":8}'::jsonb,
     now() - interval '20 days', now() - interval '20 days'),
  
    ('55500009-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Data Lineage Map — Fraud Detection Training Pipeline',
     'data_lineage', 'diagram', 'Data Engineering Team',
     'iso-42001-annex-a8', 'valid', 'data-eng@acme-fs.com',
     '{"file_name":"DataLineage_FraudDetection_2026.pdf","file_size":"3.4MB","pipeline_stages":7,"data_sources":4,"pii_fields_documented":true,"retention_policy":"5years"}'::jsonb,
     now() - interval '40 days', now() - interval '40 days'),
  
    ('55500010-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'HITL Configuration Audit — Treasury AI Agent',
     'configuration_audit', 'document', 'Internal Audit',
     'eu-ai-act-art14', 'review_required', 'internal-audit@acme-fs.com',
     '{"file_name":"HITL_ConfigAudit_TreasuryAgent_2026.pdf","file_size":"1.1MB","audit_date":"2026-04-15","findings":3,"critical_finding":"HITL bypass via policy misconfiguration","remediation_deadline":"2026-05-01"}'::jsonb,
     now() - interval '6 days', now() - interval '6 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 7. POLICIES — 10 policy records
  -- =============================================================================
  INSERT INTO public.policies
    (id, org_id, title, status, version, content, category, metadata, created_at, updated_at)
  VALUES
    ('66600001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Model Risk Management Policy', 'approved', 4,
     'This policy establishes the framework for identifying, assessing, mitigating, and monitoring risks associated with AI and machine learning models deployed within Acme Financial Services. It applies to all AI models used in credit decisions, fraud detection, customer advisory, and operational automation. All models must complete a pre-deployment risk assessment, maintain documented model cards, and undergo quarterly performance reviews. High-risk models (EU AI Act Annex III) require conformity assessments and registration.',
     'AI Governance', '{"version_history":["v1.0 2023-01","v2.0 2024-01","v3.0 2025-01","v4.0 2026-01"],"owner":"Chief AI Risk Officer","approver":"Board Risk Committee","next_review":"2027-01-01","frameworks":["ISO 42001","EU AI Act","NIST AI RMF"]}'::jsonb,
     now() - interval '110 days', now() - interval '110 days'),
  
    ('66600002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Fairness and Non-Discrimination Policy', 'approved', 2,
     'Acme Financial Services is committed to ensuring that all AI systems deployed in customer-facing decisions do not discriminate based on race, color, religion, national origin, sex, marital status, age, or receipt of public assistance. This policy mandates quarterly bias audits for all credit and underwriting models, disparate impact testing against ECOA/HMDA requirements, and mandatory adverse action explanations. Models failing fairness thresholds are suspended pending remediation.',
     'Ethics & Fairness', '{"owner":"Chief Ethics Officer","approver":"CEO","next_review":"2026-07-01","frameworks":["ECOA","HMDA","EU AI Act Art.10","Fairlearn"],"attestation_required":true}'::jsonb,
     now() - interval '95 days', now() - interval '95 days'),
  
    ('66600003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Data Privacy and AI Training Data Governance Policy', 'approved', 3,
     'This policy governs the collection, use, storage, and deletion of data used for AI model training and evaluation. All training datasets containing personal data must undergo a DPIA before use. Differential privacy (ε ≤ 2.0) must be applied to models processing sensitive customer data. Data minimization principles apply — only data strictly necessary for the training objective may be used. Synthetic data generation is permitted subject to provenance documentation.',
     'Data Privacy', '{"owner":"DPO","approver":"Legal & Compliance Committee","next_review":"2026-10-01","frameworks":["GDPR Art.25","CCPA","ISO 42001 Annex A.8"],"dpia_template_ref":"TMPL-DPIA-002"}'::jsonb,
     now() - interval '80 days', now() - interval '80 days'),
  
    ('66600004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Human-in-the-Loop (HITL) Oversight Policy', 'approved', 2,
     'This policy requires human oversight gates for all AI-assisted decisions with material impact on customers or business operations. High-risk decisions (credit limit changes >$50K, account closures, suspicious transaction flags >$100K) require mandatory human review before execution. Autonomous AI agents must be configured with action-level policy firewalls. HITL bypass incidents must be reported as severity-critical incidents within 2 hours.',
     'AI Governance', '{"owner":"Head of AI Operations","approver":"CRO","next_review":"2026-08-01","frameworks":["EU AI Act Art.14","Singapore Model AI"],"hitl_thresholds":{"credit_change_usd":50000,"transaction_flag_usd":100000}}'::jsonb,
     now() - interval '75 days', now() - interval '75 days'),
  
    ('66600005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Vendor Due Diligence and Third-Party Risk Policy', 'approved', 2,
     'All third-party AI service providers must complete a security and compliance questionnaire before onboarding. Tier 1 vendors (foundation model providers) require SOC 2 Type II and annual on-site assessments. Data Processing Agreements must be executed before any personal data is shared. Vendor contracts must include AI-specific clauses covering model explainability, bias testing, incident notification (within 24 hours), and audit rights.',
     'Third-Party Risk', '{"owner":"Head of Procurement & Vendor Risk","approver":"COO","next_review":"2026-09-01","frameworks":["ISO 27001 A.15","SOC 2","EU AI Act Art.25"],"tier_definitions":{"tier1":"Foundation model providers","tier2":"MLOps platforms","tier3":"Tooling & observability"}}'::jsonb,
     now() - interval '70 days', now() - interval '70 days'),
  
    ('66600006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Security and Adversarial Robustness Policy', 'approved', 1,
     'This policy establishes security requirements for AI systems to protect against adversarial attacks, prompt injection, model extraction, and membership inference attacks. All LLM deployments require prompt sanitization and output filtering. Red team exercises must be conducted quarterly for high-risk AI systems. Security vulnerabilities in AI components must follow the standard vulnerability management SLA (critical: 24h, high: 7 days, medium: 30 days).',
     'Security', '{"owner":"CISO","approver":"CTO","next_review":"2026-11-01","frameworks":["OWASP LLM Top 10","MITRE ATLAS","NIST CSF"],"red_team_frequency":"quarterly"}'::jsonb,
     now() - interval '60 days', now() - interval '60 days'),
  
    ('66600007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Explainability and Transparency Policy', 'approved', 2,
     'Acme Financial Services must provide meaningful explanations for all automated decisions that materially affect customers. Credit decisions must include SHAP-based feature importance explanations in adverse action notices. All high-risk AI models must maintain technical documentation (model cards) accessible to regulators upon request. Customers have the right to request human review of any automated decision within 30 days.',
     'Ethics & Fairness', '{"owner":"Chief AI Risk Officer","approver":"Legal & Compliance Committee","next_review":"2027-01-01","frameworks":["GDPR Art.22","ECOA","EU AI Act Art.13"],"explanation_method":"SHAP","customer_rights_window_days":30}'::jsonb,
     now() - interval '55 days', now() - interval '55 days'),
  
    ('66600008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Incident Response and Breach Notification Policy', 'approved', 1,
     'This policy defines procedures for detecting, classifying, and responding to AI-related incidents including model failures, bias events, security breaches, and unauthorized autonomous actions. Critical incidents require executive notification within 1 hour and regulator notification assessment within 24 hours. Post-incident reviews must be completed within 14 days. All incidents are tracked in the AI governance register and reported in quarterly board reports.',
     'Incident Management', '{"owner":"Head of AI Operations","approver":"CRO","next_review":"2026-12-01","frameworks":["EU AI Act Art.73","GDPR Art.33","NIST AI RMF MS-4.2"],"critical_notification_sla_hours":1,"regulator_assessment_sla_hours":24}'::jsonb,
     now() - interval '50 days', now() - interval '50 days'),
  
    ('66600009-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Responsible AI Procurement and Acceptable Use Policy', 'approved', 1,
     'This policy defines acceptable use cases for AI within Acme Financial Services and prohibits applications that violate ethical principles or regulatory requirements. Prohibited uses include social scoring, real-time biometric surveillance, and subliminal manipulation. All new AI use cases require an AI Impact Assessment and ethics board review for high-risk applications. Employees must complete annual AI ethics training.',
     'Ethics & Fairness', '{"owner":"Chief Ethics Officer","approver":"Board ESG Committee","next_review":"2026-06-01","frameworks":["EU AI Act Art.5","UNESCO AI Ethics","OECD AI Principles"],"prohibited_uses":["social_scoring","biometric_surveillance","subliminal_manipulation"]}'::jsonb,
     now() - interval '45 days', now() - interval '45 days'),
  
    ('66600010-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'ESG and Sustainable AI Operations Policy', 'draft', 1,
     'Acme Financial Services is committed to reducing the environmental impact of its AI operations. This policy requires tracking of GPU compute hours, energy consumption (kWh), and carbon emissions for all model training and inference workloads. Targets: 50% renewable energy for AI compute by 2026, 30% reduction in per-inference carbon by 2027. ESG metrics must be included in annual sustainability disclosures.',
     'Environmental & ESG', '{"owner":"Head of Sustainability","approver":"CEO","next_review":"2026-05-01","frameworks":["GRI Standards","TCFD","EU CSRD"],"targets":{"renewable_pct_2026":50,"carbon_reduction_pct_2027":30}}'::jsonb,
     now() - interval '20 days', now() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 8. ESG REPORTS — create table + seed 4 reports
  -- =============================================================================
  CREATE TABLE IF NOT EXISTS public.esg_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL DEFAULT public.get_org_id(),
    title text NOT NULL,
    period text NOT NULL,
    framework text,
    status text DEFAULT 'draft',
    author text,
    environmental_score numeric,
    social_score numeric,
    governance_score numeric,
    overall_score numeric,
    highlights jsonb DEFAULT '[]'::jsonb,
    ai_metrics jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  ALTER TABLE public.esg_reports ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE INDEX IF NOT EXISTS esg_reports_org_id_idx ON public.esg_reports(org_id);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  DROP POLICY IF EXISTS esg_reports_tenant ON public.esg_reports;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE POLICY esg_reports_tenant ON public.esg_reports FOR ALL TO authenticated
    USING (org_id = public.get_org_id()) WITH CHECK (org_id = public.get_org_id());
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  DROP POLICY IF EXISTS esg_reports_service ON public.esg_reports;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE POLICY esg_reports_service ON public.esg_reports FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO public.esg_reports
    (id, org_id, title, period, framework, status, author, environmental_score, social_score, governance_score, overall_score, highlights, ai_metrics, metadata, published_at, created_at, updated_at)
  VALUES
    ('77700001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'FY2025 Annual ESG Report — AI Operations', '2025', 'GRI Standards + TCFD',
     'published', 'Head of Sustainability',
     72.4, 81.3, 88.9, 80.9,
     '["Achieved 31% renewable energy share for AI compute","Reduced per-inference carbon by 18% vs 2024","Launched AI fairness audit program — 6 audits completed","Board ESG Committee approved Sustainable AI Policy","Carbon footprint tracking deployed across all training clusters"]'::jsonb,
     '{"total_gpu_hours":284000,"total_kwh":142000,"co2_kg":89240,"renewable_pct":31,"training_runs":847,"inference_requests_billions":1.4,"carbon_per_inference_mg":63.7}'::jsonb,
     '{"gri_material_topics":["Climate Change","AI Ethics","Data Privacy"],"tcfd_aligned":true,"assurance_provider":"PwC","report_pages":84}'::jsonb,
     now() - interval '90 days', now() - interval '100 days', now() - interval '90 days'),
  
    ('77700002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Q1 2026 ESG Interim Report — AI & Technology', 'Q1 2026', 'EU CSRD + GRI',
     'published', 'ESG Reporting Team',
     74.1, 82.7, 91.2, 82.7,
     '["GPU utilization efficiency improved to 87% (from 79% in Q4 2025)","3 new vendor ESG questionnaires completed","ISO 42001 gap assessment initiated","AI incident response time improved to 4.2h mean","Data center PUE reduced to 1.21"]'::jsonb,
     '{"total_gpu_hours":74200,"total_kwh":38100,"co2_kg":21300,"renewable_pct":34,"training_runs":218,"inference_requests_billions":0.38,"carbon_per_inference_mg":56.1,"pue":1.21}'::jsonb,
     '{"quarter":"Q1","year":2026,"csrd_aligned":true,"assurance_provider":"Internal","eu_taxonomy_eligible_pct":67}'::jsonb,
     now() - interval '15 days', now() - interval '20 days', now() - interval '15 days'),
  
    ('77700003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'FY2024 Annual ESG Report — AI Operations', '2024', 'GRI Standards + SASB',
     'published', 'Head of Sustainability',
     68.1, 78.4, 84.2, 76.9,
     '["Baseline carbon measurement established for AI compute","First AI bias audit program launched (3 models)","GDPR DPA executed with all Tier 1 AI vendors","Joined Partnership on AI as signatory","Net zero commitment published for 2035"]'::jsonb,
     '{"total_gpu_hours":196000,"total_kwh":112000,"co2_kg":109760,"renewable_pct":24,"training_runs":624,"inference_requests_billions":0.97,"carbon_per_inference_mg":113.2}'::jsonb,
     '{"baseline_year":true,"assurance_provider":"Deloitte","sasb_category":"Software & IT Services","report_pages":71}'::jsonb,
     now() - interval '365 days', now() - interval '380 days', now() - interval '365 days'),
  
    ('77700004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Q2 2026 ESG Interim Report (Draft)', 'Q2 2026', 'EU CSRD + GRI',
     'draft', 'ESG Reporting Team',
     NULL, NULL, NULL, NULL,
     '[]'::jsonb,
     '{"total_gpu_hours":0,"total_kwh":0,"renewable_pct":null,"status":"in_collection"}'::jsonb,
     '{"quarter":"Q2","year":2026,"data_collection_started":"2026-04-01","target_publish":"2026-07-15"}'::jsonb,
     NULL, now() - interval '5 days', now() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 9. ENERGY METRICS — create table + seed 6 readings
  -- =============================================================================
  CREATE TABLE IF NOT EXISTS public.energy_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL DEFAULT public.get_org_id(),
    model_name text,
    period text,
    gpu_hours numeric,
    kwh numeric,
    tokens_generated bigint,
    efficiency_score numeric,
    renewable_percent numeric,
    compute_provider text,
    measurement_source text,
    pue numeric,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    recorded_at date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  ALTER TABLE public.energy_metrics ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE INDEX IF NOT EXISTS energy_metrics_org_id_idx ON public.energy_metrics(org_id);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  DROP POLICY IF EXISTS energy_metrics_tenant ON public.energy_metrics;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE POLICY energy_metrics_tenant ON public.energy_metrics FOR ALL TO authenticated
    USING (org_id = public.get_org_id()) WITH CHECK (org_id = public.get_org_id());
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  DROP POLICY IF EXISTS energy_metrics_service ON public.energy_metrics;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE POLICY energy_metrics_service ON public.energy_metrics FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO public.energy_metrics
    (id, org_id, model_name, period, gpu_hours, kwh, tokens_generated, efficiency_score, renewable_percent, compute_provider, measurement_source, pue, notes, metadata, recorded_at, created_at, updated_at)
  VALUES
    ('88800001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'GPT-4 Turbo (Azure OpenAI)', '2026-03',
     0, 18420, 4200000000, 87.3, 100.0,
     'Microsoft Azure (EU-West)', 'Azure Cost Management API', 1.18,
     'Inference only — no training. 100% renewable via Azure carbon pledge.',
     '{"region":"westeurope","instance_type":"inference","carbon_kg":0,"renewable_certificates":true}'::jsonb,
     '2026-03-31', now() - interval '21 days', now() - interval '21 days'),
  
    ('88800002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Fraud Detection XGBoost v2.8', '2026-03',
     840, 3276, 0, 92.1, 28.0,
     'AWS (us-east-1)', 'CloudWatch + internal telemetry', 1.43,
     'Monthly training run + continuous inference. Low GPU utilization model — high efficiency.',
     '{"region":"us-east-1","training_hours":120,"inference_hours":720,"co2_kg":2359}'::jsonb,
     '2026-03-31', now() - interval '21 days', now() - interval '21 days'),
  
    ('88800003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Credit Scoring Neural Network v3.2', '2026-03',
     2400, 12000, 0, 73.4, 31.0,
     'GCP (europe-west4)', 'GCP Billing + Carbon Footprint API', 1.29,
     'Quarterly retraining completed March 15. Carbon offset purchased for training run.',
     '{"region":"europe-west4","training_hours":480,"inference_hours":1920,"co2_kg":8280,"offset_purchased":true}'::jsonb,
     '2026-03-31', now() - interval '21 days', now() - interval '21 days'),
  
    ('88800004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Claude 3 Opus (Anthropic API)', '2026-03',
     0, 8640, 1820000000, 79.8, 100.0,
     'Anthropic Cloud (US)', 'Anthropic Usage API', 1.22,
     'Inference only via API. Carbon offset included in Anthropic pricing.',
     '{"api_calls":4200000,"avg_tokens_per_call":433,"anthropic_carbon_neutral":true}'::jsonb,
     '2026-03-31', now() - interval '21 days', now() - interval '21 days'),
  
    ('88800005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'NLP Document Classifier v1.5', '2026-04',
     560, 2184, 0, 88.6, 34.0,
     'AWS (us-east-1)', 'Internal telemetry pipeline', 1.43,
     'April partial month (days 1-20). Fine-tuning run included.',
     '{"month_to_date":true,"fine_tuning_hours":80,"inference_hours":480,"co2_kg":1572}'::jsonb,
     '2026-04-20', now() - interval '1 day', now() - interval '1 day'),
  
    ('88800006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'GPT-4 Turbo (Azure OpenAI)', '2026-04',
     0, 7280, 1680000000, 88.1, 100.0,
     'Microsoft Azure (EU-West)', 'Azure Cost Management API', 1.18,
     'April partial month (days 1-20). Inference volume tracking on target.',
     '{"month_to_date":true,"carbon_kg":0,"on_target_for_month":true}'::jsonb,
     '2026-04-20', now() - interval '1 day', now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 10. MODEL EFFICIENCY — create table + seed 4 benchmarks
  -- =============================================================================
  CREATE TABLE IF NOT EXISTS public.model_efficiency (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL DEFAULT public.get_org_id(),
    model_name text NOT NULL,
    version text,
    task text,
    latency_p50 numeric,
    latency_p99 numeric,
    throughput numeric,
    accuracy numeric,
    f1_score numeric,
    cost_per_inference numeric,
    memory_mb numeric,
    carbon_per_inference numeric,
    compliance_score numeric,
    bias_score numeric,
    explainability_score numeric,
    overall_score numeric,
    benchmarked_by text,
    metadata jsonb DEFAULT '{}'::jsonb,
    benchmarked_at date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  ALTER TABLE public.model_efficiency ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE INDEX IF NOT EXISTS model_efficiency_org_id_idx ON public.model_efficiency(org_id);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  DROP POLICY IF EXISTS model_efficiency_tenant ON public.model_efficiency;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE POLICY model_efficiency_tenant ON public.model_efficiency FOR ALL TO authenticated
    USING (org_id = public.get_org_id()) WITH CHECK (org_id = public.get_org_id());
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  DROP POLICY IF EXISTS model_efficiency_service ON public.model_efficiency;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  CREATE POLICY model_efficiency_service ON public.model_efficiency FOR ALL TO service_role USING (true);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO public.model_efficiency
    (id, org_id, model_name, version, task, latency_p50, latency_p99, throughput, accuracy, f1_score, cost_per_inference, memory_mb, carbon_per_inference, compliance_score, bias_score, explainability_score, overall_score, benchmarked_by, metadata, benchmarked_at, created_at, updated_at)
  VALUES
    ('99900001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'GPT-4 Turbo (Azure OpenAI)', 'gpt-4-turbo-2024-04-09',
     'Customer Advisory Chat', 842, 2840, 120, 0.91, 0.89,
     0.0380, 0, 0.0021, 88.4, 84.2, 62.1, 83.7,
     'AI Performance Engineering Team',
     '{"deployment":"azure-openai-westeurope","context_length":128000,"test_dataset":"customer_queries_q1_2026","sample_size":10000,"test_date":"2026-04-01"}'::jsonb,
     '2026-04-01', now() - interval '20 days', now() - interval '20 days'),
  
    ('99900002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Credit Scoring Neural Network', 'v3.2.1',
     'Credit Risk Classification', 12, 48, 8400, 0.87, 0.85,
     0.000018, 4200, 0.0000047, 71.0, 71.0, 89.3, 77.4,
     'Model Risk Management Team',
     '{"model_type":"gradient_boosted_nn","features":147,"training_size":2400000,"test_date":"2026-03-15","champion_challenger":true,"production_model":true}'::jsonb,
     '2026-03-15', now() - interval '36 days', now() - interval '36 days'),
  
    ('99900003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Fraud Detection XGBoost', 'v2.8.3',
     'Real-Time Transaction Fraud Detection', 4, 18, 45000, 0.97, 0.94,
     0.0000008, 1800, 0.0000003, 89.0, 89.0, 76.8, 88.2,
     'AI Performance Engineering Team',
     '{"model_type":"xgboost","features":89,"training_size":18000000,"real_time_required":true,"sla_ms":20,"test_date":"2026-04-10","passing_sla":true}'::jsonb,
     '2026-04-10', now() - interval '11 days', now() - interval '11 days'),
  
    ('99900004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'KYC Document Classifier', 'v4.1.0',
     'Identity Document Verification', 380, 1240, 280, 0.94, 0.92,
     0.00240, 6400, 0.000640, 77.0, 77.0, 54.3, 73.8,
     'AI Performance Engineering Team',
     '{"model_type":"vision_transformer","image_types":["passport","drivers_license","national_id"],"jurisdictions":47,"adversarial_robustness_score":0.42,"test_date":"2026-04-05","bias_remediation_required":true}'::jsonb,
     '2026-04-05', now() - interval '16 days', now() - interval '16 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 11. MATURITY ASSESSMENTS — 5 assessments
  -- =============================================================================
  INSERT INTO public.maturity_assessments
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('aaaa0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Governance Maturity Assessment — ISO 42001 (2026 Q1)',
     'Comprehensive maturity assessment of AI governance capabilities against ISO/IEC 42001:2023. Covers AI policy framework, risk management, oversight mechanisms, and documentation practices.',
     'completed', 'iso42001', 'medium',
     'Chief AI Risk Officer',
     '{"framework":"ISO 42001","overall_maturity_level":3,"max_level":5,"domain_scores":{"ai_policy":4,"risk_management":3,"data_governance":3,"human_oversight":3,"documentation":4,"third_party":2},"assessment_date":"2026-03-28","assessor":"KPMG Advisory","next_assessment":"2026-09-28","key_gaps":["Third-party AI vendor management","Automated bias monitoring"]}'::jsonb,
     now() - interval '23 days', now() - interval '23 days'),
  
    ('aaaa0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'NIST AI RMF Maturity Assessment — 2026',
     'Assessment of AI risk management practices against the NIST AI Risk Management Framework 1.0, covering Govern, Map, Measure, and Manage functions.',
     'completed', 'nist_ai_rmf', 'medium',
     'Chief Risk Officer',
     '{"framework":"NIST AI RMF","overall_score":68,"max_score":100,"function_scores":{"govern":72,"map":65,"measure":70,"manage":65},"assessment_date":"2026-02-15","improvement_areas":["AI risk quantification","Automated monitoring","Incident playbooks"]}'::jsonb,
     now() - interval '65 days', now() - interval '65 days'),
  
    ('aaaa0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EU AI Act Readiness Assessment — High-Risk Systems',
     'Gap analysis of high-risk AI systems against EU AI Act requirements (Title III, Article 9-15). Covers risk management systems, data governance, transparency, and human oversight obligations.',
     'completed', 'eu_ai_act', 'high',
     'Head of Legal & Compliance',
     '{"framework":"EU AI Act","systems_assessed":4,"high_risk_systems":["credit-scoring-v3","mortgage-approval","kyc-classifier","fraud-detection"],"overall_readiness_pct":74,"critical_gaps":["Conformity assessments not completed","Registration in EU AI database pending"],"compliance_deadline":"2026-08-02","remediation_budget_eur":380000}'::jsonb,
     now() - interval '40 days', now() - interval '40 days'),
  
    ('aaaa0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Security Maturity Assessment — MITRE ATLAS',
     'Red team-informed assessment of AI security posture against MITRE ATLAS adversarial AI threat landscape. Covers prompt injection defenses, model extraction resistance, and supply chain security.',
     'in_progress', 'security', 'high',
     'CISO',
     '{"framework":"MITRE ATLAS","tactics_assessed":12,"tactics_total":14,"coverage_pct":86,"high_risk_tactics":["prompt_injection","model_inversion","supply_chain_compromise"],"assessment_start":"2026-04-10","expected_completion":"2026-04-30"}'::jsonb,
     now() - interval '11 days', now() - interval '1 day'),
  
    ('aaaa0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Data Privacy Maturity Assessment — GDPR AI Systems',
     'Assessment of GDPR compliance for AI systems processing personal data, including DPIA completeness, data subject rights procedures, and cross-border transfer mechanisms.',
     'completed', 'gdpr', 'high',
     'Data Protection Officer',
     '{"framework":"GDPR","articles_assessed":["Art.5","Art.9","Art.13","Art.14","Art.17","Art.22","Art.35"],"overall_compliance_pct":81,"dpia_completed":4,"dpia_pending":2,"data_subject_rights_sla_met_pct":94,"scc_executed":true,"bcr_under_review":false,"assessment_date":"2026-03-10"}'::jsonb,
     now() - interval '42 days', now() - interval '42 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 12. SECURITY THREATS — 8 threats
  -- =============================================================================
  INSERT INTO public.security_threats
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('bbbb0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Prompt Injection via Indirect Context Poisoning',
     'Adversary injects malicious instructions into documents retrieved by RAG pipeline, causing the LLM to follow attacker-controlled instructions when processing retrieved context.',
     'active', 'prompt_injection', 'critical',
     'Security Engineering',
     '{"mitre_atlas_tactic":"AML.T0051","owasp_ref":"LLM01","affected_systems":["customer-advisory-rag","internal-copilot"],"exploit_complexity":"medium","detection_coverage":"partial","mitigations":["context_isolation","instruction_segregation","output_monitoring"]}'::jsonb,
     now() - interval '30 days', now() - interval '5 days'),
  
    ('bbbb0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Model Extraction Attack via API Probing',
     'Adversary systematically queries the credit scoring API to reconstruct model logic, enabling adversarial example generation and potential regulatory evasion.',
     'active', 'model_extraction', 'high',
     'Security Engineering',
     '{"mitre_atlas_tactic":"AML.T0005","affected_models":["credit-scoring-api"],"queries_to_extract":50000,"detection_method":"query_pattern_analysis","rate_limiting_applied":true,"api_obfuscation":"partial"}'::jsonb,
     now() - interval '45 days', now() - interval '10 days'),
  
    ('bbbb0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Training Data Poisoning via Synthetic Data Injection',
     'Supply chain threat: malicious actor attempts to inject mislabeled training examples into the fraud detection model data pipeline through a compromised data vendor.',
     'investigating', 'data_poisoning', 'critical',
     'Data Security Team',
     '{"mitre_atlas_tactic":"AML.T0020","affected_pipeline":"fraud-detection-training","vendor_under_review":"DataProviderCo","poisoned_samples_detected":847,"dataset_integrity_check":"in_progress"}'::jsonb,
     now() - interval '8 days', now() - interval '1 day'),
  
    ('bbbb0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Membership Inference Attack on Customer NLP Model',
     'Attacker uses shadow model technique to determine whether specific individuals'' data was used in NLP model training, constituting a GDPR data breach risk.',
     'active', 'privacy_attack', 'high',
     'Privacy Engineering',
     '{"mitre_atlas_tactic":"AML.T0024","gdpr_risk":"Art.4(12) breach risk","affected_model":"nlp-document-classifier","shadow_model_accuracy":0.71,"differential_privacy_applied":false,"dp_remediation_scheduled":"2026-05-15"}'::jsonb,
     now() - interval '20 days', now() - interval '3 days'),
  
    ('bbbb0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Adversarial Examples Bypass KYC Image Classifier',
     'Perturbation-based adversarial examples can cause the KYC document classifier to misclassify fraudulent documents as authentic with high success rate.',
     'active', 'adversarial_example', 'critical',
     'AI Security Team',
     '{"mitre_atlas_tactic":"AML.T0043","attack_type":"FGSM","success_rate":0.78,"l_infinity_perturbation":0.03,"affected_model":"kyc-image-classifier-v4-1","adversarial_training":"not_applied","temp_mitigation":"human_review_flagged_docs"}'::jsonb,
     now() - interval '5 days', now() - interval '1 day'),
  
    ('bbbb0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'LLM System Prompt Exfiltration via Jailbreak',
     'Techniques combining role-play and encoding tricks have been used to extract the system prompt from the customer advisory chatbot, revealing internal compliance instructions.',
     'mitigated', 'jailbreak', 'high',
     'Security Engineering',
     '{"owasp_ref":"LLM07","technique":"encoding_roleplay_combo","prompt_exfiltrated":true,"remediation":"system_prompt_hardening_v2","new_detection_rules":7,"pen_test_validated":"2026-03-28"}'::jsonb,
     now() - interval '28 days', now() - interval '7 days'),
  
    ('bbbb0007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Supply Chain Compromise: ML Framework CVE',
     'Critical CVE (CVSS 9.1) discovered in PyTorch version used in 4 production model containers, enabling remote code execution via malicious model file loading.',
     'resolved', 'supply_chain', 'critical',
     'Platform Security',
     '{"cve_id":"CVE-2026-XXXX","cvss_score":9.1,"affected_framework":"PyTorch 2.1.x","affected_containers":4,"patch_version":"2.2.4","patched_date":"2026-04-12","downtime_minutes":0,"sbom_updated":true}'::jsonb,
     now() - interval '10 days', now() - interval '9 days'),
  
    ('bbbb0008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Agent Autonomy Escalation via Prompt Chain Manipulation',
     'Chained prompting technique allows attacker to gradually escalate the operational permissions of an agentic AI system beyond its configured policy boundaries.',
     'active', 'agent_manipulation', 'high',
     'AI Security Team',
     '{"affected_agents":["treasury-optimizer","customer-ops-agent"],"escalation_method":"multi_turn_prompt_chain","max_achieved_privilege":"financial_transaction","hitl_bypass_attempted":true,"policy_firewall_gaps":3}'::jsonb,
     now() - interval '3 days', now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 13. SECURITY SCANS — 6 scans
  -- =============================================================================
  INSERT INTO public.security_scans
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('cccc0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Weekly SBOM Vulnerability Scan — AI Model Registry (Week 16)',
     'Automated SBOM-based CVE scan of all AI model container images and ML framework dependencies in the model registry.',
     'completed', 'sbom_scan', 'medium',
     'Platform Security (Automated)',
     '{"scan_date":"2026-04-21","scan_tool":"Snyk","components_scanned":247,"critical_cves":0,"high_cves":1,"medium_cves":4,"low_cves":12,"images_scanned":18,"scan_duration_minutes":23}'::jsonb,
     now() - interval '0 days', now()),
  
    ('cccc0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Quarterly Red Team Exercise — AI Gateway Penetration Test Q1 2026',
     'Adversarial penetration testing of the AI gateway and LLM integration layer by external red team, covering OWASP LLM Top 10 and MITRE ATLAS attack vectors.',
     'completed', 'red_team', 'critical',
     'Crowdstrike Red Team',
     '{"test_period":"2026-02-20_to_2026-02-28","critical_findings":1,"high_findings":3,"medium_findings":7,"exploited_vectors":["prompt_injection","jailbreak_exfiltration"],"remediated_pct":78,"report_ref":"RT-2026-Q1-001"}'::jsonb,
     now() - interval '52 days', now() - interval '45 days'),
  
    ('cccc0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Static Code Analysis — ML Pipeline Codebase (April 2026)',
     'SAST scan of internal ML training and inference pipeline code using Semgrep and Bandit for security anti-patterns in Python ML code.',
     'completed', 'sast', 'low',
     'DevSecOps Team (Automated)',
     '{"scan_date":"2026-04-18","tool":"Semgrep+Bandit","files_scanned":2847,"critical_issues":0,"high_issues":2,"medium_issues":14,"ml_specific_rules":47,"pickle_deserialization_warnings":3}'::jsonb,
     now() - interval '3 days', now() - interval '3 days'),
  
    ('cccc0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'API Security Scan — Credit Scoring Inference Endpoint',
     'API security assessment of the credit scoring model inference endpoint covering authentication, authorization, input validation, and rate limiting.',
     'completed', 'api_scan', 'medium',
     'Security Engineering',
     '{"scan_date":"2026-04-08","tool":"OWASP ZAP + Burp Suite Pro","endpoint":"api.acme-fs.com/v3/credit-score","auth_mechanism":"mTLS+JWT","findings":{"broken_auth":false,"injection":true,"rate_limiting":true,"sensitive_data_exposure":false}}'::jsonb,
     now() - interval '13 days', now() - interval '13 days'),
  
    ('cccc0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Container Image Scan — Model Serving Fleet (April 2026)',
     'CIS benchmark and CVE scan of all Docker container images used in the model serving infrastructure.',
     'completed', 'container_scan', 'medium',
     'Platform Security (Automated)',
     '{"scan_date":"2026-04-15","tool":"Trivy","images_scanned":24,"base_images_compliant":21,"critical_cves":0,"high_cves":3,"cis_benchmark_passed":20,"remediation_required":4}'::jsonb,
     now() - interval '6 days', now() - interval '6 days'),
  
    ('cccc0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'LLM Prompt Injection Fuzzing — Customer Advisory Bot',
     'Automated adversarial prompt fuzzing of the customer advisory chatbot using 5,000+ injection payloads from curated adversarial dataset.',
     'in_progress', 'fuzz_test', 'high',
     'AI Security Team',
     '{"start_date":"2026-04-20","tool":"Garak+Custom","payloads_tested":3200,"payloads_total":5000,"injection_success_rate":0.023,"jailbreak_attempts":1400,"jailbreak_success_rate":0.008,"completion_eta":"2026-04-23"}'::jsonb,
     now() - interval '1 day', now() - interval '1 day')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 14. SECURITY VULNERABILITIES — 8 vulnerabilities
  -- =============================================================================
  INSERT INTO public.security_vulnerabilities
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('dddd0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-001: Prompt Injection in RAG Context Pipeline',
     'Indirect prompt injection vulnerability in the RAG pipeline allows malicious document content to override system instructions in customer advisory LLM responses.',
     'in_remediation', 'prompt_injection', 'critical',
     'Security Engineering',
     '{"cve_equivalent":"N/A (application-layer)","cvss_score":9.0,"affected_component":"rag-context-injector-v2.3","discovery_method":"red_team_exercise","owasp_ref":"LLM01","remediation_pr":"PR-4821","target_fix":"2026-04-30"}'::jsonb,
     now() - interval '52 days', now() - interval '5 days'),
  
    ('dddd0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'CVE-2026-XXXX: RCE in PyTorch 2.1.x via Malicious Model File',
     'Critical RCE vulnerability in PyTorch model loading allows arbitrary code execution when loading untrusted .pt model files. CVSS 9.1.',
     'resolved', 'dependency_cve', 'critical',
     'Platform Security',
     '{"cve_id":"CVE-2026-XXXX","cvss_score":9.1,"affected_version":"pytorch<=2.1.2","fixed_version":"pytorch==2.2.4","patched_date":"2026-04-12","affected_systems":4,"exploitability":"proof_of_concept"}'::jsonb,
     now() - interval '10 days', now() - interval '9 days'),
  
    ('dddd0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-002: Missing Rate Limiting on Credit Score API',
     'Credit scoring inference API endpoint lacks sufficient rate limiting, enabling model extraction attacks via systematic querying.',
     'in_remediation', 'api_vulnerability', 'high',
     'Backend Engineering',
     '{"discovery_method":"api_security_scan","cvss_score":7.5,"endpoint":"/v3/credit-score","current_rate_limit":"none","proposed_fix":"100 req/min per API key + anomaly detection","target_fix":"2026-05-07"}'::jsonb,
     now() - interval '13 days', now() - interval '13 days'),
  
    ('dddd0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-003: System Prompt Exfiltration via Encoding Attack',
     'Customer advisory chatbot system prompt can be exfiltrated using base64+ROT13 encoding technique to bypass content filters.',
     'resolved', 'jailbreak_vulnerability', 'high',
     'Security Engineering',
     '{"discovery_method":"red_team_exercise","cvss_score":7.2,"affected_component":"customer-advisory-chatbot-v2.4","fix_applied":"system_prompt_compartmentalization+encoding_detection","validated_by":"pen_test_2026-03-28"}'::jsonb,
     now() - interval '28 days', now() - interval '7 days'),
  
    ('dddd0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-004: Pickle Deserialization in ML Data Pipeline',
     'Python pickle deserialization used in training data preprocessing pipeline without integrity checks, enabling arbitrary code execution via malicious data files.',
     'open', 'deserialization', 'high',
     'Data Engineering',
     '{"discovery_method":"sast_scan","cvss_score":8.1,"tool_finding":"Bandit B301","affected_files":3,"fix_recommendation":"Replace pickle with JSON/MessagePack + file signature verification","target_fix":"2026-05-15"}'::jsonb,
     now() - interval '3 days', now() - interval '3 days'),
  
    ('dddd0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-005: Adversarial Robustness Gap in KYC Classifier',
     'KYC document image classifier lacks adversarial training, allowing ε=0.03 L∞ perturbations to cause 78% misclassification rate.',
     'open', 'adversarial_robustness', 'critical',
     'AI Security Team',
     '{"discovery_method":"security_research_disclosure","attack_type":"FGSM","success_rate":0.78,"affected_model":"kyc-image-classifier-v4-1","remediation":"adversarial_training+randomized_smoothing","estimated_effort_weeks":8}'::jsonb,
     now() - interval '5 days', now() - interval '1 day'),
  
    ('dddd0007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-006: Missing Differential Privacy in NLP Training',
     'NLP document classifier trained on customer data without differential privacy, enabling membership inference attacks to determine training data inclusion.',
     'in_remediation', 'privacy_vulnerability', 'high',
     'Privacy Engineering',
     '{"gdpr_risk":"Art.4(12) personal data breach","affected_model":"nlp-document-classifier-v1.5","mi_attack_accuracy":0.71,"dp_epsilon_required":1.0,"implementation_timeline":"2026-05-15","interim_control":"access_rate_limiting"}'::jsonb,
     now() - interval '20 days', now() - interval '3 days'),
  
    ('dddd0008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'VULN-2026-007: Excessive Agency in Treasury AI Agent',
     'Treasury AI agent policy firewall misconfiguration allows agent to initiate financial transactions above the $50K HITL threshold without human approval.',
     'resolved', 'misconfiguration', 'critical',
     'AI Operations',
     '{"discovery_method":"incident_AIX-0012","hitl_threshold_configured":50000,"max_transaction_attempted":2300000,"fix_applied":"policy_firewall_hardening_v3.1","config_review_completed":"2026-04-07","retrospective_ref":"PIR-2026-006"}'::jsonb,
     now() - interval '18 days', now() - interval '14 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 15. RED TEAM CAMPAIGNS — 4 campaigns
  -- =============================================================================
  INSERT INTO public.red_team_campaigns
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('eeee0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Q1 2026 LLM Red Team Exercise — Customer Advisory AI',
     'Full adversarial red team exercise targeting the customer advisory chatbot, covering prompt injection, jailbreaking, data exfiltration, and indirect context poisoning vectors.',
     'completed', 'full_red_team', 'critical',
     'Crowdstrike Adversary Services',
     '{"campaign_period":"2026-02-20_to_2026-02-28","team_size":4,"attack_vectors":["prompt_injection","jailbreak","data_exfiltration","indirect_context_poisoning","llm_dos"],"critical_findings":1,"high_findings":3,"medium_findings":7,"exploited_systems":2,"report_ref":"RT-2026-Q1-001","remediation_completed_pct":78}'::jsonb,
     now() - interval '60 days', now() - interval '45 days'),
  
    ('eeee0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'KYC Adversarial Robustness Campaign — Image Attack Simulation',
     'Focused adversarial attack campaign against the KYC document image classifier using state-of-the-art perturbation methods (FGSM, PGD, AutoAttack).',
     'completed', 'adversarial_ml', 'critical',
     'AI Security Team',
     '{"attack_methods":["FGSM","PGD","AutoAttack","CW"],"document_types_tested":8,"success_rates":{"FGSM":0.78,"PGD":0.82,"AutoAttack":0.79},"robustness_score":0.22,"recommendation":"adversarial_training_required","estimated_fix_weeks":8}'::jsonb,
     now() - interval '5 days', now() - interval '1 day'),
  
    ('eeee0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Agent Autonomy Escalation Campaign — Treasury System',
     'Simulated insider threat and external adversary attempts to escalate AI agent privileges beyond configured policy boundaries in the treasury management system.',
     'completed', 'agent_security', 'high',
     'Internal Red Team',
     '{"campaign_period":"2026-03-15_to_2026-03-22","attack_vectors":["prompt_chain_escalation","policy_firewall_bypass","context_manipulation"],"escalation_attempts":47,"successful_escalations":3,"max_privilege_achieved":"financial_transaction","hitl_bypass_achieved":true,"findings_ref":"RT-AGENT-2026-001"}'::jsonb,
     now() - interval '30 days', now() - interval '25 days'),
  
    ('eeee0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Q2 2026 Quarterly Red Team Planning — Fraud Detection Models',
     'Upcoming red team exercise targeting fraud detection model infrastructure, planned adversarial ML attacks, and model extraction via API probing.',
     'planned', 'adversarial_ml', 'high',
     'Security Engineering',
     '{"planned_start":"2026-05-12","planned_end":"2026-05-23","scope":["fraud-detection-api","model-registry","training-pipeline"],"attack_scenarios":["model_extraction","data_poisoning","adversarial_examples"],"team":"crowdstrike+internal","budget_usd":45000}'::jsonb,
     now() - interval '2 days', now() - interval '2 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 16. CONSENT RECORDS — 8 records
  -- =============================================================================
  INSERT INTO public.consent_records
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('ffff0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Customer Advisory AI — Data Processing Consent v2.1',
     'Explicit consent record for processing customer financial profile data to generate personalized AI-powered investment advisory recommendations.',
     'active', 'explicit_consent', 'medium',
     'DPO Office',
     '{"consent_version":"2.1","gdpr_basis":"Art.6(1)(a)","data_subject_count":47823,"purpose":"ai_investment_advisory","data_categories":["financial_profile","transaction_history","risk_appetite"],"withdrawal_mechanism":"app_settings","last_updated":"2026-03-01","expiry":"2027-03-01"}'::jsonb,
     now() - interval '50 days', now() - interval '50 days'),
  
    ('ffff0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Marketing AI Profiling — Opt-in Consent',
     'Consent for using AI behavioral profiling for targeted financial product marketing via email and in-app channels.',
     'active', 'opt_in', 'low',
     'Marketing Compliance',
     '{"consent_basis":"opt_in","gdpr_basis":"Art.6(1)(a)","data_subject_count":31240,"purpose":"ai_marketing_personalization","channels":["email","in_app"],"double_opt_in":true,"withdrawal_rate_monthly":0.018}'::jsonb,
     now() - interval '120 days', now() - interval '30 days'),
  
    ('ffff0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Credit Scoring Automated Decision — Art.22 Explicit Consent',
     'GDPR Art.22 explicit consent for fully automated credit scoring decisions with no human review, with right to human review disclosed.',
     'active', 'automated_decision', 'high',
     'DPO Office',
     '{"gdpr_basis":"Art.6(1)(a)+Art.22(2)(c)","data_subject_count":28900,"decision_type":"automated_credit_scoring","human_review_right_disclosed":true,"safeguards":["adverse_action_notice","human_review_on_request","shap_explanations"],"consent_date_range":"2024-01-01_to_2026-12-31"}'::jsonb,
     now() - interval '90 days', now() - interval '90 days'),
  
    ('ffff0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Biometric Data Processing — KYC Voice Verification',
     'Explicit consent for processing voiceprint biometric data for customer identity verification during telephone banking interactions.',
     'active', 'biometric_consent', 'high',
     'DPO Office',
     '{"gdpr_basis":"Art.9(2)(a) explicit consent","data_subject_count":12400,"biometric_type":"voiceprint","processing_purpose":"identity_verification","retention_period":"24_months","deletion_on_withdrawal":"immediate","special_category":true}'::jsonb,
     now() - interval '180 days', now() - interval '60 days'),
  
    ('ffff0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Research and Model Improvement — Anonymized Data Use',
     'Legitimate interest basis consent for using anonymized transaction data to improve fraud detection models, with opt-out right.',
     'active', 'legitimate_interest', 'medium',
     'Data Governance Team',
     '{"gdpr_basis":"Art.6(1)(f) legitimate interest","lia_completed":true,"data_subject_count":180000,"purpose":"fraud_model_improvement","anonymization_method":"k_anonymity_k10","opt_out_provided":true,"opt_out_count":2840}'::jsonb,
     now() - interval '200 days', now() - interval '90 days'),
  
    ('ffff0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Cross-Border AI Processing — US Data Transfer Consent',
     'Consent for transferring customer data to US-based AI processing (OpenAI Azure) under SCC mechanism with customer disclosure.',
     'active', 'cross_border_transfer', 'high',
     'DPO Office',
     '{"gdpr_basis":"Art.46(2)(c) SCCs","transfer_mechanism":"SCC_2021","destination_country":"US","recipient":"Microsoft Azure OpenAI (EU-West)","data_categories":["financial_queries","anonymized_context"],"scc_executed_date":"2024-06-01","data_subject_count":47823}'::jsonb,
     now() - interval '300 days', now() - interval '300 days'),
  
    ('ffff0007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'AI Training Data — Withdrawn Consent Batch (March 2026)',
     'Batch of 847 consent withdrawals processed in March 2026, requiring removal of associated data from training datasets and model retraining queue.',
     'expired', 'consent_withdrawal', 'medium',
     'DPO Office',
     '{"withdrawal_batch_date":"2026-03-31","withdrawals_processed":847,"data_deletion_completed":true,"deletion_date":"2026-04-07","model_retraining_triggered":true,"affected_models":["nlp-classifier","recommendation-engine"],"gdpr_erasure_art17":true}'::jsonb,
     now() - interval '21 days', now() - interval '14 days'),
  
    ('ffff0008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Employee AI Monitoring Consent — Productivity Analytics',
     'Consent for using AI behavioral analytics on employee work patterns for productivity optimization and anomaly detection.',
     'active', 'employee_consent', 'medium',
     'HR Compliance',
     '{"gdpr_basis":"Art.6(1)(c) legal obligation + Art.6(1)(f) legitimate interest","data_subject_count":2840,"monitoring_scope":["application_usage","communication_metadata"],"works_council_approved":true,"notice_period_days":30,"opt_out_available":false,"legal_requirement":"EU_whistleblowing_directive"}'::jsonb,
     now() - interval '150 days', now() - interval '60 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 17. DSAR REQUESTS — 6 records
  -- =============================================================================
  INSERT INTO public.dsar_requests
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('gggg0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DSAR-2026-0142: Right of Access + AI Decision Explanation',
     'Customer requests full copy of personal data processed by Acme AI systems, plus meaningful explanation of automated credit scoring decision that resulted in application rejection.',
     'completed', 'access_request', 'medium',
     'DPO Office',
     '{"request_date":"2026-03-15","completion_date":"2026-04-04","sla_days":30,"completed_days":20,"gdpr_articles":["Art.15","Art.22"],"data_categories_provided":["credit_profile","transaction_summary","ai_decision_rationale"],"ai_explanation_included":true,"shap_summary_provided":true}'::jsonb,
     now() - interval '37 days', now() - interval '17 days'),
  
    ('gggg0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DSAR-2026-0156: Right to Erasure — AI Training Data',
     'Customer invokes Art.17 right to erasure, specifically requesting deletion from AI model training datasets and any derived model parameters.',
     'in_progress', 'erasure_request', 'high',
     'DPO Office',
     '{"request_date":"2026-04-02","sla_deadline":"2026-05-02","gdpr_article":"Art.17","complexity":"high_technical","training_data_identified":true,"model_retraining_required":true,"affected_models":["nlp-classifier-v1.5"],"technical_team_engaged":"2026-04-05","estimated_completion":"2026-04-28"}'::jsonb,
     now() - interval '19 days', now() - interval '5 days'),
  
    ('gggg0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DSAR-2026-0171: Portability Request — Financial AI Profile',
     'Customer requests portable copy of AI-processed financial profile in machine-readable format for transfer to another financial institution.',
     'completed', 'portability_request', 'low',
     'DPO Office',
     '{"request_date":"2026-04-08","completion_date":"2026-04-18","sla_days":30,"completed_days":10,"gdpr_article":"Art.20","format_provided":"JSON","data_size_mb":2.4,"api_export":true}'::jsonb,
     now() - interval '13 days', now() - interval '3 days'),
  
    ('gggg0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DSAR-2026-0183: Objection to AI Profiling for Marketing',
     'Customer objects to automated profiling of behavioral data for AI-powered marketing, invoking Art.21 right to object.',
     'completed', 'objection', 'low',
     'Marketing Compliance',
     '{"request_date":"2026-04-10","completion_date":"2026-04-13","gdpr_article":"Art.21","outcome":"profiling_stopped","marketing_suppression_applied":true,"systems_updated":["crm","recommendation-engine","email-marketing-ai"]}'::jsonb,
     now() - interval '11 days', now() - interval '8 days'),
  
    ('gggg0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DSAR-2026-0197: Regulatory Authority Investigation — Bias Complaint',
     'ICO investigation request following customer complaint about potential discriminatory automated mortgage decision. Full data disclosure to supervisory authority required.',
     'in_progress', 'regulatory_request', 'critical',
     'Legal & Compliance',
     '{"request_date":"2026-04-14","requestor":"ICO (UK Information Commissioner)","gdpr_article":"Art.58","response_deadline":"2026-05-14","legal_hold":true,"dpa_liaison":"Head of Legal","data_scope":["mortgage_decision_record","model_output","training_data_sample"],"legal_review_ongoing":true}'::jsonb,
     now() - interval '7 days', now() - interval '1 day'),
  
    ('gggg0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'DSAR-2026-0204: Right to Rectification — AI Incorrect Data',
     'Customer requests correction of inaccurate financial information used as input to credit scoring model, with recalculation of affected AI decision.',
     'open', 'rectification_request', 'medium',
     'DPO Office',
     '{"request_date":"2026-04-19","sla_deadline":"2026-05-19","gdpr_article":"Art.16","data_error":"incorrect_employment_income","affected_model":"credit-scoring-v3.2.1","model_recalculation_required":true,"estimated_outcome":"approval_likely"}'::jsonb,
     now() - interval '2 days', now() - interval '2 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 18. TASKS — 10 tasks
  -- =============================================================================
  INSERT INTO public.tasks
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('hhhh0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Complete EU AI Act Conformity Assessment — Credit Scoring Model',
     'Conduct full conformity assessment for credit scoring model v3.2 per EU AI Act Annex VI requirements, including technical documentation, risk management system review, and post-market monitoring plan.',
     'in_progress', 'compliance', 'critical',
     'Head of Legal & Compliance',
     '{"due_date":"2026-06-15","priority":"P1","framework":"EU AI Act","estimated_effort_days":21,"assigned_team":"Legal+MRM","progress_pct":35,"blockers":"Bias remediation must complete first"}'::jsonb,
     now() - interval '20 days', now() - interval '2 days'),
  
    ('hhhh0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Implement Equalized Odds Post-Processing for Credit Scoring',
     'Deploy fairness post-processing layer using Fairlearn equalized odds transformer to address disparate impact identified in Q1 2026 bias audit.',
     'in_progress', 'remediation', 'critical',
     'ML Engineering Team',
     '{"due_date":"2026-05-15","priority":"P1","linked_bias_audit":"44400001-0000-0000-0000-000000000001","linked_risk":"11100002-0000-0000-0000-000000000001","estimated_effort_days":14,"current_disparity_ratio":0.76,"target_disparity_ratio":0.95}'::jsonb,
     now() - interval '15 days', now() - interval '1 day'),
  
    ('hhhh0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Deploy Differential Privacy for NLP Model Training Pipeline',
     'Implement ε=1.0 differential privacy in NLP document classifier training pipeline to mitigate membership inference attack vulnerability.',
     'pending', 'security_remediation', 'high',
     'Privacy Engineering',
     '{"due_date":"2026-05-15","priority":"P2","linked_vulnerability":"dddd0007-0000-0000-0000-000000000001","dp_library":"opacus","epsilon_target":1.0,"accuracy_degradation_acceptable":0.03,"testing_required":true}'::jsonb,
     now() - interval '5 days', now() - interval '5 days'),
  
    ('hhhh0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Remediate Critical Prompt Injection in RAG Pipeline',
     'Implement instruction segregation and context isolation in the RAG retrieval pipeline to prevent indirect prompt injection attacks.',
     'in_progress', 'security_remediation', 'critical',
     'Security Engineering',
     '{"due_date":"2026-04-30","priority":"P0","linked_vulnerability":"dddd0001-0000-0000-0000-000000000001","remediation_pr":"PR-4821","implementation":["context_boundary_tokens","instruction_sanitizer","output_monitor"],"code_review_completed":true}'::jsonb,
     now() - interval '12 days', now() - interval '1 day'),
  
    ('hhhh0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Complete GDPR DPIA for Mortgage AI Recommendation System',
     'Conduct and document Data Protection Impact Assessment for new mortgage recommendation AI system before production launch.',
     'pending', 'compliance', 'high',
     'DPO Office',
     '{"due_date":"2026-05-31","priority":"P2","gdpr_article":"Art.35","template":"TMPL-DPIA-002","estimated_effort_days":7,"dpo_sign_off_required":true,"launch_blocked_until_complete":true}'::jsonb,
     now() - interval '8 days', now() - interval '8 days'),
  
    ('hhhh0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Vendor Re-Assessment: Snyk AI Security Contract Renewal',
     'Complete annual security and compliance re-assessment for Snyk AI Security ahead of contract renewal in June 2026.',
     'pending', 'vendor_management', 'medium',
     'Vendor Risk Management',
     '{"due_date":"2026-05-30","priority":"P3","linked_vendor":"33300007-0000-0000-0000-000000000001","contract_expiry":"2026-06-30","questionnaire_template":"CAIQ_v4","soc2_review_required":true}'::jsonb,
     now() - interval '3 days', now() - interval '3 days'),
  
    ('hhhh0007-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Implement Adversarial Training for KYC Image Classifier',
     'Apply PGD adversarial training to KYC document classifier to achieve minimum 90% robustness against L∞ perturbations.',
     'pending', 'model_improvement', 'critical',
     'AI Security Team',
     '{"due_date":"2026-06-30","priority":"P1","linked_vulnerability":"dddd0006-0000-0000-0000-000000000001","attack_method":"PGD","epsilon_target":0.03,"robustness_target":0.90,"estimated_effort_weeks":8,"training_data_augmentation_required":true}'::jsonb,
     now() - interval '5 days', now() - interval '5 days'),
  
    ('hhhh0008-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'Publish Q2 2026 ESG Report — AI Operations Data Collection',
     'Collect and validate all AI energy consumption, carbon footprint, and efficiency metrics for Q2 2026 ESG interim report.',
     'in_progress', 'reporting', 'low',
     'ESG Reporting Team',
     '{"due_date":"2026-07-15","priority":"P3","linked_esg_report":"77700004-0000-0000-0000-000000000001","data_sources":["aws_cloudwatch","azure_cost_mgmt","gcp_carbon_footprint"],"collection_started":"2026-04-01","completion_pct":45}'::jsonb,
     now() - interval '20 days', now() - interval '1 day'),
  
    ('hhhh0009-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'ISO 42001 Gap Closure: Third-Party AI Vendor Management',
     'Address identified gap in ISO 42001 maturity assessment: implement structured third-party AI vendor management program covering assessment, monitoring, and contractual requirements.',
     'pending', 'compliance', 'medium',
     'Chief AI Risk Officer',
     '{"due_date":"2026-07-31","priority":"P2","linked_assessment":"aaaa0001-0000-0000-0000-000000000001","maturity_target_level":4,"current_level":2,"action_items":["vendor_questionnaire_update","assessment_schedule","contract_ai_clauses","vendor_register"]}'::jsonb,
     now() - interval '10 days', now() - interval '10 days'),
  
    ('hhhh0010-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'HITL Policy Firewall Hardening — All Agentic AI Systems',
     'Following treasury agent HITL bypass incident, audit and harden policy firewall configurations across all agentic AI systems to prevent unauthorized high-value action execution.',
     'completed', 'security_remediation', 'critical',
     'AI Operations',
     '{"due_date":"2026-04-15","priority":"P0","linked_incident":"22200006-0000-0000-0000-000000000001","completed_date":"2026-04-14","systems_hardened":3,"config_changes":12,"pen_test_validated":true,"sign_off_required_by":"CRO"}'::jsonb,
     now() - interval '10 days', now() - interval '7 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 19. CONFORMITY ASSESSMENTS — 5 records
  -- =============================================================================
  INSERT INTO public.conformity_assessments
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('iiii0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EU AI Act Art.43 Third-Party Conformity Assessment — Credit Scoring',
     'Third-party conformity assessment of credit scoring model v3.2 against EU AI Act Annex III requirements for high-risk AI systems in financial services.',
     'in_progress', 'eu_ai_act', 'high',
     'Head of Legal & Compliance',
     '{"framework":"EU AI Act Annex III","assessment_body":"TÜV SÜD","model":"credit-scoring-v3.2.1","start_date":"2026-04-01","expected_completion":"2026-06-30","articles_covered":["Art.9","Art.10","Art.11","Art.12","Art.13","Art.14","Art.15"],"current_stage":"technical_documentation_review","estimated_cost_eur":85000}'::jsonb,
     now() - interval '20 days', now() - interval '2 days'),
  
    ('iiii0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'ISO 42001 Internal Conformity Assessment — Annual Review',
     'Annual internal conformity assessment of AI management system against ISO/IEC 42001:2023 requirements ahead of external certification audit.',
     'completed', 'iso42001', 'medium',
     'Chief AI Risk Officer',
     '{"framework":"ISO 42001:2023","assessment_type":"internal","assessor":"Internal Audit + AI Governance Team","assessment_date":"2026-03-28","nonconformities_major":1,"nonconformities_minor":5,"opportunities_for_improvement":12,"certification_audit_scheduled":"2026-11-01","major_nc_ref":"NC-2026-001: third-party_ai_vendor_management"}'::jsonb,
     now() - interval '23 days', now() - interval '23 days'),
  
    ('iiii0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'NIST AI RMF Profile — Biometric Verification System',
     'NIST AI RMF organizational profile assessment for KYC voiceprint biometric verification system, mapping current practices to RMF subcategories.',
     'completed', 'nist_ai_rmf', 'medium',
     'Privacy Engineering',
     '{"framework":"NIST AI RMF 1.0","profile_type":"organizational","system":"kyc-voiceprint-verification","govern_score":74,"map_score":68,"measure_score":71,"manage_score":65,"priority_gaps":["bias_testing_biometrics","explainability","incident_response"],"assessment_date":"2026-02-20"}'::jsonb,
     now() - interval '60 days', now() - interval '60 days'),
  
    ('iiii0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'PCI DSS AI Touchpoint Assessment — Payment Fraud Model',
     'Assessment of payment fraud detection model compliance with PCI DSS v4.0 requirements, focusing on data security, access control, and testing requirements.',
     'completed', 'pci_dss', 'high',
     'Security Compliance Team',
     '{"framework":"PCI DSS v4.0","qsa":"Verizon QSA","assessment_date":"2026-01-31","requirements_assessed":["Req 6","Req 7","Req 8","Req 10","Req 11","Req 12"],"compliant_requirements":6,"partial_requirements":0,"non_compliant":0,"remediation_items":4,"annual_assessment":true}'::jsonb,
     now() - interval '80 days', now() - interval '80 days'),
  
    ('iiii0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'GDPR Art.22 Conformity Assessment — Automated Decision Systems',
     'Legal and technical conformity assessment of all automated decision systems against GDPR Article 22 requirements including safeguards, transparency, and right to human review.',
     'completed', 'gdpr', 'high',
     'DPO Office',
     '{"framework":"GDPR Art.22","systems_assessed":3,"systems":["credit-scoring","mortgage-approval","fraud-detection"],"safeguards_implemented":{"adverse_action_notice":true,"human_review_right":true,"explanation_service":true,"consent_mechanism":true},"assessment_date":"2026-03-10","dpa_aligned":true}'::jsonb,
     now() - interval '42 days', now() - interval '42 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 20. EXCEPTIONS — 5 records
  -- =============================================================================
  INSERT INTO public.exceptions
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('jjjj0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EXCEP-2026-001: Temporary Exemption — Credit Model Bias Remediation Deadline',
     'Approved exception to the 30-day bias remediation SLA for credit scoring model. Equalized odds implementation requires 60 days due to model complexity and validation requirements.',
     'approved', 'sla_exception', 'high',
     'Chief AI Risk Officer',
     '{"exception_date":"2026-04-01","original_sla_days":30,"approved_extension_days":60,"new_deadline":"2026-05-31","approved_by":"Chief Risk Officer","approval_date":"2026-04-03","compensating_controls":["manual_review_enhanced","bias_monitoring_daily","executive_oversight"],"linked_risk":"11100002-0000-0000-0000-000000000001"}'::jsonb,
     now() - interval '20 days', now() - interval '18 days'),
  
    ('jjjj0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EXCEP-2026-002: KYC Classifier Deployment Exception — Pre-Adversarial Training',
     'Exception to AI Security Policy requirement for adversarial robustness testing before production deployment. KYC v4.1 deployed with enhanced human oversight compensating control pending adversarial training (8-week effort).',
     'approved', 'policy_exception', 'critical',
     'CISO',
     '{"exception_date":"2026-03-15","policy_ref":"AI-SEC-POL-006","exception_rationale":"Business continuity — legacy KYC system end-of-life","approved_by":"CTO + CISO","compensating_controls":["human_review_all_high_risk_docs","reduced_auto_approve_threshold","weekly_monitoring"],"remediation_deadline":"2026-06-30","risk_accepted_by":"CRO"}'::jsonb,
     now() - interval '37 days', now() - interval '37 days'),
  
    ('jjjj0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EXCEP-2026-003: ISO 27001 Certification Gap — Hugging Face Vendor',
     'Approved exception to Tier 3 vendor ISO 27001 certification requirement for Hugging Face Enterprise. HuggingFace currently SOC 2 Type II in progress; exception valid for 12 months.',
     'approved', 'vendor_exception', 'medium',
     'Vendor Risk Management',
     '{"exception_date":"2026-02-01","policy_ref":"VENDOR-POL-002","vendor":"Hugging Face Enterprise","missing_certification":"ISO 27001","compensating_control":"SOC2_TypeII_in_progress+annual_questionnaire","exception_expiry":"2027-02-01","approved_by":"CISO","linked_vendor":"33300008-0000-0000-0000-000000000001"}'::jsonb,
     now() - interval '80 days', now() - interval '80 days'),
  
    ('jjjj0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EXCEP-2026-004: DPIA Waiver — Internal Analytics AI (Low-Risk Assessment)',
     'Waiver of mandatory DPIA for internal employee productivity analytics AI system based on pre-DPIA low-risk determination. System processes anonymized metadata only.',
     'approved', 'dpia_waiver', 'low',
     'DPO Office',
     '{"exception_date":"2026-01-15","policy_ref":"PRIVACY-POL-003","system":"employee-productivity-analytics","risk_assessment":"low_risk","anonymization_method":"k_anonymity_k15","approved_by":"DPO","basis":"GDPR_Art35_not_required","next_review":"2027-01-15"}'::jsonb,
     now() - interval '96 days', now() - interval '96 days'),
  
    ('jjjj0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'EXCEP-2026-005: Red Team Quarterly Cadence Exception — Q2 2026',
     'Exception to quarterly red team exercise requirement for Q1 2026 due to budget constraints. Compensating controls: automated adversarial fuzzing and enhanced monitoring. Q2 exercise already scheduled.',
     'expired', 'audit_exception', 'medium',
     'CISO',
     '{"exception_date":"2026-01-10","exception_expired":"2026-04-01","policy_ref":"AI-SEC-POL-006","reason":"Q4_2025_budget_overrun","compensating_controls":["automated_fuzzing_weekly","enhanced_output_monitoring","threat_intelligence_feed"],"next_exercise_scheduled":"2026-05-12","approved_by":"CTO"}'::jsonb,
     now() - interval '101 days', now() - interval '20 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- =============================================================================
  -- 21. REMEDIATION PLANS — add 6 plans (idempotent)
  -- =============================================================================
  INSERT INTO public.remediation_plans
    (id, org_id, title, description, status, type, severity, owner, metadata, created_at, updated_at)
  VALUES
    ('kkkk0001-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'REMED-2026-001: Bias Remediation — Credit Scoring Disparate Impact',
     'Comprehensive remediation plan to address disparate impact in credit scoring model (AI-ACT-Risk-002). Includes fairness post-processing, training data augmentation, and quarterly bias audit schedule.',
     'in_progress', 'bias_remediation', 'critical',
     'ML Engineering Team',
     '{"linked_risk":"11100002-0000-0000-0000-000000000001","linked_bias_audit":"44400001-0000-0000-0000-000000000001","target_di_ratio":0.95,"current_di_ratio":0.76,"milestones":["equalized_odds_postprocessing_2026-05-15","training_data_augmentation_2026-06-01","bias_audit_revalidation_2026-06-15"],"completion_target":"2026-06-15","budget_usd":120000}'::jsonb,
     now() - interval '18 days', now() - interval '2 days'),
  
    ('kkkk0002-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'REMED-2026-002: Prompt Injection Defense — RAG Pipeline Hardening',
     'Multi-layer defense implementation for indirect prompt injection vulnerability in customer advisory RAG pipeline.',
     'in_progress', 'security_remediation', 'critical',
     'Security Engineering',
     '{"linked_vulnerability":"dddd0001-0000-0000-0000-000000000001","controls":["instruction_segregation","context_boundary_tokens","output_monitor","adversarial_test_suite"],"deployment_target":"2026-04-30","test_coverage_required":0.95,"pen_test_validation":"2026-05-07"}'::jsonb,
     now() - interval '12 days', now() - interval '1 day'),
  
    ('kkkk0003-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'REMED-2026-003: KYC Adversarial Robustness Improvement Program',
     'Structured program to achieve adversarial robustness for KYC image classifier through adversarial training, data augmentation, and robustness certification.',
     'planned', 'model_improvement', 'critical',
     'AI Security Team',
     '{"linked_vulnerability":"dddd0006-0000-0000-0000-000000000001","approach":["pgd_adversarial_training","randomized_smoothing","certified_robustness"],"robustness_target_accuracy":0.90,"training_compute_hours":4800,"completion_target":"2026-06-30","validation_partner":"TÜV SÜD"}'::jsonb,
     now() - interval '5 days', now() - interval '5 days'),
  
    ('kkkk0004-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'REMED-2026-004: NLP Model Privacy — Differential Privacy Implementation',
     'Implementation of ε=1.0 differential privacy in NLP document classifier training pipeline to address membership inference attack vulnerability and GDPR compliance gap.',
     'planned', 'privacy_remediation', 'high',
     'Privacy Engineering',
     '{"linked_vulnerability":"dddd0007-0000-0000-0000-000000000001","dp_library":"PyTorch Opacus","epsilon":1.0,"delta":1e-5,"expected_accuracy_loss":0.02,"max_acceptable_loss":0.03,"completion_target":"2026-05-15","gdpr_compliance_required":true}'::jsonb,
     now() - interval '7 days', now() - interval '7 days'),
  
    ('kkkk0005-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'REMED-2026-005: EU AI Act Registration and Documentation Program',
     'Program to complete EU AI Act conformity assessments, technical documentation, and EU AI database registration for all high-risk AI systems before August 2026 compliance deadline.',
     'in_progress', 'compliance_remediation', 'critical',
     'Head of Legal & Compliance',
     '{"deadline":"2026-08-02","systems":["credit-scoring-v3.2","mortgage-approval","kyc-classifier","fraud-detection"],"workstreams":["technical_documentation","risk_management_system","conformity_assessments","eu_database_registration"],"budget_eur":380000,"external_counsel":"Freshfields"}'::jsonb,
     now() - interval '40 days', now() - interval '5 days'),
  
    ('kkkk0006-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid,
     'REMED-2026-006: HITL Infrastructure Hardening Post-Incident',
     'Post-incident remediation following treasury agent HITL bypass (Incident AIX-0012). Comprehensive hardening of HITL gateway, policy firewall, and agent action controls.',
     'completed', 'incident_remediation', 'critical',
     'AI Operations',
     '{"linked_incident":"22200006-0000-0000-0000-000000000001","changes":["policy_firewall_hardening_v3.1","hitl_threshold_enforcement","agent_action_audit_log","automated_config_validation"],"completed_date":"2026-04-14","pen_test_validated":"2026-04-18","post_incident_review":"PIR-2026-006","sign_off":"CRO_approved"}'::jsonb,
     now() - interval '18 days', now() - interval '3 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_p1_seed_all_modules.sql', SQLERRM;
END $seed$;

-- =============================================================================
-- 22. ADD NEW TABLES TO REALTIME PUBLICATION
-- =============================================================================
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'esg_reports','energy_metrics','model_efficiency',
  'risk_register','incidents','vendors','bias_audits','maturity_assessments',
  'security_threats','security_scans','security_vulnerabilities','red_team_campaigns',
  'consent_records','dsar_requests','tasks','conformity_assessments',
  'exceptions','remediation_plans'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        RAISE NOTICE 'Added % to supabase_realtime publication', t;
      END IF;
    END IF;
  END LOOP;
END $$;
