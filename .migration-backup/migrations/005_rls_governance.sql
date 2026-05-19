-- Row Level Security for governance tables
ALTER TABLE governance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY governance_events_org_isolation ON governance_events
    USING (org_id = (current_setting('app.current_org_id', true))::uuid);

ALTER TABLE agent_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_registry_org_isolation ON agent_registry
    USING (org_id = (current_setting('app.current_org_id', true))::uuid);

ALTER TABLE evidence_chain ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_chain_org_isolation ON evidence_chain
    USING (org_id = (current_setting('app.current_org_id', true))::uuid);
