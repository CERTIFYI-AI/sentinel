-- Evidence Chain Table (Cryptographic audit trail)
CREATE TABLE IF NOT EXISTS evidence_chain (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid REFERENCES organizations(id),
    entry_index integer NOT NULL,
    timestamp   timestamptz NOT NULL DEFAULT now(),
    action      text NOT NULL,
    entity_type text NOT NULL,
    entity_id   text NOT NULL,
    actor       text NOT NULL,
    prev_hash   text NOT NULL,
    hash        text NOT NULL,
    payload     jsonb DEFAULT '{}',
    created_at  timestamptz DEFAULT now()
);
CREATE INDEX idx_evidence_chain_org ON evidence_chain(org_id);
CREATE INDEX idx_evidence_chain_hash ON evidence_chain(hash);
