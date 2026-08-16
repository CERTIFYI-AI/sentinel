-- 20260816_govern_addons_foundation.sql
--
-- Governance add-on modules validated in the AI-governance market:
--   * ai_trainings       — AI literacy / training registry (EU AI Act Art.4,
--                          ISO 42001 A.4.4 competence): sessions, attendees,
--                          completion tracking, links to policies & models.
--   * ai_apps            — inventory of third-party AI tools in use by staff
--                          (shadow-AI governance): approval state, trust
--                          grade, allowed data classification, vendor link.
--   * trust_center_config — org-facing AI transparency page configuration
--                          (sections with visibility toggles, badges,
--                          resources, subprocessors drawn from the vendor
--                          registry, contact block).
--
-- Platform contract: org-scoped via RLS with DB-side default
-- (current_user_org_id()), canonical id-spaces (policies.id uuid,
-- vendors.id text, ai_models.id uuid), idempotent DDL + seeds.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AI literacy / training registry
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_trainings (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default current_user_org_id(),
  training_ref     text not null,
  name             text not null,
  description      text,
  provider         text,
  format           text not null default 'e_learning',   -- live | e_learning | workshop | certification
  audience         text,
  duration_hours   numeric,
  status           text not null default 'planned',      -- planned | in_progress | completed | archived
  starts_on        date,
  ends_on          date,
  owner_name       text,
  linked_policy_id uuid references public.policies(id) on delete set null,
  linked_model_ids uuid[] not null default '{}',
  framework_refs   text[] not null default '{}',
  attendees        jsonb not null default '[]'::jsonb,   -- [{name, role, status, completedAt}]
  metadata         jsonb not null default '{}'::jsonb,
  is_deleted       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.ai_trainings enable row level security;
drop policy if exists ai_trainings_org_isolation on public.ai_trainings;
create policy ai_trainings_org_isolation on public.ai_trainings
  for all
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());

create index if not exists ai_trainings_org_idx    on public.ai_trainings (org_id);
create index if not exists ai_trainings_status_idx on public.ai_trainings (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Third-party AI apps inventory (shadow-AI governance)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_apps (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default current_user_org_id(),
  name             text not null,
  category         text not null default 'assistant',    -- assistant | code | content | transcription | analytics | other
  vendor_id        text references public.vendors(id) on delete set null,
  approval_status  text not null default 'under_review', -- approved | under_review | restricted | blocked
  trust_grade      text,                                 -- A | B | C | D | F; null = ungraded
  allowed_data     text not null default 'public',       -- public | internal | confidential | restricted
  business_units   text[] not null default '{}',
  seats            integer,
  discovered_via   text not null default 'declared',     -- declared | sso_audit | network_scan | expense_report
  owner_name       text,
  linked_policy_id uuid references public.policies(id) on delete set null,
  notes            text,
  metadata         jsonb not null default '{}'::jsonb,
  is_deleted       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.ai_apps enable row level security;
drop policy if exists ai_apps_org_isolation on public.ai_apps;
create policy ai_apps_org_isolation on public.ai_apps
  for all
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());

create index if not exists ai_apps_org_idx      on public.ai_apps (org_id);
create index if not exists ai_apps_approval_idx on public.ai_apps (approval_status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trust center configuration (one row per org)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.trust_center_config (
  org_id       uuid primary key default current_user_org_id(),
  doc          jsonb not null default '{}'::jsonb,
  published    boolean not null default false,
  published_at timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.trust_center_config enable row level security;
drop policy if exists trust_center_config_org_isolation on public.trust_center_config;
create policy trust_center_config_org_isolation on public.trust_center_config
  for all
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seeds (demo org) — Nepali-bank narrative consistent with the rest of the
--    platform. Fixed uuids keep the seeds idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. Two governing AI policies (policies table was empty).
insert into public.policies (id, org_id, policy_ref, title, category, status, version, content, tags, effective_at, next_review_at)
values
  ('11111111-1111-4111-8111-000000000101', '00000000-0000-0000-0000-000000000001',
   'POL-AI-001', 'AI Literacy & Competence Policy', 'AI Governance', 'published', '1.2',
   jsonb_build_object(
     'summary', 'All staff who build, validate, operate or supervise AI systems must complete role-appropriate AI literacy training annually. Aligned to EU AI Act Art.4 (adopted as internal benchmark) and ISO/IEC 42001 A.4.4 competence requirements; onboarding cohorts complete foundations training within 30 days.',
     'sections', jsonb_build_array(
       jsonb_build_object('heading', 'Scope', 'body', 'Head office and all 7 province branch staff interacting with AI-assisted decisions (credit, fraud, KYC, support).'),
       jsonb_build_object('heading', 'Requirements', 'body', 'Foundations course for all staff; role tracks for credit officers (fair lending), fraud analysts (alert handling) and support agents (copilot usage).'),
       jsonb_build_object('heading', 'Records', 'body', 'Completion status, dates and assessments are tracked in the AI Literacy registry and retained 5 years for supervision evidence.')
     )),
   array['ai-literacy', 'training', 'eu-ai-act-art4', 'iso42001'],
   '2026-01-15', '2027-01-15'),
  ('11111111-1111-4111-8111-000000000102', '00000000-0000-0000-0000-000000000001',
   'POL-AI-002', 'External AI Tools Acceptable Use Policy', 'AI Governance', 'published', '2.0',
   jsonb_build_object(
     'summary', 'Third-party AI applications may only be used after registration in the AI Apps inventory and approval by AI governance. Customer data, KYC documents and CIB records must never be entered into unapproved tools; approved tools carry a data-classification ceiling.',
     'sections', jsonb_build_array(
       jsonb_build_object('heading', 'Approval states', 'body', 'approved (use within data ceiling), under_review (no customer data), restricted (named teams only), blocked (prohibited; SSO/network enforced).'),
       jsonb_build_object('heading', 'Shadow AI', 'body', 'Tools discovered via SSO audit, network scan or expense reports are auto-registered as under_review and the owning unit is notified.')
     )),
   array['acceptable-use', 'shadow-ai', 'third-party'],
   '2026-03-01', '2026-12-01')
on conflict (id) do nothing;

-- 4b. Training registry.
insert into public.ai_trainings
  (id, org_id, training_ref, name, description, provider, format, audience, duration_hours,
   status, starts_on, ends_on, owner_name, linked_policy_id, linked_model_ids, framework_refs, attendees)
values
  ('22222222-2222-4222-8222-000000000201', '00000000-0000-0000-0000-000000000001',
   'TRN-2026-001', 'AI Literacy Foundations (Nepali/English)',
   'Bilingual e-learning covering what AI systems the bank runs, how automated decisions affect customers, escalation paths, and staff responsibilities under the AI Literacy & Competence Policy.',
   'Learning & Development (internal)', 'e_learning', 'All staff — head office and branches', 3,
   'completed', '2026-04-14', '2026-06-30', 'Deepa Karki',
   '11111111-1111-4111-8111-000000000101', '{}',
   array['EU AI Act Art.4 (benchmark)', 'ISO 42001 A.4.4', 'NRB IT Guidelines 2078'],
   '[
     {"name": "Sunita Sharma",  "role": "Model Risk",        "status": "completed",   "completedAt": "2026-05-02"},
     {"name": "Bikash Thapa",   "role": "Fraud Analytics",   "status": "completed",   "completedAt": "2026-05-10"},
     {"name": "Anita Gurung",   "role": "Fairness Lead",     "status": "completed",   "completedAt": "2026-04-28"},
     {"name": "Nabin Maharjan", "role": "Data Science",      "status": "completed",   "completedAt": "2026-05-15"},
     {"name": "Sarita Poudel",  "role": "Support QA",        "status": "completed",   "completedAt": "2026-06-01"},
     {"name": "Binod K.C.",     "role": "Retail Banking",    "status": "completed",   "completedAt": "2026-06-21"}
   ]'::jsonb),
  ('22222222-2222-4222-8222-000000000202', '00000000-0000-0000-0000-000000000001',
   'TRN-2026-002', 'Fair Lending & Model Bias Awareness',
   'Workshop for credit officers and analysts: prohibited bases (caste/ethnicity, gender, province), how the Credit Risk Scorer is monitored for bias, reading adverse-action explanations, and when to route to human review.',
   'Risk Management + external facilitator', 'workshop', 'Credit operations, all provinces', 6,
   'in_progress', '2026-07-20', '2026-09-30', 'Anita Gurung',
   '11111111-1111-4111-8111-000000000101',
   array['83a20820-aa10-4216-8ad6-80e4261071cf']::uuid[],
   array['NRB fair lending review', 'EU AI Act Art.4 (benchmark)'],
   '[
     {"name": "Binod K.C.",      "role": "Retail Banking",  "status": "completed",   "completedAt": "2026-08-02"},
     {"name": "Prakash Adhikari","role": "CRO office",      "status": "in_progress"},
     {"name": "Kiran Lama",      "role": "Branch Credit",   "status": "enrolled"},
     {"name": "Sarita Poudel",   "role": "Support QA",      "status": "enrolled"}
   ]'::jsonb),
  ('22222222-2222-4222-8222-000000000203', '00000000-0000-0000-0000-000000000001',
   'TRN-2026-003', 'Fraud Model Alert Handling & Overrides',
   'Live session for the fraud desk: interpreting Fraud Detection Engine alerts, remittance-hold SLAs, override logging, and festival-season (Dashain/Tihar) surge procedures.',
   'Fraud Analytics (internal)', 'live', 'Fraud desk, AML unit', 4,
   'planned', '2026-09-08', '2026-09-08', 'Bikash Thapa',
   '11111111-1111-4111-8111-000000000101',
   array['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']::uuid[],
   array['NRB AML/CFT Directive 19', 'ISO 42001 A.4.4'],
   '[
     {"name": "Rajesh Shrestha", "role": "Validator",  "status": "enrolled"},
     {"name": "Deepa Karki",     "role": "Compliance", "status": "enrolled"}
   ]'::jsonb),
  ('22222222-2222-4222-8222-000000000204', '00000000-0000-0000-0000-000000000001',
   'TRN-2026-004', 'Responsible Copilot Usage for Support Agents',
   'E-learning for support agents on the Customer Support Copilot: what it may and may not answer, AI disclosure to customers, handoff triggers, and never pasting customer PII into external tools.',
   'Support Center Kathmandu', 'e_learning', 'Support agents (Nepali/English queues)', 2,
   'completed', '2026-06-10', '2026-07-15', 'Sarita Poudel',
   '11111111-1111-4111-8111-000000000102',
   array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[],
   array['EU AI Act Art.52 transparency', 'Individual Privacy Act 2075'],
   '[
     {"name": "Sarita Poudel", "role": "Support QA",    "status": "completed", "completedAt": "2026-07-01"},
     {"name": "Kiran Lama",    "role": "Support Agent", "status": "completed", "completedAt": "2026-07-08"},
     {"name": "Nabin Maharjan","role": "Data Science",  "status": "exempted"}
   ]'::jsonb)
on conflict (id) do nothing;

-- 4c. Third-party AI apps inventory.
insert into public.ai_apps
  (id, org_id, name, category, vendor_id, approval_status, trust_grade, allowed_data,
   business_units, seats, discovered_via, owner_name, linked_policy_id, notes)
values
  ('33333333-3333-4333-8333-000000000301', '00000000-0000-0000-0000-000000000001',
   'ChatGPT Enterprise', 'assistant', 'vendor-001', 'approved', 'B', 'internal',
   array['Head Office', 'Digital Banking'], 120, 'declared', 'Nabin Maharjan',
   '11111111-1111-4111-8111-000000000102',
   'Approved with data ceiling: internal documents only — no customer PII, KYC images or CIB extracts. DPA signed; EU data residency.'),
  ('33333333-3333-4333-8333-000000000302', '00000000-0000-0000-0000-000000000001',
   'Claude for Work', 'assistant', 'vendor-002', 'approved', 'A', 'internal',
   array['Risk Management', 'Compliance'], 45, 'declared', 'Deepa Karki',
   '11111111-1111-4111-8111-000000000102',
   'Used for policy drafting and regulatory analysis. Zero-retention agreement in place.'),
  ('33333333-3333-4333-8333-000000000303', '00000000-0000-0000-0000-000000000001',
   'GitHub Copilot', 'code', 'vendor-003', 'approved', 'B', 'confidential',
   array['Engineering'], 60, 'declared', 'Nabin Maharjan',
   '11111111-1111-4111-8111-000000000102',
   'Repository-scoped; public-code filter enabled. Secrets scanning enforced pre-commit.'),
  ('33333333-3333-4333-8333-000000000304', '00000000-0000-0000-0000-000000000001',
   'Hugging Face Hub', 'analytics', 'vendor-008', 'restricted', 'C', 'public',
   array['Data Science'], 12, 'declared', 'Nabin Maharjan',
   '11111111-1111-4111-8111-000000000102',
   'Model downloads restricted to the data science team; uploads of bank data prohibited. Model cards reviewed before internal use.'),
  ('33333333-3333-4333-8333-000000000305', '00000000-0000-0000-0000-000000000001',
   'Browser translation add-ons (misc.)', 'content', null, 'under_review', null, 'public',
   array['Branches (7 provinces)'], null, 'network_scan', 'Deepa Karki',
   '11111111-1111-4111-8111-000000000102',
   'Detected via network scan on branch workstations — translating customer correspondence. Under review; interim guidance issued to use the approved copilot instead.'),
  ('33333333-3333-4333-8333-000000000306', '00000000-0000-0000-0000-000000000001',
   'Consumer voice-transcription app', 'transcription', null, 'blocked', 'F', 'public',
   array['Support Center Kathmandu'], null, 'expense_report', 'Sarita Poudel',
   '11111111-1111-4111-8111-000000000102',
   'Found on an expense report; free tier trains on uploaded audio. Blocked at SSO and network; support calls must use the on-prem transcription pipeline.')
on conflict (id) do nothing;

-- 4d. Trust center configuration (published demo).
insert into public.trust_center_config (org_id, doc, published, published_at)
values (
  '00000000-0000-0000-0000-000000000001',
  jsonb_build_object(
    'info', jsonb_build_object(
      'orgName', 'Sentinel Demo Bank',
      'tagline', 'Responsible AI in Nepali banking',
      'heroStatement', 'We use AI to make banking faster and fairer — under human oversight, measurable controls, and transparent governance.'
    ),
    'intro', jsonb_build_object('visible', true,
      'body', 'This page describes how we govern the AI systems used in credit decisions, fraud prevention, KYC onboarding and customer support. Every production model is registered, risk-tiered, validated and monitored on our AI governance platform.'),
    'company', jsonb_build_object('visible', true,
      'body', 'We operate across all 7 provinces of Nepal. Automated decisions that materially affect customers — such as loan adverse actions — always include human review and a plain-language explanation in Nepali.'),
    'badges', jsonb_build_object('visible', true, 'items', jsonb_build_array(
      jsonb_build_object('key', 'iso42001',   'label', 'ISO/IEC 42001 (AI management)', 'enabled', true),
      jsonb_build_object('key', 'iso27001',   'label', 'ISO/IEC 27001',                 'enabled', true),
      jsonb_build_object('key', 'nist_ai_rmf','label', 'NIST AI RMF aligned',           'enabled', true),
      jsonb_build_object('key', 'eu_ai_act',  'label', 'EU AI Act (internal benchmark)','enabled', true),
      jsonb_build_object('key', 'gdpr',       'label', 'GDPR-aligned privacy program',  'enabled', false),
      jsonb_build_object('key', 'soc2',       'label', 'SOC 2 Type II',                 'enabled', false)
    )),
    'resources', jsonb_build_object('visible', true, 'items', jsonb_build_array(
      jsonb_build_object('id', 'R1', 'title', 'AI governance program overview', 'kind', 'pdf',  'uri', 'resource://trust/ai-governance-overview'),
      jsonb_build_object('id', 'R2', 'title', 'Model validation methodology',   'kind', 'pdf',  'uri', 'resource://trust/validation-methodology'),
      jsonb_build_object('id', 'R3', 'title', 'Fairness & bias monitoring statement', 'kind', 'page', 'uri', 'resource://trust/fairness-statement'),
      jsonb_build_object('id', 'R4', 'title', 'Customer explanation samples (Nepali)', 'kind', 'page', 'uri', 'resource://trust/explanations-ne')
    )),
    'subprocessors', jsonb_build_object('visible', true,
      'vendorIds', jsonb_build_array('vendor-001', 'vendor-002', 'vendor-003'),
      'extra', jsonb_build_array()),
    'contact', jsonb_build_object('visible', true,
      'email', 'ai-governance@sentinelbank.example',
      'termsNote', 'Requests about automated decisions can be raised at any branch or through the app; responses within 15 working days per our consumer-protection commitments.')
  ),
  true, now()
)
on conflict (org_id) do update
  set doc = excluded.doc, published = excluded.published, published_at = excluded.published_at, updated_at = now();
