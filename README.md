<p align="center">
  <img src="https://img.shields.io/badge/Sentinel-AI%20GRC-6C3BF5?style=for-the-badge&logoColor=white" alt="Sentinel AI GRC" />
</p>

<h1 align="center">Sentinel AI GRC</h1>
<p align="center"><strong>The trust layer for production AI</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-green.svg" alt="License: Apache 2.0" /></a>
  <a href="https://github.com/CERTIFYI-AI/sentinel/actions/workflows/ci.yml"><img src="https://github.com/CERTIFYI-AI/sentinel/actions/workflows/ci.yml/badge.svg" alt="Build Status" /></a>
  <a href="https://github.com/CERTIFYI-AI/sentinel/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

---

## What is Sentinel?

Sentinel is an enterprise-grade, open-source **AI Governance, Risk & Compliance (GRC)** platform purpose-built for organizations deploying AI at scale. It provides a single pane of glass for managing the full AI lifecycle — from model inventory and trust monitoring to bias auditing, impact assessments, incident management, vendor risk, and continuous compliance.

Sentinel is designed for Fortune 500 compliance teams, CISOs, AI ethics officers, and risk managers who need to demonstrate conformance with **EU AI Act**, **ISO 42001**, **NIST AI RMF**, **SOC 2**, and **GDPR** — without stitching together a dozen point solutions. Every control, every audit, every piece of evidence lives in one platform with a complete chain of custody.

Built by [Certifyi AI](https://certifyi.com), the team that gets AI-first companies to ISO 42001 and SOC 2 certification in 8–12 weeks. Sentinel is the platform we built to do it.

---

## Key Features

Sentinel ships with **55+ modules** organized across 9 functional areas covering the complete AI governance lifecycle:

### Overview
- **Executive Dashboard** — Real-time compliance posture, risk heatmaps, and AI inventory KPIs
- **Compliance Reporting** — Board-ready reports with framework coverage and trend analysis

### AI Governance
- **Model Inventory & Lifecycle** — Central registry for every AI/ML model with lifecycle stage tracking from development through deprecation
- **Trust Engine** — Runtime guardrails, live traces, cost & token monitoring, fallback orchestration, and tool-use monitoring with configuration management
- **Agent Discovery & Shadow AI Detection** — Automated discovery of AI agents across your environment with Shadow AI identification
- **Bias Audits** — Structured fairness assessments across protected attributes with documented remediation
- **AI Impact Assessments** — EU AI Act AIIA and GDPR DPIA templates with guided workflows
- **Explainability Center** — Model interpretability documentation and explanation artifacts
- **Use Case Registry** — Centralized catalog of all AI use cases with risk classification

### Security
- **Security Overview Dashboard** — Unified security posture view across your AI infrastructure
- **Threat Feed** — Real-time AI-specific threat intelligence with severity classification
- **Scan Center** — Automated security scanning (full, quick, API, and model scans)
- **Attack Surface Mapping** — Endpoint risk scoring and exposure analysis
- **Vulnerability Tracker** — Vulnerability lifecycle management with CVSS scoring
- **Red Team Lab** — Adversarial testing workspace for AI models
- **Policy Firewall** — Rule engine for runtime security policy enforcement
- **Keys Vault** — API key and secrets management
- **Model Arena** — Head-to-head model comparison and evaluation

### Compliance
- **Compliance Dashboard** — Framework coverage, control health, and audit readiness at a glance
- **Framework Management** — Pre-built support for ISO 27001, SOC 2, GDPR, EU AI Act, NIST AI RMF, and ISO 42001
- **Controls Library** — Full control catalog with Test of Design (ToD) and Test of Effectiveness (ToE) tracking
- **Audit Management** — End-to-end audit planning, execution, and remediation tracking
- **Evidence Sync** — Evidence hub and vault with chain-of-custody tracking and automated collection
- **Gap Analysis** — Identify control gaps across frameworks with prioritized remediation plans
- **Conformity Assessment** — Structured conformity evaluations for AI systems
- **Policy Management** — Policy editor, templates, and version-controlled policy lifecycle
- **Compliance Calendar** — Deadline tracking for audits, certifications, and regulatory milestones
- **Document Management** — Version-controlled document repository with approval workflows
- **Immutable Audit Trail** — Tamper-evident, append-only log of every action in the platform

### Risk & Incidents
- **Risk Register** — Enterprise risk register with 5x5 heat map visualization and risk matrix
- **Incident Management** — Full incident lifecycle with SLA tracking, workflow automation, and remediation tracking
- **Exception Management** — Risk exception requests with approval chains and expiration tracking

### Evaluations
- **Quality Metrics** — Model performance monitoring with configurable evaluation metrics
- **Eval Techniques** — Library of evaluation methodologies (bias probing, adversarial testing, regression)
- **Benchmarking** — Cross-model benchmarking with standardized test suites
- **Dataset Registry** — Versioned dataset catalog for training, evaluation, and testing
- **Data Governance** — Data lineage, classification, and retention policy management

### Operations
- **HITL Review Center** — Human-in-the-loop review queue for flagged AI outputs
- **Vendor Management** — Third-party AI vendor risk assessment with security questionnaires
- **Regulatory Radar** — Global regulatory tracking for AI-related legislation and guidance
- **Approval Workflows Engine** — Configurable multi-stage approval chains for governance processes
- **Notifications** — Centralized alert management with configurable channels and escalation
- **Export Center** — Bulk data export for reporting, audit, and integration

### Organization
- **Training & Awareness** — AI governance training programs with completion tracking
- **Access Control (RBAC)** — Role-based access control with role and user management
- **Benchmarking & Maturity Assessment** — AI governance maturity model with self-assessment
- **Business Continuity & DR Planning** — Disaster recovery and continuity planning for AI systems

### System
- **Settings** — Platform configuration, tenant management, and integrations
- **AI Advisor** — AI-powered compliance and governance recommendations

---

## Screenshots

> Screenshots coming soon. A live demo environment is planned — check the [Discussions](https://github.com/CERTIFYI-AI/sentinel/discussions) for updates.

---

## Quick Start

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel/dashboard
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Demo mode:** The UI runs with seed data out of the box — no backend or database required for exploration. Every module is fully navigable with realistic sample data.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React 18](https://react.dev) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Build | [Vite](https://vitejs.dev/) |
| Component Library | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Phosphor Icons](https://phosphoricons.com/) |
| Routing | [React Router v6](https://reactrouter.com/) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |
| Tables | [TanStack Table](https://tanstack.com/table) |

---

## Architecture

```
sentinel/
├── dashboard/          # React SPA — primary UI deliverable
├── sentinel/           # Python / FastAPI backend (API layer)
├── server/             # Node.js / Prisma backend (being consolidated)
├── migrations/         # Database migration files
├── configs/            # Configuration templates
├── k8s/                # Kubernetes manifests
├── docker/             # Docker build contexts
├── tests/              # Backend test suite
└── docs/               # Project documentation
```

- **Frontend:** React SPA served by Vite in development, static build for production
- **Backend:** Python/FastAPI providing the REST API layer with Pydantic validation
- **Database:** PostgreSQL via [Supabase](https://supabase.com/) with Row-Level Security (RLS) for tenant isolation
- **Multi-tenant:** Full tenant isolation at the database level — every query is scoped to the authenticated tenant

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture guide.

---

## Supported Frameworks

| Framework | Status | Coverage |
|-----------|--------|----------|
| ISO 27001:2022 | **Supported** | 114 controls |
| SOC 2 Type II | **Supported** | 96 criteria |
| EU AI Act | **Supported** | High-risk AI systems |
| NIST AI RMF | **Supported** | 39 functions |
| GDPR | **Supported** | 37 clauses |
| ISO 42001 | **Supported** | AI management system |
| OWASP AI Top 10 | In Progress | Coming Q3 2026 |

Framework crosswalk mapping (control overlap analysis across frameworks) is on the [roadmap](#roadmap).

---

## Module Count

**55+ modules** covering the complete AI governance lifecycle — from model registration through continuous monitoring, audit evidence collection, and board-level reporting. See [docs/MODULES.md](docs/MODULES.md) for the full module catalog.

---

## Database

- **PostgreSQL** via Supabase
- **45+ tables** covering models, controls, evidence, audits, risks, incidents, policies, and more
- **Row-Level Security (RLS)** on every table for multi-tenant isolation
- **Audit trail** with immutable, append-only event logging

---

## Roadmap

- [ ] Backend API integration (FastAPI + Supabase)
- [ ] Real-time WebSocket dashboard
- [ ] SSO / SAML authentication
- [ ] Automated evidence collection
- [ ] AI-powered compliance advisor
- [ ] Framework crosswalk mapping
- [ ] Public API & SDK
- [ ] OWASP AI Top 10 framework support
- [ ] Multi-language support

---

## Contributing

Sentinel is open source and we welcome contributions of all kinds — bug reports, feature requests, documentation improvements, and code contributions.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and commit (`git commit -m 'feat: add my feature'`)
4. Push to your branch (`git push origin feature/my-feature`)
5. Open a Pull Request against `main`

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines, coding standards, and our code of conduct.

The fastest path to a merged PR: pick a [`good first issue`](https://github.com/CERTIFYI-AI/sentinel/labels/good%20first%20issue), make a focused change, and open a pull request.

---

## License

[Apache License 2.0](LICENSE) — use it freely in commercial and open-source projects.

---

## Built By

<a href="https://certifyi.com"><strong>Certifyi AI</strong></a>

Certifyi helps AI-first organizations achieve ISO 42001, SOC 2, and EU AI Act compliance through automated controls, continuous evidence collection, and expert guidance. Sentinel is the platform that powers it.

[Website](https://certifyi.com) &middot; [GitHub](https://github.com/CERTIFYI-AI) &middot; [Discussions](https://github.com/CERTIFYI-AI/sentinel/discussions)
