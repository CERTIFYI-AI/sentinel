-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
-- WS0.4 — Evidence chain-of-custody.
--
-- Every evidence artifact (file uploaded as proof of control
-- effectiveness) gets a custody ledger. Each touch (upload, access,
-- relabel, archive) is recorded immutably with a hash of the content
-- AT THAT MOMENT. A nightly job re-hashes storage and flags silent
-- corruption.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. evidence_artifacts — metadata for every stored file.
--    Content lives in Supabase Storage; this row is the authoritative index.
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_artifacts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete restrict,
  storage_bucket  text not null,
  storage_path    text not null,              -- object key within the bucket
  file_name       text not null,
  content_type    text,
  size_bytes      bigint not null check (size_bytes >= 0),
  sha256_hex      text not null check (sha256_hex ~ '^[0-9a-f]{64}$'),
  -- Optional — SHA3 or BLAKE3 digest for dual-algorithm defence.
  sha3_256_hex    text,
  -- Classification — "public" / "internal" / "confidential" / "restricted".
  classification  text not null default 'internal'
    check (classification in ('public','internal','confidential','restricted')),
  -- Legal hold — when set, the artifact cannot be soft-deleted.
  legal_hold      boolean not null default false,
  -- Chain-of-custody: the current "tip" hash for this artifact. Any custody
  -- event updates this so readers can detect out-of-band tampering by
  -- comparing against sha256_hex.
  custody_tip_hash text,
  -- Last re-hash job result.
  last_verified_at timestamptz,
  last_verified_ok boolean,
  linked_control_id uuid,  -- loose FK — controls live in compliance module
  linked_risk_id    uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  deleted_at      timestamptz,
  unique (storage_bucket, storage_path)
);

create index if not exists evidence_artifacts_org_id_created_at_idx
  on public.evidence_artifacts (org_id, created_at desc);

create index if not exists evidence_artifacts_org_classification_idx
  on public.evidence_artifacts (org_id, classification);

create index if not exists evidence_artifacts_org_legal_hold_idx
  on public.evidence_artifacts (org_id, legal_hold) where legal_hold = true;

alter table public.evidence_artifacts enable row level security;

create policy ws01_org_read on public.evidence_artifacts
  for select using (org_id = auth.current_org_id());
create policy ws01_org_insert on public.evidence_artifacts
  for insert with check (org_id = auth.current_org_id());
create policy ws01_org_update on public.evidence_artifacts
  for update using (
    org_id = auth.current_org_id() and
    -- Legal-hold artifacts cannot be soft-deleted by normal users.
    (legal_hold = false or auth.role() = 'service_role')
  )
  with check (org_id = auth.current_org_id());
create policy ws04_deny_hard_delete on public.evidence_artifacts
  for delete using (false);
create policy ws01_service_all on public.evidence_artifacts
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2. evidence_custody_events — append-only ledger of every custody action.
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_custody_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete restrict,
  artifact_id     uuid not null references public.evidence_artifacts(id) on delete restrict,
  sequence_no     bigint not null,
  event_type      text not null check (event_type in (
    'uploaded','accessed','downloaded','relabelled',
    'linked','unlinked','archived','restored',
    'legal_hold_on','legal_hold_off','rehash_ok','rehash_failed'
  )),
  actor_id        uuid,
  actor_type      text not null default 'user',
  sha256_at_time  text,                       -- sha256 of content when event fired
  previous_hash   text,
  row_hash        text not null,
  metadata        jsonb not null default '{}'::jsonb,
  ip_address      inet,
  user_agent      text,
  occurred_at     timestamptz not null default now()
);

create unique index if not exists evidence_custody_events_artifact_seq_uq
  on public.evidence_custody_events (artifact_id, sequence_no);

create index if not exists evidence_custody_events_org_occurred_idx
  on public.evidence_custody_events (org_id, occurred_at desc);

alter table public.evidence_custody_events enable row level security;

create policy ws01_org_read on public.evidence_custody_events
  for select using (org_id = auth.current_org_id());
create policy ws04_service_insert on public.evidence_custody_events
  for insert with check (auth.role() = 'service_role');
create policy ws04_deny_mutate on public.evidence_custody_events
  for update using (false);
create policy ws04_deny_delete on public.evidence_custody_events
  for delete using (false);

-- ---------------------------------------------------------------------------
-- 3. evidence_append_custody_event() — RPC that guarantees chain integrity.
-- ---------------------------------------------------------------------------
create or replace function public.evidence_append_custody_event(
  p_artifact_id   uuid,
  p_event_type    text,
  p_actor_id      uuid default null,
  p_actor_type    text default 'user',
  p_sha256_now    text default null,
  p_metadata      jsonb default '{}'::jsonb,
  p_ip_address    inet default null,
  p_user_agent    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_org       uuid;
  v_prev_hash text;
  v_prev_seq  bigint;
  v_next_seq  bigint;
  v_row_id    uuid := gen_random_uuid();
  v_occurred  timestamptz := now();
  v_canonical text;
  v_row_hash  text;
begin
  select org_id into v_org
    from public.evidence_artifacts
   where id = p_artifact_id
   for update;
  if v_org is null then
    raise exception 'artifact_not_found';
  end if;

  select coalesce(max(sequence_no),0), max(row_hash order by sequence_no)
    into v_prev_seq, v_prev_hash
    from public.evidence_custody_events
   where artifact_id = p_artifact_id;
  v_next_seq := v_prev_seq + 1;

  v_canonical :=
    v_row_id::text || '|' ||
    v_org::text    || '|' ||
    p_artifact_id::text || '|' ||
    v_next_seq::text || '|' ||
    v_occurred::text || '|' ||
    coalesce(p_actor_id::text,'') || '|' ||
    p_actor_type    || '|' ||
    p_event_type    || '|' ||
    coalesce(p_sha256_now,'') || '|' ||
    p_metadata::text || '|' ||
    coalesce(v_prev_hash,'');
  v_row_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  insert into public.evidence_custody_events (
    id, org_id, artifact_id, sequence_no, event_type, actor_id, actor_type,
    sha256_at_time, previous_hash, row_hash, metadata, ip_address, user_agent,
    occurred_at
  ) values (
    v_row_id, v_org, p_artifact_id, v_next_seq, p_event_type, p_actor_id, p_actor_type,
    p_sha256_now, v_prev_hash, v_row_hash, p_metadata, p_ip_address, p_user_agent,
    v_occurred
  );

  -- Update the tip hash on the artifact so fast reads see latest custody.
  update public.evidence_artifacts
     set custody_tip_hash = v_row_hash,
         updated_at       = v_occurred
   where id = p_artifact_id;

  return v_row_id;
end;
$$;

revoke all on function public.evidence_append_custody_event(uuid,text,uuid,text,text,jsonb,inet,text) from public;
grant execute on function public.evidence_append_custody_event(uuid,text,uuid,text,text,jsonb,inet,text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Triggers — INSERT on evidence_artifacts fires an 'uploaded' event.
-- ---------------------------------------------------------------------------
create or replace function public.tg_evidence_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.evidence_append_custody_event(
    p_artifact_id => NEW.id,
    p_event_type  => 'uploaded',
    p_actor_id    => NEW.created_by,
    p_sha256_now  => NEW.sha256_hex,
    p_metadata    => jsonb_build_object(
      'file_name', NEW.file_name,
      'size_bytes', NEW.size_bytes,
      'classification', NEW.classification
    )
  );
  return NEW;
end;
$$;

drop trigger if exists ws04_evidence_on_insert on public.evidence_artifacts;
create trigger ws04_evidence_on_insert
  after insert on public.evidence_artifacts
  for each row execute function public.tg_evidence_on_insert();

-- ---------------------------------------------------------------------------
-- 5. evidence_rehash_queue — a simple work table the nightly cron drains.
--    Fresh uploads are auto-enqueued; operators can re-queue on demand.
-- ---------------------------------------------------------------------------
create table if not exists public.evidence_rehash_queue (
  artifact_id  uuid primary key references public.evidence_artifacts(id) on delete cascade,
  org_id       uuid not null references public.organizations(id) on delete restrict,
  enqueued_at  timestamptz not null default now(),
  attempts     int not null default 0,
  last_error   text
);

create index if not exists evidence_rehash_queue_org_idx
  on public.evidence_rehash_queue (org_id, enqueued_at);

alter table public.evidence_rehash_queue enable row level security;
create policy ws04_service_only on public.evidence_rehash_queue
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.tg_evidence_enqueue_rehash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.evidence_rehash_queue (artifact_id, org_id)
  values (NEW.id, NEW.org_id)
  on conflict (artifact_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists ws04_enqueue_rehash on public.evidence_artifacts;
create trigger ws04_enqueue_rehash
  after insert on public.evidence_artifacts
  for each row execute function public.tg_evidence_enqueue_rehash();

commit;
