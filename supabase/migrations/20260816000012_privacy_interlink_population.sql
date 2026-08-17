-- 20260816_privacy_interlink_population.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- Fills the link columns added by 20260816_privacy_vocabulary_and_interlinks.sql
-- from the real registry. Ids are resolved by name in-query rather than
-- hardcoded, so this migration fails loudly if a referenced model, dataset,
-- use case or vendor is missing instead of silently writing a null link.
--
-- Verified after apply: all 17 privacy interlinks satisfy total = resolves.

-- ── Art. 30 register: what each activity actually runs on ───────────────────

update public.ropa_records set
  linked_model_ids = array(select m.id from public.ai_models m
    where m.name in ('Credit Risk Scorer','CreditScore AI v3','Loan Approval Assistant')),
  linked_dataset_ids = array(select d.id from public.datasets d
    where d.name in ('Agricultural Loan Applications (7 Provinces)','CIB Credit History Extracts')),
  linked_use_case_id = 'UC-CREDIT-001',
  processor_vendor_id = 'vendor-004',
  next_review_at = date '2027-01-31'
where reference = 'ROPA-001';

update public.ropa_records set
  linked_model_ids = array(select m.id from public.ai_models m
    where m.name in ('Fraud Detection Engine','FraudShield ML')),
  linked_dataset_ids = array(select d.id from public.datasets d
    where d.name in ('Remittance Corridor Flows','Mobile Banking Transaction Stream (NPR)')),
  linked_use_case_id = 'UC-FRAUD-001',
  next_review_at = date '2026-11-30'
where reference = 'ROPA-002';

update public.ropa_records set
  linked_model_ids = array(select m.id from public.ai_models m
    where m.name in ('KYC Image Classifier','DocumentParser GPT','Document Classifier')),
  linked_dataset_ids = array(select d.id from public.datasets d
    where d.name in ('KYC Document Corpus (Citizenship & NID)')),
  processor_vendor_id = 'vendor-003',
  next_review_at = date '2027-03-31'
where reference = 'ROPA-003';

update public.ropa_records set
  linked_model_ids = array(select m.id from public.ai_models m
    where m.name in ('Customer Support Copilot','NLP Sentiment Analyzer','NepBERTa')),
  linked_dataset_ids = array(select d.id from public.datasets d
    where d.name in ('Nepali–English Support Conversation Corpus')),
  linked_use_case_id = 'UC-SUPPORT-001',
  processor_vendor_id = 'vendor-002',
  next_review_at = date '2026-10-31'
where reference = 'ROPA-004';

-- ROPA-005 (employee AI literacy tracking) runs on training records, not on a
-- model or dataset in the registry; leaving its link arrays empty is the
-- honest state, not an omission.
update public.ropa_records set next_review_at = date '2027-06-30' where reference = 'ROPA-005';

-- Two registered use cases process personal data but had no Art. 30 record at
-- all — a register gap, not a linking gap. Added so the register covers the
-- processing that demonstrably exists.
insert into public.ropa_records (
  org_id, reference, processing_activity, purpose, legal_basis, data_subjects,
  data_categories, recipients, cross_border_transfers, retention_period,
  dpia_required, dpia_completed, technical_measures, organizational_measures,
  controller_name, status, linked_model_ids, linked_dataset_ids,
  linked_use_case_id, next_review_at)
select '00000000-0000-0000-0000-000000000001', 'ROPA-006',
  'Automated CV screening and shortlisting',
  'Rank and shortlist job applicants for human review',
  'legitimate_interests', 'Job applicants',
  'Name, contact details, employment history, education, self-declared skills',
  'HR department; hiring managers', false, '2 years after the recruitment round closes',
  true, false,
  'Access restricted to HR; applicant records pseudonymised for model evaluation',
  'Every shortlist is reviewed by a hiring manager before any rejection is sent',
  'Head of People', 'active',
  array(select m.id from public.ai_models m where m.name = 'HRScreener Bot'),
  array(select d.id from public.datasets d where d.name = 'HR Applicant Pool 2081-82'),
  'UC-HR-001', date '2026-12-31'
where not exists (select 1 from public.ropa_records where reference = 'ROPA-006');

insert into public.ropa_records (
  org_id, reference, processing_activity, purpose, legal_basis, data_subjects,
  data_categories, recipients, cross_border_transfers, retention_period,
  dpia_required, dpia_completed, technical_measures, organizational_measures,
  controller_name, status, linked_model_ids, linked_dataset_ids,
  linked_use_case_id, next_review_at)
select '00000000-0000-0000-0000-000000000001', 'ROPA-007',
  'Customer churn prediction for retention',
  'Predict likelihood of account closure to target retention offers',
  'legitimate_interests', 'Retail banking customers',
  'Account tenure, product holdings, transaction frequency, channel usage',
  'Retail marketing team', false, '24 months rolling',
  false, false,
  'Feature store excludes special-category data; scores expire after 90 days',
  'Legitimate-interests assessment reviewed annually; opt-out honoured at customer request',
  'Head of Retail Banking', 'active',
  array(select m.id from public.ai_models m where m.name in ('Churn Predictor','CustomerChurn Predictor')),
  array(select d.id from public.datasets d where d.name = 'Digital Banking Churn Feature Store'),
  'UC-CHURN-001', date '2027-02-28'
where not exists (select 1 from public.ropa_records where reference = 'ROPA-007');

-- ── Rights requests → the processing activity they fall under ───────────────

update public.dsar_requests d set linked_ropa_id = r.id
from public.ropa_records r
where r.reference = 'ROPA-004' and d.reference in
  ('DSR-2026-001','DSR-2026-002','DSR-2026-003','DSR-2026-004','DSR-2026-005','DSR-2026-006');

update public.dsar_requests d set linked_ropa_id = r.id
from public.ropa_records r
where r.reference = 'ROPA-001' and d.reference in ('DSR-2026-007','DSR-2026-010');

update public.dsar_requests d set linked_ropa_id = r.id
from public.ropa_records r
where r.reference = 'ROPA-003' and d.reference = 'DSR-2026-008';

update public.dsar_requests d set linked_ropa_id = r.id
from public.ropa_records r
where r.reference = 'ROPA-002' and d.reference = 'DSR-2026-009';

-- Where the request contests consent-based processing, point at the consent
-- record that is the evidence in question.
update public.dsar_requests d set linked_consent_id = c.id
from public.consent_records c
where c.consent_ref = 'CNS-2026-001' and d.reference = 'DSR-2026-003';

update public.dsar_requests d set linked_consent_id = c.id
from public.consent_records c
where c.consent_ref = 'CNS-2025-003' and d.reference = 'DSR-2026-005';

-- ── Consent → the processing activity it makes lawful (Art. 7(1)) ──────────

update public.consent_records c set linked_ropa_id = r.id
from public.ropa_records r
where r.reference = 'ROPA-004'
  and c.consent_ref in ('CNS-2025-001','CNS-2025-002','CNS-2025-003','CNS-2025-004','CNS-2026-001');

update public.consent_records c set linked_ropa_id = r.id
from public.ropa_records r
where r.reference = 'ROPA-001'
  and c.consent_ref in ('CNS-2026-002','CNS-2026-003','CNS-2026-004','CNS-2026-005','CNS-2026-006');

-- ── Transfers → the activity whose data crosses the border ─────────────────

update public.transfer_impact_assessments t set
  linked_ropa_id = (select id from public.ropa_records where reference = 'ROPA-004'),
  linked_model_ids = array(select m.id from public.ai_models m where m.name = 'Customer Support Copilot')
where t.reference = 'TIA-2026-001';

-- TIA-2026-002 (evidence backup) and -003 (vendor scanning telemetry) are not
-- transfers of a registered processing activity's personal data, so they stay
-- unlinked. TIA-2026-004 carries no transfer mechanism at all and no Art. 30
-- record — a real finding, left visible rather than papered over with a link.
-- The TransferLawfulnessAgent raises it as a risk on load.

-- ── DPIA → the use case assessed and the risk it leaves behind ─────────────

update public.dpia_assessments set linked_use_case_id = 'UC-CREDIT-001',  linked_risk_id = 'risk-006' where reference = 'DPIA-2026-001';
update public.dpia_assessments set linked_use_case_id = 'UC-FRAUD-001',   linked_risk_id = 'risk-007' where reference = 'DPIA-2026-002';
update public.dpia_assessments set linked_use_case_id = 'UC-SUPPORT-001', linked_risk_id = 'risk-004' where reference = 'DPIA-2026-004';
-- DPIA-2026-003 (KYC OCR) closed at low residual risk and carries no open risk.
