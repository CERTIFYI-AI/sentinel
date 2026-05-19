-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
-- WS0.3 — Append-only audit log with hash chain.
--
-- This table is NEVER updated and NEVER deleted by application code.
-- A pg_policy allows only INSERT; UPDATE and DELETE are denied even to
-- service_role. Each row hashes the previous row's hash, forming a
-- per-org chain that a verifier can walk to detect tampering.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. audit_log — the append-only table.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete restrict,
  sequence_no     bigint not null,              -- per-org monotonic
  occurred_at     timestamptz not null default now(),
  actor_id        uuid,                         -- auth.users.id, null for system
  actor_type      text not null default 'user', -- user | service | system | sso
  action          text not null,                -- dotted.verb e.g. model.approved
  resource_type   text not null,                -- table / domain object
  resource_id     text,                         -- row id (text to accept non-uuid)
  outcome         text not null default 'success' check (outcome in ('success','failure','denied')),
  severity        text not null default 'info' check (severity in ('debug','info','notice','warning','error','critical')),
  metadata        jsonb not null default '{}'::jsonb,
  -- Hash chain
  previous_hash   text,                         -- hex sha256 of prev row; null for first row in chain
  row_hash        text not null,                -- hex sha256 of canonicalized (id||org||seq||...||previous_hash)
  -- Forensics
  ip_address      inet,
  user_agent      text,
  trace_id        text,                         -- OTEL trace id (WS6)
  created_at      timestamptz not null default now()
);

create unique index if not exists audit_log_org_sequence_uq
  on public.audit_log (org_id, sequence_no);

create index if not exists audit_log_org_occurred_at_idx
  on public.audit_log (org_id, occurred_at desc);

create index if not exists audit_log_org_actor_idx
  on public.audit_log (org_id, actor_id, occurred_at desc)
  where actor_id is not null;

create index if not exists audit_log_org_action_idx
  on public.audit_log (org_id, action, occurred_at desc);

alter table public.audit_log enable row level security;

-- Read: tenant-scoped.
create policy ws03_org_read on public.audit_log
  for select using (org_id = auth.current_org_id());

-- Write: service-role only — application code goes through the
-- audit_log_append() RPC below, which enforces chain invariants.
create policy ws03_service_insert on public.audit_log
  for insert with check (auth.role() = 'service_role');

-- Deny UPDATE/DELETE to *all* roles — even service_role.
-- This is defence-in-depth; operators who need to redact must use the
-- documented WORM-compliant redaction procedure (rotate hash key).
create policy ws03_deny_update on public.audit_log
  for update using (false);
create policy ws03_deny_delete on public.audit_log
  for delete using (false);

-- ---------------------------------------------------------------------------
-- 2. audit_log_head — per-org tip of the chain.
--    audit_log_append() updates this atomically so the next sequence_no
--    and previous_hash can be computed without a full table scan.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log_head (
  org_id        uuid primary key references public.organizations(id) on delete restrict,
  last_sequence bigint not null default 0,
  last_hash     text,
  updated_at    timestamptz not null default now()
);

alter table public.audit_log_head enable row level security;
create policy ws03_service_only on public.audit_log_head
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. audit_log_append() — THE ONLY way application code writes audit rows.
--    Takes a normalised payload, computes the chain hash atomically under
--    row-level lock on audit_log_head, and returns the inserted id.
-- ---------------------------------------------------------------------------
create or replace function public.audit_log_append(
  p_org_id       uuid,
  p_action       text,
  p_resource_type text,
  p_actor_id     uuid default null,
  p_actor_type   text default 'user',
  p_resource_id  text default null,
  p_outcome      text default 'success',
  p_severity     text default 'info',
  p_metadata     jsonb default '{}'::jsonb,
  p_ip_address   inet default null,
  p_user_agent   text default null,
  p_trace_id     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_prev_hash text;
  v_prev_seq  bigint;
  v_next_seq  bigint;
  v_row_id    uuid := gen_random_uuid();
  v_occurred  timestamptz := now();
  v_canonical text;
  v_row_hash  text;
begin
  if p_org_id is null then raise exception 'org_id_required'; end if;
  if p_action is null or p_action = '' then raise exception 'action_required'; end if;
  if p_resource_type is null or p_resource_type = '' then raise exception 'resource_type_required'; end if;

  -- Atomic head advance.
  insert into public.audit_log_head (org_id, last_sequence, last_hash)
  values (p_org_id, 0, null)
  on conflict (org_id) do nothing;

  update public.audit_log_head
     set last_sequence = last_sequence + 1,
         updated_at    = v_occurred
   where org_id = p_org_id
  returning last_sequence - 1, last_hash
      into v_prev_seq,      v_prev_hash;

  v_next_seq := v_prev_seq + 1;

  -- Canonical representation — deterministic newline-delimited pipe-joined
  -- string. Changing this format is a breaking migration for verifiers.
  v_canonical :=
       v_row_id::text         || '|' ||
       p_org_id::text         || '|' ||
       v_next_seq::text       || '|' ||
       v_occurred::text       || '|' ||
       coalesce(p_actor_id::text,'') || '|' ||
       p_actor_type           || '|' ||
       p_action               || '|' ||
       p_resource_type        || '|' ||
       coalesce(p_resource_id,'') || '|' ||
       p_outcome              || '|' ||
       p_severity             || '|' ||
       p_metadata::text       || '|' ||
       coalesce(v_prev_hash,'');

  v_row_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  insert into public.audit_log (
    id, org_id, sequence_no, occurred_at, actor_id, actor_type,
    action, resource_type, resource_id, outcome, severity, metadata,
    previous_hash, row_hash, ip_address, user_agent, trace_id
  ) values (
    v_row_id, p_org_id, v_next_seq, v_occurred, p_actor_id, p_actor_type,
    p_action, p_resource_type, p_resource_id, p_outcome, p_severity, p_metadata,
    v_prev_hash, v_row_hash, p_ip_address, p_user_agent, p_trace_id
  );

  update public.audit_log_head
     set last_hash = v_row_hash
   where org_id = p_org_id;

  return v_row_id;
end;
$$;

revoke all on function public.audit_log_append(uuid,text,text,uuid,text,text,text,text,jsonb,inet,text,text) from public;
grant execute on function public.audit_log_append(uuid,text,text,uuid,text,text,text,text,jsonb,inet,text,text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. audit_log_verify_chain() — walks a window and confirms every row's
--    row_hash matches the recomputed canonical digest AND previous_hash
--    equals the prior row's row_hash. Returns (ok, failed_at_sequence).
-- ---------------------------------------------------------------------------
create or replace function public.audit_log_verify_chain(
  p_org_id      uuid,
  p_from_seq    bigint default null,
  p_to_seq      bigint default null
)
returns table (ok boolean, failed_at_sequence bigint, failed_reason text)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  r record;
  v_prev_hash text := null;
  v_expected  text;
  v_canonical text;
begin
  for r in
    select *
      from public.audit_log
     where org_id = p_org_id
       and (p_from_seq is null or sequence_no >= p_from_seq)
       and (p_to_seq   is null or sequence_no <= p_to_seq)
     order by sequence_no
  loop
    if v_prev_hash is null and r.sequence_no = 1 then
      if r.previous_hash is not null then
        ok := false; failed_at_sequence := r.sequence_no; failed_reason := 'expected_null_prev_for_seq_1'; return next; return;
      end if;
    elsif v_prev_hash is null then
      -- Partial range — trust the caller's starting point.
      v_prev_hash := r.previous_hash;
    elsif r.previous_hash is distinct from v_prev_hash then
      ok := false; failed_at_sequence := r.sequence_no; failed_reason := 'previous_hash_mismatch'; return next; return;
    end if;

    v_canonical :=
      r.id::text         || '|' ||
      r.org_id::text     || '|' ||
      r.sequence_no::text|| '|' ||
      r.occurred_at::text|| '|' ||
      coalesce(r.actor_id::text,'') || '|' ||
      r.actor_type       || '|' ||
      r.action           || '|' ||
      r.resource_type    || '|' ||
      coalesce(r.resource_id,'') || '|' ||
      r.outcome          || '|' ||
      r.severity         || '|' ||
      r.metadata::text   || '|' ||
      coalesce(r.previous_hash,'');
    v_expected := encode(digest(v_canonical, 'sha256'), 'hex');

    if v_expected <> r.row_hash then
      ok := false; failed_at_sequence := r.sequence_no; failed_reason := 'row_hash_mismatch'; return next; return;
    end if;

    v_prev_hash := r.row_hash;
  end loop;
  ok := true; failed_at_sequence := null; failed_reason := null; return next;
end;
$$;

revoke all on function public.audit_log_verify_chain(uuid,bigint,bigint) from public;
grant execute on function public.audit_log_verify_chain(uuid,bigint,bigint) to service_role;

commit;
