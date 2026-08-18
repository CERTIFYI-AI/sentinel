-- 20260905000001_ai_brain_pgvector.sql
--
-- The AI Brain: retrieval-augmented compliance evaluation.
--
-- WHY
--
-- Integration adapters produce raw provider JSON (an IAM policy document, a
-- bucket ACL, a Conditional Access rule). Deciding whether that evidence
-- satisfies a control is currently a human reading it against a policy
-- document. This adds the retrieval half of an LLM-judged evaluation: the
-- org's own policy text, chunked and embedded, searchable by meaning rather
-- than by keyword (the FTS indexes in 20260421000006 already cover keywords).
--
-- THREE DELIBERATE DEPARTURES FROM THE OBVIOUS DESIGN
--
-- 1. `org_id`, NOT `tenant_id`. The platform has one tenancy id-space:
--    `org_id uuid` defaulted DB-side by `current_user_org_id()`, used by
--    `ai_models`, `integrations`, `governance_events` and 50 migrations.
--    `tenant_id text` survives only on legacy tables (`policies`,
--    `hitl_items`). A vector store keyed on the legacy column could not join
--    to the evidence it judges without a lossy text/uuid bridge.
--
-- 2. A verdict is EVIDENCE, so it is stored. `ai_compliance_verdicts` keeps
--    the model, the prompt version, the retrieved chunk ids and the raw
--    response for every judgement. An auditor asked "why did the platform say
--    this control passed?" cannot be answered by a row that only holds the
--    answer. EU AI Act Art. 12.
--
-- 3. A `fail` does NOT go straight to the mesh. `RISK_DETECTED` already
--    triggers seven agents (20260421000001), one of which — AutoPauseAgent —
--    pauses production models. Letting a probabilistic judge fire that
--    unattended is autonomous action on an unreviewed inference. Low-confidence
--    fails raise a `hitl_items` review instead; only high-confidence ones
--    emit the event. Art. 14, as a path rather than a checkbox.
--
-- Idempotent. Safe to re-run.

-- ── 1. Extension ───────────────────────────────────────────────────────────
-- Available on Supabase; on a bare Postgres without it, everything below is
-- skipped rather than failing the whole replay (CI has no pgvector).

do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'vector') then
    raise notice 'pgvector unavailable — AI Brain objects skipped';
    return;
  end if;

  execute 'create extension if not exists vector';

  -- ── 2. The knowledge base ────────────────────────────────────────────────
  --
  -- One row per CHUNK, not per policy: retrieval returns the passage that
  -- answers the question, and a whole policy document would blow the context
  -- window and bury the relevant clause.
  execute $ddl$
    create table if not exists public.policy_knowledge_base (
      id            uuid primary key default gen_random_uuid(),
      org_id        uuid not null default public.current_user_org_id()
                      references public.organizations(id) on delete cascade,
      -- The policy this passage came from. FK to `policies`, which is what the
      -- dashboard actually reads (policyService.ts) — not the legacy
      -- `corporate_policies`, whose id is text and which has no reader.
      policy_id     uuid references public.policies(id) on delete cascade,
      chunk_index   int  not null default 0,
      content       text not null,
      -- text-embedding-3-small. Changing the model changes this width, which
      -- is why `embedding_model` is stored beside it: a table holding two
      -- models' vectors returns nonsense distances.
      embedding     vector(1536),
      embedding_model text not null default 'text-embedding-3-small',
      -- Lets a re-embed detect unchanged chunks and skip the API call.
      content_hash  text,
      token_estimate int,
      metadata      jsonb not null default '{}'::jsonb,
      created_at    timestamptz not null default now()
    )
  $ddl$;

  execute 'create unique index if not exists policy_kb_dedupe_idx
             on public.policy_knowledge_base (org_id, policy_id, chunk_index)
             where policy_id is not null';
  execute 'create index if not exists policy_kb_org_idx
             on public.policy_knowledge_base (org_id)';

  -- ── 3. HNSW index ────────────────────────────────────────────────────────
  --
  -- vector_cosine_ops to match the `<=>` operator the RPC uses. An index built
  -- for a different operator class is silently ignored by the planner, which
  -- looks like "HNSW is slow" rather than "HNSW is unused".
  --
  -- m=16, ef_construction=64 are pgvector's defaults: good recall at this
  -- corpus size (policy libraries are thousands of chunks, not millions).
  -- Raise ef_construction before m if recall proves short.
  execute 'create index if not exists policy_kb_embedding_hnsw
             on public.policy_knowledge_base
             using hnsw (embedding vector_cosine_ops)
             with (m = 16, ef_construction = 64)';

  -- ── 4. RLS ───────────────────────────────────────────────────────────────
  --
  -- Policy text is among the most sensitive content in the platform: it states
  -- what a company has committed to and where it falls short.
  execute 'alter table public.policy_knowledge_base enable row level security';
  execute 'drop policy if exists policy_kb_tenant on public.policy_knowledge_base';
  execute $pol$
    create policy policy_kb_tenant on public.policy_knowledge_base
      for all to authenticated
      using       (org_id = public.current_user_org_id())
      with check  (org_id = public.current_user_org_id())
  $pol$;
  execute 'drop policy if exists policy_kb_service on public.policy_knowledge_base';
  execute $pol$
    create policy policy_kb_service on public.policy_knowledge_base
      for all to service_role using (true) with check (true)
  $pol$;

  -- ── 5. Verdict evidence ──────────────────────────────────────────────────
  --
  -- Why the judgement was made, not just what it was. `retrieved_chunk_ids`
  -- reconstructs exactly what the model was shown; `prompt_version` makes a
  -- change in wording visible when verdicts shift without the evidence
  -- changing.
  execute $ddl$
    create table if not exists public.ai_compliance_verdicts (
      id              uuid primary key default gen_random_uuid(),
      org_id          uuid not null default public.current_user_org_id()
                        references public.organizations(id) on delete cascade,
      control_requirement text not null,
      -- SHA-256 of the evidence, never the evidence. Provider payloads carry
      -- customer data; the hash answers "was this the same evidence again?".
      evidence_fingerprint text not null,
      integration_finding_id uuid,
      status          text not null check (status in ('pass', 'fail', 'inconclusive')),
      confidence      numeric(4,3) not null check (confidence between 0 and 1),
      reasoning       text,
      retrieved_chunk_ids uuid[] not null default '{}',
      model           text not null,
      prompt_version  text not null,
      -- What the platform DID about it, which is a separate fact from the
      -- verdict itself.
      action_taken    text not null default 'none'
                        check (action_taken in ('none', 'event_emitted', 'review_queued')),
      hitl_item_id    uuid,
      governance_event_id uuid,
      created_at      timestamptz not null default now()
    )
  $ddl$;

  execute 'create index if not exists ai_verdicts_org_idx
             on public.ai_compliance_verdicts (org_id, created_at desc)';
  execute 'create index if not exists ai_verdicts_status_idx
             on public.ai_compliance_verdicts (org_id, status)';

  execute 'alter table public.ai_compliance_verdicts enable row level security';
  execute 'drop policy if exists ai_verdicts_tenant_read on public.ai_compliance_verdicts';
  -- Read-only for clients on purpose. A verdict a browser can write is not
  -- evidence — same reasoning as mcp_policy_decisions (20260831000002).
  execute $pol$
    create policy ai_verdicts_tenant_read on public.ai_compliance_verdicts
      for select to authenticated
      using (org_id = public.current_user_org_id())
  $pol$;
  execute 'drop policy if exists ai_verdicts_service on public.ai_compliance_verdicts';
  execute $pol$
    create policy ai_verdicts_service on public.ai_compliance_verdicts
      for all to service_role using (true) with check (true)
  $pol$;

  -- ── 6. Retrieval ─────────────────────────────────────────────────────────
  --
  -- SECURITY INVOKER (the default) on purpose: a browser caller stays inside
  -- its own RLS. `p_org_id` exists for the Python evaluator, which connects as
  -- service role — RLS does not apply there, so the parameter IS the tenant
  -- boundary, and the caller derives it from the integration row it is
  -- judging, never from user input.
  --
  -- `<=>` is cosine DISTANCE (0 = identical), so similarity is 1 - distance.
  -- Returning similarity rather than distance means the threshold reads the
  -- way an operator expects: higher is stricter.
  execute $fn$
    create or replace function public.match_policy_chunks(
      query_embedding vector(1536),
      match_threshold float default 0.5,
      match_count     int   default 3,
      p_org_id        uuid  default null
    )
    returns table (
      id         uuid,
      policy_id  uuid,
      content    text,
      similarity float
    )
    language sql
    stable
    set search_path = public
    as $body$
      select kb.id,
             kb.policy_id,
             kb.content,
             1 - (kb.embedding <=> query_embedding) as similarity
      from public.policy_knowledge_base kb
      where kb.embedding is not null
        and kb.org_id = coalesce(p_org_id, public.current_user_org_id())
        and 1 - (kb.embedding <=> query_embedding) >= match_threshold
      order by kb.embedding <=> query_embedding
      limit greatest(1, least(match_count, 20))
    $body$
  $fn$;

  execute 'grant execute on function public.match_policy_chunks(vector, float, int, uuid)
             to authenticated, service_role';

  -- Inside the guard: a COMMENT on a table the guard skipped is an error, and
  -- would fail the whole replay on any Postgres without pgvector.
  execute $c$comment on table public.policy_knowledge_base is
    'Chunked, embedded policy text for retrieval-augmented compliance evaluation. One row per chunk; org-scoped with RLS.'$c$;
  execute $c$comment on table public.ai_compliance_verdicts is
    'Durable record of every LLM compliance judgement - model, prompt version, retrieved chunks and the action taken. Client-readable, service-role write only: a verdict a browser can write is not evidence.'$c$;
end $$;
