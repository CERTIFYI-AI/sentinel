-- Seed: Agent Control demo data, org-scoped ('00000000-0000-0000-0000-000000000001').
-- Applied live via Supabase MCP on 2026-08-13. Idempotent (on conflict do nothing).
--
-- Interlink contract (CLAUDE.md): agents carry the canonical ai_models.id in
-- doc->>'modelId' AND the first-class model_id column; credentials, workflows
-- and kill-switch events reference agent_gov_registry ids. No invented runtime
-- metrics beyond the declared demo docs themselves.
--
-- Referenced live models (ai_models.id):
--   83a20820-aa10-4216-8ad6-80e4261071cf  Credit Risk Scorer
--   e61f991b-7da7-4b81-9deb-aa8665bb6ac1  Fraud Detection Engine
--   4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb  HRScreener Bot
--   bd167875-01d2-4afb-aa11-b25b6dbd4d09  Customer Support Copilot
--   0fac9e56-8ddf-47eb-922e-ed11086fd260  Churn Predictor

-- ── 1) agent_gov_registry — 5 agents (doc = complete AgentRecord) ────────────

insert into public.agent_gov_registry (id, tenant_id, org_id, doc, state, model_id, version)
values (
  'aa000001-0000-4000-8000-000000000001', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "aa000001-0000-4000-8000-000000000001",
    "displayId": "AGT-001",
    "name": "CreditDecisionAgent",
    "agentVersion": "2.3.1",
    "type": "Autonomous",
    "status": "Active",
    "riskTier": "Critical",
    "owner": "James Liu",
    "team": "Lending AI",
    "purpose": "End-to-end consumer credit application processing: document intake, invoking the Credit Risk Scorer model, and drafting preliminary decisions for underwriter review.",
    "tools": ["CreditAPI", "DocumentVerifier", "CustomerDB", "NotificationService", "AuditLogger"],
    "permissions": ["READ:customer_data", "WRITE:loan_decisions", "CALL:credit_risk_scorer", "READ:policy_rules"],
    "modelId": "83a20820-aa10-4216-8ad6-80e4261071cf",
    "model": "Credit Risk Scorer",
    "maxBudget": 5000,
    "dailyCallCount": 1247,
    "lastActivity": "2026-08-12 09:18:00",
    "registeredDate": "2026-01-15",
    "approvedBy": "Sarah Chen",
    "trustScore": 72,
    "escalationPolicy": "HITL on decisions > $500K or model score < 0.65",
    "killSwitchEnabled": true,
    "totalCallsLifetime": 184291,
    "avgLatencyMs": 1240
  }'::jsonb,
  'Active', '83a20820-aa10-4216-8ad6-80e4261071cf', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_registry (id, tenant_id, org_id, doc, state, model_id, version)
values (
  'aa000002-0000-4000-8000-000000000002', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "aa000002-0000-4000-8000-000000000002",
    "displayId": "AGT-002",
    "name": "FraudTriageAgent",
    "agentVersion": "1.8.0",
    "type": "Semi-Autonomous",
    "status": "Active",
    "riskTier": "High",
    "owner": "Sarah Chen",
    "team": "Fraud & Security",
    "purpose": "Triages transactions flagged by the Fraud Detection Engine: gathers evidence, enriches context, and files investigation cases for human review.",
    "tools": ["TransactionDB", "DeviceFingerprinter", "IPGeolocation", "CaseManagement"],
    "permissions": ["READ:transaction_data", "READ:customer_pii", "WRITE:case_notes", "CALL:fraud_detection_engine"],
    "modelId": "e61f991b-7da7-4b81-9deb-aa8665bb6ac1",
    "model": "Fraud Detection Engine",
    "maxBudget": 2000,
    "dailyCallCount": 342,
    "lastActivity": "2026-08-12 08:55:00",
    "registeredDate": "2026-02-01",
    "approvedBy": "Sarah Chen",
    "trustScore": 85,
    "escalationPolicy": "Auto-escalate cases > $50K to Senior Investigator",
    "killSwitchEnabled": true,
    "totalCallsLifetime": 52340,
    "avgLatencyMs": 2100
  }'::jsonb,
  'Active', 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_registry (id, tenant_id, org_id, doc, state, model_id, version)
values (
  'aa000003-0000-4000-8000-000000000003', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "aa000003-0000-4000-8000-000000000003",
    "displayId": "AGT-003",
    "name": "HRScreeningAssistant",
    "agentVersion": "0.9.4",
    "type": "Tool-Using",
    "status": "Suspended",
    "riskTier": "High",
    "owner": "Maria Santos",
    "team": "People Operations",
    "purpose": "Pre-screens inbound job applications with the HRScreener Bot model and drafts shortlists for recruiter review. Suspended pending bias-audit remediation.",
    "tools": ["ATSConnector", "ResumeParser", "HRScreenerAPI", "NotificationService"],
    "permissions": ["READ:candidate_data", "CALL:hrscreener_bot", "WRITE:shortlists"],
    "modelId": "4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb",
    "model": "HRScreener Bot",
    "maxBudget": 800,
    "dailyCallCount": 0,
    "lastActivity": "2026-08-05 14:11:00",
    "registeredDate": "2026-03-12",
    "approvedBy": "Maria Santos",
    "trustScore": 58,
    "escalationPolicy": "All shortlists require recruiter sign-off; suspend on any bias-audit breach",
    "killSwitchEnabled": true,
    "totalCallsLifetime": 18240,
    "avgLatencyMs": 1730
  }'::jsonb,
  'Suspended', '4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_registry (id, tenant_id, org_id, doc, state, model_id, version)
values (
  'aa000004-0000-4000-8000-000000000004', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "aa000004-0000-4000-8000-000000000004",
    "displayId": "AGT-004",
    "name": "SupportCopilotOrchestrator",
    "agentVersion": "1.4.2",
    "type": "Orchestrator",
    "status": "Active",
    "riskTier": "Medium",
    "owner": "Emma Wilson",
    "team": "Digital Banking",
    "purpose": "Routes customer conversations through the Customer Support Copilot model, coordinates worker agents, and manages human handoffs for out-of-scope requests.",
    "tools": ["ConversationRouter", "ContextStore", "SubAgentSpawner", "CustomerDB"],
    "permissions": ["READ:customer_profile", "SPAWN:worker_agents", "WRITE:conversation_logs", "CALL:support_copilot"],
    "modelId": "bd167875-01d2-4afb-aa11-b25b6dbd4d09",
    "model": "Customer Support Copilot",
    "maxBudget": 1200,
    "dailyCallCount": 2874,
    "lastActivity": "2026-08-12 10:02:00",
    "registeredDate": "2026-02-20",
    "approvedBy": "Sarah Chen",
    "trustScore": 81,
    "escalationPolicy": "Hand off to human agent on low confidence or customer request",
    "killSwitchEnabled": true,
    "totalCallsLifetime": 96110,
    "avgLatencyMs": 640
  }'::jsonb,
  'Active', 'bd167875-01d2-4afb-aa11-b25b6dbd4d09', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_registry (id, tenant_id, org_id, doc, state, model_id, version)
values (
  'aa000005-0000-4000-8000-000000000005', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "aa000005-0000-4000-8000-000000000005",
    "displayId": "AGT-005",
    "name": "ChurnOutreachAgent",
    "agentVersion": "0.5.0-beta",
    "type": "Worker",
    "status": "Pending Approval",
    "riskTier": "Medium",
    "owner": "Marcus Johnson",
    "team": "Growth",
    "purpose": "Consumes Churn Predictor scores to draft personalised retention outreach; awaiting governance approval before first production run.",
    "tools": ["ChurnModelAPI", "CampaignComposer", "EmailGateway"],
    "permissions": ["READ:churn_scores", "WRITE:draft_campaigns"],
    "modelId": "0fac9e56-8ddf-47eb-922e-ed11086fd260",
    "model": "Churn Predictor",
    "maxBudget": 400,
    "dailyCallCount": 0,
    "lastActivity": "Never",
    "registeredDate": "2026-08-01",
    "approvedBy": "Pending",
    "trustScore": 0,
    "escalationPolicy": "All outbound messages require marketing sign-off during beta",
    "killSwitchEnabled": true,
    "totalCallsLifetime": 0,
    "avgLatencyMs": 0
  }'::jsonb,
  'Pending Approval', '0fac9e56-8ddf-47eb-922e-ed11086fd260', 1
)
on conflict (id) do nothing;

-- ── 2) agent_gov_credentials — 6 credentials (doc = complete AgentCredential) ─

insert into public.agent_gov_credentials (id, tenant_id, org_id, doc, state, version)
values (
  'cc000001-0000-4000-8000-000000000001', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "cc000001-0000-4000-8000-000000000001",
    "displayId": "IAM-001",
    "agentId": "aa000001-0000-4000-8000-000000000001",
    "agentName": "CreditDecisionAgent",
    "principalType": "Service Account",
    "principalId": "svc-credit-decision@sentinel.iam.prod",
    "roles": ["LoanProcessor", "CreditReporter", "AuditWriter"],
    "scopes": ["credit:read", "loans:write", "documents:read", "audit:write"],
    "created": "2026-01-15",
    "expires": "2026-10-15",
    "lastUsed": "2026-08-12 09:18:00",
    "status": "Active",
    "mfaRequired": false,
    "ipAllowlist": ["10.0.0.0/8", "172.16.0.0/12"],
    "rotationPolicy": "Every 90 days — next: 2026-10-15",
    "auditRequired": true,
    "approvedBy": "Sarah Chen"
  }'::jsonb,
  'Active', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_credentials (id, tenant_id, org_id, doc, state, version)
values (
  'cc000002-0000-4000-8000-000000000002', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "cc000002-0000-4000-8000-000000000002",
    "displayId": "IAM-002",
    "agentId": "aa000001-0000-4000-8000-000000000001",
    "agentName": "CreditDecisionAgent",
    "principalType": "API Key",
    "principalId": "sk-prod-cda-...f4a2",
    "roles": ["CreditBureauCaller"],
    "scopes": ["credit_bureau:read"],
    "created": "2026-05-14",
    "expires": "2026-08-14",
    "lastUsed": "2026-08-11 17:42:00",
    "status": "Pending Rotation",
    "mfaRequired": false,
    "ipAllowlist": ["10.0.1.0/24"],
    "rotationPolicy": "Every 90 days — due 2026-08-14",
    "auditRequired": true,
    "approvedBy": "Sarah Chen"
  }'::jsonb,
  'Pending Rotation', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_credentials (id, tenant_id, org_id, doc, state, version)
values (
  'cc000003-0000-4000-8000-000000000003', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "cc000003-0000-4000-8000-000000000003",
    "displayId": "IAM-003",
    "agentId": "aa000002-0000-4000-8000-000000000002",
    "agentName": "FraudTriageAgent",
    "principalType": "OAuth Client",
    "principalId": "oauth-fraud-triage-prod-7a3f",
    "roles": ["FraudInvestigator", "CaseManager"],
    "scopes": ["transactions:read", "customers:read", "cases:write", "enrichment:call"],
    "created": "2026-02-01",
    "expires": "2027-02-01",
    "lastUsed": "2026-08-12 08:55:00",
    "status": "Active",
    "mfaRequired": true,
    "ipAllowlist": ["10.0.2.0/24", "10.0.3.0/24"],
    "rotationPolicy": "Annually — next: 2027-02-01",
    "auditRequired": true,
    "approvedBy": "Sarah Chen"
  }'::jsonb,
  'Active', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_credentials (id, tenant_id, org_id, doc, state, version)
values (
  'cc000004-0000-4000-8000-000000000004', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "cc000004-0000-4000-8000-000000000004",
    "displayId": "IAM-004",
    "agentId": "aa000003-0000-4000-8000-000000000003",
    "agentName": "HRScreeningAssistant",
    "principalType": "Service Account",
    "principalId": "svc-hr-screening@sentinel.iam.prod",
    "roles": ["CandidateReader", "ShortlistWriter"],
    "scopes": ["candidates:read", "shortlists:write", "ats:read"],
    "created": "2026-03-12",
    "expires": "2026-09-12",
    "lastUsed": "2026-08-05 14:11:00",
    "status": "Revoked",
    "mfaRequired": false,
    "ipAllowlist": ["10.0.4.0/24"],
    "rotationPolicy": "N/A — revoked with agent suspension on 2026-08-05",
    "auditRequired": true,
    "approvedBy": "Maria Santos"
  }'::jsonb,
  'Revoked', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_credentials (id, tenant_id, org_id, doc, state, version)
values (
  'cc000005-0000-4000-8000-000000000005', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "cc000005-0000-4000-8000-000000000005",
    "displayId": "IAM-005",
    "agentId": "aa000004-0000-4000-8000-000000000004",
    "agentName": "SupportCopilotOrchestrator",
    "principalType": "mTLS Certificate",
    "principalId": "CN=support-copilot-orchestrator,O=Sentinel,C=US",
    "roles": ["ConversationManager", "AgentOrchestrator"],
    "scopes": ["conversations:write", "customers:read", "agents:spawn"],
    "created": "2026-02-20",
    "expires": "2027-02-20",
    "lastUsed": "2026-08-12 10:02:00",
    "status": "Active",
    "mfaRequired": false,
    "ipAllowlist": ["10.0.0.0/8"],
    "rotationPolicy": "Annually — auto-renewed via PKI",
    "auditRequired": false,
    "approvedBy": "Sarah Chen"
  }'::jsonb,
  'Active', 1
)
on conflict (id) do nothing;

insert into public.agent_gov_credentials (id, tenant_id, org_id, doc, state, version)
values (
  'cc000006-0000-4000-8000-000000000006', 'default', '00000000-0000-0000-0000-000000000001',
  '{
    "id": "cc000006-0000-4000-8000-000000000006",
    "displayId": "IAM-006",
    "agentId": "aa000005-0000-4000-8000-000000000005",
    "agentName": "ChurnOutreachAgent",
    "principalType": "API Key",
    "principalId": "sk-stg-coa-...b8f1",
    "roles": ["ChurnScoreReader", "CampaignDrafter"],
    "scopes": ["churn_scores:read", "campaigns:write"],
    "created": "2026-08-01",
    "expires": "2026-11-01",
    "lastUsed": "Never",
    "status": "Active",
    "mfaRequired": false,
    "ipAllowlist": ["10.0.6.0/24"],
    "rotationPolicy": "Every 90 days — next: 2026-11-01",
    "auditRequired": true,
    "approvedBy": "Marcus Johnson"
  }'::jsonb,
  'Active', 1
)
on conflict (id) do nothing;

-- ── 3) agent_workflows — 3 workflows referencing the agents ──────────────────
-- Statuses match the Choreography Canvas vocabulary
-- (running / awaiting_approval / paused / failed / terminated).

insert into public.agent_workflows
  (id, org_id, name, description, status, agents, steps, triggers, owner, last_run_at, last_run_status, run_count, metadata)
values (
  'cd000001-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
  'Customer Support Resolution Flow',
  'Inbound support conversations routed by the orchestrator; suspected-fraud contacts are handed to FraudTriageAgent before resolution.',
  'running',
  '{
    "orchestratorId": "aa000004-0000-4000-8000-000000000004",
    "orchestratorName": "SupportCopilotOrchestrator",
    "workerIds": ["aa000002-0000-4000-8000-000000000002"],
    "workerNames": ["FraudTriageAgent"],
    "names": ["SupportCopilotOrchestrator", "FraudTriageAgent"]
  }'::jsonb,
  '[
    {"order": 1, "name": "Classify inbound conversation", "agentId": "aa000004-0000-4000-8000-000000000004", "action": "route"},
    {"order": 2, "name": "Fraud check on flagged contacts", "agentId": "aa000002-0000-4000-8000-000000000002", "action": "triage"},
    {"order": 3, "name": "Resolve or hand off to human", "agentId": "aa000004-0000-4000-8000-000000000004", "action": "resolve"}
  ]'::jsonb,
  '[{"type": "event", "source": "support_ticket_created"}]'::jsonb,
  'Emma Wilson',
  '2026-08-12T08:30:00Z', 'success', 412,
  '{}'::jsonb
)
on conflict (id) do nothing;

insert into public.agent_workflows
  (id, org_id, name, description, status, agents, steps, triggers, owner, last_run_at, last_run_status, run_count, metadata)
values (
  'cd000002-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001',
  'Credit Application Review',
  'Credit applications processed end-to-end with a fraud pre-check; final decisions above the HITL threshold pause for underwriter approval.',
  'awaiting_approval',
  '{
    "orchestratorId": "aa000001-0000-4000-8000-000000000001",
    "orchestratorName": "CreditDecisionAgent",
    "workerIds": ["aa000002-0000-4000-8000-000000000002"],
    "workerNames": ["FraudTriageAgent"],
    "names": ["CreditDecisionAgent", "FraudTriageAgent"]
  }'::jsonb,
  '[
    {"order": 1, "name": "Verify application documents", "agentId": "aa000001-0000-4000-8000-000000000001", "action": "verify"},
    {"order": 2, "name": "Fraud pre-check", "agentId": "aa000002-0000-4000-8000-000000000002", "action": "screen"},
    {"order": 3, "name": "Score and draft decision", "agentId": "aa000001-0000-4000-8000-000000000001", "action": "decide"},
    {"order": 4, "name": "HITL approval gate", "agentId": null, "action": "approve"}
  ]'::jsonb,
  '[{"type": "event", "source": "loan_application_submitted"}]'::jsonb,
  'James Liu',
  '2026-08-11T16:05:00Z', 'success', 98,
  '{}'::jsonb
)
on conflict (id) do nothing;

insert into public.agent_workflows
  (id, org_id, name, description, status, agents, steps, triggers, owner, last_run_at, last_run_status, run_count, metadata)
values (
  'cd000003-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001',
  'Churn Win-back Campaign',
  'Weekly batch: pull fresh churn scores and draft retention outreach. Failing while the drafting agent awaits governance approval.',
  'failed',
  '{
    "orchestratorId": "aa000005-0000-4000-8000-000000000005",
    "orchestratorName": "ChurnOutreachAgent",
    "workerIds": [],
    "workerNames": [],
    "names": ["ChurnOutreachAgent"]
  }'::jsonb,
  '[
    {"order": 1, "name": "Fetch weekly churn scores", "agentId": "aa000005-0000-4000-8000-000000000005", "action": "fetch"},
    {"order": 2, "name": "Draft outreach batch", "agentId": "aa000005-0000-4000-8000-000000000005", "action": "draft"},
    {"order": 3, "name": "Marketing sign-off", "agentId": null, "action": "approve"}
  ]'::jsonb,
  '[{"type": "schedule", "cron": "0 6 * * 1"}]'::jsonb,
  'Marcus Johnson',
  '2026-08-11T06:00:00Z', 'failed', 7,
  '{"lastError": "Agent aa000005 is Pending Approval — execution blocked by governance policy"}'::jsonb
)
on conflict (id) do nothing;

-- ── 4) kill_switch_events — 3 events referencing the agents ──────────────────
-- Statuses match the Kill Switch console vocabulary (active / resumed / escalated).

insert into public.kill_switch_events
  (id, org_id, agent_id, agent_name, triggered_by, trigger_type, reason, severity, status, affected_systems, metadata, triggered_at)
values (
  'ce000001-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000001',
  'aa000003-0000-4000-8000-000000000003', 'HRScreeningAssistant',
  'Bias monitor', 'automated',
  'Weekly bias audit breached the disparate-impact threshold (ratio < 0.8) on the gender dimension for the HRScreener Bot model. Agent suspended pending remediation.',
  'critical', 'active',
  '["HR screening pipeline", "Candidate shortlist queue"]'::jsonb,
  '{"modelId": "4fbec697-2d9f-4d8d-88bc-e7d1a9ca00eb", "policy": "bias-audit-threshold"}'::jsonb,
  '2026-08-05T14:12:00Z'
)
on conflict (id) do nothing;

insert into public.kill_switch_events
  (id, org_id, agent_id, agent_name, triggered_by, trigger_type, reason, severity, status,
   resolved_by, resolved_at, resolution_notes, affected_systems, metadata, triggered_at)
values (
  'ce000002-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000001',
  'aa000001-0000-4000-8000-000000000001', 'CreditDecisionAgent',
  'James Liu', 'manual',
  'Upstream credit bureau outage produced stale scores in preliminary decisions; agent suspended as a precaution.',
  'high', 'resumed',
  'Sarah Chen', '2026-07-22T09:40:00Z',
  'Root cause confirmed as bureau-side outage. Affected decisions re-scored after backfill validation; agent resumed with no policy changes required.',
  '["Loan decisioning pipeline"]'::jsonb,
  '{"incident": "INC-2214"}'::jsonb,
  '2026-07-21T15:03:00Z'
)
on conflict (id) do nothing;

insert into public.kill_switch_events
  (id, org_id, agent_id, agent_name, triggered_by, trigger_type, reason, severity, status, affected_systems, metadata, triggered_at)
values (
  'ce000003-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000001',
  'aa000002-0000-4000-8000-000000000002', 'FraudTriageAgent',
  'Runtime guardrail', 'policy',
  'Case-filing rate exceeded the configured guardrail during a fraud-ring spike; auto-throttled and escalated to the SOC for review rather than suspended.',
  'medium', 'escalated',
  '["Fraud case management"]'::jsonb,
  '{"guardrail": "case_rate_limit", "observedPerHour": 96, "limitPerHour": 60}'::jsonb,
  '2026-08-11T22:47:00Z'
)
on conflict (id) do nothing;
