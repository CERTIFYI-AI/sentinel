-- 20260819000002_seed_risk_incidents.sql
--
-- Demo seeds for the RISK & INCIDENTS group, Nepali-bank narrative (all
-- FICTIONAL — see NOTICE). Model references are resolved from ai_models at
-- seed time by name (never hardcoded uuids); risk references are resolved by
-- title pattern from the ws09 risk seed where present, NULL otherwise.
-- Idempotent: every insert is guarded by a natural-key NOT EXISTS.

DO $ri$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit uuid; m_fraud uuid; m_kyc uuid; m_support uuid; m_loan uuid; m_nepberta uuid;
  -- text, not uuid: risks.id and incidents.id are TEXT (20260418000002, and on
  -- live). Declaring these uuid made every comparison against a text id column
  -- fail with "operator does not exist: text = uuid" and aborted the seed
  -- (audit F1). incident_playbooks.id really is uuid, so pb_* stay uuid.
  r_bias text; r_drift text;
  pb_model uuid; pb_bias uuid; pb_breach uuid;
  i_drift text; i_bias text; i_pii text;
  wf_release uuid; wf_exception uuid;
BEGIN
  SELECT id INTO m_credit   FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'       LIMIT 1;
  SELECT id INTO m_fraud    FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'   LIMIT 1;
  SELECT id INTO m_kyc      FROM public.ai_models WHERE org_id = v_org AND name = 'KYC Image Classifier'     LIMIT 1;
  SELECT id INTO m_support  FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot' LIMIT 1;
  SELECT id INTO m_loan     FROM public.ai_models WHERE org_id = v_org AND name = 'Loan Approval Assistant'  LIMIT 1;
  SELECT id INTO m_nepberta FROM public.ai_models WHERE org_id = v_org AND name = 'NepBERTa'                 LIMIT 1;
  SELECT id INTO r_bias  FROM public.risks WHERE tenant_id = v_org::text AND coalesce(name, '') ILIKE '%bias%'  LIMIT 1;
  SELECT id INTO r_drift FROM public.risks WHERE tenant_id = v_org::text AND coalesce(name, '') ILIKE '%drift%' LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Playbooks — response runbooks with phases, escalation roles, regulatory
  -- templates. Contacts are roles + channels, never personal data.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.incident_playbooks WHERE org_id = v_org AND playbook_ref = 'PB-001') THEN
    INSERT INTO public.incident_playbooks
      (org_id, playbook_ref, name, category, description, status, version, last_tested_date, owner,
       phases, escalation_chain, regulatory_templates, linked_model_ids)
    VALUES
      (v_org, 'PB-001', 'AI Model Failure Response', 'model_failure',
       'Containment and recovery for production model outages or degraded scoring quality.',
       'active', '2.1', DATE '2026-07-12', 'Head of Model Risk',
       '[{"name":"Detect & Triage","sla_minutes":30,"steps":[{"text":"Confirm degradation via model analytics dashboard","role":"MLOps"},{"text":"Classify severity against SLA matrix","role":"Incident Commander"},{"text":"Open incident record and assign commander","role":"MLOps"}]},
         {"name":"Containment","sla_minutes":60,"steps":[{"text":"Route traffic to fallback model or rule-based path","role":"MLOps"},{"text":"Freeze pending deployments of the affected model","role":"Model Risk"},{"text":"Snapshot inputs/outputs for forensics","role":"MLOps"}]},
         {"name":"Recovery","sla_minutes":240,"steps":[{"text":"Roll back to last validated model version","role":"MLOps"},{"text":"Re-run validation suite before restoring traffic","role":"Model Risk"}]},
         {"name":"Post-incident","sla_minutes":2880,"steps":[{"text":"Root-cause analysis and lessons learned","role":"Incident Commander"},{"text":"Update drift thresholds and monitors","role":"Model Risk"},{"text":"File regulator notification if thresholds met","role":"Compliance"}]}]'::jsonb,
       '[{"tier":1,"role":"On-call MLOps engineer","contact_channel":"pager rotation"},
         {"tier":2,"role":"Head of Model Risk","contact_channel":"phone bridge"},
         {"tier":3,"role":"CRO","contact_channel":"executive bridge"}]'::jsonb,
       '[{"authority":"Nepal Rastra Bank (supervision)","regulation":"IT Guidelines incident clause","deadline_hours":72},
         {"authority":"EU market conduct (if EU data subjects affected)","regulation":"EU AI Act Art. 73","deadline_hours":72}]'::jsonb,
       array_remove(ARRAY[m_credit, m_loan]::uuid[], NULL)),
      (v_org, 'PB-002', 'Bias / Discrimination Incident Response', 'bias',
       'Response to detected discriminatory outcomes in credit, lending or hiring decisions.',
       'active', '1.4', DATE '2026-06-20', 'Chief Compliance Officer',
       '[{"name":"Verify & Scope","sla_minutes":120,"steps":[{"text":"Reproduce disparity metrics on holdout cohorts","role":"Data Science"},{"text":"Quantify affected decisions and time window","role":"Model Risk"}]},
         {"name":"Mitigate","sla_minutes":480,"steps":[{"text":"Suspend automated decisioning for affected segment","role":"Model Risk"},{"text":"Enable human review for all in-scope decisions","role":"Operations"}]},
         {"name":"Remediate customers","sla_minutes":4320,"steps":[{"text":"Re-adjudicate affected applications","role":"Operations"},{"text":"Prepare customer communication plan","role":"Compliance"}]},
         {"name":"Prevent recurrence","sla_minutes":10080,"steps":[{"text":"Schedule fairness re-audit","role":"Data Science"},{"text":"Update bias monitors and thresholds","role":"Model Risk"}]}]'::jsonb,
       '[{"tier":1,"role":"Fair-lending officer","contact_channel":"compliance queue"},
         {"tier":2,"role":"Chief Compliance Officer","contact_channel":"phone bridge"},
         {"tier":3,"role":"Board risk committee","contact_channel":"board secretariat"}]'::jsonb,
       '[{"authority":"Nepal Rastra Bank (fair lending)","regulation":"Consumer protection directive","deadline_hours":168}]'::jsonb,
       array_remove(ARRAY[m_credit, m_loan]::uuid[], NULL)),
      (v_org, 'PB-003', 'AI Data Breach Response', 'data_breach',
       'Response to leakage of personal or training data through model endpoints or pipelines.',
       'active', '3.0', DATE '2026-08-01', 'CISO',
       '[{"name":"Contain","sla_minutes":60,"steps":[{"text":"Disable affected endpoint or apply firewall block rule","role":"Security Ops"},{"text":"Preserve access logs and request corpus","role":"Security Ops"}]},
         {"name":"Assess","sla_minutes":480,"steps":[{"text":"Determine categories and volume of exposed data","role":"Privacy Office"},{"text":"Assess notification thresholds (NRB, GDPR if applicable)","role":"Privacy Office"}]},
         {"name":"Notify","sla_minutes":4320,"steps":[{"text":"Notify supervisor and affected data subjects as required","role":"Compliance"},{"text":"Coordinate public statement with communications","role":"Compliance"}]},
         {"name":"Harden","sla_minutes":10080,"steps":[{"text":"Add canary records and leakage evals to CI","role":"Data Science"},{"text":"Re-run privacy red-team scenarios","role":"Security Ops"}]}]'::jsonb,
       '[{"tier":1,"role":"On-call security engineer","contact_channel":"pager rotation"},
         {"tier":2,"role":"CISO","contact_channel":"phone bridge"},
         {"tier":3,"role":"CEO office","contact_channel":"executive bridge"}]'::jsonb,
       '[{"authority":"Nepal Rastra Bank","regulation":"IT Guidelines breach notification","deadline_hours":24},
         {"authority":"EU DPA (if EU data subjects affected)","regulation":"GDPR Art. 33","deadline_hours":72}]'::jsonb,
       array_remove(ARRAY[m_kyc, m_support]::uuid[], NULL));
  END IF;
  SELECT id INTO pb_model  FROM public.incident_playbooks WHERE org_id = v_org AND playbook_ref = 'PB-001' LIMIT 1;
  SELECT id INTO pb_bias   FROM public.incident_playbooks WHERE org_id = v_org AND playbook_ref = 'PB-002' LIMIT 1;
  SELECT id INTO pb_breach FROM public.incident_playbooks WHERE org_id = v_org AND playbook_ref = 'PB-003' LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Incidents — spread across the workflow states, linked to models and
  -- playbooks. incident_id is the natural key.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-601') THEN
    INSERT INTO public.incidents
      (org_id, tenant_id, incident_id, title, description, severity, category, status, source,
       incident_type, model_id, affected_models, detection_method, detected_at, occurred_date,
       sla_hours, playbook_id, assignee, response_team, regulatory_reportable, root_cause,
       impact_description, financial_impact)
    VALUES
      (v_org, v_org::text, 'INC-2026-601', 'Fraud engine drift breach during Dashain remittance surge',
       'PSI on remittance-channel features exceeded 0.32 (threshold 0.25); false-negative rate rising on high-value corridor transactions.',
       'high', 'model_drift', 'investigating', 'DriftDetection sentinel',
       'model_failure', m_fraud, ARRAY['Fraud Detection Engine'], 'automated_monitor',
       now() - interval '18 hours', (now() - interval '18 hours')::date,
       24, pb_model, 'Fraud Analytics Lead', ARRAY['Fraud Analytics','MLOps'], false,
       NULL, 'Elevated fraud exposure on remittance corridor while recalibration pending.', NULL),
      (v_org, v_org::text, 'INC-2026-602', 'Geographic disparity detected in credit scorer approvals',
       'BiasMonitor flagged approval-rate gap of 11.8pp between Terai and hill-district applicants at equal creditworthiness bands.',
       'critical', 'bias', 'containment', 'BiasMonitor sentinel',
       'bias_discrimination', m_credit, ARRAY['Credit Risk Scorer'], 'automated_monitor',
       now() - interval '3 days', (now() - interval '3 days')::date,
       12, pb_bias, 'Fair-lending Officer', ARRAY['Compliance','Data Science'], true,
       NULL, 'Automated decisioning suspended for affected segment; manual review active.', NULL),
      (v_org, v_org::text, 'INC-2026-603', 'PII exposure attempt via support copilot session',
       'Guardrails blocked repeated attempts to extract citizenship numbers from conversation context; no confirmed exfiltration.',
       'medium', 'data_leakage', 'resolved', 'Policy Firewall telemetry',
       'security', m_support, ARRAY['Customer Support Copilot'], 'guardrail_block',
       now() - interval '12 days', (now() - interval '12 days')::date,
       48, pb_breach, 'Security Operations', ARRAY['Security Ops','Privacy Office'], false,
       'Prompt-injection payloads in pasted text; guardrail held.', 'No customer impact confirmed after log review.', 0),
      (v_org, v_org::text, 'INC-2026-604', 'KYC classifier outage after runtime upgrade',
       'Image preprocessing dependency mismatch caused 40-minute scoring outage in branch onboarding flow.',
       'high', 'availability', 'closed', 'Branch operations report',
       'model_failure', m_kyc, ARRAY['KYC Image Classifier'], 'manual_report',
       now() - interval '30 days', (now() - interval '30 days')::date,
       8, pb_model, 'MLOps Lead', ARRAY['MLOps'], false,
       'Unpinned dependency in inference image.', 'Manual onboarding fallback used; 112 applications delayed.', 180000),
      (v_org, v_org::text, 'INC-2026-605', 'Loan assistant hallucinated repayment terms in Nepali',
       'Copilot cited a non-existent grace-period clause in Nepali-language responses; caught by human reviewer before customer send.',
       'medium', 'quality', 'open', 'HITL reviewer report',
       'model_failure', m_loan, ARRAY['Loan Approval Assistant','NepBERTa'], 'human_review',
       now() - interval '6 hours', (now() - interval '6 hours')::date,
       24, pb_model, NULL, ARRAY['Model Risk'], false,
       NULL, 'Response quarantined in review queue; no customer exposure.', 0);
  END IF;
  SELECT id INTO i_drift FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-601' LIMIT 1;
  SELECT id INTO i_bias  FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-602' LIMIT 1;
  SELECT id INTO i_pii   FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-603' LIMIT 1;

  -- Workflow transition history for the two live incidents.
  IF i_bias IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.incident_workflow_steps WHERE incident_id = i_bias) THEN
    INSERT INTO public.incident_workflow_steps (org_id, incident_id, from_status, to_status, actor, notes, occurred_at) VALUES
      (v_org, i_bias, NULL, 'open', 'BiasMonitor sentinel', 'Disparity metrics breached fair-lending threshold.', now() - interval '3 days'),
      (v_org, i_bias, 'open', 'investigating', 'Fair-lending Officer', 'Cohort reproduction confirmed the gap.', now() - interval '2 days 20 hours'),
      (v_org, i_bias, 'investigating', 'containment', 'Model Risk', 'Automated decisioning suspended for affected segment.', now() - interval '2 days 12 hours');
    INSERT INTO public.incident_workflow_steps (org_id, incident_id, from_status, to_status, actor, notes, occurred_at) VALUES
      (v_org, i_drift, NULL, 'open', 'DriftDetection sentinel', 'PSI 0.32 on remittance features.', now() - interval '18 hours'),
      (v_org, i_drift, 'open', 'investigating', 'Fraud Analytics Lead', 'Recalibration candidate models under evaluation.', now() - interval '10 hours');
  END IF;

  -- One completed playbook activation (history), none active (honest banner).
  IF pb_breach IS NOT NULL AND i_pii IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.playbook_runs WHERE playbook_id = pb_breach AND incident_id = i_pii) THEN
    INSERT INTO public.playbook_runs
      (org_id, playbook_id, incident_id, status, current_phase, commander, severity,
       completed_steps, started_at, completed_at, notes)
    VALUES
      (v_org, pb_breach, i_pii, 'completed', 'Harden', 'Security Operations', 'medium',
       '["Contain:0","Contain:1","Assess:0","Assess:1","Notify:0","Harden:0","Harden:1"]'::jsonb,
       now() - interval '12 days', now() - interval '9 days',
       'Guardrail held; notification thresholds not met. Leakage evals added to CI.');
  END IF;

  -- -------------------------------------------------------------------------
  -- Tabletop exercises — respect the type/status CHECK constraints.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.tabletop_exercises WHERE org_id = v_org AND exercise_ref = 'TTX-2026-01') THEN
    INSERT INTO public.tabletop_exercises
      (org_id, exercise_ref, name, type, scenario, status, facilitator, participant_names,
       scheduled_at, completed_at, duration_minutes, objectives, readiness_score,
       findings, action_items, lessons_learned, linked_playbook_id)
    VALUES
      (v_org, 'TTX-2026-01', 'Credit scorer bias escalation drill', 'AI-Incident',
       'Simulated fair-lending breach on the credit scorer requiring segment suspension and regulator notification decisioning.',
       'completed', 'Head of Model Risk', ARRAY['Model Risk','Compliance','Data Science','Operations'],
       now() - interval '45 days', now() - interval '45 days' + interval '3 hours', 180,
       ARRAY['Validate PB-002 escalation chain','Test decision rights for segment suspension'],
       78,
       '[{"finding":"Suspension decision took 42 minutes; target is 30","severity":"medium"},{"finding":"Regulatory threshold matrix was ambiguous for partial cohorts","severity":"high"}]'::jsonb,
       '[{"item":"Clarify NRB notification thresholds in PB-002","owner":"Compliance","due":"2026-08-30"}]'::jsonb,
       'Decision rights need pre-authorization for out-of-hours suspension.', pb_bias),
      (v_org, 'TTX-2026-02', 'Model outage failover drill', 'IR',
       'Fraud engine hard outage during peak remittance window; fallback routing and rollback under time pressure.',
       'completed', 'MLOps Lead', ARRAY['MLOps','Fraud Analytics','Security Ops'],
       now() - interval '20 days', now() - interval '20 days' + interval '2 hours', 120,
       ARRAY['Exercise fallback routing','Measure rollback time'],
       85,
       '[{"finding":"Rollback met the 60-minute SLA","severity":"low"}]'::jsonb,
       '[{"item":"Automate validation-suite trigger on rollback","owner":"MLOps","due":"2026-09-15"}]'::jsonb,
       'Fallback path held; manual validation trigger is the remaining gap.', pb_model),
      (v_org, 'TTX-2026-03', 'Cross-border data breach notification exercise', 'Regulatory',
       'KYC data exposure scenario with simultaneous NRB and GDPR notification tracks.',
       'planned', 'CISO', ARRAY['Security Ops','Privacy Office','Compliance','Legal'],
       now() + interval '21 days', NULL, 240,
       ARRAY['Test 24h NRB notification path','Dry-run GDPR Art. 33 template'],
       NULL, '[]'::jsonb, '[]'::jsonb, NULL, pb_breach);
  END IF;

  -- -------------------------------------------------------------------------
  -- Remediation plans — linked to incidents/risks/models, real progress.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.remediation_plans WHERE org_id = v_org AND plan_ref = 'REM-2026-01') THEN
    INSERT INTO public.remediation_plans
      (org_id, tenant_id, plan_ref, title, description, status, priority, owner, assignee,
       incident_id, risk_id, source_type, source_id, start_date, due_date, progress_pct,
       linked_model_ids, milestones)
    VALUES
      (v_org, v_org::text, 'REM-2026-01', 'Recalibrate fraud engine for remittance seasonality',
       'Retrain on post-surge distribution, add seasonal covariates, and tighten drift monitors.',
       'in_progress', 'high', 'Fraud Analytics Lead', 'Senior ML Engineer',
       i_drift, r_drift, 'incident', 'INC-2026-601', DATE '2026-08-10', now() + interval '20 days', 35,
       array_remove(ARRAY[m_fraud]::uuid[], NULL),
       '[{"name":"Data cut & labeling","done":true},{"name":"Retrain candidates","done":false},{"name":"Champion/challenger eval","done":false},{"name":"Staged rollout","done":false}]'::jsonb),
      (v_org, v_org::text, 'REM-2026-02', 'Fair-lending remediation for credit scorer',
       'Re-adjudicate affected applications, retrain with fairness constraints, refresh bias audit.',
       'in_progress', 'critical', 'Fair-lending Officer', 'Data Science Lead',
       i_bias, r_bias, 'incident', 'INC-2026-602', DATE '2026-08-13', now() + interval '30 days', 20,
       array_remove(ARRAY[m_credit]::uuid[], NULL),
       '[{"name":"Affected-cohort re-adjudication","done":false},{"name":"Constrained retraining","done":false},{"name":"Independent fairness audit","done":false}]'::jsonb),
      (v_org, v_org::text, 'REM-2026-03', 'Pin and scan inference image dependencies',
       'Dependency pinning, SBOM generation and CI gate to prevent recurrence of the KYC outage.',
       'completed', 'medium', 'MLOps Lead', 'Platform Engineer',
       NULL, NULL, 'incident', 'INC-2026-604', DATE '2026-07-20', now() - interval '5 days', 100,
       array_remove(ARRAY[m_kyc]::uuid[], NULL),
       '[{"name":"Pin dependencies","done":true},{"name":"SBOM in CI","done":true},{"name":"Rollout to all images","done":true}]'::jsonb),
      (v_org, v_org::text, 'REM-2026-04', 'Nepali-language grounding evals for loan assistant',
       'Add curated Devanagari eval set for repayment-term grounding; block release on regression.',
       'planned', 'high', 'Head of Model Risk', NULL,
       NULL, NULL, 'incident', 'INC-2026-605', DATE '2026-08-20', now() + interval '45 days', 0,
       array_remove(ARRAY[m_loan, m_nepberta]::uuid[], NULL),
       '[{"name":"Eval set curation","done":false},{"name":"CI wiring","done":false}]'::jsonb);
  END IF;

  -- -------------------------------------------------------------------------
  -- Exceptions — text PK per baseline schema; approval chain as jsonb.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.exceptions WHERE tenant_id = v_org::text AND exception_id = 'EXC-2026-701') THEN
    INSERT INTO public.exceptions
      (id, org_id, tenant_id, exception_id, title, description, status, type, severity, owner,
       requested_by, requested_date, approver, risk_accepted, justification, expiry_date, review_date,
       renewal_count, policy_ref, likelihood, impact, risk_score, compensating_controls, impact_scope,
       framework_mapping, regulatory_ref, department, affected_systems, approval_chain, linked_risk_id,
       linked_model_ids)
    VALUES
      ('exc-2026-701', v_org, v_org::text, 'EXC-2026-701',
       'Deferred re-validation for NepBERTa sentiment module',
       'Quarterly re-validation deferred one cycle while the Nepali eval corpus is rebuilt; module is advisory-only.',
       'approved', 'validation_deferral', 'medium', 'Head of Model Risk',
       'Data Science Lead', DATE '2026-07-05', 'Chief Risk Officer', 'Medium',
       'Advisory-only usage; human review on all outputs; corpus rebuild completes next quarter.',
       DATE '2026-10-31', DATE '2026-10-01', 0, 'MRM-POL-3.2', 2, 3, 6,
       'Human review of all outputs; usage restricted to advisory contexts.',
       'Single advisory module; no automated decisions.',
       ARRAY['ISO 42001 8.2','EU AI Act Art. 9'], NULL, 'Model Risk',
       ARRAY['NepBERTa sentiment service'],
       '[{"role":"Head of Model Risk","decision":"approved","date":"2026-07-08","notes":"Compensating controls adequate."},{"role":"Chief Risk Officer","decision":"approved","date":"2026-07-10","notes":"Expiry firm; no second renewal."}]'::jsonb,
       NULL, array_remove(ARRAY[m_nepberta]::uuid[], NULL)),
      ('exc-2026-702', v_org, v_org::text, 'EXC-2026-702',
       'Legacy scorecard parallel-run beyond sunset date',
       'Legacy rule scorecard kept in parallel with Credit Risk Scorer for 90 extra days to extend the champion/challenger window.',
       'approved', 'policy_exception', 'low', 'Credit Risk Manager',
       'Credit Risk Manager', DATE '2026-06-15', 'Head of Model Risk', 'Low',
       'Extended comparison window reduces model-replacement risk for hill-district segments.',
       DATE '2026-09-30', DATE '2026-09-15', 1, 'MRM-POL-5.1', 2, 2, 4,
       'Outputs logged and reconciled weekly; scorecard cannot auto-decision.',
       'Shadow-mode only.', ARRAY['ISO 42001 8.3'], NULL, 'Credit Risk',
       ARRAY['Legacy scorecard engine'],
       '[{"role":"Head of Model Risk","decision":"approved","date":"2026-06-18","notes":"Shadow mode only."}]'::jsonb,
       NULL, array_remove(ARRAY[m_credit]::uuid[], NULL)),
      ('exc-2026-703', v_org, v_org::text, 'EXC-2026-703',
       'Support copilot session retention above standard',
       'Retain copilot transcripts 180 days (standard 90) pending the PII-leakage investigation closure.',
       'pending', 'data_retention', 'high', 'Privacy Officer',
       'Security Operations', DATE '2026-08-10', NULL, 'High',
       'Forensic window must cover the full INC-2026-603 investigation period.',
       DATE '2026-12-31', DATE '2026-11-30', 0, 'DP-POL-2.4', 3, 3, 9,
       'Access restricted to investigation team; transcripts encrypted at rest.',
       'Copilot transcripts only; no other channel data.',
       ARRAY['GDPR Art. 5(1)(e)','ISO 42001 7.4'], 'GDPR', 'Privacy Office',
       ARRAY['Customer Support Copilot'],
       '[{"role":"Privacy Officer","decision":"pending","date":null,"notes":null}]'::jsonb,
       NULL, array_remove(ARRAY[m_support]::uuid[], NULL)),
      ('exc-2026-704', v_org, v_org::text, 'EXC-2026-704',
       'KYC classifier below target accuracy in low-light captures',
       'Accept 91.5% accuracy (target 94%) for low-light branch captures while camera refresh completes.',
       'expired', 'performance_waiver', 'medium', 'Head of Model Risk',
       'Operations Lead', DATE '2026-02-01', 'Chief Risk Officer', 'Medium',
       'Hardware refresh addressed root cause; waiver allowed branch onboarding to continue.',
       DATE '2026-07-31', DATE '2026-07-01', 0, 'MRM-POL-4.7', 3, 2, 6,
       'Manual verification for low-confidence classifications.',
       'Branch onboarding flow only.', ARRAY['ISO 42001 8.2'], NULL, 'Operations',
       ARRAY['KYC Image Classifier'],
       '[{"role":"Head of Model Risk","decision":"approved","date":"2026-02-05","notes":"Camera refresh funded."},{"role":"Chief Risk Officer","decision":"approved","date":"2026-02-07","notes":null}]'::jsonb,
       NULL, array_remove(ARRAY[m_kyc]::uuid[], NULL));
  END IF;

  -- -------------------------------------------------------------------------
  -- HITL reviews — same table the mesh agents write.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.hitl_reviews WHERE tenant_id = v_org::text AND title = 'Credit scorer segment suspension sign-off') THEN
    INSERT INTO public.hitl_reviews
      (org_id, tenant_id, entity_type, entity_id, entity_name, model_id, review_type, title, description,
       status, priority, risk_level, trigger_reason, reason, assigned_to, sla_hours, sla_deadline,
       blocks_deployment, decided_at, decided_by, decision, remarks, linked_risk_id)
    VALUES
      (v_org, v_org::text, 'incident', i_bias::text, 'INC-2026-602', m_credit::text, 'escalation',
       'Credit scorer segment suspension sign-off',
       'Confirm continued suspension of automated decisioning for the affected geographic segment.',
       'pending', 'critical', 'critical', 'BiasMonitor disparity breach', 'BiasMonitor disparity breach',
       'Fair-lending Officer', 12, now() + interval '6 hours', true, NULL, NULL, NULL, NULL, r_bias::text),
      (v_org, v_org::text, 'model', m_loan::text, 'Loan Approval Assistant', m_loan::text, 'output_review',
       'Quarantined Nepali response — hallucinated repayment terms',
       'Reviewer must confirm quarantine and approve corrected response template.',
       'pending', 'high', 'high', 'Hallucination flag from human reviewer', 'Hallucination flag from human reviewer',
       'Model Risk Analyst', 24, now() + interval '18 hours', false, NULL, NULL, NULL, NULL, NULL),
      (v_org, v_org::text, 'model', m_fraud::text, 'Fraud Detection Engine', m_fraud::text, 'threshold_review',
       'Drift-driven threshold override request',
       'Fraud analytics requests temporary score-threshold override while recalibration completes.',
       'pending', 'high', 'high', 'DriftDetection PSI breach', 'DriftDetection PSI breach',
       'Head of Model Risk', 24, now() + interval '20 hours', true, NULL, NULL, NULL, NULL, r_drift::text),
      (v_org, v_org::text, 'deployment', m_kyc::text, 'KYC Image Classifier v2.4', m_kyc::text, 'release_gate',
       'Release gate: KYC classifier v2.4',
       'Post-outage release with pinned dependencies; requires human release approval.',
       'approved', 'medium', 'medium', 'ChangeDetection release gate', 'ChangeDetection release gate',
       'MLOps Lead', 48, now() - interval '2 days', true,
       now() - interval '3 days', 'Head of Model Risk', 'approved',
       'Dependency pinning verified; validation suite green.', NULL),
      (v_org, v_org::text, 'incident', i_pii::text, 'INC-2026-603', m_support::text, 'closure_review',
       'PII probe incident closure review',
       'Confirm no notification thresholds met and approve closure.',
       'approved', 'medium', 'medium', 'IncidentTriage closure gate', 'IncidentTriage closure gate',
       'Privacy Officer', 48, now() - interval '9 days', false,
       now() - interval '9 days', 'Privacy Officer', 'approved',
       'Log review complete; guardrail held; no exposure.', NULL);
  END IF;

  -- -------------------------------------------------------------------------
  -- Approval workflow definitions + live approval requests.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.approval_workflows WHERE tenant_id = v_org::text AND name = 'Model release to production') THEN
    INSERT INTO public.approval_workflows
      (org_id, tenant_id, entity_type, entity_id, entity_name, workflow_type, status, name, description,
       applies_to, steps, requires_mfa, escalation_hours, notify_on_escalation, is_active)
    VALUES
      (v_org, v_org::text, 'model', '', NULL, 'definition', 'active',
       'Model release to production', 'Two-step human approval for any production model promotion.',
       'model_release',
       '[{"name":"Model Risk review","approver_role":"Head of Model Risk","required":true,"sla_hours":24},{"name":"Business owner sign-off","approver_role":"Business Owner","required":true,"sla_hours":24}]'::jsonb,
       true, 24, true, true),
      (v_org, v_org::text, 'exception', '', NULL, 'definition', 'active',
       'Policy exception approval', 'Risk-accepted exceptions require compliance and CRO sign-off.',
       'exception',
       '[{"name":"Policy owner review","approver_role":"Policy Owner","required":true,"sla_hours":48},{"name":"CRO sign-off","approver_role":"CRO","required":true,"sla_hours":72}]'::jsonb,
       false, 72, true, true),
      (v_org, v_org::text, 'incident', '', NULL, 'definition', 'active',
       'Regulatory incident report release', 'Regulator-bound incident reports require compliance approval before filing.',
       'incident_report',
       '[{"name":"Compliance review","approver_role":"Chief Compliance Officer","required":true,"sla_hours":12}]'::jsonb,
       true, 12, true, true),
      (v_org, v_org::text, 'policy', '', NULL, 'definition', 'active',
       'Guardrail policy change', 'Changes to blocking guardrail rules require security approval.',
       'policy_change',
       '[{"name":"Security review","approver_role":"CISO","required":true,"sla_hours":24}]'::jsonb,
       true, 24, false, true);
  END IF;
  SELECT id INTO wf_release   FROM public.approval_workflows WHERE tenant_id = v_org::text AND name = 'Model release to production' LIMIT 1;
  SELECT id INTO wf_exception FROM public.approval_workflows WHERE tenant_id = v_org::text AND name = 'Policy exception approval'   LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.approvals WHERE org_id = v_org AND requested_action = 'promote_to_production' AND entity_name = 'Fraud Detection Engine v3.2') THEN
    INSERT INTO public.approvals
      (org_id, entity_type, entity_id, entity_name, workflow_id, requested_by, requested_action,
       status, reason, approver, step_index, decision, decided_at)
    VALUES
      (v_org, 'model', m_fraud::text, 'Fraud Detection Engine v3.2', wf_release,
       'Fraud Analytics Lead', 'promote_to_production', 'pending',
       'Recalibrated model addressing INC-2026-601 drift; champion/challenger complete.',
       NULL, 0, NULL, NULL),
      (v_org, 'exception', 'exc-2026-703', 'EXC-2026-703 retention extension', wf_exception,
       'Security Operations', 'approve_exception', 'pending',
       'Forensic retention extension pending investigation closure.',
       NULL, 0, NULL, NULL),
      (v_org, 'model', m_kyc::text, 'KYC Image Classifier v2.4', wf_release,
       'MLOps Lead', 'promote_to_production', 'approved',
       'Post-outage release with pinned dependencies.',
       'Head of Model Risk', 1, 'approved', now() - interval '3 days'),
      (v_org, 'incident', i_bias::text, 'INC-2026-602 interim regulator report', NULL,
       'Chief Compliance Officer', 'file_regulator_report', 'pending',
       'Interim fair-lending report drafted for NRB supervision.',
       NULL, 0, NULL, NULL);
  END IF;

  -- -------------------------------------------------------------------------
  -- Automation rules + honest run history (no synthetic engines).
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.automation_rules WHERE org_id = v_org AND rule_ref = 'AUTO-001') THEN
    INSERT INTO public.automation_rules
      (org_id, rule_ref, name, description, status, trigger_type, trigger_config, actions,
       run_count, last_run_at, last_run_status, created_by)
    VALUES
      (v_org, 'AUTO-001', 'Critical incident → HITL escalation',
       'When a critical incident is created, open a blocking HITL review and notify the risk channel.',
       'active', 'incident_created', '{"severity":["critical"]}'::jsonb,
       '[{"type":"create_hitl_review","config":{"priority":"critical","blocks_deployment":true}},{"type":"notify","config":{"channel":"risk-ops"}}]'::jsonb,
       0, NULL, NULL, 'Head of Model Risk'),
      (v_org, 'AUTO-002', 'Drift breach → freeze deployments',
       'On a drift threshold breach, hold pending deployments of the affected model until sign-off.',
       'active', 'model_drift', '{"psi_threshold":0.25}'::jsonb,
       '[{"type":"hold_deployments","config":{"scope":"affected_model"}},{"type":"create_hitl_review","config":{"review_type":"threshold_review"}}]'::jsonb,
       0, NULL, NULL, 'MLOps Lead'),
      (v_org, 'AUTO-003', 'Exception expiry reminder',
       'Fourteen days before an exception expires, create a review task for the owner.',
       'active', 'schedule', '{"cron":"0 6 * * *","lead_days":14}'::jsonb,
       '[{"type":"create_task","config":{"assignee_field":"owner","title":"Exception expiring — review or renew"}}]'::jsonb,
       0, NULL, NULL, 'Compliance Analyst'),
      (v_org, 'AUTO-004', 'Regulatory-reportable incident → compliance approval',
       'Incidents flagged regulatory-reportable open a compliance approval request automatically.',
       'draft', 'incident_created', '{"regulatory_reportable":true}'::jsonb,
       '[{"type":"create_approval","config":{"workflow":"Regulatory incident report release"}}]'::jsonb,
       0, NULL, NULL, 'Chief Compliance Officer');
  END IF;

  -- -------------------------------------------------------------------------
  -- Risk Intelligence — regulation entries with obligations and model scope.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.regulation_entries WHERE tenant_id = v_org::text AND regulation_ref = 'REG-EU-AIACT') THEN
    INSERT INTO public.regulation_entries
      (tenant_id, regulation_ref, name, jurisdiction, status, effective_date, effective_on,
       relevance_score, requirements_summary, obligations, models_in_scope, controls_mapped,
       gap_percent, alert_on_change, owner, source_url, linked_model_ids)
    VALUES
      (v_org::text, 'REG-EU-AIACT', 'EU AI Act — high-risk obligations', 'EU', 'Enacted',
       '2026-08-02', DATE '2026-08-02', 95,
       'Credit scoring and creditworthiness models are Annex III high-risk: risk management, data governance, human oversight, logging, and post-market monitoring apply.',
       '[{"ref":"Art. 9","title":"Risk management system","status":"in_progress"},{"ref":"Art. 10","title":"Data & data governance","status":"met"},{"ref":"Art. 14","title":"Human oversight","status":"met"},{"ref":"Art. 26","title":"Deployer obligations","status":"in_progress"},{"ref":"Art. 73","title":"Serious incident reporting","status":"met"}]'::jsonb,
       3, 18, 22, true, 'Chief Compliance Officer',
       'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
       array_remove(ARRAY[m_credit, m_loan, m_kyc]::uuid[], NULL)),
      (v_org::text, 'REG-NRB-IT', 'NRB Information Technology Guidelines', 'Nepal', 'Enacted',
       '2023-07-16', DATE '2023-07-16', 90,
       'Bank-wide IT and outsourcing controls, incident notification to supervision, and audit-trail retention for automated decision systems.',
       '[{"ref":"6.4","title":"Incident notification to NRB","status":"met"},{"ref":"7.2","title":"Audit trails for automated decisions","status":"met"},{"ref":"9.1","title":"Outsourced model due diligence","status":"in_progress"}]'::jsonb,
       6, 22, 12, true, 'CISO', NULL,
       array_remove(ARRAY[m_credit, m_fraud, m_kyc, m_support, m_loan]::uuid[], NULL)),
      (v_org::text, 'REG-ISO-42001', 'ISO/IEC 42001 — AI management system', 'Global', 'Enacted',
       '2023-12-18', DATE '2023-12-18', 85,
       'AIMS clauses on impact assessment, lifecycle controls, and continual improvement; certification targeted next fiscal year.',
       '[{"ref":"6.1.4","title":"AI system impact assessment","status":"met"},{"ref":"8.2","title":"Operational planning & control","status":"in_progress"},{"ref":"10.1","title":"Continual improvement","status":"in_progress"}]'::jsonb,
       6, 31, 18, false, 'Head of Model Risk', NULL, '{}'::uuid[]),
      (v_org::text, 'REG-GDPR', 'GDPR — automated decision-making', 'EU', 'Enacted',
       '2018-05-25', DATE '2018-05-25', 70,
       'Art. 22 safeguards for automated decisions on EU data subjects; breach notification under Arts. 33–34.',
       '[{"ref":"Art. 22","title":"Automated decision safeguards","status":"met"},{"ref":"Art. 33","title":"Breach notification (72h)","status":"met"},{"ref":"Art. 35","title":"DPIA for high-risk processing","status":"met"}]'::jsonb,
       2, 14, 8, true, 'Privacy Officer', NULL,
       array_remove(ARRAY[m_support, m_kyc]::uuid[], NULL)),
      (v_org::text, 'REG-NIST-AIRMF', 'NIST AI RMF 1.0', 'US', 'Guidance',
       '2023-01-26', DATE '2023-01-26', 55,
       'Voluntary framework adopted as internal benchmark; mapped to govern/map/measure/manage functions.',
       '[{"ref":"GOVERN","title":"Governance function","status":"met"},{"ref":"MEASURE","title":"Measurement function","status":"in_progress"}]'::jsonb,
       6, 12, 30, false, 'Head of Model Risk', NULL, '{}'::uuid[]),
      (v_org::text, 'REG-BASEL-239', 'BCBS 239 — risk data aggregation', 'Global', 'Enacted',
       '2016-01-01', DATE '2016-01-01', 60,
       'Risk data lineage and aggregation accuracy expectations applied to model input pipelines.',
       '[{"ref":"P3","title":"Accuracy & integrity","status":"met"},{"ref":"P4","title":"Completeness","status":"in_progress"}]'::jsonb,
       4, 9, 25, false, 'CRO', NULL,
       array_remove(ARRAY[m_credit, m_fraud]::uuid[], NULL));
  END IF;

  -- -------------------------------------------------------------------------
  -- Financial risk quantifications — FAIR rows tied to models and risks.
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.financial_risks WHERE org_id = v_org AND fin_ref = 'FRQ-2026-001') THEN
    INSERT INTO public.financial_risks
      (org_id, fin_ref, title, scenario, model_id, linked_risk_id, category, methodology,
       loss_event_frequency, loss_magnitude, probability, single_loss_expectancy,
       annualized_loss_expectancy, exposure, currency, owner, status, last_quantified,
       controls, insurance)
    VALUES
      (v_org, 'FRQ-2026-001', 'Fraud model failure during remittance peak',
       'Sustained false-negative elevation on remittance corridor during festival surge.',
       m_fraud, r_drift, 'model_failure', 'FAIR',
       0.5, 42000000, 0.39, 42000000, 21000000, 120000000, 'NPR',
       'Fraud Analytics Lead', 'quantified', DATE '2026-08-12',
       '[{"name":"Drift monitors + fallback routing","annual_cost":2400000,"risk_reduction_pct":45}]'::jsonb,
       '{"policy":"Cyber & operational risk","coverage":60000000,"deductible":5000000}'::jsonb),
      (v_org, 'FRQ-2026-002', 'Fair-lending enforcement exposure — credit scorer',
       'Supervisory action and remediation cost if geographic disparity persists past the remediation window.',
       m_credit, r_bias, 'bias_discrimination', 'FAIR',
       0.2, 95000000, 0.18, 95000000, 19000000, 250000000, 'NPR',
       'Chief Compliance Officer', 'quantified', DATE '2026-08-14',
       '[{"name":"Fairness-constrained retraining","annual_cost":6000000,"risk_reduction_pct":60},{"name":"Segment-level HITL review","annual_cost":3600000,"risk_reduction_pct":25}]'::jsonb,
       '{}'::jsonb),
      (v_org, 'FRQ-2026-003', 'KYC data exposure via OCR pipeline',
       'Citizenship-number leakage through model endpoint leading to notification and credit-monitoring costs.',
       m_kyc, NULL, 'data_breach', 'FAIR',
       0.1, 65000000, 0.09, 65000000, 6500000, 180000000, 'NPR',
       'CISO', 'quantified', DATE '2026-08-05',
       '[{"name":"PII redaction guardrail (block mode)","annual_cost":1800000,"risk_reduction_pct":70}]'::jsonb,
       '{"policy":"Cyber liability","coverage":100000000,"deductible":10000000}'::jsonb),
      (v_org, 'FRQ-2026-004', 'Copilot misinformation → mis-selling claims',
       'Hallucinated product terms in customer conversations creating conduct-risk restitution.',
       m_support, NULL, 'conduct', 'FAIR',
       0.8, 4500000, 0.55, 4500000, 3600000, 25000000, 'NPR',
       'Head of Retail Banking', 'quantified', DATE '2026-07-28',
       '[{"name":"Grounding evals + response templates","annual_cost":1200000,"risk_reduction_pct":50}]'::jsonb,
       '{}'::jsonb),
      (v_org, 'FRQ-2026-005', 'Loan assistant outage — origination slowdown',
       'Extended assistant outage reverts origination to manual processing with volume loss.',
       m_loan, NULL, 'availability', 'FAIR',
       1.2, 2800000, 0.70, 2800000, 3360000, 15000000, 'NPR',
       'MLOps Lead', 'accepted', DATE '2026-07-15',
       '[{"name":"Fallback manual workflow","annual_cost":900000,"risk_reduction_pct":35}]'::jsonb,
       '{}'::jsonb),
      (v_org, 'FRQ-2026-006', 'Third-party model API dependency shock',
       'Upstream LLM provider pricing or availability shock affecting copilot economics.',
       NULL, NULL, 'third_party', 'FAIR',
       0.6, 6000000, 0.45, 6000000, 3600000, 30000000, 'NPR',
       'CRO', 'draft', DATE '2026-06-30',
       '[{"name":"Dual-provider abstraction layer","annual_cost":2000000,"risk_reduction_pct":55}]'::jsonb,
       '{}'::jsonb);
  END IF;
END $ri$;
