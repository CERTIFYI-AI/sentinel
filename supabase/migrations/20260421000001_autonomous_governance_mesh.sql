-- =====================================================================
-- Sentinel Autonomous Governance Mesh - Phase 1 Event Bus Foundation
-- Fortune 500 Enterprise Readiness
-- Date: 2026-04-21
--
-- Enhances the existing governance_events and agent_registry tables,
-- adds agent_executions ledger, event_cascade_links, governance_event_dlq,
-- and the notification triggers that make the event bus autonomous.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Enhance governance_events: add columns expected by the
--    Auto-Agent Module Interlink Architecture
-- ---------------------------------------------------------------------
ALTER TABLE public.governance_events
    ADD COLUMN IF NOT EXISTS source_module     text,
    ADD COLUMN IF NOT EXISTS triggered_agents  text[]       DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS status            text         DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS processed_at      timestamptz,
    ADD COLUMN IF NOT EXISTS error             text,
    ADD COLUMN IF NOT EXISTS retry_count       integer      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS correlation_id    uuid,
    ADD COLUMN IF NOT EXISTS causation_id      uuid,
    ADD COLUMN IF NOT EXISTS idempotency_key   text,
    ADD COLUMN IF NOT EXISTS trace_id          text,
    ADD COLUMN IF NOT EXISTS actor_id          uuid,
    ADD COLUMN IF NOT EXISTS cascade_depth     integer      DEFAULT 0;

-- Constrain status to a known set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'governance_events_status_chk'
    ) THEN
        ALTER TABLE public.governance_events
            ADD CONSTRAINT governance_events_status_chk
            CHECK (status IN ('pending','processing','completed','failed','dead_letter','cancelled'));
    END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_gov_events_idem
    ON public.governance_events(org_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gov_events_status       ON public.governance_events(status);
CREATE INDEX IF NOT EXISTS idx_gov_events_type_created ON public.governance_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gov_events_correlation  ON public.governance_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_gov_events_causation    ON public.governance_events(causation_id);
CREATE INDEX IF NOT EXISTS idx_gov_events_source_mod   ON public.governance_events(source_module);
CREATE INDEX IF NOT EXISTS idx_gov_events_payload_gin  ON public.governance_events USING gin(payload);

-- ---------------------------------------------------------------------
-- 2. Enhance agent_registry
-- ---------------------------------------------------------------------
ALTER TABLE public.agent_registry
    ADD COLUMN IF NOT EXISTS trigger_events        text[]   DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS target_modules        text[]   DEFAULT '{}'::text[],
    ADD COLUMN IF NOT EXISTS is_enabled            boolean  DEFAULT true,
    ADD COLUMN IF NOT EXISTS priority              integer  DEFAULT 5,
    ADD COLUMN IF NOT EXISTS last_execution_at     timestamptz,
    ADD COLUMN IF NOT EXISTS avg_execution_ms      integer  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS p95_execution_ms      integer  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS error_rate            numeric(5,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_executions      bigint   DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_errors          bigint   DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sla_ms                integer  DEFAULT 5000,
    ADD COLUMN IF NOT EXISTS description           text,
    ADD COLUMN IF NOT EXISTS owner_team            text,
    ADD COLUMN IF NOT EXISTS runbook_url           text,
    ADD COLUMN IF NOT EXISTS dlq_threshold         integer  DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_agent_registry_enabled        ON public.agent_registry(is_enabled);
CREATE INDEX IF NOT EXISTS idx_agent_registry_triggers       ON public.agent_registry USING gin(trigger_events);
CREATE INDEX IF NOT EXISTS idx_agent_registry_priority       ON public.agent_registry(priority);

-- ---------------------------------------------------------------------
-- 3. Per-agent execution ledger (observability + audit)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_executions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_id          uuid REFERENCES public.governance_events(id) ON DELETE CASCADE,
    agent_name        text NOT NULL,
    event_type        text NOT NULL,
    status            text NOT NULL DEFAULT 'started'
        CHECK (status IN ('started','succeeded','failed','timeout','skipped')),
    started_at        timestamptz NOT NULL DEFAULT now(),
    finished_at       timestamptz,
    duration_ms       integer,
    output            jsonb,
    error             text,
    attempt           integer DEFAULT 1,
    trace_id          text,
    input_hash        text
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_event   ON public.agent_executions(event_id);
CREATE INDEX IF NOT EXISTS idx_agent_exec_agent   ON public.agent_executions(agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_exec_status  ON public.agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_exec_trace   ON public.agent_executions(trace_id);

-- ---------------------------------------------------------------------
-- 4. Cascade graph - links parent event to child event emitted by agent
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_cascade_links (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_event_id   uuid NOT NULL REFERENCES public.governance_events(id) ON DELETE CASCADE,
    child_event_id    uuid NOT NULL REFERENCES public.governance_events(id) ON DELETE CASCADE,
    agent_name        text NOT NULL,
    depth             integer NOT NULL DEFAULT 1,
    created_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE(parent_event_id, child_event_id)
);

CREATE INDEX IF NOT EXISTS idx_cascade_parent ON public.event_cascade_links(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_cascade_child  ON public.event_cascade_links(child_event_id);

-- ---------------------------------------------------------------------
-- 5. Dead-letter queue for poisoned events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.governance_event_dlq (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    original_event  jsonb NOT NULL,
    last_error      text,
    last_agent      text,
    attempts        integer DEFAULT 0,
    moved_at        timestamptz DEFAULT now(),
    resolved_at     timestamptz,
    resolution_note text
);

CREATE INDEX IF NOT EXISTS idx_event_dlq_org      ON public.governance_event_dlq(org_id);
CREATE INDEX IF NOT EXISTS idx_event_dlq_unres    ON public.governance_event_dlq(moved_at)
    WHERE resolved_at IS NULL;

-- ---------------------------------------------------------------------
-- 6. Module health heartbeat - "Is the Risk module's agent alive?"
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.module_health (
    module          text PRIMARY KEY,
    last_heartbeat  timestamptz,
    status          text CHECK (status IN ('healthy','degraded','down')) DEFAULT 'healthy',
    last_error      text,
    metadata        jsonb DEFAULT '{}'::jsonb
);

-- ---------------------------------------------------------------------
-- 7. LISTEN/NOTIFY trigger for async agent dispatch
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_governance_event() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'governance_events_channel',
        json_build_object(
            'id', NEW.id,
            'org_id', NEW.org_id,
            'event_type', NEW.event_type,
            'source_module', NEW.source_module,
            'status', NEW.status
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_governance_event ON public.governance_events;
CREATE TRIGGER trg_notify_governance_event
AFTER INSERT ON public.governance_events
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_governance_event();

-- ---------------------------------------------------------------------
-- 8. Agent metrics rollup (refresh every minute via cron)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_rollup_agent_metrics() RETURNS void AS $$
BEGIN
    UPDATE public.agent_registry ar
    SET total_executions = m.total,
        total_errors     = m.errors,
        error_rate       = CASE WHEN m.total > 0 THEN (m.errors::numeric / m.total) ELSE 0 END,
        avg_execution_ms = m.avg_ms,
        p95_execution_ms = m.p95_ms,
        last_execution_at = m.last_at
    FROM (
        SELECT agent_name,
               COUNT(*)                                                     AS total,
               COUNT(*) FILTER (WHERE status = 'failed')                    AS errors,
               COALESCE(AVG(duration_ms)::int, 0)                           AS avg_ms,
               COALESCE((PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY duration_ms))::int, 0) AS p95_ms,
               MAX(started_at)                                              AS last_at
        FROM public.agent_executions
        WHERE started_at > now() - interval '24 hours'
        GROUP BY agent_name
    ) m
    WHERE ar.agent_name = m.agent_name;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 9. RLS policies (org-scoped, role aware)
-- ---------------------------------------------------------------------
ALTER TABLE public.agent_executions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cascade_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_event_dlq    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_health           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_exec_org_read  ON public.agent_executions;
CREATE POLICY agent_exec_org_read ON public.agent_executions
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.user_profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS agent_exec_service_write ON public.agent_executions;
CREATE POLICY agent_exec_service_write ON public.agent_executions
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS cascade_org_read ON public.event_cascade_links;
CREATE POLICY cascade_org_read ON public.event_cascade_links
    FOR SELECT USING (true);

DROP POLICY IF EXISTS dlq_org_read ON public.governance_event_dlq;
CREATE POLICY dlq_org_read ON public.governance_event_dlq
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM public.user_profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS module_health_read ON public.module_health;
CREATE POLICY module_health_read ON public.module_health
    FOR SELECT USING (true);

-- Make agent_executions & cascade available via realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_executions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.event_cascade_links;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END$$;

-- ---------------------------------------------------------------------
-- 10. Seed the 24 Fortune 500 agents into agent_registry
-- ---------------------------------------------------------------------
INSERT INTO public.agent_registry
    (agent_name, agent_type, trigger_events, target_modules, priority, sla_ms, description, owner_team, status)
VALUES
    -- MODEL_REGISTERED cascade
    ('RiskAssessmentAgent',    'risk',         ARRAY['MODEL_REGISTERED'], ARRAY['risks'],                    1, 3000,  'Auto-creates risk register entry for new models', 'risk',       'active'),
    ('ComplianceMapAgent',     'compliance',   ARRAY['MODEL_REGISTERED','COMPLIANCE_UPDATED'], ARRAY['controls','frameworks'], 2, 5000,  'Maps new model against EU AI Act / ISO 42001 / SOC 2 / NIST AI RMF', 'compliance', 'active'),
    ('FairnessScanAgent',      'fairness',     ARRAY['MODEL_REGISTERED','BIAS_SCAN_QUEUED'], ARRAY['bias_audits'], 3, 10000, 'Queues fairness + bias tests across demographic groups', 'ml-ops', 'active'),
    ('ExplainabilityAgent',    'explainability', ARRAY['MODEL_REGISTERED'], ARRAY['explainability_reports'], 3, 8000, 'Evaluates interpretability level and assigns SHAP/LIME/attention method', 'ml-ops', 'active'),
    ('DataGovernanceAgent',    'data',         ARRAY['MODEL_REGISTERED'], ARRAY['dataset_registry','model_dataset_links','consent_records'], 2, 6000, 'Cross-references datasets for PII/PHI, validates consent + cross-border transfer', 'data-privacy', 'active'),
    ('VendorRiskAgent',        'vendor',       ARRAY['MODEL_REGISTERED','VENDOR_LINKED'], ARRAY['vendors'], 3, 4000, 'Links model to vendor, updates concentration risk, flags >40% dependency', 'vendor-risk', 'active'),
    ('CarbonAgent',            'sustainability', ARRAY['MODEL_REGISTERED','CARBON_ESTIMATED'], ARRAY['carbon_records','energy_metrics','model_efficiency'], 4, 5000, 'Estimates training + inference CO2 footprint and updates carbon ledger', 'sustainability', 'active'),
    ('HITLAgent',              'governance',   ARRAY['MODEL_REGISTERED','HITL_REQUIRED'], ARRAY['hitl_reviews','tasks'], 1, 2000, 'Creates HITL review tasks for Tier-1/2 and High-Risk models', 'compliance', 'active'),
    ('CICDGateAgent',          'devops',       ARRAY['MODEL_REGISTERED'], ARRAY['workflow_instances'], 2, 3000, 'Registers EU AI Act Conformity Gate (WF-T001) against model', 'platform', 'active'),
    ('KnowledgeGraphAgent',    'graph',        ARRAY['MODEL_REGISTERED','RISK_CREATED','VENDOR_LINKED'], ARRAY['knowledge_graph'], 5, 4000, 'Updates entity relationship graph with model edges', 'platform', 'active'),
    ('NotificationAgent',      'notify',       ARRAY['*'], ARRAY['notifications'], 9, 2000, 'Fan-out notifications + tasks to owners & stakeholders', 'platform', 'active'),
    ('ConformityAssessmentAgent','compliance',  ARRAY['MODEL_REGISTERED'], ARRAY['conformity_assessments'], 2, 4000, 'Triggers EU AI Act conformity assessment for high-risk models', 'compliance', 'active'),

    -- RISK_DETECTED cascade
    ('RiskDetectionAgent',     'monitor',      ARRAY['DRIFT_DETECTED','SLA_BREACHED','SECURITY_VULN_FOUND','DATA_QUALITY_ANOMALY','CARBON_BUDGET_EXCEEDED','REGULATORY_DEADLINE'], ARRAY['risks'], 1, 2000, 'Classifies severity and writes risk', 'risk', 'active'),
    ('ImpactAnalysisAgent',    'analyze',      ARRAY['RISK_DETECTED','RISK_CREATED'], ARRAY['risks','ai_impact_assessments'], 2, 8000, 'Blast-radius via Knowledge Graph BFS + ALE calc', 'risk', 'active'),
    ('AutoPauseAgent',         'control',      ARRAY['RISK_DETECTED'], ARRAY['ai_models','workflow_instances'], 1, 1000, 'Pauses affected models for Critical/High risks', 'platform', 'active'),
    ('RemediationPlannerAgent','plan',         ARRAY['RISK_CREATED','RISK_DETECTED'], ARRAY['remediation_plans','remediation_items','tasks'], 2, 4000, 'Generates remediation tasks with severity-tier SLAs (4h/24h/7d/30d)', 'compliance', 'active'),
    ('ComplianceImpactAgent',  'compliance',   ARRAY['RISK_DETECTED'], ARRAY['compliance_scores'], 3, 5000, 'Recalculates framework scores + trust engine in real-time', 'compliance', 'active'),
    ('NarrativeEngineAgent',   'narrative',    ARRAY['RISK_DETECTED','INCIDENT_CREATED','COMPLIANCE_UPDATED'], ARRAY['transparency_reports'], 6, 10000, 'Regenerates board + exec talking points + regulator language', 'comms', 'active'),
    ('ESGAgent',               'esg',          ARRAY['RISK_DETECTED','CARBON_ESTIMATED'], ARRAY['esg_reports'], 6, 5000, 'Recalculates ESG dimension scores', 'sustainability', 'active'),

    -- INCIDENT_CREATED cascade
    ('IncidentClassificationAgent','incident', ARRAY['INCIDENT_CREATED'], ARRAY['incidents'], 1, 1500, 'Classifies P0-P4 severity and assigns commander', 'incident', 'active'),
    ('ContainmentAgent',       'control',      ARRAY['INCIDENT_CREATED'], ARRAY['ai_models','bcp_plans'], 1, 1000, 'P0/P1: pause models, trigger BCP, block CI/CD', 'incident', 'active'),
    ('RegulatorNotifyAgent',   'notify',       ARRAY['INCIDENT_CREATED'], ARRAY['regulator_filings'], 2, 5000, 'SEC / FCA / ICO (GDPR 72h) / EU AI Act templates', 'legal', 'active'),
    ('DSRImpactAgent',         'privacy',      ARRAY['INCIDENT_CREATED'], ARRAY['dsar_requests','consent_records'], 2, 6000, 'Bulk DSR entries for affected data subjects', 'privacy', 'active'),
    ('VendorCascadeAgent',     'vendor',       ARRAY['INCIDENT_CREATED','VENDOR_LINKED'], ARRAY['vendors','bcp_plans'], 3, 4000, 'Vendor SLA breach workflow + BCP-004 failover', 'vendor-risk', 'active'),
    ('EvidenceCollectionAgent','evidence',     ARRAY['INCIDENT_CREATED','RISK_DETECTED','EVIDENCE_COLLECTED'], ARRAY['evidence','evidence_chain'], 2, 8000, 'Tamper-proof evidence capture with hash chain', 'audit', 'active'),
    ('FinancialImpactAgent',   'finance',      ARRAY['INCIDENT_CREATED','RISK_DETECTED'], ARRAY['ai_impact_assessments'], 3, 5000, 'ALE update + CFO alert threshold (WF-T006)', 'finance', 'active'),
    ('TrainingUpdateAgent',    'learning',     ARRAY['INCIDENT_CREATED'], ARRAY['training_courses','training_assignments'], 7, 6000, 'Lessons-learned + refresher training assignments', 'learning', 'active')
ON CONFLICT DO NOTHING;

COMMIT;
