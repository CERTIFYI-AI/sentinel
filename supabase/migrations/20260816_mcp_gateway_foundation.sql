-- 20260816_mcp_gateway_foundation.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- MCP gateway foundation. The MCP Overview / Servers / Tool Catalog pages ran
-- entirely on in-file mock arrays (MOCK_SERVERS, MOCK_TOOLS) with invented
-- headline stats and no backing tables at all. These two registries give the
-- group a real, org-scoped backend and connect it to the rest of the platform:
--   mcp_servers.integration_id → integrations.id  (the connector behind a server)
--   mcp_tools.server_id        → mcp_servers.id
--   mcp_tools.allowed_agent_ids → agent_gov_registry.id (which agents may call it)
--
-- Seeds follow the Nepali-bank narrative: core banking, CIB credit lookups,
-- remittance status, a bilingual knowledge base, HR records (restricted while
-- the HR screening assessment is open), and an issue-tracker bridge.

create table if not exists public.mcp_servers (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default current_user_org_id(),
  name            text not null,
  url             text not null,
  description     text,
  transport       text not null default 'https',          -- https | stdio | sse | websocket
  auth_method     text not null default 'bearer_token',   -- bearer_token | mtls | oauth2 | basic | none
  status          text not null default 'unknown',        -- healthy | degraded | offline | unknown
  environment     text not null default 'production',     -- production | staging | development
  owner_name      text,
  data_sensitivity text not null default 'internal',      -- public | internal | confidential | restricted
  integration_id  uuid references public.integrations(id) on delete set null,
  approval_state  text not null default 'under_review',   -- approved | under_review | restricted | blocked
  last_ping_at    timestamptz,
  last_error      text,
  config          jsonb not null default '{}'::jsonb,
  is_deleted      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.mcp_servers enable row level security;
drop policy if exists mcp_servers_org_isolation on public.mcp_servers;
create policy mcp_servers_org_isolation on public.mcp_servers
  for all using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
create index if not exists mcp_servers_org_idx    on public.mcp_servers (org_id);
create index if not exists mcp_servers_status_idx on public.mcp_servers (status);

create table if not exists public.mcp_tools (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default current_user_org_id(),
  server_id       uuid not null references public.mcp_servers(id) on delete cascade,
  name            text not null,
  description     text,
  category        text not null default 'read',           -- read | write | execute | admin
  risk_tier       text not null default 'low',            -- low | medium | high | critical
  approval_state  text not null default 'under_review',
  requires_hitl   boolean not null default false,
  side_effects    boolean not null default false,
  input_schema    jsonb not null default '{}'::jsonb,
  scopes          text[] not null default '{}',
  allowed_agent_ids uuid[] not null default '{}',
  invocations_30d integer,
  last_invoked_at timestamptz,
  is_deleted      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.mcp_tools enable row level security;
drop policy if exists mcp_tools_org_isolation on public.mcp_tools;
create policy mcp_tools_org_isolation on public.mcp_tools
  for all using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
create index if not exists mcp_tools_org_idx    on public.mcp_tools (org_id);
create index if not exists mcp_tools_server_idx on public.mcp_tools (server_id);

-- Seeds live alongside this migration in the repo; they were applied with the
-- same fixed uuids so re-running is a no-op (on conflict do nothing).

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds (demo org), Nepali-bank narrative. Idempotent on fixed uuids.
-- Servers link to the connectors registered in the Integrations module; tools
-- link to the governed agents in agent_gov_registry.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.mcp_servers
 (id, org_id, name, url, description, transport, auth_method, status, environment, owner_name, data_sensitivity, integration_id, approval_state, last_ping_at, last_error, config)
values
 ('66666666-6666-4666-8666-000000000601','00000000-0000-0000-0000-000000000001',
  'Core Banking Bridge','https://mcp.internal.sentinelbank.example/core-banking',
  'Read-only account, loan and collateral lookups for agent workflows. Backed by the core banking loan-origination connector.',
  'https','mtls','healthy','production','Binod K.C.','confidential',
  '44444444-4444-4444-8444-000000000403','approved','2026-08-16T04:05:00Z',null,
  jsonb_build_object('rateLimitPerMin',600,'region','kathmandu-dc1')),
 ('66666666-6666-4666-8666-000000000602','00000000-0000-0000-0000-000000000001',
  'CIB Credit Lookup','https://mcp.internal.sentinelbank.example/cib',
  'Credit Information Bureau history lookups. Restricted: every call is logged and rate-limited under NRB data-sharing terms.',
  'https','mtls','healthy','production','Nabin Maharjan','restricted',
  '44444444-4444-4444-8444-000000000401','approved','2026-08-16T03:50:00Z',null,
  jsonb_build_object('rateLimitPerMin',60,'auditRequired',true)),
 ('66666666-6666-4666-8666-000000000603','00000000-0000-0000-0000-000000000001',
  'Remittance Status Service','https://mcp.internal.sentinelbank.example/remittance',
  'Payout status and corridor metadata for support and fraud agents.',
  'https','bearer_token','degraded','production','Bikash Thapa','confidential',
  '44444444-4444-4444-8444-000000000404','approved','2026-08-16T02:40:00Z',
  'Elevated p95 latency (1.8s) during festival surge',
  jsonb_build_object('rateLimitPerMin',300)),
 ('66666666-6666-4666-8666-000000000604','00000000-0000-0000-0000-000000000001',
  'Knowledge Base (Nepali/English)','https://mcp.internal.sentinelbank.example/kb',
  'Product, branch and FAQ retrieval powering grounded copilot answers in both languages.',
  'https','bearer_token','healthy','production','Sarita Poudel','internal',
  null,'approved','2026-08-16T04:02:00Z',null,
  jsonb_build_object('rateLimitPerMin',1200,'languages',jsonb_build_array('ne','en'))),
 ('66666666-6666-4666-8666-000000000605','00000000-0000-0000-0000-000000000001',
  'HR Records API','https://mcp.internal.sentinelbank.example/hr',
  'Employee record lookups. Offline pending review — the HR screening use case is not cleared for production.',
  'https','bearer_token','offline','staging','Deepa Karki','restricted',
  null,'restricted','2026-08-14T09:10:00Z','Connection refused since 2026-08-14',
  jsonb_build_object('note','Blocked until AIIA-HR-001 bias audit completes')),
 ('66666666-6666-4666-8666-000000000606','00000000-0000-0000-0000-000000000001',
  'Issue Tracker Bridge','https://mcp.internal.sentinelbank.example/tickets',
  'Creates and updates remediation tickets from governance findings.',
  'https','oauth2','healthy','production','Sunita Sharma','internal',
  '44444444-4444-4444-8444-000000000407','approved','2026-08-16T03:58:00Z',null,
  jsonb_build_object('rateLimitPerMin',120))
on conflict (id) do nothing;

insert into public.mcp_tools
 (id, org_id, server_id, name, description, category, risk_tier, approval_state, requires_hitl, side_effects, scopes, allowed_agent_ids, invocations_30d, last_invoked_at, input_schema)
values
 ('77777777-7777-4777-8777-000000000701','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000601',
  'get_account_summary','Balance, product type and standing for a customer account.','read','low','approved',false,false,
  array['accounts:read'], array['aa000001-0000-4000-8000-000000000001','aa000004-0000-4000-8000-000000000004']::uuid[],
  18420,'2026-08-16T03:55:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('account_no',jsonb_build_object('type','string')),'required',jsonb_build_array('account_no'))),
 ('77777777-7777-4777-8777-000000000702','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000601',
  'get_loan_collateral','Collateral records and coverage ratio for a loan application.','read','medium','approved',false,false,
  array['loans:read'], array['aa000001-0000-4000-8000-000000000001']::uuid[],
  6210,'2026-08-16T03:40:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('application_id',jsonb_build_object('type','string')))),
 ('77777777-7777-4777-8777-000000000703','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000602',
  'get_cib_history','Borrower repayment history from the Credit Information Bureau. Every call is audit-logged.','read','high','approved',false,false,
  array['cib:read'], array['aa000001-0000-4000-8000-000000000001']::uuid[],
  3180,'2026-08-16T03:20:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('citizenship_no',jsonb_build_object('type','string')))),
 ('77777777-7777-4777-8777-000000000704','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000603',
  'get_remittance_status','Payout status for an inbound remittance reference.','read','low','approved',false,false,
  array['remittance:read'], array['aa000002-0000-4000-8000-000000000002','aa000004-0000-4000-8000-000000000004']::uuid[],
  24900,'2026-08-16T04:01:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('reference',jsonb_build_object('type','string')))),
 ('77777777-7777-4777-8777-000000000705','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000603',
  'hold_transaction','Places a temporary hold on a suspicious payout. Human review required before release.','write','critical','approved',true,true,
  array['remittance:write'], array['aa000002-0000-4000-8000-000000000002']::uuid[],
  412,'2026-08-15T18:45:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('txn_id',jsonb_build_object('type','string'),'reason',jsonb_build_object('type','string')))),
 ('77777777-7777-4777-8777-000000000706','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000604',
  'search_knowledge_base','Retrieves product and branch answers in Nepali or English for grounded responses.','read','low','approved',false,false,
  array['kb:read'], array['aa000004-0000-4000-8000-000000000004']::uuid[],
  51200,'2026-08-16T04:03:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('query',jsonb_build_object('type','string'),'lang',jsonb_build_object('type','string','enum',jsonb_build_array('ne','en'))))),
 ('77777777-7777-4777-8777-000000000707','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000605',
  'get_employee_record','Employee record lookup. Restricted pending the HR screening impact assessment.','read','high','restricted',true,false,
  array['hr:read'], '{}'::uuid[], 0,null,
  jsonb_build_object('type','object','properties',jsonb_build_object('employee_id',jsonb_build_object('type','string')))),
 ('77777777-7777-4777-8777-000000000708','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000606',
  'create_remediation_ticket','Opens a remediation ticket from a governance finding.','write','medium','approved',false,true,
  array['tickets:write'], array['aa000001-0000-4000-8000-000000000001','aa000002-0000-4000-8000-000000000002']::uuid[],
  86,'2026-08-15T11:15:00Z',
  jsonb_build_object('type','object','properties',jsonb_build_object('title',jsonb_build_object('type','string'),'severity',jsonb_build_object('type','string')))),
 ('77777777-7777-4777-8777-000000000709','00000000-0000-0000-0000-000000000001','66666666-6666-4666-8666-000000000604',
  'summarize_policy','Summarizes an internal policy document for staff questions.','read','low','under_review',false,false,
  array['kb:read'], '{}'::uuid[], 0,null,
  jsonb_build_object('type','object','properties',jsonb_build_object('policy_ref',jsonb_build_object('type','string'))))
on conflict (id) do nothing;
