# Sentinel AI GRC — Module Catalog

> Complete catalog of all 55+ modules in the Sentinel AI GRC platform, organized by sidebar section. Routes are relative to the dashboard SPA root.

---

## Overview

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Dashboard | `/overview` | Overview | Executive dashboard with compliance posture, risk heatmaps, model inventory KPIs, and real-time status |
| Reporting | `/reporting` | Overview | Board-ready compliance reports with framework coverage analysis and trend visualization |

## AI Governance

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Model Inventory | `/models/inventory` | AI Governance | Central registry of all AI/ML models with metadata, ownership, risk classification, and status tracking |
| Model Lifecycle | `/models/lifecycle` | AI Governance | Model lifecycle stage management from development through production to deprecation and retirement |
| Trust Engine | `/trust-engine` | AI Governance | Runtime trust monitoring dashboard with aggregate trust scores and system health |
| Guardrails | `/trust-engine/guardrails` | AI Governance | Configurable guardrail rules for content filtering, safety checks, and output validation |
| Live Traces | `/trust-engine/traces` | AI Governance | Real-time request/response trace viewer with trust score breakdown per interaction |
| Cost & Tokens | `/trust-engine/costs` | AI Governance | Token usage and cost tracking per model, provider, and tenant with budget alerting |
| Fallback Log | `/trust-engine/fallback` | AI Governance | Log of fallback events when primary models fail or trust thresholds are breached |
| Tool Monitor | `/trust-engine/tools` | AI Governance | Monitoring dashboard for AI agent tool usage, function calls, and tool-use policy enforcement |
| Trust Configuration | `/trust-engine/config` | AI Governance | Trust engine settings including thresholds, scoring weights, and circuit breaker configuration |
| Agent Discovery | `/agents` | AI Governance | Automated discovery and inventory of AI agents deployed across the organization |
| Shadow AI | `/agents/shadow-ai` | AI Governance | Detection and tracking of unauthorized or unregistered AI usage within the organization |
| Bias Audits | `/bias-audits` | AI Governance | Structured fairness assessments across protected attributes with bias metrics and remediation plans |
| AI Impact Assessments | `/aiia` | AI Governance | EU AI Act AIIA and GDPR DPIA assessment templates with guided workflows and risk scoring |
| Explainability | `/explainability` | AI Governance | Model interpretability documentation, explanation artifacts, and transparency reporting |
| Use Cases | `/use-cases` | AI Governance | Centralized catalog of all AI use cases with risk classification, ownership, and approval status |

## Security

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Security Overview | `/security` | Security | Unified security posture dashboard with threat summary, scan status, and vulnerability metrics |
| Threat Feed | `/security/threats` | Security | Real-time AI-specific threat intelligence feed with severity classification and response actions |
| Scan Center | `/security/scans` | Security | Automated security scanning engine supporting full, quick, API, and model-specific scan types |
| Attack Surface | `/security/attack-surface` | Security | AI infrastructure attack surface mapping with endpoint risk scoring and exposure analysis |
| Vulnerabilities | `/security/vulnerabilities` | Security | Vulnerability lifecycle management with CVSS scoring, status tracking, and remediation assignment |
| Red Team Lab | `/security/red-team` | Security | Adversarial testing workspace for AI models with prompt injection, jailbreak, and evasion testing |
| Policy Firewall | `/security/policies` | Security | Runtime security policy engine with rule management, enforcement modes, and violation logging |
| Keys Vault | `/security/keys` | Security | Centralized API key and secrets management with rotation tracking and access auditing |
| Model Arena | `/security/model-arena` | Security | Head-to-head model comparison environment for evaluating security properties across models |
| Security Reports | `/security/reports` | Security | Security assessment reports with findings, risk ratings, and remediation recommendations |

## Compliance

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Compliance Dashboard | `/compliance` | Compliance | Framework coverage, control health, audit readiness, and compliance trend analysis |
| Frameworks | `/frameworks` | Compliance | Framework management for ISO 27001, SOC 2, GDPR, EU AI Act, NIST AI RMF, and ISO 42001 |
| Controls | `/compliance/controls` | Compliance | Full control catalog with Test of Design (ToD) and Test of Effectiveness (ToE) tracking |
| Audit Management | `/audits` | Compliance | End-to-end audit planning, execution, finding management, and remediation tracking |
| Evidence Sync | `/evidence-sync` | Compliance | Evidence collection hub with automated sync, chain-of-custody tracking, and integrity verification |
| Evidence Hub | `/compliance/evidence` | Compliance | Centralized evidence browser with search, filtering, and framework mapping |
| Evidence Vault | `/evidence-vault` | Compliance | Immutable evidence storage with tamper-proof integrity verification and retention management |
| Gap Analysis | `/compliance/gap-analysis` | Compliance | Control gap identification across frameworks with prioritized remediation plans and progress tracking |
| Conformity Assessment | `/conformity` | Compliance | Structured conformity evaluations for AI systems per EU AI Act requirements |
| Policies | `/policies` | Compliance | Policy lifecycle management with drafting, review, approval, and publication workflows |
| Policy Templates | `/compliance/policy-templates` | Compliance | Pre-built policy templates for common compliance requirements across supported frameworks |
| Policy Editor | `/policy-editor` | Compliance | Rich text policy editor with version control, diff view, and approval routing |
| Compliance Calendar | `/calendar` | Compliance | Deadline tracking for audits, certifications, regulatory milestones, and renewal dates |
| Document Management | `/documents` | Compliance | Version-controlled document repository with metadata, approval workflows, and access tracking |
| Audit Trail | `/audit-trail` | Compliance | Immutable, hash-chained audit log of every platform action with search and export |

## Risk & Incidents

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Risk Register | `/risks` | Risk & Incidents | Enterprise risk register with risk identification, assessment, treatment plans, and monitoring |
| Risk Matrix | `/risk/matrix` | Risk & Incidents | 5x5 risk heat map visualization with likelihood/impact scoring and risk appetite thresholds |
| Incidents | `/risk/incidents` | Risk & Incidents | Incident management with detection, triage, investigation, and resolution tracking |
| Incident Workflow | `/incident-workflow` | Risk & Incidents | Configurable incident response workflows with SLA tracking and escalation rules |
| Remediation | `/risk/remediation` | Risk & Incidents | Remediation action tracking with ownership, deadlines, and verification status |
| Remediation Tracker | `/remediation-tracker` | Risk & Incidents | Cross-module remediation dashboard aggregating actions from audits, incidents, and gap analysis |
| Exception Management | `/exceptions` | Risk & Incidents | Risk exception requests with approval chains, justification requirements, and expiration tracking |

## Evaluations

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Quality Metrics | `/evals` | Evaluations | Model performance monitoring with configurable evaluation metrics and trend analysis |
| Eval Techniques | `/evals/techniques` | Evaluations | Library of evaluation methodologies including bias probing, adversarial testing, and regression testing |
| Benchmark | `/evals/benchmark` | Evaluations | Cross-model benchmarking with standardized test suites and comparative analysis |
| Datasets | `/datasets` | Evaluations | Versioned dataset catalog for training, evaluation, and testing with lineage tracking |
| Data Governance | `/data-governance` | Evaluations | Data classification, lineage, quality rules, and retention policy management |

## Operations

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| HITL Reviews | `/hitl` | Operations | Human-in-the-loop review queue for flagged AI outputs requiring human judgment |
| Vendors | `/vendors` | Operations | Third-party AI vendor risk assessment with security questionnaires and due diligence tracking |
| Regulatory Radar | `/reg-radar` | Operations | Global regulatory intelligence tracking AI-related legislation, guidance, and enforcement actions |
| Approval Workflows | `/workflows` | Operations | Configurable multi-stage approval chains for governance processes with delegation and escalation |
| Notifications | `/notifications` | Operations | Centralized notification management with configurable channels, rules, and escalation policies |
| Export Center | `/export` | Operations | Bulk data export for audit evidence, reporting, and third-party system integration |

## Organization

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Training & Awareness | `/training` | Organization | AI governance training programs with course management, completion tracking, and certification |
| Access Control | `/access-control` | Organization | Role-based access control administration with permission management and access reviews |
| Role Manager | `/access-control/roles` | Organization | Role definition and permission assignment with hierarchical role inheritance |
| User Manager | `/access-control/users` | Organization | User provisioning, role assignment, and access lifecycle management |
| Benchmarking & Maturity | `/maturity` | Organization | AI governance maturity model with self-assessment, scoring, and improvement roadmap |
| Business Continuity | `/continuity` | Organization | Disaster recovery and business continuity planning for AI systems and data infrastructure |

## System

| Module | Route | Section | Description |
|--------|-------|---------|-------------|
| Settings | `/settings` | System | Platform configuration including tenant settings, integrations, and system preferences |
| AI Advisor | `/ai-advisor` | System | AI-powered compliance and governance recommendations with contextual guidance |

---

## Module Count Summary

| Section | Top-level Modules | Sub-modules | Total |
|---------|------------------|-------------|-------|
| Overview | 2 | 0 | 2 |
| AI Governance | 7 | 8 | 15 |
| Security | 1 | 9 | 10 |
| Compliance | 11 | 4 | 15 |
| Risk & Incidents | 3 | 4 | 7 |
| Evaluations | 3 | 2 | 5 |
| Operations | 6 | 0 | 6 |
| Organization | 4 | 2 | 6 |
| System | 2 | 0 | 2 |
| **Total** | **39** | **29** | **68** |

---

## Further Reading

- [README.md](../README.md) — Quick start and feature overview
- [ARCHITECTURE.md](ARCHITECTURE.md) — System architecture and deployment guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) — How to contribute new modules
