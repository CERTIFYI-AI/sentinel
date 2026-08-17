# Sentinel Modules

Per-module reference for the Sentinel AI GRC platform. Each page covers purpose, standards mapping, data model, workflow, and evidence outputs.

## AI Governance
- [Model Inventory & Lifecycle](model-inventory.md)
- [AI Risk Tiering](ai-risk-tiering.md)
- [AI Impact Assessments (DPIA/FRIA)](dpia.md)
- [AIBOM Registry](aibom.md)
- [Agent Platform (Registry, Discovery, IAM, Choreography)](agent-platform.md)
- [Prompt Registry](prompt-registry.md)
- [Explainability & Transparency](explainability.md)
- [AI Advisor & Narrative Engine](ai-advisor-narrative.md)
- [Kill-Switch & Emergency Controls](kill-switch.md)
- [Bias & Fairness Audits](bias-fairness.md)
- [Red Team & Evaluations](red-team-evals.md)
- [Benchmarking & Examination Manager](benchmarking-maturity.md)
- [Trust Engine](trust-engine.md)
- [Policy Firewall & Guardrails](policy-firewall.md)

## Compliance & Policy
- [Compliance Programs (Frameworks, Autopilot, Maturity, Gap Analysis)](compliance-programs.md)
- [Framework Portfolio](frameworks.md)
- [Conformity Assessment](conformity-assessment.md)
- [Policy Management & Templates](policy-management.md)
- [Controls & Control Testing](controls-control-testing.md)
- [Gap Analysis](gap-analysis.md)
- [Control Drift](control-drift.md)
- [Approval Workflows](approval-workflows.md)
- [Regulatory Intelligence (Radar, Velocity)](regulatory-intelligence.md)
- [Regulator Filing Workspace](regulator-filings.md)
- [Transparency Reports](transparency-reports.md)
- [Post-Market Monitoring](post-market.md)
- [Trust Center](trust-center.md)
- [Evidence Management (Vault, Chain, Sync, Export)](evidence-management.md)
- [Audit Management](audit-management.md)
- [Audit Log & Trail](audit-log-trail.md)

## Risk & Response
- [Risk Register & Matrix](risk-register.md)
- [Incident Management](incident-management.md)
- [Forensics & Incident Log](forensics-log.md)
- [Remediation & Tasks](remediation-tasks.md)
- [Tabletop Exercises](tabletop-exercises.md)
- [Business Impact Analysis (BIA)](business-impact-analysis.md)

## Data, Privacy & Vendors
- [**Privacy — DSR, Consent, RoPA, DPIA, TIA**](privacy.md) — group-level view:
  the interlink graph across all five registers, the agents that write records,
  and the field tables. Start here; the per-module docs below carry the detail
  and the history of what was fixed.
- [Data Governance (Datasets, Quality, Lineage)](data-governance.md)
- [Records of Processing Activities (RoPA)](ropa.md)
- [Transfer Impact Assessment (TIA)](transfer-impact-assessment.md)
- [DSR & Consent Management](dsr-consent.md)
- [Vendor / Third-Party Risk (TPRM)](vendor-risk.md) — cluster overview; the
  per-module docs are listed under
  [Vendors, AI Supply Chain & Sustainability](#vendors-ai-supply-chain--sustainability-modules)
- [Asset Management](asset-management.md)
- [Identity Governance (IGA)](identity-governance.md)

## Human Oversight & Ethics
- [Human-in-the-Loop (HITL) Review](hitl-review.md)
- [Ethics Reporting & Whistleblowing](ethics-reporting.md)
- [Training & Awareness](training-awareness.md)

## Security
- [Security Intelligence](security-intelligence.md)

## Sustainability & Finance
- [ESG & Sustainability (Carbon, Energy, Financial)](esg-sustainability.md) —
  cluster overview; the per-module docs are listed under
  [Vendors, AI Supply Chain & Sustainability](#vendors-ai-supply-chain--sustainability-modules)
- [Financial Risk](financial-risk.md)

## Enterprise & Platform
- [Executive Intelligence (Executive Center, ROI, CISO, Peer Intel)](executive-intelligence.md)
- [Knowledge Graph, Marketplace, Use Cases](knowledge-and-marketplace.md)
- [Integrations Platform](integrations-platform.md)
- [RBAC, Admin, Departments, Committees, Settings](rbac-organization.md)

## Policy Library
- [Policy Management & Templates](policy-management.md) — module reference and the
  70-template starter library
- [Policy template changelog](policy-management-changelog.md) — release history of
  the policy templates module

## Planned (V2)

Not shipped. Listed here so the roadmap is visible alongside the module reference.

- **Sentinel Agent** — Wazuh-compatible host agent for FIM, vulnerability
  detection and AI telemetry (prompt sampling, PII detection, jailbreak
  signatures), with OpenTelemetry export.
- **Patch Management** — CVE-to-asset linkage with SLA-based patching deadlines
  and auto-close on scan verification.
- **Audit Requests / Auditor Portal** — external auditor read-only workspace,
  evidence request tracker, secure package delivery.
- **Integration Framework** — first-class connector framework: SIEM (Splunk,
  Elastic, MS Sentinel), ITSM (Jira, ServiceNow), cloud posture (AWS Security
  Hub, GCP SCC, Azure Defender), AI safety (Lakera, Garak, PyRIT), identity
  (Okta, Entra).

## Connectivity, Gateway & Workforce Modules

Added with the August 2026 build-out. Each has a full module guide covering
purpose, why it exists, how it works, field-level schema, interlinks in both
directions, compliance mapping and operations.

- [Integrations](integrations.md) — inbound/outbound connectors and webhook endpoints
- [MCP Gateway](mcp-gateway.md) — MCP servers and the governed tool catalogue
- [Eval Techniques](eval-techniques.md) — the evaluation regime, cadence and coverage
- [Tasks](tasks.md) — the governance work queue with SLA and entity links
- [AI Apps](ai-apps.md) — third-party and shadow-AI application inventory
- [AI Literacy](ai-literacy.md) — Art. 4 training programmes and completion evidence
- [Trust Center](trust-center.md) — outward transparency and subprocessor disclosure
- [Playground](playground.md) — guardrail rehearsal (simulated, explicitly labelled)

## Vendors, AI Supply Chain & Sustainability Modules

Rebuilt 2026-08-16 after four adversarial audits found these twelve modules
rendering from in-file mocks, sitting on cross-tenant demo tables, and asserting
assurance nothing performed. Each doc below covers purpose, why it exists, how
it works, field-level schema, interlinks in both directions, compliance mapping
and operations. Cluster overviews: [TPRM](vendor-risk.md) and
[ESG & Sustainability](esg-sustainability.md).

**Vendors / TPRM**

- [Vendor Registry](vendor-registry.md) — `/vendors`, `/vendors/:id`; the
  `vendors` record every other vendor module hangs off
- [Vendor Assessments](vendor-assessments.md) — `/vendors/assessments`; due
  diligence with an approver distinct from the owner and real `evidence_ids`
- [Vendor SLA](vendor-sla.md) — `/vendors/sla`; numeric thresholds with breach
  **derived** by `vendor_sla_status` (unmeasured is never reported as healthy)
- [TPRM Workspace](tprm-workspace.md) — `/vendors/tprm`; the programme view over
  the four vendor tables
- [Vendor Questionnaire](vendor-questionnaire.md) — `/vendors/:id/questionnaire`;
  persisted VSQ responses with respondent, reviewer and decision
- [Vendor Upload](vendor-upload.md) — `/vendor-upload`; vendor documents in
  Storage with a digest, a version chain and a recorded review

**AI Supply Chain**

- [AIBOM](aibom.md) — `/aibom`; components, licences and CVE rows per model
- [Provenance](provenance.md) — `/provenance`; the typed lineage DAG with
  temporal validity and cross-border transfer facts
- [Supply Chain Graph](supply-chain-graph.md) — `/supply-chain/graph`; the
  interactive canvas over the same provenance rows
- [Supply Chain Attestations](supply-chain-attestations.md) — `/supply-chain`;
  attestations with validity **derived** by `supply_chain_attestation_status`

**Sustainability & ESG**

- [Carbon Ledger](carbon-ledger.md) — `/carbon-ledger`; per-model GHG accounting
  with a cited emission factor and a declared measurement method
- [Energy Efficiency](energy-efficiency.md) — `/energy-efficiency`; kWh, PUE,
  grid intensity and water with the provenance of each reading
- [ESG Reports](esg-reports.md) — `/esg-reports`; disclosures citing the carbon
  records, energy readings and models they report on

Cross-cutting: `org_id` is filled by the DB default `current_user_org_id()` on
every table; all twelve modules call `logAction` (EU AI Act Art. 12); no
verification is performed, so every `verification_status` reads `unverified`
(see TD-011 in [`../reference/technical-debt.md`](../reference/technical-debt.md)).

## Platform Utilities

- [Demo Data Import](demo-import.md) — Settings → Demo data; one-button,
  clearly-fictional, marker-tagged demo dataset written through the real
  service layer (replaces the retired `/import-data` raw-upsert page)
- [Guided Setup](guided-setup.md) — the "Get started" checklist; every step's
  done-state is DERIVED from the real tables (never stored), surfaced in the
  RightSidebar and as a dismissible card on `/overview`

## See Also
- Framework mappings: [`../compliance/`](../compliance/README.md)
- Operational guides: [`../guides/`](../guides/README.md)
- Reference and glossary: [`../reference/`](../reference/README.md)
- Architecture: [`../architecture/overview.md`](../architecture/overview.md)
- API reference: [`../api/api-reference.md`](../api/api-reference.md)
- Top-level index: [`../README.md`](../README.md)
