-- 20260814_trust_runtime_seeds
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-14 via mcp apply_migration.
-- Coherent demo seeds for the Runtime Trust group, keyed to REAL ai_models uuids
-- (resolved by name at run time, never hardcoded). Demo org:
-- 00000000-0000-0000-0000-000000000001 (verified against user_profiles.org_id).
-- Idempotent: every section is guarded with an existence check on the demo org's
-- rows, so re-running is a no-op.
-- Note: the agents table exists but is empty (Agent Control phase not seeded yet),
-- so tool_call_logs.agent_id is left null and only agent_name is populated;
-- live_traces.agent_id / guardrail_events.agent_id are likewise left null.

do $$
declare
  v_org  uuid := '00000000-0000-0000-0000-000000000001';
  v_user uuid;
  -- real model ids, resolved by name
  v_m_support uuid; v_m_docparser uuid; v_m_credit uuid; v_m_fraud uuid;
  v_m_loan uuid; v_m_sentiment uuid; v_m_hr uuid; v_m_creditrisk uuid;
  v_m_fraudshield uuid; v_m_docclass uuid; v_m_nepberta uuid;
  -- working vars
  v_trace_models uuid[]; v_block_policies uuid[]; v_cost_models uuid[];
  v_fb_primary uuid[]; v_fb_fallback uuid[];
  v_model uuid; v_status text; v_r double precision; v_tin int; v_tout int;
  v_rate numeric; v_pol record; v_ev_model uuid; v_ev_status text;
  v_model_name text; v_base numeric; v_trend numeric; v_total bigint; v_prompt bigint;
  v_idx int; v_p uuid; v_f uuid; v_succ boolean; v_reason text; v_trace uuid;
  v_tool text; v_agent text; v_args jsonb; v_result jsonb; v_lat int;
begin
  select id into v_m_support     from public.ai_models where org_id = v_org and name = 'Customer Support Copilot' limit 1;
  select id into v_m_docparser   from public.ai_models where org_id = v_org and name = 'DocumentParser GPT'       limit 1;
  select id into v_m_credit      from public.ai_models where org_id = v_org and name = 'CreditScore AI v3'        limit 1;
  select id into v_m_fraud       from public.ai_models where org_id = v_org and name = 'Fraud Detection Engine'   limit 1;
  select id into v_m_loan        from public.ai_models where org_id = v_org and name = 'Loan Approval Assistant'  limit 1;
  select id into v_m_sentiment   from public.ai_models where org_id = v_org and name = 'NLP Sentiment Analyzer'   limit 1;
  select id into v_m_hr          from public.ai_models where org_id = v_org and name = 'HRScreener Bot'           limit 1;
  select id into v_m_creditrisk  from public.ai_models where org_id = v_org and name = 'Credit Risk Scorer'       limit 1;
  select id into v_m_fraudshield from public.ai_models where org_id = v_org and name = 'FraudShield ML'           limit 1;
  select id into v_m_docclass    from public.ai_models where org_id = v_org and name = 'Document Classifier'      limit 1;
  select id into v_m_nepberta    from public.ai_models where org_id = v_org and name = 'NepBERTa'                 limit 1;

  if v_m_support is null or v_m_docparser is null or v_m_credit is null or v_m_fraud is null
     or v_m_loan is null or v_m_sentiment is null or v_m_hr is null or v_m_creditrisk is null
     or v_m_fraudshield is null or v_m_docclass is null or v_m_nepberta is null then
    raise exception 'trust_runtime_seeds: expected demo ai_models rows are missing for org %', v_org;
  end if;

  select id into v_user from public.user_profiles where org_id = v_org order by created_at limit 1;

  ------------------------------------------------------------------
  -- 1) trust_policies (9)
  ------------------------------------------------------------------
  if not exists (select 1 from public.trust_policies where org_id = v_org and policy_ref like 'POL-%') then
    insert into public.trust_policies
      (org_id, policy_ref, name, type, action, severity, condition_json, threshold,
       is_active, linked_models, framework_ref, triggers_7d, block_rate, avg_latency_ms)
    values
      (v_org, 'POL-PII-001', 'PII Detection & Redaction', 'pii', 'redact', 'high',
       '{"detectors":["email","phone","address","name"],"languages":["en","es"]}', 0.85,
       true, array[v_m_support, v_m_docparser, v_m_hr], 'GDPR Art. 5', 142, 3.2, 45),
      (v_org, 'POL-PII-002', 'SSN & Account Number Block', 'pii', 'block', 'critical',
       '{"detectors":["ssn","credit_card","iban"],"mode":"strict"}', 0.95,
       true, array[v_m_credit, v_m_loan], 'EU AI Act Art. 10', 23, 100, 38),
      (v_org, 'POL-TOX-001', 'Toxicity Filter', 'toxicity', 'block', 'high',
       '{"categories":["hate","harassment","sexual"],"provider":"perspective"}', 0.80,
       true, array[v_m_support, v_m_sentiment], 'NIST AI RMF GV-1.2', 67, 88.1, 52),
      (v_org, 'POL-JBK-001', 'Jailbreak & Prompt Injection Shield', 'jailbreak', 'block', 'critical',
       '{"heuristics":["role_play","ignore_instructions","payload_split"],"ml_classifier":true}', 0.90,
       true, array[v_m_support, v_m_docparser, v_m_hr], 'OWASP LLM01', 31, 96.8, 61),
      (v_org, 'POL-COST-001', 'Daily Cost Ceiling', 'cost', 'warn', 'medium',
       '{"window":"1d","metric":"cost_usd"}', 250,
       true, array[v_m_support, v_m_docparser], null, 12, 0, 5),
      (v_org, 'POL-COST-002', 'Per-Request Token Cap', 'cost', 'warn', 'low',
       '{"metric":"total_tokens","per":"request"}', 8000,
       true, array[v_m_docparser], null, 54, 14.8, 8),
      (v_org, 'POL-LAT-001', 'Latency SLA Guard', 'latency', 'log', 'medium',
       '{"metric":"p95_latency_ms","window":"5m"}', 5000,
       true, array[v_m_support, v_m_fraud], null, 87, 0, 12),
      (v_org, 'POL-HAL-001', 'Hallucination Grounding Check', 'hallucination', 'route_hitl', 'medium',
       '{"method":"citation_overlap","min_sources":2}', 0.70,
       true, array[v_m_docparser, v_m_loan], 'NIST AI RMF MS-2.5', 44, 9.1, 210),
      (v_org, 'POL-TOX-002', 'Harassment Escalation (draft)', 'toxicity', 'block', 'high',
       '{"categories":["threat","self_harm"],"escalate_to":"trust_ops"}', 0.75,
       false, array[v_m_support], null, 0, 0, null);
  end if;

  select array_agg(id) into v_block_policies
  from public.trust_policies
  where org_id = v_org and policy_ref in ('POL-PII-002', 'POL-TOX-001', 'POL-JBK-001');

  ------------------------------------------------------------------
  -- 2) live_traces (165 over last 14 days, ~8% blocked / ~4% error)
  ------------------------------------------------------------------
  if not exists (select 1 from public.live_traces where org_id = v_org) then
    -- weighted pool: chat-heavy models appear more often
    v_trace_models := array[v_m_support, v_m_support, v_m_support, v_m_docparser, v_m_docparser,
                            v_m_credit, v_m_fraud, v_m_loan, v_m_sentiment, v_m_hr];
    for i in 1..165 loop
      v_model  := v_trace_models[1 + floor(random() * array_length(v_trace_models, 1))::int];
      v_r      := random();
      v_status := case when v_r < 0.08 then 'blocked' when v_r < 0.12 then 'error' else 'success' end;
      v_tin    := 200 + floor(random() * 3800)::int;
      v_tout   := case when v_status = 'success' then 100 + floor(random() * 1900)::int
                       else floor(random() * 120)::int end;
      -- per-model-tier $/1K tokens
      v_rate   := case when v_model = v_m_support   then 0.010
                       when v_model = v_m_docparser then 0.008
                       when v_model = v_m_loan      then 0.006
                       else 0.002 end;
      insert into public.live_traces
        (org_id, trace_ref, model_id, action, status, tokens_in, tokens_out,
         latency_ms, cost_usd, policy_id, created_at)
      values
        (v_org,
         'TRC-2026-' || lpad(i::text, 4, '0'),
         v_model,
         (array['chat_completion','completion','tool_use','rag_query'])[1 + floor(random() * 4)::int],
         v_status,
         v_tin, v_tout,
         300 + floor(random() * 8700)::int,
         round(((v_tin + v_tout) / 1000.0 * v_rate)::numeric, 4),
         case when v_status = 'blocked'
              then v_block_policies[1 + floor(random() * array_length(v_block_policies, 1))::int] end,
         now() - (random() * interval '14 days'));
    end loop;
  end if;

  ------------------------------------------------------------------
  -- 3) guardrail_events (36, ~1/3 acknowledged)
  ------------------------------------------------------------------
  if not exists (select 1 from public.guardrail_events where org_id = v_org) then
    for i in 1..36 loop
      select id, severity, action, linked_models into v_pol
      from public.trust_policies
      where org_id = v_org and is_active and cardinality(linked_models) > 0
      order by random() limit 1;

      v_ev_model := (v_pol.linked_models)[1 + floor(random() * array_length(v_pol.linked_models, 1))::int];
      v_r        := random();
      v_ev_status := case when v_r < 0.34 then 'acknowledged'
                          when v_r < 0.50 then 'resolved'
                          else 'open' end;

      insert into public.guardrail_events
        (org_id, policy_id, model_id, action, severity, latency_ms, status,
         ack_by, ack_at, ack_reason, created_at)
      values
        (v_org, v_pol.id, v_ev_model, v_pol.action, v_pol.severity,
         20 + floor(random() * 280)::int,
         v_ev_status,
         case when v_ev_status = 'acknowledged' then v_user end,
         case when v_ev_status = 'acknowledged' then now() - (random() * interval '5 days') end,
         case when v_ev_status = 'acknowledged' then
           (array['False positive - internal test traffic',
                  'Confirmed - escalated to model owner',
                  'Reviewed - expected behavior for this workload'])[1 + floor(random() * 3)::int] end,
         now() - (random() * interval '14 days'));
    end loop;
  end if;

  ------------------------------------------------------------------
  -- 4) guardrail_rules (10; tenant_id carries the org uuid as text,
  --    matching the table's RLS: tenant_id = current_user_org_id()::text)
  ------------------------------------------------------------------
  if not exists (select 1 from public.guardrail_rules where tenant_id = v_org::text) then
    insert into public.guardrail_rules (id, tenant_id, name, rule_type, condition, action, enabled, priority)
    values
      ('grl-pii-high',         v_org::text, 'PII high-sensitivity redaction', 'pii',
       '{"type":"pii","sensitivity":"high","entities":["ssn","credit_card"]}', 'block',    true,  100),
      ('grl-pii-standard',     v_org::text, 'PII standard redaction',         'pii',
       '{"type":"pii","sensitivity":"medium","entities":["email","phone"]}',   'redact',   true,   90),
      ('grl-toxicity',         v_org::text, 'Toxicity threshold',             'toxicity',
       '{"type":"toxicity","threshold":0.8,"categories":["hate","harassment"]}', 'block',  true,   80),
      ('grl-jailbreak',        v_org::text, 'Jailbreak heuristics',           'jailbreak',
       '{"type":"jailbreak","patterns":["ignore previous","DAN"],"ml_check":true}', 'block', true,  95),
      ('grl-prompt-length',    v_org::text, 'Prompt length cap',              'cost',
       '{"type":"token_limit","max_prompt_tokens":6000}',                      'throttle', true,   40),
      ('grl-latency-fallback', v_org::text, 'Latency fallback trigger',       'latency',
       '{"type":"latency","p95_ms":5000,"window_min":5}',                      'fallback', true,   50),
      ('grl-topic-finance',    v_org::text, 'Restricted financial advice',    'topic',
       '{"type":"topic","blocked":["investment_advice","tax_evasion"]}',       'block',    true,   70),
      ('grl-secrets',          v_org::text, 'Secrets & credential scan',      'security',
       '{"type":"secrets","entities":["api_key","password","jwt"]}',           'block',    true,  100),
      ('grl-lang-filter',      v_org::text, 'Unsupported language deflect',   'content',
       '{"type":"language","allowed":["en","es","ne"]}',                       'flag',     false,  20),
      ('grl-competitor',       v_org::text, 'Competitor mention watch',       'topic',
       '{"type":"topic","watch":["competitor_names"]}',                        'flag',     false,  10);
  end if;

  ------------------------------------------------------------------
  -- 5) cost_token_usage (6 models x 14 days; support/docparser trending up;
  --    Customer Support Copilot has a $60/day budget it is close to exceeding)
  ------------------------------------------------------------------
  if not exists (select 1 from public.cost_token_usage where org_id = v_org) then
    v_cost_models := array[v_m_support, v_m_docparser, v_m_credit, v_m_fraud, v_m_loan, v_m_sentiment];
    foreach v_model in array v_cost_models loop
      select name into v_model_name from public.ai_models where id = v_model;
      v_base := case v_model
                  when v_m_support   then 3200000
                  when v_m_docparser then 1500000
                  when v_m_credit    then  900000
                  when v_m_fraud     then 2500000
                  when v_m_loan      then  600000
                  else 1400000 end;
      v_rate := case v_model
                  when v_m_support   then 0.010
                  when v_m_docparser then 0.008
                  when v_m_credit    then 0.002
                  when v_m_fraud     then 0.0015
                  when v_m_loan      then 0.006
                  else 0.0008 end;
      for d in 0..13 loop
        -- d = days ago; trend factor grows toward today for the two trending models
        v_trend  := case when v_model in (v_m_support, v_m_docparser) then 1 + (13 - d) * 0.045 else 1 end;
        v_total  := floor(v_base * v_trend * (0.85 + random() * 0.30))::bigint;
        v_prompt := floor(v_total * 0.62)::bigint;
        insert into public.cost_token_usage
          (org_id, usage_date, model_id, model_name, prompt_tokens, completion_tokens,
           total_tokens, cost_usd, request_count, budget_limit_usd)
        values
          (v_org, current_date - d, v_model, v_model_name,
           v_prompt, v_total - v_prompt, v_total,
           round((v_total / 1000.0 * v_rate)::numeric, 2),
           greatest(1, floor(v_total / 1200.0 * (0.9 + random() * 0.2))::int),
           case when v_model = v_m_support then 60.00 end);
      end loop;
    end loop;
  end if;

  ------------------------------------------------------------------
  -- 6) fallback_logs (14; primary->fallback pairs of real models)
  ------------------------------------------------------------------
  if not exists (select 1 from public.fallback_logs where org_id = v_org) then
    v_fb_primary  := array[v_m_support,  v_m_docparser, v_m_fraud,       v_m_credit];
    v_fb_fallback := array[v_m_nepberta, v_m_docclass,  v_m_fraudshield, v_m_creditrisk];
    for i in 1..14 loop
      v_idx    := 1 + floor(random() * 4)::int;
      v_p      := v_fb_primary[v_idx];
      v_f      := v_fb_fallback[v_idx];
      v_succ   := random() < 0.8;
      v_reason := (array['timeout','rate_limit','provider_error','quality_degradation'])[1 + floor(random() * 4)::int];
      v_trace  := null;
      if random() < 0.5 then
        select id into v_trace from public.live_traces
        where org_id = v_org and model_id = v_p order by random() limit 1;
      end if;
      insert into public.fallback_logs
        (org_id, primary_model, fallback_model, primary_model_id, fallback_model_id,
         trigger_reason, request_id, latency_ms, succeeded, error_message, trace_id, occurred_at)
      values
        (v_org,
         (select name from public.ai_models where id = v_p),
         (select name from public.ai_models where id = v_f),
         v_p, v_f, v_reason,
         'req_' || substr(md5(random()::text), 1, 12),
         800 + floor(random() * 5200)::int,
         v_succ,
         case when not v_succ then
           (array['Fallback model rejected request: context length exceeded',
                  'Fallback timed out after 10000ms',
                  'Provider returned 503 during failover'])[1 + floor(random() * 3)::int] end,
         v_trace,
         now() - (random() * interval '14 days'));
    end loop;
  end if;

  ------------------------------------------------------------------
  -- 7) tool_call_logs (28; agents table is empty so agent_id stays null)
  ------------------------------------------------------------------
  if not exists (select 1 from public.tool_call_logs where org_id = v_org) then
    for i in 1..28 loop
      v_tool  := (array['web_search','sql_query','send_email','file_read','vector_search','code_exec'])[1 + floor(random() * 6)::int];
      v_agent := (array['Support Triage Agent','Claims Processing Agent','Research Assistant','Ops Reporting Agent'])[1 + floor(random() * 4)::int];
      v_r     := random();
      v_status := case when v_r < 0.10 then 'error' when v_r < 0.15 then 'blocked' else 'success' end;
      v_args := case v_tool
        when 'web_search'    then jsonb_build_object('query', 'latest EBA guidelines on AI credit scoring', 'max_results', 5)
        when 'sql_query'     then jsonb_build_object('database', 'analytics', 'query', 'select count(*) from claims where status = $1', 'params', jsonb_build_array('open'))
        when 'send_email'    then jsonb_build_object('to', 'ops-team@sentinel.internal', 'subject', 'Daily anomaly digest', 'template', 'anomaly_digest_v2')
        when 'file_read'     then jsonb_build_object('path', '/mnt/shared/policies/underwriting_2026.pdf', 'pages', '1-12')
        when 'vector_search' then jsonb_build_object('collection', 'kb_articles', 'query', 'fallback routing configuration', 'top_k', 8)
        else                      jsonb_build_object('language', 'python', 'entrypoint', 'recompute_kpis.py', 'timeout_s', 120) end;
      v_result := case
        when v_status = 'success' then
          case v_tool
            when 'web_search'    then jsonb_build_object('results', 5, 'top_url', 'https://eba.europa.eu/ai-guidelines')
            when 'sql_query'     then jsonb_build_object('rows', 137, 'duration_ms', 84)
            when 'send_email'    then jsonb_build_object('message_id', 'msg_' || substr(md5(random()::text), 1, 10), 'accepted', true)
            when 'file_read'     then jsonb_build_object('bytes', 482113, 'pages_read', 12)
            when 'vector_search' then jsonb_build_object('matches', 8, 'best_score', 0.87)
            else                      jsonb_build_object('exit_code', 0, 'stdout_lines', 42) end
        when v_status = 'blocked' then jsonb_build_object('blocked_by', 'grl-secrets', 'reason', 'argument contained credential-like string')
        else null end;
      v_lat := case v_tool
        when 'web_search' then  900 + floor(random() * 2600)::int
        when 'code_exec'  then 1500 + floor(random() * 6000)::int
        else                     50 + floor(random() *  900)::int end;
      v_model := case v_agent
        when 'Support Triage Agent'    then v_m_support
        when 'Claims Processing Agent' then v_m_docparser
        when 'Research Assistant'      then v_m_docparser
        else v_m_sentiment end;
      v_trace := null;
      if random() < 0.4 then
        select id into v_trace from public.live_traces
        where org_id = v_org and model_id = v_model order by random() limit 1;
      end if;
      insert into public.tool_call_logs
        (org_id, agent_id, agent_name, tool_name, invocation_id, arguments, result,
         status, latency_ms, error_message, model_id, trace_id, invoked_at)
      values
        (v_org, null, v_agent, v_tool,
         'inv_' || substr(md5(random()::text), 1, 12),
         v_args, v_result, v_status, v_lat,
         case when v_status = 'error' then
           (array['Upstream tool timeout after 30s',
                  'Permission denied: file outside sandbox',
                  'Query cancelled: statement_timeout'])[1 + floor(random() * 3)::int] end,
         v_model, v_trace,
         now() - (random() * interval '14 days'));
    end loop;
  end if;

  ------------------------------------------------------------------
  -- 8) model_trust_configs (5 highest-risk models; one with a fallback model)
  ------------------------------------------------------------------
  if not exists (select 1 from public.model_trust_configs where org_id = v_org) then
    insert into public.model_trust_configs
      (org_id, model_id, toxicity_threshold, hallucination_threshold, pii_detection_enabled,
       jailbreak_detection, output_filtering, cost_alert_usd, token_limit_per_req,
       rate_limit_rpm, fallback_model_id, blocked_topics)
    values
      (v_org, v_m_credit,  0.70, 0.60, true, true, true, 25.00, 4096,  60, v_m_creditrisk, array['investment_advice']),
      (v_org, v_m_loan,    0.70, 0.60, true, true, true, 20.00, 4096,  45, null,           array['discriminatory_criteria']),
      (v_org, v_m_fraud,   0.80, 0.70, true, true, true, 40.00, 2048, 120, null,           '{}'),
      (v_org, v_m_hr,      0.65, 0.65, true, true, true, 15.00, 4096,  30, null,           array['protected_characteristics']),
      (v_org, v_m_support, 0.75, 0.70, true, true, true, 60.00, 8192, 300, null,           array['legal_advice','medical_advice']);
  end if;
end $$;
