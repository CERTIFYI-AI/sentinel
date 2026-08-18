-- 20260831000001_mcp_gateway_enforcement.sql
--
-- WHY: `mcp_tools` already models a complete authorization policy — per-tool
-- `approval_state`, `requires_hitl`, `side_effects`, `risk_tier`, `scopes` and
-- `allowed_agent_ids` — and **nothing reads any of it at call time**. The
-- fields are captured, rendered and audited as intent, while an agent calling
-- a tool is governed by nothing at all. That is the widest gap between what
-- the product claims and what it enforces.
--
-- This migration adds the missing half: a durable record of every
-- authorization decision the gateway makes, so that "which agent was allowed
-- to call which tool, when, and why" is answerable from the database rather
-- than from a log file nobody keeps.
--
-- DESIGN NOTES
--
-- 1. A DENIED call is the most valuable row here. Denials never become a
--    `tool_call_logs` entry — the call did not happen — so without this table
--    an enforcement plane leaves no evidence that it enforced anything. EU AI
--    Act Art. 12 wants the record of the control operating, not only of the
--    traffic that passed.
--
-- 2. `request_fingerprint` is a SHA-256 of the arguments, never the arguments.
--    Tool arguments routinely carry customer data; storing them would turn an
--    audit table into a data-retention liability, and the fingerprint answers
--    the question that matters (was this the same call again?) without it.
--
-- 3. `rate_limit_per_hour` lands on `mcp_tools` rather than in a separate
--    policy table because it is a property of the tool, sits beside the other
--    policy fields an operator edits, and needs no join to evaluate.
--
-- 4. Deliberately NOT added: a `decision` cache or a materialised counter.
--    Counts are derived from these rows at read time. `mcp_tools.invocations_30d`
--    already exists as a stored number nothing maintains; adding a second one
--    would repeat the mistake this platform has spent several waves removing.
--
-- Idempotent throughout. Org scoping is filled DB-side by
-- `current_user_org_id()`, per CLAUDE.md First principle #3, so no client can
-- choose the tenant.

-- ── 1. Rate limit lives with the rest of the tool's policy ──────────────────
DO $$
BEGIN
  IF to_regclass('public.mcp_tools') IS NULL THEN
    RAISE NOTICE 'mcp_tools absent; skipping enforcement schema';
    RETURN;
  END IF;

  ALTER TABLE public.mcp_tools
    -- NULL means "no limit", which is different from 0 ("never allowed").
    ADD COLUMN IF NOT EXISTS rate_limit_per_hour integer;

  COMMENT ON COLUMN public.mcp_tools.rate_limit_per_hour IS
    'Max invocations per agent per rolling hour. NULL = unlimited, 0 = never.';
END $$;

-- ── 2. The decision record ─────────────────────────────────────────────────
create table if not exists public.mcp_policy_decisions (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default current_user_org_id(),

  -- Who asked. Nullable because a decision can be made about an agent id that
  -- resolves to nothing — and that denial is precisely what we want recorded.
  agent_id            uuid references public.agents(id) on delete set null,
  --: The identifier the caller presented, kept verbatim so an unknown agent is
  --  still traceable after the fact.
  agent_ref           text,

  -- What was asked for. Nullable for the same reason: an unknown tool is a
  -- denial worth keeping.
  tool_id             uuid references public.mcp_tools(id) on delete set null,
  server_id           uuid references public.mcp_servers(id) on delete set null,
  tool_ref            text,

  decision            text not null
    check (decision in ('allowed', 'denied', 'pending_approval')),
  --: Stable machine-readable cause. The UI groups on this; the prose in
  --  `reason` is for a human and may be reworded without breaking anything.
  reason_code         text not null
    check (reason_code in (
      'allowed',
      'unknown_agent', 'unknown_tool',
      'server_blocked', 'server_restricted',
      'tool_blocked', 'tool_not_approved',
      'agent_not_granted',
      'rate_limited',
      'approval_required'
    )),
  reason              text not null,

  --: Set when the decision was `pending_approval`, so the human decision is
  --  reachable from the machine one (EU AI Act Art. 14).
  hitl_item_id        uuid references public.hitl_items(id) on delete set null,

  --: Correlates this decision with the `tool_call_logs` row it produced, when
  --  the call was allowed and then actually ran.
  invocation_id       text,
  --: SHA-256 of the arguments. NEVER the arguments themselves.
  request_fingerprint text,

  decided_at          timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.mcp_policy_decisions is
  'Every authorization decision the MCP gateway makes, allowed and denied alike. Denials never reach tool_call_logs, so this is the only evidence the control operated.';

-- ── 3. Indexes for the three questions the UI actually asks ────────────────
create index if not exists mcp_policy_decisions_org_time_idx
  on public.mcp_policy_decisions (org_id, decided_at desc);
create index if not exists mcp_policy_decisions_tool_idx
  on public.mcp_policy_decisions (tool_id, decided_at desc);
create index if not exists mcp_policy_decisions_agent_idx
  on public.mcp_policy_decisions (agent_id, decided_at desc);
-- Denials and pending approvals are what an operator opens the page for.
create index if not exists mcp_policy_decisions_open_idx
  on public.mcp_policy_decisions (org_id, decision, decided_at desc)
  where decision <> 'allowed';

-- ── 4. RLS: read your own org, write only from the server ──────────────────
alter table public.mcp_policy_decisions enable row level security;

drop policy if exists mcp_policy_decisions_org_read on public.mcp_policy_decisions;
create policy mcp_policy_decisions_org_read on public.mcp_policy_decisions
  for select to authenticated using (org_id = current_user_org_id());

-- No client insert policy, deliberately. A decision is a statement by the
-- enforcement plane about what it did; a browser being able to write one would
-- make the evidence worthless.
drop policy if exists mcp_policy_decisions_service on public.mcp_policy_decisions;
create policy mcp_policy_decisions_service on public.mcp_policy_decisions
  for all to service_role using (true) with check (true);

drop trigger if exists trg_set_updated_at on public.mcp_policy_decisions;
create trigger trg_set_updated_at before update on public.mcp_policy_decisions
  for each row execute function public.set_updated_at();

-- ── 5. Verify the postconditions this migration is responsible for ─────────
DO $$
DECLARE
  n int;
BEGIN
  IF to_regclass('public.mcp_policy_decisions') IS NULL THEN
    RAISE EXCEPTION 'mcp_policy_decisions was not created';
  END IF;

  -- Org scoping must be filled DB-side, not by the client.
  SELECT count(*) INTO n FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'mcp_policy_decisions'
     AND column_name = 'org_id' AND column_default IS NOT NULL;
  IF n <> 1 THEN
    RAISE EXCEPTION 'mcp_policy_decisions.org_id has no DB-side default';
  END IF;

  -- The read path must be org-scoped, and there must be no client write path.
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'mcp_policy_decisions'
     AND cmd IN ('INSERT', 'UPDATE', 'ALL')
     AND roles::text[] && ARRAY['authenticated'];
  IF n > 0 THEN
    RAISE EXCEPTION
      'mcp_policy_decisions has a client write policy — enforcement evidence '
      'must be written by the server only';
  END IF;

  -- The TD-000 test, applied to the table this migration adds.
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'mcp_policy_decisions'
     AND permissive = 'PERMISSIVE'
     AND NOT (roles::text[] && ARRAY['service_role'])
     AND coalesce(qual, '') || coalesce(with_check, '') !~* '(org_id|tenant_id)';
  IF n > 0 THEN
    RAISE EXCEPTION 'mcp_policy_decisions has a permissive policy with no tenant predicate';
  END IF;

  RAISE NOTICE 'mcp gateway enforcement schema ready';
END $$;
