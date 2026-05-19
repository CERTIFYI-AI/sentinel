-- Agent Registry Table
CREATE TABLE IF NOT EXISTS agent_registry (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid REFERENCES organizations(id),
    agent_name          text NOT NULL,
    trigger_events      text[] NOT NULL,
    target_modules      text[] NOT NULL,
    is_enabled          boolean DEFAULT true,
    priority            integer DEFAULT 5,
    last_execution_at   timestamptz,
    avg_execution_ms    integer DEFAULT 0,
    error_rate          numeric DEFAULT 0,
    total_executions    integer DEFAULT 0,
    created_at          timestamptz DEFAULT now()
);
