# Sentinel AI GRC — Documentation

> The Trust Layer for Production AI — Apache 2.0, enterprise-grade governance, risk, and compliance for organisations deploying AI in regulated environments.

## Getting Started
- [Getting Started](getting-started.md)
- [Setup](SETUP.md)
- [Quickstart guide](guides/quickstart.md)
- [Configuration](configuration.md) · [Environment variables](reference/environment-variables.md)
- [Deployment](deployment.md) · [Deployment guide (AWS/GCP/bare metal)](deployment-guide.md)

## How Sentinel Works
- [How it works](how-it-works.md) — request lifecycle, policy pipeline
- [Architecture](ARCHITECTURE.md) · [High-level architecture](architecture.md)
- [Architecture deep-dives (Interlinks, Supabase, Activation)](architecture/README.md)
- [Backend](BACKEND.md) — Supabase schema, RLS, evidence chain
- [API reference](API.md) · [Extended API reference](api-reference.md)
- [SDK guide](sdk-guide.md)
- [Security model](security-model.md)

## Modules (per-feature reference)
- [Modules overview](MODULES.md)
- [Modules directory](modules/README.md)
  - Asset Management, IGA, RoPA, TIA, BIA, Tabletop, Regulator Filings
  - Vendor Risk, HITL, Policy Firewall, Red Team & Evals
  - Model Inventory, Trust Engine, Incident, DSR/Consent, Bias & Fairness
- [Security Intelligence module](SECURITY_MODULE.md)
- [Policy Templates](POLICY_TEMPLATES.md) · [Policy language](policy-language.md) · [Changelog](CHANGELOG_POLICIES.md)
- [Guardrails](guardrails.md)
- [UI component reference](ui-component-reference.md)

## Compliance Frameworks
- [Frameworks overview](compliance/overview.md) · [All frameworks](compliance/frameworks.md)
- [EU AI Act mapping](compliance/eu-ai-act-mapping.md)
- [ISO/IEC 42001 mapping](compliance/iso-42001-mapping.md)
- [SOC 2 mapping](compliance/soc2-mapping.md)
- [GDPR / HIPAA / PII](compliance/gdpr-hipaa-pii.md)
- [Audit log schema](compliance/audit-log-schema.md) · [Evidence export](compliance/evidence-export.md)

## Operational Guides
- [Quickstart](guides/quickstart.md)
- [Dashboard guide](guides/dashboard-guide.md)
- [Auth guide](guides/auth-guide.md) · [Settings guide](guides/settings-guide.md)
- [Provider configuration](guides/provider-configuration.md)
- [Writing policies](guides/writing-policies.md)
- [Model inventory guide](guides/model-inventory-guide.md)
- [Audit trail guide](guides/audit-trail-guide.md)
- [Golden-source setup](guides/golden-source-setup.md)
- [CI/CD integration](guides/ci-cd-integration.md)

## Operations
- [Monitoring](ops/monitoring-guide.md)
- [Scaling](ops/scaling-guide.md)
- [Backup & restore](ops/backup-restore.md)
- [Production checklist](ops/production-checklist.md)
- [Troubleshooting](troubleshooting.md)

## Reference
- [Glossary](reference/glossary.md)
- [Metric definitions](reference/metric-definitions.md)
- [Trust score](reference/trust-score.md)
- [Error codes](reference/error-codes.md)
- [Circuit breaker](reference/circuit-breaker.md)

## Audit & Governance
- [Audit report](AUDIT_REPORT.md)

## Contributing
See top-level [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md), and [`SECURITY.md`](../SECURITY.md).
