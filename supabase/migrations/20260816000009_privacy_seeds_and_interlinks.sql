-- 20260816000009_privacy_seeds_and_interlinks.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- Captures seed data and interlink population that had been applied directly to
-- the live database but not committed, so a fresh environment could not
-- reproduce it. All statements are idempotent.
--
-- Covers:
--   * transfer_impact_assessments seeds (GDPR Chapter V)
--   * dpia_assessments seeds (GDPR Art. 35/36), linked to RoPA and models
--   * the interlink rollout: five link columns that existed and resolved but
--     were populated on zero rows, so the relationship was theoretical and the
--     UI rendered "—" for every record

-- ── Transfer Impact Assessments ─────────────────────────────────────────────

-- Replay-safety (heal-before-seed): these columns exist on the live DB but
-- not in the replayed DDL (transfer_impact_assessments was created lean in
-- ws-era migrations). No-op live.
alter table public.transfer_impact_assessments
  add column if not exists transfer_name text,
  add column if not exists data_types text,
  add column if not exists data_volume text,
  add column if not exists valid_until date;
-- The replayed era table carries title NOT NULL, which this seed does not
-- set (live uses transfer_name). Relax it, then keep both in sync below.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='transfer_impact_assessments'
                and column_name='title' and is_nullable='NO') then
    alter table public.transfer_impact_assessments alter column title drop not null;
  end if;
end $$;
-- The era CHECK constrains transfer_mechanism to legacy tokens (SCCs/BCRs/
-- Adequacy/...); the live vocabulary uses snake_case mechanism names. Widen
-- the constraint so both vocabularies pass (live has no such CHECK).
do $$
begin
  if exists (select 1 from pg_constraint where conname='transfer_impact_assessments_transfer_mechanism_check') then
    alter table public.transfer_impact_assessments drop constraint transfer_impact_assessments_transfer_mechanism_check;
  end if;
end $$;

insert into public.transfer_impact_assessments
 (id, org_id, transfer_name, source_country, destination_country, transfer_mechanism,
  data_types, data_volume, risk_level, supplementary_measures, status, valid_until, vendor_id)
values
 ('aaaaaaaa-aaaa-4aaa-8aaa-000000000a01','00000000-0000-0000-0000-000000000001',
  'Support copilot inference — cloud LLM provider','Nepal','United States','standard_contractual_clauses',
  'Support conversation transcripts; retrieved account context','~40,000 sessions/month','high',
  'PII redaction before egress; no training on customer data (contractual); regional endpoint pinning; encryption in transit and at rest; annual provider audit review',
  'approved','2027-03-31','vendor-001'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-000000000a02','00000000-0000-0000-0000-000000000001',
  'Cloud backup of governance evidence','Nepal','Singapore','standard_contractual_clauses',
  'Governance records, audit chain exports','~120 GB','medium',
  'Client-side encryption with bank-held keys; provider has no plaintext access; access logging retained 400 days',
  'approved','2027-06-30','vendor-003'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-000000000a03','00000000-0000-0000-0000-000000000001',
  'Vendor security scanning telemetry','Nepal','Ireland','adequacy_decision',
  'Infrastructure metadata; no personal data','Continuous','low',
  'Adequacy decision covers the destination; no personal data in scope',
  'approved','2028-01-31','vendor-007'),
 -- Deliberately has NO transfer_mechanism: the register must show at least one
 -- transfer that is unlawful as it stands, so the "No mechanism" counter is
 -- exercised rather than always reading zero.
 ('aaaaaaaa-aaaa-4aaa-8aaa-000000000a04','00000000-0000-0000-0000-000000000001',
  'Marketing analytics pilot','Nepal','United States',null,
  'Customer segment identifiers; campaign engagement','Pilot — ~5,000 records','critical',
  'None in place. Transfer suspended pending mechanism selection and a completed assessment.',
  'in_progress','2026-09-30','vendor-005')
on conflict (id) do nothing;
update public.transfer_impact_assessments set title = transfer_name where title is null and transfer_name is not null;

-- ── DPIA register (Art. 35), linked to RoPA activities and AI systems ───────

insert into public.dpia_assessments
 (id, org_id, reference, title, description, processing_purpose, necessity_justification,
  data_categories, data_subjects, risk_level, identified_risks, mitigation_measures,
  residual_risk_level, consultation_required, consultation_date, status, dpo_opinion,
  dpo_reviewed_at, approved_by, approved_at, next_review_at, owner_name,
  linked_model_ids, linked_ropa_id)
values
 ('bbbbbbbb-bbbb-4bbb-8bbb-000000000b01','00000000-0000-0000-0000-000000000001',
  'DPIA-2026-001','Automated credit scoring — Krishi Karja',
  'Assessment of automated creditworthiness evaluation for agricultural lending, which produces legal effects for applicants.',
  'Assess repayment capacity for agricultural loan applications',
  'Manual assessment cannot scale to seasonal application volumes; automation is necessary for timely decisions during planting windows. Scope limited to a recommendation, with a branch officer retaining the decision.',
  array['Identity','Financial history','Land holding','CIB repayment history'],
  'Loan applicants across all seven provinces','high',
  'Automated decision with legal effect (Art. 22); under-representation of Karnali and Sudurpashchim in training data risks systematic disadvantage; adverse-action reasons may be unintelligible to applicants.',
  'Human review of every decline before it is issued; quarterly bias audit across provinces; reason codes tested for intelligibility with branch officers; applicant right to contest documented in the notice.',
  'medium',true,'2026-05-12','approved',
  'Residual risk acceptable given mandatory human review of declines. Re-assess if the human-review step is ever relaxed.',
  '2026-04-28','Deepa Karki','2026-05-20','2027-05-20','Nabin Maharjan',
  array['83a20820-aa10-4216-8ad6-80e4261071cf']::uuid[],(select id from public.ropa_records where id = '99999999-9999-4999-8999-000000000901'::uuid)),
 ('bbbbbbbb-bbbb-4bbb-8bbb-000000000b02','00000000-0000-0000-0000-000000000001',
  'DPIA-2026-002','Remittance fraud detection',
  'Large-scale monitoring of remittance payouts for structuring and mule-account behaviour.',
  'Detect and prevent money laundering in inbound remittance flows',
  'Required by AML/CFT obligations; systematic monitoring is the only effective control at the transaction volumes involved.',
  array['Beneficiary identity','Transaction amount','Corridor','Device metadata'],
  'Remittance beneficiaries and senders','high',
  'Systematic monitoring of a vulnerable population; false positives can freeze funds families depend on; corridor features may proxy for nationality.',
  'Human review before any account restriction; corridor-level fairness monitoring; documented appeal route; false-positive rate tracked monthly.',
  'high',true,null,'in_progress',
  'Residual risk remains high pending the festival-surge recalibration. Prior consultation with the supervisory authority should be scheduled before the next Dashain window.',
  '2026-07-15',null,null,'2026-09-30','Bikash Thapa',
  array['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']::uuid[],(select id from public.ropa_records where id = '99999999-9999-4999-8999-000000000902'::uuid)),
 ('bbbbbbbb-bbbb-4bbb-8bbb-000000000b03','00000000-0000-0000-0000-000000000001',
  'DPIA-2026-003','KYC document OCR at onboarding',
  'Automated extraction of identity data from citizenship and passport documents.',
  'Verify customer identity at account opening',
  'Manual transcription is slower and demonstrably more error-prone; automation reduces both onboarding time and keying errors.',
  array['Citizenship document images','Extracted identity fields'],
  'New and re-verified customers','medium',
  'Lower extraction accuracy on handwritten pre-2047 BS documents disadvantages older and rural applicants; document images are sensitive if breached.',
  'Manual review path for low-confidence extractions; images encrypted and access-limited; extraction confidence recorded per document.',
  'low',false,null,'approved',
  'Residual risk low once the manual-review fallback is enforced for confidence below threshold.',
  '2026-06-10','Deepa Karki','2026-06-18','2027-06-18','Nabin Maharjan',
  array['30e2d2ae-b71d-49eb-9b90-daf0d78aa070']::uuid[],(select id from public.ropa_records where id = '99999999-9999-4999-8999-000000000903'::uuid)),
 ('bbbbbbbb-bbbb-4bbb-8bbb-000000000b04','00000000-0000-0000-0000-000000000001',
  'DPIA-2026-004','Customer support copilot',
  'Generative assistant handling customer support conversations in Nepali and English, with account context retrieved during the session.',
  'Provide grounded support answers and reduce handling time',
  'Volume of routine queries makes assisted handling proportionate; the assistant recommends, and an agent remains in the conversation.',
  array['Conversation transcripts','Retrieved account context'],
  'Customers contacting support','high',
  'Transcripts and retrieved account context leave the country for inference; prompt-injection could induce disclosure of another customer''s data; romanized-Nepali jailbreaks are not fully blocked.',
  'PII redaction before egress; guardrail chain with adversarial testing each month; no training on customer data by contract; human handover on request; transcripts retained 90 days.',
  'high',true,null,'pending_review',
  'Cannot approve while the romanized-Nepali jailbreak gap remains open. Prior consultation likely required if residual risk is not reduced before launch.',
  '2026-08-05',null,null,'2026-09-15','Sarita Poudel',
  array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[],(select id from public.ropa_records where id = '99999999-9999-4999-8999-000000000904'::uuid))
on conflict (id) do nothing;

-- ── Interlink rollout ───────────────────────────────────────────────────────
-- These five columns resolved 100% but were populated on zero rows: the schema
-- supported the relationship and the UI rendered "—" for every record. A
-- resolve query passes trivially when there is nothing to resolve, so coverage
-- is now tracked separately in docs/architecture/interlink-map.md.

update public.dsar_requests set
  ai_systems_affected = array['Krishi Karja Credit Scorer','KYC Document OCR'],
  linked_model_ids = array['83a20820-aa10-4216-8ad6-80e4261071cf','30e2d2ae-b71d-49eb-9b90-daf0d78aa070']::uuid[],
  regulation = 'GDPR Art. 15', assignee = 'Deepa Karki'
where id = '0a9001fd-b97c-4ff8-aa99-310f5fbf2701';

update public.dsar_requests set
  ai_systems_affected = array['Krishi Karja Credit Scorer','Customer Support Copilot'],
  linked_model_ids = array['83a20820-aa10-4216-8ad6-80e4261071cf','bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[],
  regulation = 'GDPR Art. 20', assignee = 'Deepa Karki'
where id = 'f59615d1-e764-4c0d-bb59-fbd2ba18472c';

update public.dsar_requests set
  ai_systems_affected = array['Remittance Fraud Engine'],
  linked_model_ids = array['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']::uuid[],
  regulation = 'GDPR Art. 15', assignee = 'Bikash Thapa'
where id = 'ee737b56-5f70-4c54-942f-78327d87bc2d';

update public.dsar_requests set
  ai_systems_affected = array['Customer Support Copilot','KYC Document OCR'],
  linked_model_ids = array['bd167875-01d2-4afb-aa11-b25b6dbd4d09','30e2d2ae-b71d-49eb-9b90-daf0d78aa070']::uuid[],
  regulation = 'GDPR Art. 17', assignee = 'Sarita Poudel'
where id = '3f06a442-6193-4d3a-b552-fd1228e246b4';

update public.dsar_requests set
  ai_systems_affected = array['Customer Support Copilot'],
  linked_model_ids = array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[],
  regulation = coalesce(regulation, 'GDPR Art. 15')
where coalesce(array_length(ai_systems_affected,1),0) = 0;

update public.consent_records set
  ai_systems = array['Customer Support Copilot'],
  linked_model_ids = array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[],
  data_categories = array['Conversation transcripts','Account context'],
  channel = coalesce(channel, 'Mobile App')
where coalesce(array_length(ai_systems,1),0) = 0
  and id in (select id from consent_records order by created_at limit 5);

update public.consent_records set
  ai_systems = array['Krishi Karja Credit Scorer'],
  linked_model_ids = array['83a20820-aa10-4216-8ad6-80e4261071cf']::uuid[],
  data_categories = array['Financial history','Land holding'],
  channel = coalesce(channel, 'Branch')
where coalesce(array_length(ai_systems,1),0) = 0;
