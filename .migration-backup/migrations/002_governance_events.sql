-- Governance Events Table (Event Bus persistence)
CREATE TABLE IF NOT EXISTS governance_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          uuid REFERENCES organizations(id),
    event_type      text NOT NULL,
    source_module   text NOT NULL,
    payload         jsonb NOT NULL DEFAULT '{}',
    triggered_agents text[] DEFAULT '{}',
    status          text DEFAULT 'pending',
    processed_at    timestamptz,
    created_at      timestamptz DEFAULT now()
);
CREATE INDEX idx_gov_events_org ON governance_events(org_id);
CREATE INDEX idx_gov_events_type ON governance_events(event_type);
CREATE INDEX idx_gov_events_status ON governance_events(status);
ALTER PUBLICATION supabase_realtime ADD TABLE governance_events;
