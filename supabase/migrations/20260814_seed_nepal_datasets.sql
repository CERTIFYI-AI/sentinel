-- =============================================================================
-- Seed — Nepal-grounded demo data for the AI Assets datasets family.
-- Org: 00000000-0000-0000-0000-000000000001 (the org all live ai_models /
-- use_cases rows belong to). Every link targets a REAL row in the platform
-- id-space: used_in_models carries ai_models uuids, used_in_use_cases carries
-- use_cases ids, and quality/DSAR rows join by looking the datasets up by name.
--
-- Idempotent: every insert is guarded by WHERE NOT EXISTS on (tenant, name /
-- natural key), so re-running is a no-op and user-created rows are untouched.
-- =============================================================================

-- ── 1. Datasets ──────────────────────────────────────────────────────────────

INSERT INTO public.datasets
  (tenant_id, name, version, description, type, classification, status, owner,
   source, license, format, contains_pii, demographic_data, known_biases,
   bias_mitigation, collection_method, preprocessing_steps, used_in_models,
   used_in_use_cases, record_count, encryption, retention_policy,
   last_audit_date, pii_types, upstream_sources, ingestion_method, sla,
   schema_definition)
SELECT * FROM (VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'CIB Credit History Extracts', '2083-Q1',
    'Borrower credit histories extracted from the Nepal Rastra Bank Credit Information Bureau (Karja Suchana Kendra), joined with internal core-banking loan performance. Primary training data for consumer credit decisioning.',
    'tabular', 'restricted', 'active', 'Credit Risk Analytics — Prabin Maharjan',
    'NRB Credit Information Bureau (CIB)', 'NRB CIB member-institution agreement', 'Parquet',
    true, false,
    'Thin-file borrowers (first-time and rural applicants) are underrepresented relative to Kathmandu-valley salaried borrowers.',
    'Thin-file segment reweighting; alternative repayment signals (utility, telecom top-up) under evaluation.',
    'Weekly CIB member extract + core banking join',
    'Citizenship-number tokenization; NPR amount normalization; loan-state encoding; 36-month repayment window features',
    ARRAY['83a20820-aa10-4216-8ad6-80e4261071cf','820f578e-713b-498d-b36e-ddace8dde1dd','bad4bd0a-f588-4344-bea8-2b8a9564351c'],
    ARRAY['UC-CREDIT-001'],
    2840000::bigint, 'AES-256 at rest', '7 years (NRB directive)',
    DATE '2026-07-02',
    ARRAY['Citizenship number (tokenized)','Loan account number','Date of birth','Full name'],
    ARRAY['NRB CIB member extract','Core Banking System (Pumori CBS)'],
    'Batch ETL · Weekly (Sunday 02:00 NPT)', 'By Sunday 06:00 NPT',
    '[{"column":"borrower_token","type":"TEXT","pii":true,"nullable":false,"description":"Tokenized citizenship number"},
      {"column":"cib_score","type":"INT","pii":false,"nullable":true,"description":"CIB bureau score"},
      {"column":"loan_amount_npr","type":"NUMERIC(15,2)","pii":false,"nullable":false,"description":"Sanctioned amount in NPR"},
      {"column":"district","type":"TEXT","pii":false,"nullable":true,"description":"Borrower district (77 districts)"},
      {"column":"repayment_state","type":"TEXT","pii":false,"nullable":false,"description":"pass / watchlist / substandard / doubtful / loss"},
      {"column":"default_flag","type":"BOOLEAN","pii":false,"nullable":false,"description":"Historical default label"}]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Mobile Banking Transaction Stream (NPR)', 'live',
    'Real-time NPR transaction events from mobile banking, connectIPS and QR (NepalPay) rails, enriched with device and session signals for fraud screening.',
    'time_series', 'confidential', 'active', 'Digital Banking Engineering — Sunita Shakya',
    'Mobile banking switch + NCHL connectIPS gateway', 'Internal', 'Avro (Kafka)',
    true, false,
    NULL, NULL,
    'Streaming capture from payment switch',
    'Deduplication; schema validation; velocity features (5-min windows); merchant-category encoding',
    ARRAY['f1b405e7-2da5-402a-a807-7f40898b3ff5','e61f991b-7da7-4b81-9deb-aa8665bb6ac1'],
    ARRAY['UC-FRAUD-001'],
    NULL::bigint, 'TLS in transit · AES-256 at rest', '90 days hot · 5 years cold (NRB AML/CFT)',
    DATE '2026-07-21',
    ARRAY['Account number (masked)','Mobile number','Device ID'],
    ARRAY['Mobile banking switch','NCHL connectIPS','NepalPay QR gateway'],
    'Streaming · Real-time', '< 500 ms end-to-end lag',
    '[{"column":"txn_id","type":"UUID","pii":false,"nullable":false,"description":"Transaction identifier"},
      {"column":"account_masked","type":"TEXT","pii":true,"nullable":false,"description":"Masked account number"},
      {"column":"amount_npr","type":"NUMERIC(15,2)","pii":false,"nullable":false,"description":"Amount in NPR"},
      {"column":"channel","type":"TEXT","pii":false,"nullable":false,"description":"mobile / connectIPS / QR"},
      {"column":"is_fraud","type":"BOOLEAN","pii":false,"nullable":true,"description":"Confirmed-fraud label (delayed)"}]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Remittance Corridor Flows', '2082-83',
    'Inbound remittance transactions across the Gulf (UAE, Qatar, Saudi Arabia), Malaysia and South Korea corridors, used for AML pattern screening and fraud detection.',
    'tabular', 'confidential', 'active', 'AML & Compliance — Kiran Kumar Yadav',
    'Remittance partners + SWIFT messages', 'Partner data-sharing agreements', 'Parquet',
    true, false,
    'Corridor mix shifts seasonally with migrant-worker cycles; models retrained quarterly to track it.',
    'Quarterly retraining calendar; corridor-share drift monitor.',
    'Daily partner file ingestion + SWIFT MT parsing',
    'Beneficiary tokenization; corridor/currency normalization to NPR; sender-country encoding',
    ARRAY['e61f991b-7da7-4b81-9deb-aa8665bb6ac1'],
    ARRAY['UC-FRAUD-001'],
    9600000::bigint, 'AES-256 at rest', '5 years (AML/CFT directive)',
    DATE '2026-06-15',
    ARRAY['Beneficiary name (tokenized)','Beneficiary account','Sender name (tokenized)'],
    ARRAY['IME/partner settlement files','SWIFT MT103'],
    'Batch ETL · Daily (04:00 NPT)', 'By 06:00 NPT daily',
    '[]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'KYC Document Corpus (Citizenship & NID)', 'v2.4',
    'Scanned citizenship certificates, National Identity cards and PAN documents collected during account onboarding, with OCR ground-truth labels for document parsing models.',
    'image', 'restricted', 'active', 'Onboarding Operations — Deepa Adhikari',
    'Branch + Nagarik App-assisted onboarding scans', 'Internal — data-subject consent at onboarding', 'JPEG + JSONL labels',
    true, true,
    'Older handwritten citizenship certificates (pre-2050 BS) OCR poorly; rural-district documents overrepresented in the error tail.',
    'Handwritten-document augmentation set; human review queue for low-confidence parses.',
    'Onboarding scan capture with consent',
    'De-skew; PII-region annotation; Devanagari + Latin OCR ground-truthing',
    ARRAY['73fb19ae-e0b0-4e68-822c-9fb11c830c24','b0e95abb-fbc5-4f1e-afd7-18f0c8073fe0'],
    ARRAY[]::text[],
    412000::bigint, 'AES-256 at rest · restricted bucket', '10 years after account closure',
    DATE '2026-05-04',
    ARRAY['Citizenship number','NID number','PAN','Photograph','Full name','Address'],
    ARRAY['Branch scanner uplink','Nagarik App-assisted onboarding'],
    'Batch upload · Continuous', 'Parse within 15 min of upload',
    '[{"column":"doc_id","type":"UUID","pii":false,"nullable":false,"description":"Document identifier"},
      {"column":"doc_type","type":"TEXT","pii":false,"nullable":false,"description":"citizenship / nid / pan"},
      {"column":"image_uri","type":"TEXT","pii":true,"nullable":false,"description":"Restricted-bucket object key"},
      {"column":"ocr_ground_truth","type":"JSONB","pii":true,"nullable":true,"description":"Labeled field values"}]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Nepali–English Support Conversation Corpus', 'v1.7',
    'Anonymized chat and call transcripts in Nepali (Devanagari), romanized Nepali and English, used to train and evaluate the customer support copilot.',
    'text_corpus', 'confidential', 'active', 'CX Analytics — Roshan Karki',
    'Support chat platform + call transcription', 'Internal — consent via service terms', 'JSONL',
    true, false,
    'Code-switched (romanized Nepali) turns are under-covered versus pure Devanagari and English; Maithili and Bhojpuri queries effectively absent.',
    'Romanized-Nepali augmentation; Terai-language coverage tracked as a backlog item.',
    'Consent-gated transcript capture',
    'PII scrubbing (names, numbers); Devanagari normalization; turn segmentation; intent labeling',
    ARRAY['bd167875-01d2-4afb-aa11-b25b6dbd4d09'],
    ARRAY['UC-SUPPORT-001'],
    1350000::bigint, 'AES-256 at rest', '3 years',
    DATE '2026-07-10',
    ARRAY['Customer name (scrubbed)','Mobile number (scrubbed)'],
    ARRAY['In-app chat platform','Call-center transcription'],
    'Batch ETL · Nightly (01:00 NPT)', 'By 03:00 NPT nightly',
    '[]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'HR Applicant Pool 2081-82', 'v3.0',
    'Job applications received across all seven provinces for officer and assistant-level roles, used to train the CV screening model. Under active bias remediation.',
    'tabular', 'restricted', 'active', 'People & Culture — Sarita Bhattarai',
    'Recruitment portal', 'Internal — applicant consent', 'CSV',
    true, true,
    'Historical shortlists skew male and Kathmandu-valley; Karnali and Madhesh province applicants are underrepresented in positive labels.',
    'Balanced re-sampling by province and gender; protected attributes withheld from features; quarterly bias audit via the Bias Audits module.',
    'Portal submissions with consent',
    'Name/gender/ethnicity removal from feature set; education-board normalization; experience parsing',
    ARRAY['4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb'],
    ARRAY['UC-HR-001'],
    48500::bigint, 'AES-256 at rest', '2 years after cycle close',
    DATE '2026-03-20',
    ARRAY['Full name','Contact details','Citizenship number','Photograph'],
    ARRAY['Recruitment portal exports'],
    'Batch ETL · Per recruitment cycle', 'Within 24 h of cycle close',
    '[]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Digital Banking Churn Feature Store', '2083-04',
    'Pseudonymized monthly activity aggregates per digital-banking customer — login frequency, product holdings, QR usage, balance trends — for churn prediction.',
    'tabular', 'internal', 'active', 'Data Science — Nabin Raut',
    'Warehouse aggregate of core banking + digital channels', 'Internal', 'Parquet',
    false, false,
    NULL, NULL,
    'Monthly warehouse aggregation',
    'Customer pseudonymization; 12-month rolling windows; NPR balance bucketing',
    ARRAY['678da9f6-900d-4c60-b67f-ea92c12f927c','0fac9e56-8ddf-47eb-922e-ed11086fd260'],
    ARRAY['UC-CHURN-001'],
    1120000::bigint, 'AES-256 at rest', '3 years',
    DATE '2026-07-28',
    ARRAY[]::text[],
    ARRAY['Enterprise data warehouse'],
    'Batch ETL · Monthly (1st, 03:00 NPT)', 'By the 2nd of each month',
    '[]'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Agricultural Loan Applications (7 Provinces)', '2082-83',
    'Subsidized agricultural (krishi karja) loan applications with landholding, crop and cooperative details, scored by the loan approval assistant under the priority-sector program.',
    'tabular', 'restricted', 'active', 'Priority Sector Lending — Gopal Chaudhary',
    'Branch + cooperative partner intake', 'Internal — applicant consent', 'CSV',
    true, true,
    'Landholding documentation quality varies sharply by province; Madhesh applications carry more missing fields, risking systematic rejection.',
    'Missing-field imputation reviewed by credit officers; province-level approval-rate monitoring.',
    'Branch intake digitization',
    'Land-area unit normalization (ropani/kattha/bigha → ha); crop-type encoding; cooperative-membership join',
    ARRAY['bad4bd0a-f588-4344-bea8-2b8a9564351c','83a20820-aa10-4216-8ad6-80e4261071cf'],
    ARRAY['UC-CREDIT-001'],
    86300::bigint, 'AES-256 at rest', '7 years (NRB directive)',
    DATE '2026-06-30',
    ARRAY['Full name','Citizenship number','Landholding certificate number'],
    ARRAY['Branch intake forms','Cooperative partner files'],
    'Batch ETL · Weekly', 'By Monday 10:00 NPT',
    '[]'::jsonb
  )
) AS v(tenant_id, name, version, description, type, classification, status, owner,
       source, license, format, contains_pii, demographic_data, known_biases,
       bias_mitigation, collection_method, preprocessing_steps, used_in_models,
       used_in_use_cases, record_count, encryption, retention_policy,
       last_audit_date, pii_types, upstream_sources, ingestion_method, sla,
       schema_definition)
WHERE NOT EXISTS (
  SELECT 1 FROM public.datasets d
  WHERE d.tenant_id = v.tenant_id AND d.name = v.name AND d.is_deleted = false
);

-- ── 2. Data quality assessments (Art. 10) ────────────────────────────────────
-- overall = round(mean of 6 dimensions + bias*100); status from the weakest
-- dimension (>=80 met, >=60 partial, else not_met) — same rule the UI derives.

INSERT INTO public.data_quality_assessments
  (tenant_id, dataset_id, model_id, completeness, accuracy, consistency,
   representativeness, bias_score, relevance, timeliness, overall_score,
   art10_status, assessment_method, assessor, deficiencies, assessed_at)
SELECT '00000000-0000-0000-0000-000000000001', d.id, v.model_id,
       v.completeness, v.accuracy, v.consistency, v.representativeness,
       v.bias_score, v.relevance, v.timeliness, v.overall_score,
       v.art10_status, v.assessment_method, v.assessor, v.deficiencies, v.assessed_at
FROM (VALUES
  ('CIB Credit History Extracts', '83a20820-aa10-4216-8ad6-80e4261071cf'::uuid,
   94, 91, 90, 84, 0.86, 95, 92, 90, 'met', 'automated', 'Data Quality Pipeline',
   '[]'::jsonb, DATE '2026-07-02'),
  ('Mobile Banking Transaction Stream (NPR)', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1'::uuid,
   98, 93, 95, 88, 0.90, 96, 97, 94, 'met', 'automated', 'Data Quality Pipeline',
   '[]'::jsonb, DATE '2026-07-21'),
  ('KYC Document Corpus (Citizenship & NID)', '73fb19ae-e0b0-4e68-822c-9fb11c830c24'::uuid,
   90, 74, 82, 80, 0.84, 92, 88, 84, 'partial', 'hybrid', 'Deepa Adhikari',
   '[{"issue":"OCR accuracy drops on pre-2050 BS handwritten citizenship certificates","dimension":"Accuracy","severity":"High","remediation":"Expand handwritten augmentation set; route low-confidence parses to human review"}]'::jsonb,
   DATE '2026-05-04'),
  ('Nepali–English Support Conversation Corpus', 'bd167875-01d2-4afb-aa11-b25b6dbd4d09'::uuid,
   86, 81, 79, 72, 0.80, 90, 85, 82, 'partial', 'hybrid', 'Roshan Karki',
   '[{"issue":"Romanized-Nepali (code-switched) turns under-covered versus Devanagari and English","dimension":"Representativeness","severity":"Medium","remediation":"Add romanized-Nepali augmentation and targeted transcript sampling"}]'::jsonb,
   DATE '2026-07-10'),
  ('HR Applicant Pool 2081-82', '4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb'::uuid,
   78, 72, 70, 52, 0.62, 74, 66, 68, 'not_met', 'manual', 'Sarita Bhattarai',
   '[{"issue":"Karnali and Madhesh province applicants underrepresented in positive (shortlisted) labels","dimension":"Representativeness","severity":"Critical","remediation":"Balanced re-sampling by province; quarterly fairness audit before any production use"},
     {"issue":"Historical shortlists skew male","dimension":"Bias-Free","severity":"Critical","remediation":"Withhold protected attributes; apply counterfactual fairness checks in the Bias Audits module"}]'::jsonb,
   DATE '2026-03-20')
) AS v(dataset_name, model_id, completeness, accuracy, consistency,
       representativeness, bias_score, relevance, timeliness, overall_score,
       art10_status, assessment_method, assessor, deficiencies, assessed_at)
JOIN public.datasets d
  ON d.tenant_id = '00000000-0000-0000-0000-000000000001'
 AND d.name = v.dataset_name AND d.is_deleted = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.data_quality_assessments q
  WHERE q.dataset_id = d.id AND q.assessed_at = v.assessed_at
    AND q.model_id IS NOT DISTINCT FROM v.model_id
);

-- ── 3. DSAR requests ─────────────────────────────────────────────────────────

INSERT INTO public.dsar_requests
  (org_id, requester_name, requester_email, request_type, description, status,
   priority, due_date, completed_at, dataset_id)
SELECT '00000000-0000-0000-0000-000000000001'::uuid, v.requester_name,
       v.requester_email, v.request_type, v.description, v.status, v.priority,
       v.due_date, v.completed_at, d.id
FROM (VALUES
  ('Sita Gurung', 'sita.gurung@example.com', 'access',
   'Requests a copy of all credit-history data held about her, citing an unexpected CIB score drop after a cooperative loan was cleared.',
   'pending', 'normal', CURRENT_DATE + 21, NULL::timestamptz,
   'CIB Credit History Extracts'),
  ('Ramesh Shrestha', 'ramesh.shrestha@example.com', 'deletion',
   'Account closed in Falgun 2082; requests deletion of KYC document scans beyond the regulatory retention minimum.',
   'in_progress', 'high', CURRENT_DATE + 9, NULL::timestamptz,
   'KYC Document Corpus (Citizenship & NID)'),
  ('Anita Maharjan', 'anita.maharjan@example.com', 'portability',
   'Requests machine-readable export of her mobile-banking transaction history for the last fiscal year (2082/83).',
   'completed', 'normal', CURRENT_DATE - 12, now() - interval '15 days',
   'Mobile Banking Transaction Stream (NPR)'),
  ('Bikash Tamang', 'bikash.tamang@example.com', 'access',
   'Foreign-employment returnee; requests remittance transaction records used in the fraud review that froze his account.',
   'pending', 'high', CURRENT_DATE - 4, NULL::timestamptz,
   'Remittance Corridor Flows')
) AS v(requester_name, requester_email, request_type, description, status,
       priority, due_date, completed_at, dataset_name)
JOIN public.datasets d
  ON d.tenant_id = '00000000-0000-0000-0000-000000000001'
 AND d.name = v.dataset_name AND d.is_deleted = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.dsar_requests r
  WHERE r.org_id = '00000000-0000-0000-0000-000000000001'
    AND r.requester_email = v.requester_email AND r.request_type = v.request_type
);
