-- 20260818000002_seed_security_group.sql
--
-- Demo seeds for the SECURITY group, Nepali-bank narrative (all FICTIONAL —
-- see NOTICE). Model references are resolved from ai_models at seed time by
-- name (never hardcoded uuids), matching the trust-runtime seed pattern.
-- Idempotent: every insert is guarded by a natural-key NOT EXISTS.

DO $sec$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit uuid; m_fraud uuid; m_kyc uuid; m_support uuid; m_hr uuid; m_nepberta uuid; m_loan uuid;
BEGIN
  SELECT id INTO m_credit   FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'        LIMIT 1;
  SELECT id INTO m_fraud    FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'    LIMIT 1;
  SELECT id INTO m_kyc      FROM public.ai_models WHERE org_id = v_org AND name = 'KYC Image Classifier'      LIMIT 1;
  SELECT id INTO m_support  FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot'  LIMIT 1;
  SELECT id INTO m_hr       FROM public.ai_models WHERE org_id = v_org AND name = 'HRScreener Bot'            LIMIT 1;
  SELECT id INTO m_nepberta FROM public.ai_models WHERE org_id = v_org AND name = 'NepBERTa'                  LIMIT 1;
  SELECT id INTO m_loan     FROM public.ai_models WHERE org_id = v_org AND name = 'Loan Approval Assistant'   LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Threat Feed — canonical rows with MITRE/CVE + model links
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.security_threats WHERE org_id = v_org AND threat_id = 'THR-2026-101') THEN
    INSERT INTO public.security_threats
      (org_id, tenant_id, threat_id, title, description, threat_type, severity, status, source,
       mitre_technique, cve_ref, detected_at, remediation_steps, affected_model_ids, owner)
    VALUES
      (v_org, v_org::text, 'THR-2026-101', 'Prompt-injection campaign against support copilot',
       'Coordinated attempts to override system prompts via pasted "IGNORE PREVIOUS" payloads in Nepali and English chat sessions.',
       'prompt_injection', 'critical', 'investigating', 'Policy Firewall telemetry',
       'AML.T0051', NULL, now() - interval '2 days',
       '["Tighten system-prompt guard on copilot deployment","Enable strict output filtering for session cohort","Replay blocked payloads in Red Team Lab"]'::jsonb,
       CASE WHEN m_support IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_support] END, 'Security Operations'),
      (v_org, v_org::text, 'THR-2026-102', 'Model extraction probing on credit scoring API',
       'High-volume, low-variance scoring requests from three IP ranges consistent with model-extraction reconnaissance.',
       'model_extraction', 'high', 'open', 'API gateway anomaly detection',
       'AML.T0044', NULL, now() - interval '5 days',
       '["Rate-limit scoring endpoint per client","Add jitter to score precision","Notify fraud team of source ranges"]'::jsonb,
       CASE WHEN m_credit IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_credit] END, 'Security Operations'),
      (v_org, v_org::text, 'THR-2026-103', 'Data-poisoning attempt via remittance feedback loop',
       'Suspicious clustered "false fraud" labels submitted through the dispute channel ahead of the Dashain remittance surge.',
       'data_poisoning', 'high', 'investigating', 'IncidentTriage sentinel',
       'AML.T0020', NULL, now() - interval '1 day',
       '["Quarantine feedback batch from dispute channel","Re-run drift baseline on fraud engine","Escalate to MRC if label skew confirmed"]'::jsonb,
       CASE WHEN m_fraud IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_fraud] END, 'Fraud Analytics'),
      (v_org, v_org::text, 'THR-2026-104', 'Jailbreak strings circulating for Nepali-language models',
       'Public repository of Devanagari-script jailbreak templates observed; NepBERTa-based flows are in scope.',
       'jailbreak', 'medium', 'open', 'External threat intel',
       'AML.T0054', NULL, now() - interval '8 days',
       '["Import templates into injection corpus","Schedule arena re-benchmark for Nepali models"]'::jsonb,
       CASE WHEN m_nepberta IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_nepberta] END, 'Security Operations'),
      (v_org, v_org::text, 'THR-2026-105', 'Credential stuffing against dashboard SSO',
       'Burst login failures across 40 staff accounts from residential proxies; MFA held, no compromise confirmed.',
       'credential_attack', 'medium', 'mitigated', 'Supabase auth logs',
       'T1110.004', NULL, now() - interval '12 days',
       '["Force step-up MFA for flagged accounts","Review JIT elevations issued in window"]'::jsonb,
       '{}'::uuid[], 'IT Security'),
      (v_org, v_org::text, 'THR-2026-106', 'PII leakage probe on KYC OCR endpoint',
       'Requests crafted to elicit training-set citizenship numbers from the OCR pipeline. Guardrails blocked all attempts.',
       'pii_exfiltration', 'high', 'mitigated', 'Guardrail events',
       'AML.T0057', NULL, now() - interval '15 days',
       '["Keep PII redaction rule at block","Add canary identifiers to OCR eval set"]'::jsonb,
       CASE WHEN m_kyc IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_kyc] END, 'Privacy Office');
  END IF;

  -- -------------------------------------------------------------------------
  -- Scan Center — scans with schedule/duration, real columns only
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.security_scans WHERE tenant_id = v_org::text AND scan_id = 'SCN-2026-201') THEN
    INSERT INTO public.security_scans
      (id, org_id, tenant_id, scan_id, title, scan_type, target, status, severity,
       findings_count, critical_count, high_count, medium_count, low_count,
       schedule, duration_minutes, started_at, completed_at, initiated_by)
    VALUES
      ('scn-2026-201', v_org, v_org::text, 'SCN-2026-201', 'Weekly prompt-injection sweep — production LLM endpoints',
       'llm_probe', 'Support Copilot + Loan Assistant endpoints', 'completed', 'high',
       14, 1, 4, 6, 3, 'weekly', 42, now() - interval '3 days', now() - interval '3 days' + interval '42 minutes', 'DriftDetection sentinel'),
      ('scn-2026-202', v_org, v_org::text, 'SCN-2026-202', 'Dependency & container CVE scan',
       'sca', 'dashboard + workers images', 'completed', 'medium',
       9, 0, 2, 5, 2, 'daily', 11, now() - interval '1 day', now() - interval '1 day' + interval '11 minutes', 'ChangeDetection sentinel'),
      ('scn-2026-203', v_org, v_org::text, 'SCN-2026-203', 'PII exfiltration red-line scan — KYC pipeline',
       'dlp', 'KYC OCR + document store', 'completed', 'high',
       6, 1, 2, 2, 1, 'weekly', 27, now() - interval '6 days', now() - interval '6 days' + interval '27 minutes', 'DataLineage sentinel'),
      ('scn-2026-204', v_org, v_org::text, 'SCN-2026-204', 'Attack-surface discovery — external assets',
       'asm', 'public DNS + edge endpoints', 'running', 'medium',
       0, 0, 0, 0, 0, 'weekly', NULL, now() - interval '20 minutes', NULL, 'AccessAudit sentinel');
  END IF;

  -- -------------------------------------------------------------------------
  -- Vulnerabilities — CVE tracker with model + scan links
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.security_vulnerabilities WHERE org_id = v_org AND vuln_id = 'VUL-2026-301') THEN
    INSERT INTO public.security_vulnerabilities
      (org_id, tenant_id, vuln_id, cve_ref, title, description, severity, status,
       cvss_score, affected_component, affected_model_id, remediation, assignee,
       discovered_at, patch_date, scan_id)
    VALUES
      (v_org, v_org::text, 'VUL-2026-301', 'CVE-2025-48219', 'Prompt-template escape in support copilot adapter',
       'System-prompt boundary can be escaped with a crafted tool-call argument, letting user content reach the system role.',
       'critical', 'in_remediation', '9.1', 'copilot-adapter', m_support,
       'Upgrade adapter to pinned build; enforce output schema on tool results.', 'Bikash Thapa',
       (now() - interval '4 days')::date, NULL, 'SCN-2026-201'),
      (v_org, v_org::text, 'VUL-2026-302', NULL, 'Unbounded score precision enables model extraction',
       'Credit scoring endpoint returns 6-decimal scores, easing surrogate-model training.',
       'high', 'open', '7.5', 'credit-scoring-api', m_credit,
       'Round scores to 2 decimals and add per-client rate limits.', 'Anita Gurung',
       (now() - interval '5 days')::date, NULL, 'SCN-2026-201'),
      (v_org, v_org::text, 'VUL-2026-303', 'CVE-2025-30144', 'Vulnerable transitive dependency in worker image',
       'A transitive npm dependency in the edge worker image has a known high-severity advisory.',
       'high', 'resolved', '8.1', 'edge-worker-image', NULL,
       'Upgrade lockfile; rebuild image.', 'Sara Cohen',
       (now() - interval '10 days')::date, (now() - interval '2 days')::date, 'SCN-2026-202'),
      (v_org, v_org::text, 'VUL-2026-304', NULL, 'PII canary recoverable from KYC OCR eval logs',
       'Debug logging retained raw OCR output containing citizenship numbers for 24h.',
       'medium', 'resolved', '5.4', 'kyc-ocr-logging', m_kyc,
       'Disable raw-output logging; scrub retained logs.', 'Privacy Office',
       (now() - interval '15 days')::date, (now() - interval '9 days')::date, 'SCN-2026-203');
  END IF;

  -- -------------------------------------------------------------------------
  -- Attack Surface — external/internal assets with exposure + model links
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.attack_surface_assets WHERE org_id = v_org AND name = 'api.sentinelbank.example') THEN
    INSERT INTO public.attack_surface_assets
      (org_id, name, type, description, exposure, protocol, open_ports, status, severity,
       risk_score, last_scanned_at, owner, linked_model_ids, tags)
    VALUES
      (v_org, 'api.sentinelbank.example', 'api_endpoint', 'Public scoring & inference gateway', 'public', 'HTTPS',
       ARRAY[443], 'active', 'high', 78, now() - interval '1 day', 'Platform Engineering',
       array_remove(ARRAY[m_credit, m_fraud]::uuid[], NULL), ARRAY['edge','regulated']),
      (v_org, 'chat.sentinelbank.example', 'api_endpoint', 'Customer support copilot web entrypoint', 'public', 'HTTPS',
       ARRAY[443], 'active', 'high', 72, now() - interval '1 day', 'Digital Banking',
       (CASE WHEN m_support IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_support] END), ARRAY['edge','llm']),
      (v_org, 'kyc-ocr.internal', 'service', 'KYC document OCR pipeline (internal)', 'internal', 'gRPC',
       ARRAY[8443], 'active', 'medium', 55, now() - interval '6 days', 'Risk Engineering',
       (CASE WHEN m_kyc IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_kyc] END), ARRAY['pii','internal']),
      (v_org, 'data-warehouse.internal', 'infrastructure', 'Analytics warehouse holding training extracts', 'restricted', 'TLS',
       ARRAY[5432], 'active', 'critical', 88, now() - interval '2 days', 'Data Platform',
       '{}'::uuid[], ARRAY['pii','restricted']);
  END IF;

  -- -------------------------------------------------------------------------
  -- Red Team — campaigns (extend) + findings with OWASP-LLM + model links
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.red_team_campaigns WHERE tenant_id = v_org::text AND campaign_id = 'RTC-2026-401') THEN
    INSERT INTO public.red_team_campaigns
      (id, org_id, tenant_id, campaign_id, name, objective, lead, status, severity,
       target_model_ids, attack_types, findings_count, success_rate, started_at, completed_at)
    VALUES
      ('rtc-2026-401', v_org, v_org::text, 'RTC-2026-401', 'Q3 LLM safety red-team — customer-facing models',
       'Exercise prompt-injection, jailbreak and PII-exfiltration resistance ahead of the festive surge.',
       'Bikash Thapa', 'completed', 'high',
       array_remove(ARRAY[m_support, m_kyc]::uuid[], NULL),
       ARRAY['prompt_injection','jailbreak','pii_exfiltration'], 3, 27,
       now() - interval '9 days', now() - interval '2 days'),
      ('rtc-2026-402', v_org, v_org::text, 'RTC-2026-402', 'Credit model extraction resilience',
       'Attempt surrogate-model reconstruction of the credit scorer via query probing.',
       'Anita Gurung', 'in_progress', 'medium',
       (CASE WHEN m_credit IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_credit] END),
       ARRAY['model_extraction'], 1, 10, now() - interval '3 days', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.red_team_findings WHERE org_id = v_org AND finding_ref = 'RTF-2026-501') THEN
    INSERT INTO public.red_team_findings
      (org_id, finding_ref, title, description, severity, status, attack_vector, owasp_llm_ref,
       cvss, model_id, impact, recommendation, remediation_owner, discovered_by)
    VALUES
      (v_org, 'RTF-2026-501', 'System-prompt override via multilingual payload',
       'A Nepali/English mixed "ignore previous instructions" payload overrode the copilot system prompt in 27% of trials.',
       'critical', 'in_remediation', 'Prompt Injection', 'LLM01', 9.1, m_support,
       'Attacker can extract system instructions and redirect the assistant.',
       'Enforce a signed system-prompt guard and strict output schema; add the payload to the injection corpus.',
       'Digital Banking', 'Bikash Thapa'),
      (v_org, 'RTF-2026-502', 'PII disclosure through indirect KYC prompt',
       'Chained prompts coaxed partial citizenship numbers from the KYC OCR summary flow before the guardrail tripped.',
       'high', 'open', 'Sensitive Information Disclosure', 'LLM06', 7.4, m_kyc,
       'Potential exposure of regulated personal identifiers.',
       'Lower PII redaction threshold to block; add canary identifiers to the eval set.',
       'Privacy Office', 'Anita Gurung'),
      (v_org, 'RTF-2026-503', 'Surrogate model viable from unbounded credit scores',
       'A gradient-boosted surrogate reached 0.91 agreement with the production credit scorer after 40k queries.',
       'medium', 'open', 'Model Extraction', 'LLM10', 5.9, m_credit,
       'Intellectual-property and fairness-audit bypass risk.',
       'Round score precision and rate-limit per client; monitor query entropy.',
       'Risk Engineering', 'Anita Gurung');
  END IF;

  -- -------------------------------------------------------------------------
  -- Model Arena — security benchmarks keyed to real registry models
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.model_arena_runs WHERE org_id = v_org AND name = 'Customer Support Copilot — security benchmark') THEN
    INSERT INTO public.model_arena_runs
      (org_id, name, model_id, provider, status,
       prompt_injection_resistance, jailbreak_resistance, output_safety, pii_leakage,
       hallucination_rate, bias_score, overall_score, evaluated_at, run_by)
    VALUES
      (v_org, 'Customer Support Copilot — security benchmark', m_support, 'Anthropic', 'completed',
       84, 88, 91, 4, 6, 88, 86, now() - interval '2 days', 'BiasMonitor sentinel'),
      (v_org, 'Loan Approval Assistant — security benchmark', m_loan, 'OpenAI', 'completed',
       79, 82, 87, 6, 9, 82, 80, now() - interval '2 days', 'BiasMonitor sentinel'),
      (v_org, 'NepBERTa — security benchmark', m_nepberta, 'Internal', 'completed',
       71, 74, 83, 8, 12, 78, 74, now() - interval '4 days', 'BiasMonitor sentinel');
  END IF;

  -- -------------------------------------------------------------------------
  -- Policy Firewall — enforcement rules with real counters + model links
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.policy_firewall_rules WHERE org_id = v_org AND name = 'PII high-sensitivity redaction') THEN
    INSERT INTO public.policy_firewall_rules
      (org_id, name, description, rule_type, pattern, action, target, enabled, priority,
       evaluations, blocked, last_triggered_at, severity, status, linked_model_ids)
    VALUES
      (v_org, 'PII high-sensitivity redaction', 'Block citizenship / card numbers in prompts and outputs',
       'pii', 'ssn|citizenship|card_number', 'block', 'All LLM endpoints', true, 100,
       128400, 342, now() - interval '3 hours', 'critical', 'active',
       array_remove(ARRAY[m_kyc, m_support]::uuid[], NULL)),
      (v_org, 'Prompt-injection guard', 'Detect system-prompt override attempts',
       'prompt_injection', 'ignore (all )?previous|system prompt', 'block', 'Customer-facing agents', true, 95,
       98230, 512, now() - interval '40 minutes', 'critical', 'active',
       (CASE WHEN m_support IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_support] END)),
      (v_org, 'Toxicity threshold', 'Flag toxic or harassing content above 0.8',
       'toxicity', 'threshold:0.8', 'flag', 'All endpoints', true, 80,
       76110, 88, now() - interval '2 hours', 'medium', 'active', '{}'::uuid[]),
      (v_org, 'Model-extraction rate guard', 'Require approval on high-entropy scoring bursts',
       'data_exfil', 'entropy_burst', 'require_approval', 'Credit scoring API', true, 70,
       21050, 19, now() - interval '5 hours', 'high', 'active',
       (CASE WHEN m_credit IS NULL THEN '{}'::uuid[] ELSE ARRAY[m_credit] END));
  END IF;

  -- -------------------------------------------------------------------------
  -- Keys Vault — metadata only, NO secret material (key_hash is a sha256)
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.keys_vault WHERE org_id = v_org AND name = 'Production scoring gateway key') THEN
    INSERT INTO public.keys_vault
      (org_id, name, provider, key_prefix, key_hash, scopes, status, severity,
       expires_at, last_used_at, usage_count, owner, linked_agent_id)
    VALUES
      (v_org, 'Production scoring gateway key', 'Internal', 'sk-prod-a1',
       encode(sha256(('demo-key-1' || v_org::text)::bytea), 'hex'),
       ARRAY['scoring:read','scoring:write'], 'active', 'high',
       now() + interval '60 days', now() - interval '2 hours', 45200, 'Platform Engineering', NULL),
      (v_org, 'Support copilot LLM key', 'Anthropic', 'sk-ant-b2',
       encode(sha256(('demo-key-2' || v_org::text)::bytea), 'hex'),
       ARRAY['inference:invoke'], 'active', 'medium',
       now() + interval '30 days', now() - interval '15 minutes', 128900, 'Digital Banking', NULL),
      (v_org, 'Legacy fraud batch key', 'OpenAI', 'sk-openai-c3',
       encode(sha256(('demo-key-3' || v_org::text)::bytea), 'hex'),
       ARRAY['inference:invoke'], 'revoked', 'low',
       now() - interval '5 days', now() - interval '20 days', 8800, 'Fraud Analytics', NULL);
  END IF;

  -- -------------------------------------------------------------------------
  -- Security Reports — real templates + one generated run with a snapshot
  -- -------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.security_reports WHERE org_id = v_org AND name = 'Weekly security posture') THEN
    INSERT INTO public.security_reports
      (org_id, name, category, description, frequency, sections, recipients, format, generation_count, last_generated_at)
    VALUES
      (v_org, 'Weekly security posture', 'posture', 'Threats, scans and open vulnerabilities for the week.',
       'weekly', '["threats","scans","vulnerabilities"]'::jsonb, ARRAY['ciso@sentinelbank.example'], 'json', 6, now() - interval '2 days'),
      (v_org, 'Red-team executive summary', 'red_team', 'Campaign outcomes and critical findings for leadership.',
       'monthly', '["red_team_campaigns","red_team_findings"]'::jsonb, ARRAY['board@sentinelbank.example'], 'json', 2, now() - interval '9 days'),
      (v_org, 'Quarterly EU AI Act security evidence', 'compliance', 'Art.15 robustness & cybersecurity evidence pack.',
       'quarterly', '["vulnerabilities","policy_firewall_rules","red_team_findings"]'::jsonb, ARRAY['compliance@sentinelbank.example'], 'json', 1, now() - interval '20 days');
  END IF;
END $sec$;
