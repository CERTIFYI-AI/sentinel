-- Idempotent demo data for the four Impact & Risk (AIIA) modules, interlinked to
-- real ai_models ids so the platform reads as one connected system. Org = demo org.
-- Applied live via Supabase MCP on 2026-08-13.
do $$
declare org uuid := '00000000-0000-0000-0000-000000000001';
begin

insert into public.use_cases (id, tenant_id, title, owner, status, approval_workflow, ai_risk_classification, high_risk_role, geography, applicable_regulations, goal, target_industry, description, compliance_score, linked_model_ids)
values
 ('UC-CREDIT-001', org::text, 'Automated Consumer Credit Decisioning', 'Maria Santos', 'approved', 'executive', 'high', 'Provider', 'EU', array['EU AI Act','GDPR','ECOA'], 'Approve or decline consumer credit applications with human review on adverse actions.', 'Financial Services', 'Uses the Credit Risk Scorer to rank applicants; adverse decisions route to a human adjudicator.', 88, array['83a20820-aa10-4216-8ad6-80e4261071cf']),
 ('UC-FRAUD-001', org::text, 'Real-time Payment Fraud Screening', 'David Kim', 'active', 'standard', 'high', 'Provider', 'Global', array['EU AI Act','PSD2'], 'Flag fraudulent transactions in-flight and hold for review.', 'Financial Services', 'Fraud Detection Engine scores each transaction; high scores trigger a hold + analyst review.', 82, array['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']),
 ('UC-HR-001', org::text, 'Automated CV Screening & Shortlisting', 'Priya Patel', 'under_review', 'executive', 'high', 'Deployer', 'EU', array['EU AI Act','GDPR'], 'Shortlist candidates for recruiter review — Annex III employment use.', 'Human Resources', 'HRScreener Bot ranks CVs; recruiters make final decisions. Bias audit required before go-live.', 61, array['4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb']),
 ('UC-SUPPORT-001', org::text, 'Customer Support Copilot Assist', 'Jordan Lee', 'approved', 'standard', 'limited', null, 'Global', array['EU AI Act'], 'Draft support replies for agents with a disclosure that AI is involved.', 'Technology', 'Customer Support Copilot suggests responses; agents edit and send. Transparency notice shown to users.', 90, array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']),
 ('UC-CHURN-001', org::text, 'Churn Prediction for Retention', 'Maria Santos', 'draft', 'standard', 'limited', null, 'Global', array['GDPR'], 'Predict likely-to-churn customers for targeted retention offers.', 'Technology', 'Churn Predictor flags accounts; retention team acts. No automated adverse action.', 74, array['0fac9e56-8ddf-47eb-922e-ed11086fd260'])
on conflict (id) do nothing;

insert into public.ai_impact_assessments (id, tenant_id, assessment_id, title, assessment_type, model_id, use_case_id, risk_level, status, progress_pct, assessor_id, reviewer_id, summary, affected_entities, rag_status, findings, mitigations, approved_at, next_review)
values
 ('AIIA-CREDIT-001', org::text, 'AIIA-CREDIT-001', 'FRIA — Consumer Credit Decisioning', 'Fundamental Rights (FRIA)', '83a20820-aa10-4216-8ad6-80e4261071cf', 'UC-CREDIT-001', 'high', 'approved', 100, 'Maria Santos', 'James Patel', 'Fundamental-rights impact assessment for automated credit decisioning. Residual risk acceptable with human-in-the-loop on adverse actions.', array['Loan applicants','Protected groups'], 'green',
   '[{"title":"Disparate impact on age 55+ segment","severity":"medium","status":"mitigated"},{"title":"Explainability required for adverse actions","severity":"high","status":"mitigated"}]'::jsonb,
   '[{"title":"Human adjudication on all declines","status":"in_place"},{"title":"Quarterly bias re-audit","status":"in_place"},{"title":"SHAP reason codes on adverse action notices","status":"in_place"}]'::jsonb,
   now() - interval '18 days', (now() + interval '80 days')::date),
 ('AIIA-FRAUD-001', org::text, 'AIIA-FRAUD-001', 'DPIA — Payment Fraud Screening', 'Data Protection (DPIA)', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'UC-FRAUD-001', 'high', 'in_review', 70, 'David Kim', 'James Patel', 'DPIA covering transaction monitoring and holds. Review of false-positive customer impact underway.', array['Cardholders','Merchants'], 'amber',
   '[{"title":"False-positive holds affect legitimate customers","severity":"medium","status":"open"}]'::jsonb,
   '[{"title":"Analyst review within 15 min SLA","status":"in_place"},{"title":"Customer notification on hold","status":"planned"}]'::jsonb,
   null, (now() + interval '30 days')::date),
 ('AIIA-HR-001', org::text, 'AIIA-HR-001', 'FRIA — Automated CV Screening', 'Fundamental Rights (FRIA)', '4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb', 'UC-HR-001', 'high', 'draft', 35, 'Priya Patel', null, 'High-risk Annex III employment use. Bias audit outstanding; not cleared for production.', array['Job applicants','Protected groups'], 'red',
   '[{"title":"No completed bias audit","severity":"high","status":"open"},{"title":"Gender skew observed in shortlist sample","severity":"high","status":"open"}]'::jsonb,
   '[{"title":"Run Fairlearn bias audit before go-live","status":"planned"},{"title":"Recruiter override mandatory","status":"in_place"}]'::jsonb,
   null, (now() + interval '20 days')::date),
 ('AIIA-SUPPORT-001', org::text, 'AIIA-SUPPORT-001', 'AIIA — Support Copilot', 'General (AIIA)', 'bd167875-01d2-4afb-aa11-b25b6dbd4d09', 'UC-SUPPORT-001', 'limited', 'approved', 100, 'Jordan Lee', 'Alex Rivera', 'Limited-risk transparency obligations met; AI disclosure shown to end users.', array['Support customers'], 'green',
   '[{"title":"Transparency notice required (Art. 50)","severity":"low","status":"mitigated"}]'::jsonb,
   '[{"title":"AI-assisted disclosure banner","status":"in_place"}]'::jsonb,
   now() - interval '40 days', (now() + interval '140 days')::date),
 ('AIIA-CHURN-001', org::text, 'AIIA-CHURN-001', 'AIIA — Churn Prediction', 'General (AIIA)', '0fac9e56-8ddf-47eb-922e-ed11086fd260', 'UC-CHURN-001', 'limited', 'in_review', 55, 'Maria Santos', null, 'Retention targeting; no automated adverse action. Reviewing profiling transparency.', array['Customers'], 'amber',
   '[{"title":"Profiling transparency under GDPR Art. 22","severity":"medium","status":"open"}]'::jsonb,
   '[{"title":"Opt-out honored in retention flows","status":"in_place"}]'::jsonb,
   null, (now() + interval '45 days')::date)
on conflict (id) do nothing;

insert into public.ai_risk_tiering (id, org_id, system_id, system_name, risk_tier, risk_score, use_case, affected_users, fundamental_rights_impact, classification_basis, classifier, classified_at, review_due_at, status, metadata)
values
 ('33333333-0000-0000-0000-000000000001', org, '83a20820-aa10-4216-8ad6-80e4261071cf', 'Credit Risk Scorer', 'high', 0.82, 'Consumer credit decisioning', 'Loan applicants (EU)', 'High — access to essential financial services', 'Annex III(5)(b) — creditworthiness assessment', 'Maria Santos', now() - interval '20 days', now() + interval '160 days', 'approved',
   '{"model_id":"83a20820-aa10-4216-8ad6-80e4261071cf","annexIII":["Creditworthiness / credit scoring"],"gpai":false,"obligations":["Risk management system","Data governance","Technical documentation","Human oversight","Accuracy & robustness"]}'::jsonb),
 ('33333333-0000-0000-0000-000000000002', org, 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'Fraud Detection Engine', 'high', 0.79, 'Payment fraud screening', 'Cardholders (global)', 'Medium — financial disruption on false positives', 'Annex III — essential private services access', 'David Kim', now() - interval '15 days', now() + interval '165 days', 'approved',
   '{"model_id":"e61f991b-7da7-4b81-9deb-aa8665bb6ac1","annexIII":["Access to essential private services"],"gpai":false,"obligations":["Risk management system","Human oversight","Accuracy & robustness","Logging"]}'::jsonb),
 ('33333333-0000-0000-0000-000000000003', org, '4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb', 'HRScreener Bot', 'high', 0.85, 'CV screening & shortlisting', 'Job applicants (EU)', 'High — access to employment', 'Annex III(4)(a) — recruitment / candidate selection', 'Priya Patel', now() - interval '8 days', now() + interval '172 days', 'in_review',
   '{"model_id":"4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb","annexIII":["Employment / recruitment"],"gpai":false,"obligations":["Risk management system","Data governance","Bias monitoring","Human oversight","Transparency to candidates"]}'::jsonb),
 ('33333333-0000-0000-0000-000000000004', org, 'bd167875-01d2-4afb-aa11-b25b6dbd4d09', 'Customer Support Copilot', 'limited', 0.35, 'Support response drafting', 'Support customers (global)', 'Low', 'Art. 50 — transparency obligations for AI interacting with humans', 'Jordan Lee', now() - interval '30 days', now() + interval '150 days', 'approved',
   '{"model_id":"bd167875-01d2-4afb-aa11-b25b6dbd4d09","annexIII":[],"gpai":true,"obligations":["Transparency / AI disclosure"]}'::jsonb),
 ('33333333-0000-0000-0000-000000000005', org, '0fac9e56-8ddf-47eb-922e-ed11086fd260', 'Churn Predictor', 'minimal', 0.18, 'Retention targeting', 'Customers (global)', 'Low', 'No Annex III category; no automated adverse action', 'Maria Santos', now() - interval '25 days', now() + interval '340 days', 'approved',
   '{"model_id":"0fac9e56-8ddf-47eb-922e-ed11086fd260","annexIII":[],"gpai":false,"obligations":[]}'::jsonb),
 ('33333333-0000-0000-0000-000000000006', org, '3f9836df-e94c-4167-bf97-1afdff96359b', 'SupplyChain Optimizer', 'minimal', 0.12, 'Logistics optimization', 'Internal ops', 'None', 'No Annex III category', 'James Okoro', now() - interval '60 days', now() + interval '300 days', 'approved',
   '{"model_id":"3f9836df-e94c-4167-bf97-1afdff96359b","annexIII":[],"gpai":false,"obligations":[]}'::jsonb)
on conflict (id) do nothing;

insert into public.mrc_meetings (id, org_id, title, meeting_type, scheduled_at, status, quorum_required, attendees, minutes)
values
 ('11111111-0000-0000-0000-000000000001', org, 'Q2 2026 Model Risk Committee', 'Quarterly', now() - interval '21 days', 'completed', 4,
   '["Maria Santos","David Kim","Priya Patel","Alex Rivera","James Patel"]'::jsonb,
   'Quorum met (5/5). Credit Risk Scorer go-live approved with human-in-the-loop condition. Fraud Detection Engine periodic review approved. HRScreener Bot deferred pending bias audit.'),
 ('11111111-0000-0000-0000-000000000002', org, 'Q3 2026 Model Risk Committee', 'Quarterly', now() + interval '20 days', 'scheduled', 4,
   '["Maria Santos","David Kim","Priya Patel","Alex Rivera"]'::jsonb, null)
on conflict (id) do nothing;

insert into public.mrc_agenda_items (id, org_id, meeting_id, title, model_id, model_name, review_type, summary, presenter, decision, decided_at)
values
 ('22222222-0000-0000-0000-000000000001', org, '11111111-0000-0000-0000-000000000001', 'Credit Risk Scorer — production go-live', '83a20820-aa10-4216-8ad6-80e4261071cf', 'Credit Risk Scorer', 'Go-Live', 'FRIA complete; bias within threshold. Requesting production go-live approval.', 'Maria Santos', 'approved', now() - interval '21 days'),
 ('22222222-0000-0000-0000-000000000002', org, '11111111-0000-0000-0000-000000000001', 'Fraud Detection Engine — periodic review', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'Fraud Detection Engine', 'Periodic', 'Semi-annual review. Drift stable, DPIA in review. Continue in production.', 'David Kim', 'approved', now() - interval '21 days'),
 ('22222222-0000-0000-0000-000000000003', org, '11111111-0000-0000-0000-000000000002', 'HRScreener Bot — go-live gate', '4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb', 'HRScreener Bot', 'Go-Live', 'High-risk employment use. Bias audit outstanding — go-live gated on FRIA + audit completion.', 'Priya Patel', 'pending', null),
 ('22222222-0000-0000-0000-000000000004', org, '11111111-0000-0000-0000-000000000002', 'Loan Approval Assistant — incident review', 'bad4bd0a-f588-4344-bea8-2b8a9564351c', 'Loan Approval Assistant', 'Incident', 'Review of Q2 adverse-action explainability incident and remediation.', 'Priya Patel', 'pending', null)
on conflict (id) do nothing;

insert into public.mrc_votes (id, org_id, agenda_item_id, agenda_item_title, model_id, voter_id, voter_name, vote, rationale, voted_at)
values
 ('44444444-0000-0000-0000-000000000001', org, '22222222-0000-0000-0000-000000000001', 'Credit Risk Scorer — production go-live', '83a20820-aa10-4216-8ad6-80e4261071cf', 'M1', 'Maria Santos', 'approve', 'FRIA complete, HITL condition satisfied.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000002', org, '22222222-0000-0000-0000-000000000001', 'Credit Risk Scorer — production go-live', '83a20820-aa10-4216-8ad6-80e4261071cf', 'M2', 'David Kim', 'approve', 'Risk controls adequate.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000003', org, '22222222-0000-0000-0000-000000000001', 'Credit Risk Scorer — production go-live', '83a20820-aa10-4216-8ad6-80e4261071cf', 'M3', 'Priya Patel', 'approve', 'Explainability on adverse actions in place.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000004', org, '22222222-0000-0000-0000-000000000001', 'Credit Risk Scorer — production go-live', '83a20820-aa10-4216-8ad6-80e4261071cf', 'M4', 'Alex Rivera', 'approve', 'Approved for go-live.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000005', org, '22222222-0000-0000-0000-000000000002', 'Fraud Detection Engine — periodic review', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'M1', 'Maria Santos', 'approve', 'Drift stable.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000006', org, '22222222-0000-0000-0000-000000000002', 'Fraud Detection Engine — periodic review', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'M2', 'David Kim', 'approve', 'Continue in production.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000007', org, '22222222-0000-0000-0000-000000000002', 'Fraud Detection Engine — periodic review', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'M3', 'Priya Patel', 'approve', 'DPIA to be finalized.', now() - interval '21 days'),
 ('44444444-0000-0000-0000-000000000008', org, '22222222-0000-0000-0000-000000000002', 'Fraud Detection Engine — periodic review', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 'M4', 'Alex Rivera', 'abstain', 'Recused — conflict.', now() - interval '21 days')
on conflict (id) do nothing;
end $$;
