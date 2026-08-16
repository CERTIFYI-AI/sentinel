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
- [Policy Management & Templates](policy-management.md)
- [Controls & Control Testing](controls-control-testing.md)
- [Approval Workflows](approval-workflows.md)
- [Regulatory Intelligence (Radar, Velocity)](regulatory-intelligence.md)
- [Regulator Filing Workspace](regulator-filings.md)
- [Evidence Management (Vault, Chain, Sync, Export)](evidence-management.md)
- [Audit Log & Trail](audit-log-trail.md)

## Risk & Response
- [Risk Register & Matrix](risk-register.md)
- [Incident Management](incident-management.md)
- [Forensics & Incident Log](forensics-log.md)
- [Remediation & Tasks](remediation-tasks.md)
- [Tabletop Exercises](tabletop-exercises.md)
- [Business Impact Analysis (BIA)](business-impact-analysis.md)

## Data, Privacy & Vendors
- [Data Governance (Datasets, Quality, Lineage)](data-governance.md)
- [Records of Processing Activities (RoPA)](ropa.md)
- [Transfer Impact Assessment (TIA)](transfer-impact-assessment.md)
- [DSR & Consent Management](dsr-consent.md)
- [Vendor / Third-Party Risk (TPRM)](vendor-risk.md)
- [Asset Management](asset-management.md)
- [Identity Governance (IGA)](identity-governance.md)

## Human Oversight & Ethics
- [Human-in-the-Loop (HITL) Review](hitl-review.md)
- [Ethics Reporting & Whistleblowing](ethics-reporting.md)
- [Training & Awareness](training-awareness.md)

## Security
- [Security Intelligence](security-intelligence.md)

## Sustainability & Finance
- [ESG & Sustainability (Carbon, Energy, Financial)](esg-sustainability.md)

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

## See Also
- Framework mappings: [`../compliance/`](../compliance/README.md)
- Operational guides: [`../guides/`](../guides/README.md)
- Reference and glossary: [`../reference/`](../reference/README.md)
- Architecture: [`../architecture/overview.md`](../architecture/overview.md)
- API reference: [`../api/api-reference.md`](../api/api-reference.md)
- Top-level index: [`../README.md`](../README.md)
