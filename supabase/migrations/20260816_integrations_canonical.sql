-- 20260816_integrations_canonical.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- Integrations & connectivity foundation:
--   * public.integrations — canonical, org-scoped connector registry. Replaces
--     the generic `integrations_table (id, doc jsonb)` demo table the page was
--     wired to, which violated the platform contract (real backend, org-scoped).
--   * webhook_endpoints — existed but was orphaned: no UI, no RLS policy, and
--     tenant_id had no default, so a client decided its own tenant. Now scoped
--     and surfaced in the Integrations module.
--   * tasks.tenant_id defaulted to the literal 'default' rather than the
--     caller's org, so new rows landed outside org isolation. Matches
--     use_cases now.
--
-- Seeds use the Nepali-bank narrative: CIB credit-bureau extract, NRB
-- supervisory reporting, core banking loan origination, the remittance switch,
-- SIEM, SSO (which feeds shadow-AI discovery in the AI Apps module), an issue
-- tracker, and team messaging.

create table if not exists public.integrations (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null default current_user_org_id(),
  name           text not null,
  provider       text,
  category       text not null default 'other',    -- credit_bureau | regulator | core_banking | payments | monitoring | identity | ticketing | communication | mlops | storage | other
  status         text not null default 'configuring', -- connected | degraded | error | disconnected | configuring
  auth_method    text,
  description    text,
  data_flows     text[] not null default '{}',
  health         text not null default 'unknown',  -- passing | degraded | failing | unknown
  direction      text not null default 'inbound',  -- inbound | outbound | bidirectional
  last_sync_at   timestamptz,
  connected_at   date,
  owner_name     text,
  config         jsonb not null default '{}'::jsonb,
  is_deleted     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.integrations enable row level security;
drop policy if exists integrations_org_isolation on public.integrations;
create policy integrations_org_isolation on public.integrations
  for all
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());

create index if not exists integrations_org_idx      on public.integrations (org_id);
create index if not exists integrations_status_idx   on public.integrations (status);
create index if not exists integrations_category_idx on public.integrations (category);

-- Webhook endpoints: org-scope the existing table and enforce isolation.
alter table public.webhook_endpoints
  alter column tenant_id set default (current_user_org_id())::text;

alter table public.webhook_endpoints enable row level security;
drop policy if exists webhook_endpoints_org_isolation on public.webhook_endpoints;
create policy webhook_endpoints_org_isolation on public.webhook_endpoints
  for all
  using (tenant_id = (current_user_org_id())::text)
  with check (tenant_id = (current_user_org_id())::text);

-- Tasks: repair the tenant default (was the literal 'default').
alter table public.tasks
  alter column tenant_id set default (current_user_org_id())::text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds (demo org). Idempotent on fixed uuids.
-- Webhook secrets are stored as sha256 digests — never plaintext.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.integrations
  (id, org_id, name, provider, category, status, auth_method, description, data_flows, health, direction, last_sync_at, connected_at, owner_name, config)
values
  ('44444444-4444-4444-8444-000000000401','00000000-0000-0000-0000-000000000001',
   'Credit Information Bureau (CIB) Extract','Credit Information Bureau Nepal','credit_bureau','connected','mTLS Certificate',
   'Monthly borrower credit-history extract feeding the Krishi Karja scoring dataset and validation runs.',
   array['Borrower repayment history','Outstanding facilities','Default flags'],'passing','inbound',
   '2026-08-15T02:00:00Z','2025-07-14','Nabin Maharjan',
   jsonb_build_object('schedule','monthly','datasetId','e4fea3a6-a4cb-4553-99e1-fccd7a7c87ce','recordsLastSync',186420)),
  ('44444444-4444-4444-8444-000000000402','00000000-0000-0000-0000-000000000001',
   'NRB Supervisory Reporting','Nepal Rastra Bank','regulator','connected','Service Account Token',
   'Outbound regulatory return submission and acknowledgement tracking for supervisory reporting.',
   array['Model inventory summaries','Incident notifications','AML/CFT returns'],'passing','outbound',
   '2026-08-10T09:30:00Z','2025-09-01','Deepa Karki',
   jsonb_build_object('schedule','quarterly','lastAckRef','NRB-ACK-2083-Q1')),
  ('44444444-4444-4444-8444-000000000403','00000000-0000-0000-0000-000000000001',
   'Core Banking (Loan Origination)','Internal core banking','core_banking','connected','IAM Role',
   'Loan application and decision events — the source of scored applications and adverse-action records.',
   array['Applications','Decisions','Collateral records'],'passing','bidirectional',
   '2026-08-16T01:15:00Z','2025-06-02','Binod K.C.',
   jsonb_build_object('schedule','realtime','topic','los.decisions')),
  ('44444444-4444-4444-8444-000000000404','00000000-0000-0000-0000-000000000001',
   'Remittance Switch','National payment switch','payments','degraded','API Key',
   'Inbound remittance payout events scored by the fraud engine; corridor labels attached downstream.',
   array['Payout events','Corridor metadata','Beneficiary changes'],'degraded','inbound',
   '2026-08-16T00:05:00Z','2025-08-20','Bikash Thapa',
   jsonb_build_object('schedule','realtime','note','Elevated latency during festival surge windows')),
  ('44444444-4444-4444-8444-000000000405','00000000-0000-0000-0000-000000000001',
   'SIEM / Log Pipeline','Internal SIEM','monitoring','connected','Service Account Token',
   'Ships guardrail events, inference traces and audit logs to the security monitoring platform.',
   array['Audit logs','Guardrail events','Inference traces'],'passing','outbound',
   '2026-08-16T03:40:00Z','2025-05-11','Rajesh Shrestha',
   jsonb_build_object('schedule','streaming','retentionDays',400)),
  ('44444444-4444-4444-8444-000000000406','00000000-0000-0000-0000-000000000001',
   'Identity Provider (SSO)','Enterprise SSO','identity','connected','SAML 2.0',
   'Single sign-on and role mapping; also the discovery source for shadow-AI app usage.',
   array['User directory','Role assignments','App sign-in telemetry'],'passing','bidirectional',
   '2026-08-16T04:00:00Z','2025-04-01','Deepa Karki',
   jsonb_build_object('schedule','hourly','discoveryFeedsModule','ai-apps')),
  ('44444444-4444-4444-8444-000000000407','00000000-0000-0000-0000-000000000001',
   'Issue Tracker','Internal issue tracker','ticketing','connected','OAuth 2.0',
   'Two-way sync for remediation tasks — governance findings open tickets, ticket closure updates the task.',
   array['Remediation tasks','Status transitions','Assignees'],'passing','bidirectional',
   '2026-08-15T11:20:00Z','2025-10-15','Sunita Sharma',
   jsonb_build_object('schedule','5m','project','AIGOV')),
  ('44444444-4444-4444-8444-000000000408','00000000-0000-0000-0000-000000000001',
   'Team Messaging','Internal messaging','communication','error','Integration Key',
   'Alert delivery for guardrail breaches, SLA warnings and approval requests.',
   array['Alerts','Approval requests'],'failing','outbound',
   '2026-08-12T16:45:00Z','2025-11-03','Sarita Poudel',
   jsonb_build_object('schedule','realtime','lastError','Webhook token rejected (401) — rotate integration key'))
on conflict (id) do nothing;

insert into public.webhook_endpoints
  (id, tenant_id, url, description, event_types, secret_hash, secret_prefix, is_active, failure_count, last_success_at, max_retries, timeout_sec)
values
  ('55555555-5555-4555-8555-000000000501','00000000-0000-0000-0000-000000000001',
   'https://ops.sentinelbank.example/hooks/governance','Governance events → operations channel',
   array['model.risk_tier_changed','validation.completed','bias_audit.failed'],
   encode(sha256(gen_random_uuid()::text::bytea),'hex'),'whsec_a1b2',true,0,'2026-08-15T20:16:00Z',5,10),
  ('55555555-5555-4555-8555-000000000502','00000000-0000-0000-0000-000000000001',
   'https://soc.sentinelbank.example/hooks/guardrails','Guardrail breaches → security operations',
   array['guardrail.blocked','trace.policy_failed','kill_switch.activated'],
   encode(sha256(gen_random_uuid()::text::bytea),'hex'),'whsec_c3d4',true,2,'2026-08-16T02:11:00Z',5,10),
  ('55555555-5555-4555-8555-000000000503','00000000-0000-0000-0000-000000000001',
   'https://tickets.sentinelbank.example/hooks/remediation','Remediation tasks → issue tracker',
   array['task.created','task.sla_breached','incident.opened'],
   encode(sha256(gen_random_uuid()::text::bytea),'hex'),'whsec_e5f6',false,7,'2026-07-28T08:00:00Z',3,15)
on conflict (id) do nothing;
