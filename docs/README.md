# Sentinel Documentation

Sentinel is an AI risk, governance and compliance platform: a policy-enforcing
proxy in front of LLM providers plus a governed dashboard over a Supabase
backend.

This directory is the documentation root. Every page lives in one of the
sections below; each section has its own `README.md` index.

## Sections

| Section | What's in it |
|---|---|
| [Getting started](getting-started/README.md) | Install, configure, seed data, troubleshoot |
| [Architecture](architecture/README.md) | How the system is built: pipeline, backend, interlinks, ADRs |
| [Modules](modules/README.md) | Per-module reference for every GRC module in the product |
| [API](api/README.md) | HTTP API reference, SDK, OpenAPI spec, webhooks & integrations |
| [Operations](operations/README.md) | Deployment, monitoring, scaling, backup, runbooks, release engineering |
| [Security](security/README.md) | Security model, guardrails, policy language, RBAC, tenancy, SSO |
| [Compliance](compliance/README.md) | Framework mappings (EU AI Act, ISO 42001, SOC 2, GDPR/HIPAA) and evidence |
| [Guides](guides/README.md) | Task-oriented walkthroughs for operators and administrators |
| [Reference](reference/README.md) | Glossary, metrics, error codes, environment variables, trust score |
| [Contributing](contributing/README.md) | Test harness, UI component library, accessibility and i18n |
| [Archive](archive/README.md) | Historical engineering working notes — not product documentation |

## Start here

- New to Sentinel: [How it works](architecture/how-it-works.md) →
  [Installation](getting-started/installation.md) →
  [Quickstart](guides/quickstart.md)
- Deploying it: [Deployment guide](operations/deployment.md) →
  [Production checklist](operations/production-checklist.md) →
  [Monitoring](operations/monitoring.md)
- Integrating with it: [API reference](api/api-reference.md) →
  [SDK guide](api/sdk-guide.md)
- Evaluating it for compliance: [Compliance overview](compliance/overview.md) →
  [Security model](security/security-model.md)
- Contributing code: [Architecture overview](architecture/overview.md) →
  [Testing](contributing/testing/ARCHITECTURE.md) →
  [`CONTRIBUTING.md`](../CONTRIBUTING.md)

## Repository-level documents

Kept at the repository root, outside this directory:
[`README.md`](../README.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md),
[`SECURITY.md`](../SECURITY.md), [`SUPPORT.md`](../SUPPORT.md),
[`CHANGELOG.md`](../CHANGELOG.md), [`RELEASE_NOTES.md`](../RELEASE_NOTES.md),
[`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) and [`LICENSE`](../LICENSE).
