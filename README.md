<div align="center">

<img src="https://img.shields.io/badge/SENTINEL-AI%20GRC-6d28d9?style=for-the-badge&labelColor=1a1a2e&color=6d28d9&logoColor=white" alt="Sentinel AI GRC" height="40"/>

# Sentinel AI GRC

**The trust layer for production AI**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/CERTIFYI-AI/sentinel/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/CERTIFYI-AI/sentinel/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

[**Live Demo**](https://sentinel.certifyi.ai) · [**Documentation**](./docs/) · [**Report a Bug**](https://github.com/CERTIFYI-AI/sentinel/issues/new?template=bug_report.md) · [**Request a Feature**](https://github.com/CERTIFYI-AI/sentinel/issues/new?template=feature_request.md)

</div>

---

## What Is Sentinel?

Sentinel AI GRC is an **open-source AI governance, risk, and compliance platform** purpose-built for organisations deploying AI models in regulated industries — financial services, healthcare, and critical infrastructure.

While other GRC tools bolt AI onto legacy risk frameworks, Sentinel is **AI-native from the ground up**: every model, agent, and decision chain is treated as a first-class governance object with mandatory audit trails, policy enforcement, and observable autonomous oversight.

> **Open-core model:** The core governance engine is Apache-2.0. Enterprise modules (SSO, custom agent policies, managed SaaS) are commercial. See [`OPEN_SOURCE.md`](./OPEN_SOURCE.md).

---

## Why Sentinel Exists

| Problem | What Sentinel Does |
|---|---|
| AI models make decisions with zero audit trail | Append-only immutable decision logs on every inference |
| Compliance teams can't understand model behaviour | Human-readable policy engine with explainability hooks |
| Risk frameworks weren't built for autonomous agents | 10 autonomous governance agents with observable state |
| GRC tools are reactive, not continuous | Real-time monitoring + threshold alerting across all models |
| No standard for AI model risk classification | Built-in EU AI Act, NIST AI RMF, and ISO/IEC 42001 controls |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Sentinel AI GRC                         │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────┐   │
│  │  React / TS  │   │   FastAPI    │   │  CF Workers   │   │
│  │  Frontend    │◄──┤   Backend    │◄──┤  Edge Layer   │   │
│  │  (Vite 5)    │   │  (Python)    │   │  (audit/logs) │   │
│  └──────────────┘   └──────┬───────┘   └───────────────┘   │
│                            │                                │
│  ┌──────────────┐   ┌──────▼───────┐   ┌───────────────┐   │
│  │  Autonomous  │   │   Supabase   │   │  Event Bus    │   │
│  │  Gov. Agents │◄──┤  (35+ RLS    │   │  (10 agents)  │   │
│  │  (10 agents) │   │   tables)    │   │               │   │
│  └──────────────┘   └──────────────┘   └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** React 18, TypeScript 5.x, Vite, Tailwind CSS, Recharts
- **Backend:** FastAPI (Python), Pydantic, async/await throughout
- **Edge:** Cloudflare Workers — append-only audit log mutations
- **Database:** Supabase (PostgreSQL) with Row Level Security on all 35+ tables
- **Auth:** Supabase Auth, RBAC across 6 roles
- **Design:** Outfit font, `#368F4D` brand green, light mode only, no hardcoded hex in JSX

---

## Key Features

### 🤖 AI Model Registry
Register, version, and classify every AI model in your organisation. Assign risk tiers, ownership, and compliance frameworks automatically.

### 📋 Policy Engine
Define governance policies in plain language. The policy engine translates them into enforceable rules attached to models, agents, and data pipelines.

### 🔍 Continuous Monitoring
Real-time dashboards tracking model drift, inference anomalies, and policy violations. Threshold-based alerting with configurable escalation.

### 🛡️ Risk Assessment
Structured risk assessment workflows aligned to EU AI Act, NIST AI RMF 1.0, and ISO/IEC 42001. Risk scores computed and tracked over time.

### 📊 Audit & Compliance
Immutable, append-only audit trails for every governance decision. Export-ready compliance reports for regulators.

### 👁️ Agent Observability
Real-time visibility into 10 autonomous governance agents — what they triggered, on which model, at what time, with what outcome.

### 🗳️ Security Questionnaire Automation
AI-assisted completion of vendor security questionnaires (SOC 2, ISO 27001, CAIQ) using your existing policy and control library.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Supabase account (free tier works)
- Cloudflare Workers account (free tier works)

### 1. Clone

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel
```

### 2. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare
CF_ACCOUNT_ID=your-cf-account-id
CF_WORKERS_TOKEN=your-cf-token

# App
VITE_APP_ENV=development
```

### 4. Seed the database

```bash
# Applies all migrations + seeds canonical demo tenant
npm run db:seed
```

This creates **Sentinel Financial Corp** — the canonical demo organisation — with 6 users, 6 AI models, 12 agents, and 30 days of synthetic governance events. Ready to demo in under 2 minutes.

### 5. Run

```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend
cd backend && uvicorn main:app --reload

# Terminal 3 — Workers (local dev)
cd workers && wrangler dev
```

Open [http://localhost:5173](http://localhost:5173)

**Demo credentials:**
| Role | Email | Password |
|---|---|---|
| Chief Risk Officer | cro@sentinelfinancial.com | `demo-sentinel-2025` |
| Compliance Officer | compliance@sentinelfinancial.com | `demo-sentinel-2025` |
| AI Engineer | engineer@sentinelfinancial.com | `demo-sentinel-2025` |
| Auditor (read-only) | auditor@sentinelfinancial.com | `demo-sentinel-2025` |
| Data Scientist | datascience@sentinelfinancial.com | `demo-sentinel-2025` |
| Admin | admin@sentinelfinancial.com | `demo-sentinel-2025` |

---

## Project Structure

```
sentinel/
├── frontend/                    # React/TypeScript application
│   ├── src/
│   │   ├── pages/               # 25+ GRC module pages
│   │   ├── components/          # Shared UI components
│   │   ├── hooks/               # Data fetching hooks (useFromDB)
│   │   ├── lib/
│   │   │   ├── dataAccess.ts    # fromDB/mutateDB standardised pattern
│   │   │   ├── supabase.ts      # Supabase client
│   │   │   └── eventBus.ts      # Agent event bus client
│   │   └── agents/              # Agent observability components
│   └── ...
├── backend/                     # FastAPI application
│   ├── api/                     # Route handlers
│   ├── agents/                  # 10 autonomous governance agents
│   ├── core/                    # Policy engine, risk scoring
│   └── ...
├── workers/                     # Cloudflare Workers
│   ├── audit-log/               # appendToChain — immutable audit writes
│   └── ...
├── supabase/
│   ├── migrations/              # All schema migrations
│   ├── seed/
│   │   ├── seed.ts              # TypeScript seed runner
│   │   └── seed.sql             # Raw SQL seed (alternative)
│   └── policies/                # RLS policy definitions
├── docs/
│   ├── page-status.json         # Scaffold vs. live data manifest
│   ├── architecture.md          # Deep-dive architecture
│   └── runbooks/                # Operational runbooks
├── scripts/
│   └── loadtest-appendchain.ts  # CF Workers concurrency load test
├── OPEN_SOURCE.md               # Free vs. commercial boundary
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── LICENSE                      # Apache-2.0
```

---

## Compliance Frameworks Supported

| Framework | Status | Coverage |
|---|---|---|
| EU AI Act (2024) | ✅ Implemented | Risk classification, prohibited use checks, transparency requirements |
| NIST AI RMF 1.0 | ✅ Implemented | Govern, Map, Measure, Manage functions |
| ISO/IEC 42001:2023 | 🚧 In Progress | AI management system controls |
| SOC 2 Type II | ✅ Implemented | CC6-CC9 controls mapped to AI systems |
| GDPR / Data Privacy | ✅ Implemented | Data lineage, consent tracking for training data |

---

## Autonomous Governance Agents

Sentinel runs 10 always-on governance agents on a shared event bus:

| Agent | Responsibility |
|---|---|
| `PolicyEnforcementAgent` | Validates model behaviour against active policies |
| `DriftDetectionAgent` | Monitors model output distribution for statistical drift |
| `BiasMonitorAgent` | Continuous fairness testing across protected attributes |
| `DataLineageAgent` | Tracks training data provenance and consent validity |
| `IncidentTriageAgent` | Auto-classifies and routes governance incidents |
| `ComplianceCheckAgent` | Maps controls to frameworks, flags gaps |
| `AccessAuditAgent` | Reviews RBAC assignments and privilege escalation |
| `ExplainabilityAgent` | Generates human-readable model decision summaries |
| `ChangeDetectionAgent` | Detects model version changes and re-triggers assessments |
| `ReportingAgent` | Compiles scheduled compliance reports for stakeholders |

All agent events are observable via the `/agents` panel in real time.

---

## RBAC Roles

| Role | Capabilities |
|---|---|
| `super_admin` | Full platform access, tenant management |
| `admin` | User management, all GRC functions |
| `compliance_officer` | Policy creation, audit, reporting |
| `risk_manager` | Risk assessments, control mapping |
| `ai_engineer` | Model registration, technical configuration |
| `auditor` | Read-only access to all GRC data |

---

## Contributing

We welcome contributions. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before submitting a PR.

**Good first issues:** [`good first issue`](https://github.com/CERTIFYI-AI/sentinel/labels/good%20first%20issue)

**Current priorities:**
- [ ] Fix failing CI (see [CI Runbook](./docs/runbooks/ci.md))
- [ ] ISO/IEC 42001 control mapping
- [ ] Multi-tenant enterprise module
- [ ] Agent plugin API for custom governance agents

---

## Roadmap

### v1.0 — Fundable Demo (Current Sprint)
- [x] Core GRC module pages (25+)
- [x] 10 autonomous governance agents
- [x] Append-only audit log (Cloudflare Workers)
- [x] RBAC with 6 roles
- [ ] Fix CI pipeline
- [ ] Complete live data wiring for all pages
- [ ] Agent observability panel
- [ ] Canonical seed data (Sentinel Financial Corp)

### v1.1 — Community Release
- [ ] ISO/IEC 42001 full coverage
- [ ] Public agent plugin API
- [ ] Docker Compose single-command setup
- [ ] OpenAPI spec published

### v2.0 — Enterprise
- [ ] Multi-tenant architecture
- [ ] Custom agent policy builder (commercial)
- [ ] Managed SaaS offering (commercial)
- [ ] SSO / SAML integration (commercial)

---

## Security

Found a vulnerability? Please do **not** open a public issue. See [`SECURITY.md`](./SECURITY.md) for our responsible disclosure policy.

---

## License

```
Copyright 2025 CERTIFYI-AI / Dignep Group Pvt. Ltd.

Licensed under the Apache License, Version 2.0.
You may not use this file except in compliance with the License.
See LICENSE for the full text.
```

The **core platform** is Apache-2.0. Enterprise modules are proprietary. See [`OPEN_SOURCE.md`](./OPEN_SOURCE.md) for the exact boundary.

---

<div align="center">

Built by [Dignep Group](https://dignep.com) · Powering AI governance for regulated industries

**[certifyi.ai](https://certifyi.ai)** · [LinkedIn](https://linkedin.com/company/certifyi) · [Twitter/X](https://x.com/certifyi_ai)

</div>
