-- 20260816_privacy_vocabulary_and_interlinks.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- PRIVACY group, second pass. 20260816_privacy_group_canonical.sql moved DSR,
-- Consent and DPIA onto real org-scoped tables and stopped the silent write
-- failures. This migration fixes what that pass left behind: the *values* in
-- those tables, and the fact that the statutory privacy records could not
-- reach the AI systems they describe.
--
-- ── 1. Why the vocabularies are being normalized ────────────────────────────
--
-- Neither `dsar_requests` nor `consent_records` had a CHECK constraint on its
-- status, type or priority columns, so successive writers left mixed casing
-- and mixed spellings in the same column. The pages then filtered on values
-- that do not occur, which is why every one of these was silently broken:
--
--   dsar.status       stored pending/in_review/in_progress/completed
--                     page matched 'Pending'/'In Review'/'Completed'
--                     → all four stat cards read 0, all status filters empty
--   dsar.request_type stored access/erasure/deletion/objection/...
--                     page matched 'Access'/'Erasure'/...
--                     → type filter dead, type badge always the grey fallback
--   dsar.priority     stored high(5)/medium(3)/normal(2)
--                     page matched 'High'/'Medium'
--                     → every row rendered a LOW badge, including the 5 highs
--   consent.status    stored active(6)/expired/withdrawn
--                     page counted 'granted'
--                     → "Active Consents" read 0 against 6 active consents
--
-- A governance console that reports zero overdue rights requests because of a
-- casing mismatch is worse than one that reports nothing at all: it is read as
-- an assurance. The CHECK constraints added here are the point of this
-- migration — they stop the drift returning, which no amount of UI care can.
--
-- 'overdue' is deliberately NOT a stored status. It is derived from due_date
-- at read time so it can never go stale against the clock.
--
-- ── 2. Why the link columns are being added ─────────────────────────────────
--
-- Art. 30 records described processing carried out *by AI systems* but held no
-- reference to any of them; a rights request could not name the processing
-- activity it fell under; a breach-driven Art. 34 batch had nowhere to record
-- the incident that caused it. Each record was a dead end, which is exactly
-- what the platform's first principle forbids. All links are stored as ids and
-- resolved to names at render time.

-- Applied via Supabase apply_migration, which wraps the whole file in one
-- transaction; every statement is individually idempotent and safe to re-run.

-- ── DSR: canonical vocabularies ─────────────────────────────────────────────

-- Art. 17 names the right as erasure; 'deletion' was a synonym in flight.
update public.dsar_requests set request_type = 'erasure' where request_type = 'deletion';
update public.dsar_requests set request_type = lower(request_type) where request_type is not null;
update public.dsar_requests set request_type = 'access' where request_type is null
  or request_type not in ('access','rectification','erasure','restriction','portability','objection');

update public.dsar_requests set status = lower(replace(status, ' ', '_')) where status is not null;
update public.dsar_requests set status = 'pending' where status is null
  or status not in ('pending','in_review','in_progress','completed','rejected');

-- 'medium' and 'normal' were the same tier under two names.
update public.dsar_requests set priority = 'normal' where lower(coalesce(priority,'')) in ('medium','');
update public.dsar_requests set priority = lower(priority) where priority is not null;
update public.dsar_requests set priority = 'normal' where priority is null
  or priority not in ('low','normal','high','urgent');

alter table public.dsar_requests
  drop constraint if exists dsar_requests_status_check,
  drop constraint if exists dsar_requests_request_type_check,
  drop constraint if exists dsar_requests_priority_check;

alter table public.dsar_requests
  add constraint dsar_requests_status_check
    check (status in ('pending','in_review','in_progress','completed','rejected')),
  add constraint dsar_requests_request_type_check
    check (request_type in ('access','rectification','erasure','restriction','portability','objection')),
  add constraint dsar_requests_priority_check
    check (priority in ('low','normal','high','urgent'));

alter table public.dsar_requests alter column status set default 'pending';
alter table public.dsar_requests alter column priority set default 'normal';

-- ── Consent: canonical vocabularies ─────────────────────────────────────────

-- 'active' and 'granted' were the same state under two names; Art. 7 speaks of
-- consent being *given*, so 'granted' is the one kept.
update public.consent_records set status = 'granted' where lower(coalesce(status,'')) in ('active','');
update public.consent_records set status = lower(status) where status is not null;
update public.consent_records set status = 'pending' where status is null
  or status not in ('granted','pending','withdrawn','expired');

-- legal_basis was free text ('Consent', 'Consent GDPR Art.6(1)(a)',
-- 'Legitimate Interest'…), so it could not be reconciled against the RoPA
-- register, whose legal_basis is already constrained to these six values.
update public.consent_records set legal_basis = case
  when legal_basis is null                              then null
  when legal_basis ilike 'consent%'                     then 'consent'
  when legal_basis ilike 'contract%'                    then 'contract'
  when legal_basis ilike 'legitimate%'                  then 'legitimate_interests'
  when legal_basis ilike 'legal obligation%'            then 'legal_obligation'
  when legal_basis ilike 'vital%'                       then 'vital_interests'
  when legal_basis ilike 'public task%'                 then 'public_task'
  else 'consent'
end;

-- `type` held a mix of true consent types (explicit/implicit) and values that
-- are really *purposes* (Marketing, Profiling, Automated-Decision). The purpose
-- values are moved into `purposes`, where they belong and where the UI reads
-- them, rather than being discarded.
update public.consent_records
   set purposes = array_append(purposes, type)
 where type is not null
   and lower(type) not in ('explicit','implicit','opt_out')
   and not (purposes @> array[type]);

update public.consent_records set type = 'explicit'
 where type is null or lower(type) not in ('explicit','implicit','opt_out');
update public.consent_records set type = lower(type);

alter table public.consent_records
  drop constraint if exists consent_records_status_check,
  drop constraint if exists consent_records_type_check,
  drop constraint if exists consent_records_legal_basis_check;

alter table public.consent_records
  add constraint consent_records_status_check
    check (status in ('granted','pending','withdrawn','expired')),
  add constraint consent_records_type_check
    check (type in ('explicit','implicit','opt_out')),
  add constraint consent_records_legal_basis_check
    check (legal_basis is null or legal_basis in
      ('consent','contract','legal_obligation','vital_interests','public_task','legitimate_interests'));

alter table public.consent_records alter column status set default 'granted';

-- ── Human-readable references ───────────────────────────────────────────────
-- Statutory registers are cited by reference in correspondence with a
-- supervisory authority; a raw uuid is not a citable identifier, and the UI
-- must never print one. Backfilled in creation order, unique per org.

alter table public.dsar_requests               add column if not exists reference text;
alter table public.ropa_records                add column if not exists reference text;
alter table public.transfer_impact_assessments add column if not exists reference text;

update public.dsar_requests d set reference = s.ref from (
  select id, 'DSR-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
         lpad(row_number() over (partition by org_id, to_char(coalesce(created_at, now()), 'YYYY')
                                 order by created_at, id)::text, 3, '0') as ref
  from public.dsar_requests
) s where s.id = d.id and d.reference is null;

-- consent_ref carried two prefix families from two separate seeds ('CON-001'
-- and 'CONS-2026-006'), and the 'CONS-2026-*' block was numbered against a year
-- that did not match its own created_at. A citable reference has to be one
-- scheme, so every row is renumbered rather than only the empty ones.
update public.consent_records c set consent_ref = s.ref from (
  select id, 'CNS-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
         lpad(row_number() over (partition by tenant_id, to_char(coalesce(created_at, now()), 'YYYY')
                                 order by created_at, id)::text, 3, '0') as ref
  from public.consent_records
) s where s.id = c.id;

update public.ropa_records r set reference = s.ref from (
  select id, 'ROPA-' || lpad(row_number() over (partition by org_id order by created_at, id)::text, 3, '0') as ref
  from public.ropa_records
) s where s.id = r.id and r.reference is null;

update public.transfer_impact_assessments t set reference = s.ref from (
  select id, 'TIA-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
         lpad(row_number() over (partition by org_id, to_char(coalesce(created_at, now()), 'YYYY')
                                 order by created_at, id)::text, 3, '0') as ref
  from public.transfer_impact_assessments
) s where s.id = t.id and t.reference is null;

create unique index if not exists consent_records_tenant_ref_key
  on public.consent_records (tenant_id, consent_ref) where consent_ref is not null;
create unique index if not exists dsar_requests_org_reference_key
  on public.dsar_requests (org_id, reference) where reference is not null;
create unique index if not exists ropa_records_org_reference_key
  on public.ropa_records (org_id, reference) where reference is not null;
create unique index if not exists tia_org_reference_key
  on public.transfer_impact_assessments (org_id, reference) where reference is not null;

-- ── Interlinks ──────────────────────────────────────────────────────────────
-- Ids only. Names are resolved at render time so a rename never leaves a
-- stale label behind in a statutory record.

-- A rights request belongs to a processing activity, may be evidenced by a
-- consent record, and may have been raised by a breach. Without these it is a
-- dead-end row that cannot be actioned against anything.
alter table public.dsar_requests
  add column if not exists linked_ropa_id    uuid references public.ropa_records(id) on delete set null,
  add column if not exists linked_consent_id uuid references public.consent_records(id) on delete set null,
  add column if not exists incident_id       uuid references public.incidents(id) on delete set null,
  add column if not exists linked_risk_id    uuid references public.risks(id) on delete set null,
  -- Art. 34 breach communications are handled as one batch record per incident
  -- rather than one row per subject; these describe that batch honestly.
  add column if not exists legal_basis    text,
  add column if not exists subject_count  integer,
  add column if not exists is_batch       boolean not null default false,
  -- Provenance, matching the convention already on risks/incidents.
  add column if not exists source           text not null default 'manual',
  add column if not exists auto_generated   boolean not null default false,
  add column if not exists created_by_agent text,
  add column if not exists source_event_id  uuid;

alter table public.dsar_requests drop constraint if exists dsar_requests_source_check;
alter table public.dsar_requests add constraint dsar_requests_source_check
  check (source in ('manual','agent','import','portal'));

-- Consent is the lawful basis for a specific processing activity; Art. 7(1)
-- requires the controller to be able to demonstrate which.
alter table public.consent_records
  add column if not exists linked_ropa_id uuid references public.ropa_records(id) on delete set null;

-- An Art. 30 record that names no model, dataset or use case cannot answer the
-- question a supervisory authority actually asks: which system does this?
alter table public.ropa_records
  add column if not exists linked_model_ids     uuid[] not null default '{}',
  add column if not exists linked_dataset_ids   text[] not null default '{}',
  add column if not exists linked_use_case_id   text references public.use_cases(id) on delete set null,
  add column if not exists processor_vendor_id  uuid references public.vendors(id) on delete set null,
  add column if not exists next_review_at       date;

-- A transfer is a transfer *of* a processing activity's data, carried out by
-- named systems.
alter table public.transfer_impact_assessments
  add column if not exists linked_ropa_id   uuid references public.ropa_records(id) on delete set null,
  add column if not exists linked_model_ids uuid[] not null default '{}';

-- A DPIA whose residual risk stays high is a risk the register must carry, and
-- it is nearly always an assessment of a registered use case.
alter table public.dpia_assessments
  add column if not exists linked_risk_id     uuid references public.risks(id) on delete set null,
  add column if not exists linked_use_case_id text references public.use_cases(id) on delete set null;

-- Indexes on the link columns actually used as filters (?model=, ?open=).
create index if not exists dsar_requests_linked_ropa_idx    on public.dsar_requests (linked_ropa_id);
create index if not exists dsar_requests_incident_idx       on public.dsar_requests (incident_id);
create index if not exists consent_records_linked_ropa_idx  on public.consent_records (linked_ropa_id);
create index if not exists ropa_records_use_case_idx        on public.ropa_records (linked_use_case_id);
create index if not exists tia_linked_ropa_idx              on public.transfer_impact_assessments (linked_ropa_id);
create index if not exists dpia_linked_risk_idx             on public.dpia_assessments (linked_risk_id);
