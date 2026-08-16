-- 20260820000002_seed_compliance_group.sql
--
-- Demo seeds for the COMPLIANCE & REGULATORY group, Nepali-bank narrative
-- (all FICTIONAL — see NOTICE). Cross-group interlinks are real: audit
-- findings carry the AF-007 ref the remediation seeds already point at,
-- post-market events link the seeded incident, calendar rows carry
-- source_type/source_id into conformity/exceptions/tabletop/filings.
-- Model refs resolved by name; natural-key NOT EXISTS guards throughout.

DO $cg$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit uuid; m_fraud uuid; m_support uuid; m_kyc uuid;
  i_drift uuid; a_iso uuid; a_nrb uuid;
  pm_credit uuid; pm_fraud uuid;
BEGIN
  SELECT id INTO m_credit  FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'       LIMIT 1;
  SELECT id INTO m_fraud   FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'   LIMIT 1;
  SELECT id INTO m_support FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot' LIMIT 1;
  SELECT id INTO m_kyc     FROM public.ai_models WHERE org_id = v_org AND name = 'KYC Image Classifier'     LIMIT 1;
  SELECT id INTO i_drift   FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-601' LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Policy templates — global catalog (system rows; accurate clause maps).
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.policy_templates WHERE template_ref = 'PT-EUAI-RM') THEN
    INSERT INTO public.policy_templates (template_ref, name, category, framework, clause_refs, description, body, version) VALUES
      ('PT-EUAI-RM', 'AI Risk Management Policy', 'risk', 'EU AI Act', ARRAY['Art. 9','ISO 42001 6.1'],
       'Risk management system for high-risk AI: identification, evaluation, mitigation, monitoring across the lifecycle.',
       '{"summary":"Establishes the continuous risk management system required for high-risk AI systems.","sections":[{"heading":"Scope","text":"All AI systems classified high-risk under the EU AI Act Annex III and internal tiering."},{"heading":"Process","text":"Risks are identified at registration, scored on likelihood and impact, mitigated with linked controls, and re-reviewed on the register cadence."},{"heading":"Roles","text":"Model owners identify; Model Risk approves treatments; the risk committee reviews escalations."}]}'::jsonb, '1.0'),
      ('PT-EUAI-HO', 'Human Oversight Policy', 'oversight', 'EU AI Act', ARRAY['Art. 14','ISO 42001 8.2'],
       'Human oversight measures: HITL gates, override authority, competence requirements for reviewers.',
       '{"summary":"Defines when automated decisions require human review and who may override them.","sections":[{"heading":"HITL gates","text":"Blocking reviews are required for high-risk deployments, threshold overrides, and segment suspensions."},{"heading":"Override authority","text":"Only designated reviewers may approve, reject, or request changes; every decision is audit-logged with the actor."}]}'::jsonb, '1.0'),
      ('PT-EUAI-LOG', 'Logging & Traceability Policy', 'records', 'EU AI Act', ARRAY['Art. 12','Art. 19'],
       'Automatic event recording and retention for high-risk AI systems.',
       '{"summary":"Requires tamper-evident logging of AI system events and decisions.","sections":[{"heading":"What is logged","text":"Model lifecycle events, decisions affecting persons, oversight decisions, and incident timelines."},{"heading":"Retention","text":"Logs are retained per the records schedule and protected against modification."}]}'::jsonb, '1.0'),
      ('PT-ISO-AIMS', 'AI Management System Manual', 'governance', 'ISO/IEC 42001', ARRAY['Clause 5.2','Clause 6.2','Clause 10.1'],
       'Top-level AIMS policy: objectives, roles, continual improvement.',
       '{"summary":"Defines the AI management system, its objectives and improvement cycle.","sections":[{"heading":"Policy","text":"Leadership commits to responsible AI objectives measured through the AIMS."},{"heading":"Improvement","text":"Nonconformities feed corrective actions tracked to closure."}]}'::jsonb, '1.0'),
      ('PT-GDPR-ADM', 'Automated Decision-Making Policy', 'privacy', 'GDPR', ARRAY['Art. 22','Art. 35'],
       'Safeguards for solely automated decisions with legal or similar effect.',
       '{"summary":"Guarantees meaningful human involvement and contestability for automated decisions.","sections":[{"heading":"Rights","text":"Affected persons may obtain human review, express their view, and contest the decision."},{"heading":"DPIA","text":"High-risk processing requires a documented impact assessment before go-live."}]}'::jsonb, '1.0'),
      ('PT-SEC-LLM', 'LLM Security Standard', 'security', 'OWASP LLM Top 10', ARRAY['LLM01','LLM02','LLM06'],
       'Controls for prompt injection, insecure output handling, and sensitive data disclosure.',
       '{"summary":"Mandatory guardrails for LLM-backed features.","sections":[{"heading":"Input","text":"System prompts are protected; untrusted input is isolated and filtered."},{"heading":"Output","text":"Responses are policy-screened before reaching users; PII redaction is block-mode in production."}]}'::jsonb, '1.0'),
      ('PT-NRB-IT', 'Supervisory IT Compliance Policy', 'regulatory', 'NRB IT Guidelines', ARRAY['6.4','7.2'],
       'Incident notification and audit-trail obligations under banking supervision.',
       '{"summary":"Meets NRB expectations for incident reporting and decision traceability.","sections":[{"heading":"Notification","text":"Reportable incidents are filed within the supervisory deadline with an approved narrative."},{"heading":"Traceability","text":"Automated decisions retain an audit trail reviewable by the supervisor."}]}'::jsonb, '1.0'),
      ('PT-NIST-GOV', 'AI Governance Charter', 'governance', 'NIST AI RMF', ARRAY['GOVERN 1','GOVERN 2'],
       'Accountability structure, risk tolerance and workforce competence for AI.',
       '{"summary":"Charters the governance function for trustworthy AI.","sections":[{"heading":"Accountability","text":"Executive ownership, committee cadence, and escalation paths are defined."},{"heading":"Competence","text":"Roles interacting with AI systems complete role-appropriate literacy training."}]}'::jsonb, '1.0');
  END IF;

  -- -------------------------------------------------------------------------
  -- Audits + findings (AF-007 resolves the remediation seed's source_id).
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.audits WHERE org_id = v_org AND audit_ref = 'AUD-2026-01') THEN
    INSERT INTO public.audits (org_id, tenant_id, audit_ref, title, audit_type, framework, scope, auditor, lead_auditor, status, start_date, end_date, owner, findings_count, description) VALUES
      (v_org, v_org::text, 'AUD-2026-01', 'ISO/IEC 42001 readiness assessment', 'external', 'ISO/IEC 42001',
       'AIMS scope: credit, fraud and KYC model families', 'Accredited certification body (fictional)', 'Lead assessor',
       'completed', DATE '2026-05-05', DATE '2026-05-16', 'Head of Model Risk', 3,
       'Stage-1 readiness against the AIMS; three findings raised, one major.'),
      (v_org, v_org::text, 'AUD-2026-02', 'NRB supervisory IT examination', 'regulator', 'NRB IT Guidelines',
       'Automated decisioning, incident handling, audit trails', 'Nepal Rastra Bank supervision (exercise)', 'Examiner-in-charge',
       'in_progress', DATE '2026-08-01', NULL, 'Chief Compliance Officer', 1,
       'Ongoing supervisory examination of AI decisioning controls.'),
      (v_org, v_org::text, 'AUD-2026-03', 'Internal audit — model change management', 'internal', 'Internal',
       'Release gates, rollback drills, dependency hygiene', 'Internal Audit', 'IA manager',
       'planned', DATE '2026-10-01', NULL, 'Internal Audit', 0,
       'Planned Q4 internal audit following the KYC outage remediation.');
  END IF;
  SELECT id INTO a_iso FROM public.audits WHERE org_id = v_org AND audit_ref = 'AUD-2026-01' LIMIT 1;
  SELECT id INTO a_nrb FROM public.audits WHERE org_id = v_org AND audit_ref = 'AUD-2026-02' LIMIT 1;

  IF a_iso IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.audit_findings WHERE org_id = v_org AND finding_ref = 'AF-007') THEN
    INSERT INTO public.audit_findings (org_id, audit_id, finding_ref, title, description, severity, status, due_date, owner) VALUES
      (v_org, a_iso, 'AF-005', 'AIMS objectives lack measurable indicators', 'Clause 6.2: objectives defined but two lack quantitative measures.', 'minor', 'closed', DATE '2026-07-15', 'Head of Model Risk'),
      (v_org, a_iso, 'AF-006', 'Supplier AI due-diligence evidence incomplete', 'Clause 8.1: two vendor models missing refreshed due-diligence records.', 'minor', 'in_remediation', DATE '2026-09-30', 'Vendor Management'),
      (v_org, a_iso, 'AF-007', 'Bias monitoring thresholds not formally approved', 'Clause 8.2 / EU AI Act Art. 9: disparity thresholds in monitoring lack documented approval by the risk committee.', 'major', 'in_remediation', DATE '2026-09-15', 'Fair-lending Officer'),
      (v_org, a_nrb, 'AF-008', 'Incident notification dry-run gap', 'NRB 6.4: no evidence of a notification dry-run in the last 12 months.', 'moderate', 'open', DATE '2026-10-31', 'Chief Compliance Officer');
    UPDATE public.audits SET findings_count = 3 WHERE id = a_iso;
    UPDATE public.audits SET findings_count = 1 WHERE id = a_nrb;
  END IF;

  -- -------------------------------------------------------------------------
  -- Post-market monitoring plans + one event escalated to the real incident.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.post_market_plans WHERE org_id = v_org AND plan_ref = 'PMM-2026-01') THEN
    INSERT INTO public.post_market_plans (org_id, plan_ref, model_id, name, status, frequency, metrics, owner, last_review, next_review) VALUES
      (v_org, 'PMM-2026-01', m_credit, 'Credit scorer post-market surveillance', 'active', 'continuous',
       '[{"name":"approval_rate_disparity_pp","threshold":5,"direction":"above"},{"name":"psi","threshold":0.25,"direction":"above"},{"name":"complaint_rate_per_10k","threshold":3,"direction":"above"}]'::jsonb,
       'Head of Model Risk', DATE '2026-08-01', DATE '2026-09-01'),
      (v_org, 'PMM-2026-02', m_fraud, 'Fraud engine post-market surveillance', 'active', 'continuous',
       '[{"name":"false_negative_rate_pct","threshold":8,"direction":"above"},{"name":"psi","threshold":0.25,"direction":"above"}]'::jsonb,
       'Fraud Analytics Lead', DATE '2026-08-10', DATE '2026-09-10'),
      (v_org, 'PMM-2026-03', m_support, 'Copilot conversation quality surveillance', 'active', 'weekly',
       '[{"name":"hallucination_flag_rate_pct","threshold":1,"direction":"above"},{"name":"pii_block_events","threshold":10,"direction":"above"}]'::jsonb,
       'Head of Retail Banking', DATE '2026-08-12', DATE '2026-09-12');
  END IF;
  SELECT id INTO pm_fraud  FROM public.post_market_plans WHERE org_id = v_org AND plan_ref = 'PMM-2026-02' LIMIT 1;
  SELECT id INTO pm_credit FROM public.post_market_plans WHERE org_id = v_org AND plan_ref = 'PMM-2026-01' LIMIT 1;
  IF pm_fraud IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.post_market_events WHERE plan_id = pm_fraud) THEN
    INSERT INTO public.post_market_events (org_id, plan_id, incident_id, severity, event_type, description, occurred_at, resolved) VALUES
      (v_org, pm_fraud, i_drift, 'high', 'metric_breach',
       'PSI 0.32 breached the 0.25 threshold on remittance features; escalated to incident INC-2026-601.',
       now() - interval '18 hours', false),
      (v_org, pm_credit, NULL, 'medium', 'complaint',
       'Two branch complaints on declined applications in the same district; under review, below escalation threshold.',
       now() - interval '6 days', true);
  END IF;

  -- -------------------------------------------------------------------------
  -- Compliance calendar — manual entries; derived entries come from the
  -- service (conformity/exceptions/tabletop/filings/trainings at read time).
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.compliance_calendar WHERE tenant_id = v_org::text AND title = 'Board AI risk committee — quarterly review') THEN
    INSERT INTO public.compliance_calendar (org_id, tenant_id, name, title, description, status, type, severity, owner, due_at, source_type, framework_ref) VALUES
      (v_org, v_org::text, 'board-ai-q3', 'Board AI risk committee — quarterly review',
       'Quarterly review of the risk register, open incidents and mesh telemetry.', 'scheduled', 'review', 'high',
       'CRO', date_trunc('day', now()) + interval '20 days', 'manual', 'ISO/IEC 42001 9.3'),
      (v_org, v_org::text, 'nrb-dryrun', 'NRB incident-notification dry run',
       'Exercise the 24h supervisory notification path (closes AF-008).', 'scheduled', 'exercise', 'medium',
       'Chief Compliance Officer', date_trunc('day', now()) + interval '35 days', 'manual', 'NRB 6.4'),
      (v_org, v_org::text, 'aiact-annual', 'EU AI Act Annex IV documentation refresh',
       'Annual technical documentation review for high-risk systems.', 'scheduled', 'documentation', 'medium',
       'Head of Model Risk', date_trunc('day', now()) + interval '60 days', 'manual', 'EU AI Act Art. 11');
  END IF;

  -- -------------------------------------------------------------------------
  -- Transparency reports — publishable rows linked to models (the mesh's
  -- narrative agent also writes here on events).
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.transparency_reports WHERE org_id = v_org AND title = 'Credit Risk Scorer — public transparency report') THEN
    INSERT INTO public.transparency_reports (org_id, report_type, audience, title, status, generated_by, content, model_id, version, published_at) VALUES
      (v_org, 'model_card_public', 'customer', 'Credit Risk Scorer — public transparency report', 'PUBLISHED',
       'Compliance Office', 'Plain-language description of the credit scoring system: purpose, data categories, human oversight, contestability route, and performance summary. (Fictional demo content.)',
       m_credit, '2026.2', now() - interval '30 days'),
      (v_org, 'model_card_public', 'customer', 'Customer Support Copilot — AI disclosure notice', 'DRAFT',
       'Compliance Office', 'Draft Art. 50 disclosure for the conversational assistant: AI interaction notice, escalation to human agents, logging practices. (Fictional demo content.)',
       m_support, '0.9', NULL);
  END IF;
END $cg$;
