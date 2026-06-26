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

# Sentinel AI GRC

**Governance, Risk & Compliance for production AI systems.**

Sentinel is an open-source platform for organizations deploying AI in regulated
environments. It provides continuous compliance monitoring against EU AI Act,
ISO 42001, NIST AI RMF, GDPR, SOC 2, and ISO 27001 with built-in model
lifecycle governance, bias auditing, vendor risk management, and a real-time
trust engine.

---

## Why Sentinel

Enterprise AI deployments face overlapping regulatory obligations with no
unified tooling. Security teams manage model risk in spreadsheets. Compliance
teams track evidence manually. Engineering teams have no visibility into
downstream governance requirements.

Sentinel closes that gap.

---

## Core Modules

Sentinel features over 100+ governance modules structured into 5 Enterprise GRC Pillars:

| Pillar | Focus Area |
|--------|------------|
| **AI Governance** | Model Registry, AI Supply Chain, Bias Audits, Explainability, Red Teaming |
| **Data & Privacy** | Data Maps, DPIAs, RoPA, Consent Management, Data Lineage |
| **Risk & Compliance** | 5x5 Risk Register, Multi-framework Controls (EU AI Act, ISO 42001, NIST AI RMF), Evidence Vault |
| **Security & Ops** | Threat Intel, Vulnerability Management, Incident Response, Kill Switches |
| **Enterprise Readiness** | RBAC, Audit Logs, Vendor Management, Executive Board Reporting, Policy Library |

---

## Architecture

```
sentinel/
  dashboard/          # React 18 + TypeScript + Vite frontend
    src/
      api/            # Supabase-backed service layer
      components/     # UI component library
      hooks/          # React Query data hooks
      pages/          # Route-level page components
      stores/         # Zustand state management
      lib/            # Supabase client, utilities
  supabase/
    migrations/       # PostgreSQL schema (versioned)
    functions/        # Edge functions
  server/             # Node.js API layer
  sentinel/           # Python backend (FastAPI)
  docs/               # Architecture and API documentation
```

**Stack:** React 18, TypeScript, Vite, Zustand, TanStack Query, Supabase, Cloudflare Workers, Radix UI, Recharts

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase account (free tier works for development)

### Installation

```bash
git clone https://github.com/CERTIFYI-AI/sentinel.git
cd sentinel/dashboard
npm install
```

### Configuration

```bash
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

```bash
npx supabase db push
npm run seed
```

### Development

```bash
npm run dev          # http://localhost:5173
npm run typecheck    # TypeScript validation
npm run test         # Unit tests
```

### Demo

The platform runs in demo mode without a Supabase connection. All modules display representative data from `dashboard/src/data/`.

**Demo credentials (after seed):**
- Email: admin@sentinel-financial.com
- Password: Sentinel2026!

---

## Compliance Coverage

| Framework | Coverage |
|-----------|----------|
| EU AI Act | Art. 6-7 risk classification, Art. 9 risk management, Art. 10 data governance, Art. 13 transparency, Art. 14 human oversight, Art. 72 post-market surveillance |
| ISO 42001 | Clause 6.1 risk identification, Clause 8.3 AI system lifecycle, Clause 9.1 monitoring |
| NIST AI RMF | GOVERN, MAP, MEASURE, MANAGE functions |
| GDPR | Art. 22 automated decisions, Art. 35 DPIA, Art. 83 enforcement |
| SOC 2 | CC6.1 access controls, CC7.1 threat detection |
| ISO 27001 | A.8 information security, A.15 supplier relationships |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache 2.0. See [LICENSE](LICENSE).
