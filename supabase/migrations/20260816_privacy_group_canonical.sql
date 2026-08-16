-- 20260816_privacy_group_canonical.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- PRIVACY group backend repair. Audit of DSR / Consent / DPIA / TIA / RoPA
-- found the first three defective; TIA and RoPA were migrated separately in
-- 20260816_* earlier the same day.
--
-- 1. DSR was silently losing every write.
--    `dsrRequestsService` sent `tenant_id` — a column that does not exist on
--    `dsar_requests` (the table is scoped by `org_id`). Postgres rejected each
--    upsert, the service caught the error and returned the input record, and
--    the UI reported success. No data subject request submitted through the UI
--    had ever been persisted. Under GDPR Art. 12(3) an unlogged request is a
--    missed one-month deadline.
--
-- 2. Consent writes were client-tenanted and error-swallowing.
--    Same catch-and-return pattern; `tenant_id` was chosen by the client.
--    Art. 7(1) requires the controller to *demonstrate* consent — a silently
--    unsaved record is indistinguishable from consent never obtained.
--
-- 3. DPIA had no real table at all.
--    The page ran on the generic `dpia_table (id, doc jsonb)` demo table with
--    local-only writes.
--
-- Both pages also rendered fields the tables did not have (AI systems, data
-- categories, regulation, assignee, capture channel), so those values could
-- never persist even when a write succeeded. The columns are added here rather
-- than removed from the UI: they are genuinely governance-relevant, especially
-- the AI-system links that make an erasure request actionable.

-- ── DPIA register (GDPR Art. 35 / Art. 36) ──────────────────────────────────

create table if not exists public.dpia_assessments (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null default current_user_org_id(),
  reference               text,
  title                   text not null,
  description             text,
  processing_purpose      text,
  necessity_justification text,                                    -- Art. 35(7)(b)
  data_categories         text[] not null default '{}',
  data_subjects           text,
  risk_level              text not null default 'medium',          -- inherent
  identified_risks        text,
  mitigation_measures     text,
  residual_risk_level     text,                                    -- after mitigation
  consultation_required   boolean not null default false,          -- Art. 36
  consultation_date       date,
  status                  text not null default 'draft',
  dpo_opinion             text,
  dpo_reviewed_at         date,
  approved_by             text,
  approved_at             date,
  next_review_at          date,
  owner_name              text,
  linked_model_ids        uuid[] not null default '{}',            -- → ai_models.id
  linked_ropa_id          uuid references public.ropa_records(id) on delete set null,
  is_deleted              boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint dpia_assessments_status_check
    check (status in ('draft','in_progress','pending_review','approved','rejected')),
  constraint dpia_assessments_risk_check
    check (risk_level in ('low','medium','high','critical')),
  constraint dpia_assessments_residual_risk_check
    check (residual_risk_level is null or residual_risk_level in ('low','medium','high','critical'))
);

alter table public.dpia_assessments enable row level security;
drop policy if exists dpia_assessments_org_isolation on public.dpia_assessments;
create policy dpia_assessments_org_isolation on public.dpia_assessments
  for all using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());

create index if not exists dpia_assessments_org_idx    on public.dpia_assessments (org_id);
create index if not exists dpia_assessments_status_idx on public.dpia_assessments (status);
create index if not exists dpia_assessments_ropa_idx   on public.dpia_assessments (linked_ropa_id);

-- ── Consent records: org-scope + the fields the page actually renders ───────

alter table public.consent_records
  alter column tenant_id set default (current_user_org_id())::text;

alter table public.consent_records enable row level security;
drop policy if exists consent_records_org_isolation on public.consent_records;
create policy consent_records_org_isolation on public.consent_records
  for all
  using (tenant_id = (current_user_org_id())::text)
  with check (tenant_id = (current_user_org_id())::text);

alter table public.consent_records
  add column if not exists subject_name      text,
  add column if not exists subject_email     text,
  add column if not exists ai_systems        text[]  not null default '{}',
  add column if not exists data_categories   text[]  not null default '{}',
  add column if not exists consent_version   text,
  add column if not exists source_ip         text,
  add column if not exists channel           text,
  add column if not exists withdrawal_reason text,
  add column if not exists linked_model_ids  uuid[]  not null default '{}';

create index if not exists consent_records_status_idx on public.consent_records (status);

-- ── DSAR requests: the fields the page renders ─────────────────────────────
-- `ai_systems_affected` is the governance-relevant addition: an erasure or
-- access request must be actionable against the systems that hold the data.

alter table public.dsar_requests
  add column if not exists regulation          text,
  add column if not exists ai_systems_affected text[]  not null default '{}',
  add column if not exists assignee            text,
  add column if not exists submitted_date      date,
  add column if not exists linked_model_ids    uuid[]  not null default '{}',
  add column if not exists is_deleted          boolean not null default false;

create index if not exists dsar_requests_status_idx on public.dsar_requests (status);
create index if not exists dsar_requests_due_idx    on public.dsar_requests (due_date);

-- Seeds for dpia_assessments live alongside this file; they link each
-- assessment to its RoPA processing activity and the AI systems it covers.
