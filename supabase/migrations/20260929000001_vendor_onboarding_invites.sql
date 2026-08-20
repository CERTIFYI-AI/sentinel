-- Why: vendor onboarding gains questionnaire invitations — pick packs at
-- intake, the platform emails the vendor contact a tokenized link, the
-- vendor fills the questionnaire WITHOUT logging in (24-hour window), and
-- the submission lands on the vendor profile.
--
-- The audit that preceded this also found live-schema drift of the same
-- class as the controls table: `vendors` lacks most columns
-- vendorService.toRow writes (contact_email, status, dpa_*, soc2_*, …) and
-- `vendor_questionnaires` lacks template_version / max_score / respondent /
-- vendor_uuid / expires_at — so vendor create/edit and questionnaire submit
-- failed against live. Parts A and B heal that contract.
--
-- Part C adds `vendor_questionnaire_invites`. Design:
--   * token: 48-hex random, unique — the capability that lets the vendor
--     fill without an account. RLS keeps rows org-only for authenticated
--     reads; the anonymous fill path goes through the
--     vendor-questionnaire-fill edge function (service role), which is the
--     only thing that can resolve a token.
--   * questions are SNAPSHOTTED onto the invite at send time, so the vendor
--     fills exactly what was sent even if the pack is edited later.
--   * expires_at defaults to now() + 24 hours per the onboarding contract.
-- Idempotent throughout.

-- ── A. Heal the vendors write contract ──────────────────────────────────
alter table public.vendors add column if not exists name text;
alter table public.vendors add column if not exists description text;
alter table public.vendors add column if not exists status text;
alter table public.vendors add column if not exists contact_email text;
alter table public.vendors add column if not exists risk_tier_label text;
alter table public.vendors add column if not exists criticality text;
alter table public.vendors add column if not exists inherent_risk text;
alter table public.vendors add column if not exists residual_risk text;
alter table public.vendors add column if not exists score numeric;
alter table public.vendors add column if not exists services text[];
alter table public.vendors add column if not exists ai_use text;
alter table public.vendors add column if not exists dpa_status text;
alter table public.vendors add column if not exists dpa_signed_at date;
alter table public.vendors add column if not exists dpa_expires_at date;
alter table public.vendors add column if not exists data_classification text;
alter table public.vendors add column if not exists data_access_level text;
alter table public.vendors add column if not exists data_regions text[];
alter table public.vendors add column if not exists transfer_mechanism text;
alter table public.vendors add column if not exists soc2_certified boolean;
alter table public.vendors add column if not exists soc2_expires_at date;
alter table public.vendors add column if not exists iso_certified boolean;
alter table public.vendors add column if not exists iso_expires_at date;
alter table public.vendors add column if not exists last_pentest_at date;
alter table public.vendors add column if not exists breach_history_count integer;
alter table public.vendors add column if not exists last_breach_summary text;
alter table public.vendors add column if not exists subprocessor_count integer;
alter table public.vendors add column if not exists fourth_party_exposure text;
alter table public.vendors add column if not exists exit_plan_status text;
alter table public.vendors add column if not exists exit_plan_notes text;
alter table public.vendors add column if not exists reassessment_cadence_months integer;
alter table public.vendors add column if not exists reassessment_due_at date;
alter table public.vendors add column if not exists last_assessed_at date;
alter table public.vendors add column if not exists business_owner text;
alter table public.vendors add column if not exists vendor_manager text;
alter table public.vendors add column if not exists contract_start date;
alter table public.vendors add column if not exists contract_expiry date;
alter table public.vendors add column if not exists renewal_notice_days integer;
alter table public.vendors add column if not exists annual_spend numeric;
alter table public.vendors add column if not exists spend_currency text;
alter table public.vendors add column if not exists insurance_coverage text;
alter table public.vendors add column if not exists metadata jsonb;

-- Rows that predate the heal keep their display name.
update public.vendors set name = vendor_name where name is null and vendor_name is not null;

-- ── B. Heal the vendor_questionnaires write contract ────────────────────
alter table public.vendor_questionnaires add column if not exists vendor_uuid text;
alter table public.vendor_questionnaires add column if not exists template_version text;
alter table public.vendor_questionnaires add column if not exists max_score double precision;
alter table public.vendor_questionnaires add column if not exists respondent text;
alter table public.vendor_questionnaires add column if not exists respondent_email text;
alter table public.vendor_questionnaires add column if not exists expires_at timestamptz;
alter table public.vendor_questionnaires add column if not exists reviewer text;
alter table public.vendor_questionnaires add column if not exists decision text;
alter table public.vendor_questionnaires add column if not exists reviewed_at timestamptz;

-- ── C. Questionnaire invites ────────────────────────────────────────────
create extension if not exists pgcrypto;

create table if not exists public.vendor_questionnaire_invites (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default current_user_org_id(),
  vendor_id        text not null,
  template_slug    text not null,
  template_name    text not null,
  template_version text not null,
  questions        jsonb not null,
  sent_to          text not null,
  token            text not null unique default encode(gen_random_bytes(24), 'hex'),
  status           text not null default 'pending'
                   check (status in ('pending','completed','expired','cancelled')),
  expires_at       timestamptz not null default now() + interval '24 hours',
  questionnaire_id text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
comment on table public.vendor_questionnaire_invites is
  'Tokenized no-login questionnaire invitations sent to vendor contacts at onboarding. The token is the capability; the anonymous fill path resolves it only through the vendor-questionnaire-fill edge function (service role). questions snapshot the pack at send time; expires_at enforces the 24-hour window.';

alter table public.vendor_questionnaire_invites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='vendor_questionnaire_invites' and policyname='vqi_org_isolation') then
    create policy vqi_org_isolation on public.vendor_questionnaire_invites
      for all using (org_id = current_user_org_id())
      with check (org_id = current_user_org_id());
  end if;
end $$;

create index if not exists idx_vqi_vendor on public.vendor_questionnaire_invites(vendor_id);
create index if not exists idx_vqi_token on public.vendor_questionnaire_invites(token);
